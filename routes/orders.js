const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const adminAuth = require('../middleware/adminAuth');
require('dotenv').config();

const DELIVERY_FEE = parseFloat(process.env.DELIVERY_FEE || 300);

// POST /api/orders — place order (public)
router.post('/', (req, res) => {
  const { customer_name, contact1, contact2, address, postal_code, items } = req.body;
  if (!customer_name || !contact1 || !address || !postal_code || !items?.length)
    return res.status(400).json({ error: 'Missing required fields' });

  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const p = db.prepare('SELECT * FROM products WHERE id=? AND hidden=0').get(item.id);
    if (!p) return res.status(400).json({ error: `Product not found: ${item.id}` });
    if (p.stock < item.qty) return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
    subtotal += p.price * item.qty;
    orderItems.push({ productId: p.id, name: p.name, price: p.price, qty: item.qty, total: p.price * item.qty });
  }

  const total = subtotal + DELIVERY_FEE;
  const id = 'NK-' + Date.now().toString(36).toUpperCase();

  db.transaction(() => {
    db.prepare(
      'INSERT INTO orders (id,customer_name,contact1,contact2,address,postal_code,items,subtotal,delivery_fee,total) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).run(id, customer_name, contact1, contact2 || '', address, postal_code, JSON.stringify(orderItems), subtotal, DELIVERY_FEE, total);
    for (const item of items)
      db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(item.qty, item.id);
  })();

  const waNumber = process.env.WA_NUMBER || '';
  const lines = orderItems.map(i => `• ${i.name} x${i.qty} — Rs. ${(i.price * i.qty).toLocaleString()}`).join('\n');
  const waMsg = encodeURIComponent(
    `🛒 *New Order — NK. SCENTS*\n━━━━━━━━━━━━━━━\n📦 Order ID: ${id}\n👤 ${customer_name}\n📱 ${contact1}${contact2 ? '\n📱 Alt: ' + contact2 : ''}\n📍 ${address}, ${postal_code}\n\n🧴 *Items:*\n${lines}\n\n💫 Subtotal: Rs. ${subtotal.toLocaleString()}\n🚚 Delivery: Rs. ${DELIVERY_FEE}\n💰 *Total: Rs. ${total.toLocaleString()}*\n━━━━━━━━━━━━━━━\nPlease confirm your order!`
  );
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : null;
  res.status(201).json({ id, subtotal, delivery_fee: DELIVERY_FEE, total, waLink });
});

// GET /api/orders — admin list
router.get('/', adminAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
    .map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(orders);
});

// GET /api/orders/:id — admin single
router.get('/:id', adminAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  res.json({ ...o, items: JSON.parse(o.items) });
});

// PUT /api/orders/:id/status — admin update status
router.put('/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Delayed', 'Completed', 'Canceled'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  if (!db.prepare('SELECT id FROM orders WHERE id=?').get(req.params.id))
    return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

// GET /api/orders/:id/invoice — PDF
router.get('/:id/invoice', adminAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  const items = JSON.parse(o.items);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${o.id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fillColor('#c9a84c').fontSize(30).font('Helvetica-Bold').text('NK. SCENTS', 50, 50);
  doc.fillColor('#888').fontSize(10).font('Helvetica').text('Premium Fragrance Collection', 50, 85);
  doc.fillColor('#444').text(`Invoice #: ${o.id}`, 400, 50, { align: 'right' });
  doc.text(`Date: ${new Date(o.created_at).toLocaleDateString('en-PK')}`, 400, 65, { align: 'right' });
  doc.text(`Status: ${o.status}`, 400, 80, { align: 'right' });
  doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#c9a84c').lineWidth(2).stroke();

  // Bill to
  doc.fillColor('#222').fontSize(11).font('Helvetica-Bold').text('Bill To:', 50, 120);
  doc.font('Helvetica').fontSize(10).fillColor('#444')
    .text(o.customer_name, 50, 138)
    .text(`Phone: ${o.contact1}${o.contact2 ? ' / ' + o.contact2 : ''}`, 50, 153)
    .text(o.address, 50, 168)
    .text(`Postal Code: ${o.postal_code}`, 50, 183);

  // Table header
  const tY = 220;
  doc.rect(50, tY, 495, 22).fill('#1a1a1a');
  doc.fillColor('#c9a84c').fontSize(9).font('Helvetica-Bold')
    .text('PRODUCT', 60, tY + 7)
    .text('QTY', 340, tY + 7, { width: 50, align: 'center' })
    .text('UNIT PRICE', 390, tY + 7, { width: 70, align: 'right' })
    .text('TOTAL', 460, tY + 7, { width: 75, align: 'right' });

  let y = tY + 28;
  items.forEach((item, i) => {
    if (i % 2 === 0) doc.rect(50, y - 4, 495, 20).fill('#f7f7f7');
    doc.fillColor('#333').font('Helvetica').fontSize(10)
      .text(item.name, 60, y)
      .text(String(item.qty), 340, y, { width: 50, align: 'center' })
      .text(`Rs. ${item.price.toLocaleString()}`, 390, y, { width: 70, align: 'right' })
      .text(`Rs. ${item.total.toLocaleString()}`, 460, y, { width: 75, align: 'right' });
    y += 22;
  });

  y += 10;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.fillColor('#444').font('Helvetica').fontSize(10)
    .text('Subtotal:', 390, y, { width: 75, align: 'right' })
    .text(`Rs. ${o.subtotal.toLocaleString()}`, 460, y, { width: 75, align: 'right' });
  y += 16;
  doc.text('Delivery Fee:', 390, y, { width: 75, align: 'right' })
    .text(`Rs. ${o.delivery_fee}`, 460, y, { width: 75, align: 'right' });
  y += 16;
  doc.rect(388, y - 4, 150, 22).fill('#c9a84c');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11)
    .text('TOTAL:', 392, y, { width: 68, align: 'right' })
    .text(`Rs. ${o.total.toLocaleString()}`, 460, y, { width: 72, align: 'right' });

  doc.moveTo(50, 750).lineTo(545, 750).strokeColor('#c9a84c').lineWidth(1).stroke();
  doc.fillColor('#aaa').font('Helvetica').fontSize(8)
    .text('Thank you for choosing NK. SCENTS — Crafted for those who appreciate true luxury.', 50, 758, { align: 'center' });
  doc.end();
});

module.exports = router;
