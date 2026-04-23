const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const adminAuth = require('../middleware/adminAuth');

// GET /api/products — public storefront
router.get('/', (req, res) => {
  const products = db.prepare(
    'SELECT id,name,description,notes,image_url,price,stock FROM products WHERE hidden=0 ORDER BY created_at ASC'
  ).all();
  res.json(products);
});

// GET /api/products/admin/all — admin full list
router.get('/admin/all', adminAuth, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at ASC').all();
  res.json(products);
});

// GET /api/products/:id — public single
router.get('/:id', (req, res) => {
  const p = db.prepare(
    'SELECT id,name,description,notes,image_url,price,stock FROM products WHERE id=? AND hidden=0'
  ).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// POST /api/products — admin create
router.post('/', adminAuth, (req, res) => {
  const { name, description, notes, image_url, price, cost_price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Name and price required' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO products (id,name,description,notes,image_url,price,cost_price,stock) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, description || '', notes || '', image_url || '', Number(price), Number(cost_price || 0), Number(stock || 0));
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(id));
});

// PUT /api/products/:id — admin update
router.put('/:id', adminAuth, (req, res) => {
  const ex = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Not found' });
  const { name, description, notes, image_url, price, cost_price, stock, hidden } = req.body;
  db.prepare(`UPDATE products SET name=?,description=?,notes=?,image_url=?,price=?,cost_price=?,stock=?,hidden=? WHERE id=?`
  ).run(
    name ?? ex.name, description ?? ex.description, notes ?? ex.notes,
    image_url ?? ex.image_url, price ?? ex.price, cost_price ?? ex.cost_price,
    stock ?? ex.stock, hidden ?? ex.hidden, req.params.id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

// DELETE /api/products/:id — admin soft delete
router.delete('/:id', adminAuth, (req, res) => {
  const ex = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE products SET hidden=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
