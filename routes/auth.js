const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const adminAuth = require('../middleware/adminAuth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  res.json({ success: true, username: admin.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.username });
});

// GET /api/auth/stats
router.get('/stats', adminAuth, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='Pending'").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status != 'Canceled'").get().r;
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE hidden=0').get().c;
  const recentOrders = db.prepare("SELECT id, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5").all();
  res.json({ totalOrders, pendingOrders, totalRevenue, totalProducts, recentOrders });
});

// PUT /api/auth/password
router.put('/password', adminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(currentPassword, admin.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.session.adminId);
  res.json({ success: true });
});

module.exports = router;
