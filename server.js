const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const supabase = require('./supabase');

const app = express();

// ─────────────────────────────
// Middleware
// ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'nkscents-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ─────────────────────────────
// Static files (frontend)
// ─────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────
// Uploads folder
// ─────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ─────────────────────────────
// AUTH ROUTES
// ─────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ─────────────────────────────
// PRODUCTS API (FIXED SAFELY)
// ─────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products') // IMPORTANT: lowercase recommended in Supabase
      .select('*');

    if (error) {
      console.log("Products error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.log("Server error (products):", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────
// ORDERS API (IMPORTANT FIX)
// ─────────────────────────────
app.post('/api/orders', async (req, res) => {
  try {
    const { items, total, customer } = req.body;

    if (!items || !total) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          items,
          total,
          customer: customer || null,
          created_at: new Date()
        }
      ])
      .select();

    if (error) {
      console.log("Order insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, order: data });
  } catch (err) {
    console.log("Order server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────
// ROUTE MODULES
// ─────────────────────────────
app.use('/api/upload', require('./routes/upload'));

// ─────────────────────────────
// 404 fallback (IMPORTANT)
// ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─────────────────────────────
// START SERVER
// ─────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});