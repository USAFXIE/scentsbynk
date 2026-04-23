const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      contact1 TEXT NOT NULL,
      contact2 TEXT DEFAULT '',
      address TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      delivery_fee REAL DEFAULT 300,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // Seed admin if not exists
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get(
    process.env.ADMIN_USERNAME || 'admin'
  );
  if (!adminExists) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'NKScents2024!', 10);
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin', hash
    );
    console.log('✓ Admin account created');
  }

  // Seed products if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (id, name, description, notes, image_url, price, cost_price, stock)
      VALUES (@id, @name, @description, @notes, @image_url, @price, @cost_price, @stock)
    `);
    const products = [
      { id: uuidv4(), name: 'Oud Noir', description: 'A rich smoky journey through Arabian oud. Deep resinous notes blended with warm amber and dark musk create an unforgettable presence that commands attention.', notes: 'Top: Saffron, Cardamom | Heart: Oud, Rose | Base: Amber, Musk', image_url: '/uploads/oud-noir.jpg', price: 4500, cost_price: 2000, stock: 15 },
      { id: uuidv4(), name: 'Rose Elixir', description: 'The finest Bulgarian rose petals captured in luminous form. A romantic floral heart lifted by sparkling bergamot and grounded in warm sandalwood.', notes: 'Top: Bergamot, Lychee | Heart: Bulgarian Rose, Jasmine | Base: Sandalwood, White Musk', image_url: '/uploads/rose-elixir.jpg', price: 3800, cost_price: 1700, stock: 20 },
      { id: uuidv4(), name: 'Amber Dreams', description: 'A warm enveloping embrace of golden amber and sweet vanilla. This sensuous fragrance evokes candlelit evenings and luxurious comfort.', notes: 'Top: Citrus, Spice | Heart: Amber, Benzoin | Base: Vanilla, Cedar, Tonka', image_url: '/uploads/amber-dreams.jpg', price: 3200, cost_price: 1400, stock: 25 },
      { id: uuidv4(), name: 'Midnight Jasmine', description: 'Intoxicating white jasmine blooms under a midnight sky. Ethereal, mysterious, deeply sensual — a fragrance for those who dare to dream.', notes: 'Top: Green Leaves, Pear | Heart: White Jasmine, Ylang-Ylang | Base: Vetiver, Musks', image_url: '/uploads/midnight-jasmine.jpg', price: 4200, cost_price: 1900, stock: 12 },
      { id: uuidv4(), name: 'Saffron Royale', description: 'The most precious spice meets the finest oud. An opulent regal composition worthy of royalty, commanding attention with every step taken.', notes: 'Top: Saffron, Pink Pepper | Heart: Rose, Oud | Base: Leather, Amber, Musk', image_url: '/uploads/saffron-royale.jpg', price: 5500, cost_price: 2500, stock: 8 },
      { id: uuidv4(), name: 'Cedar Noir', description: 'Fresh cedarwood meets dark mystery. Clean, sophisticated, effortlessly elegant — a signature scent for the modern fragrance connoisseur.', notes: 'Top: Bergamot, Grapefruit | Heart: Cedar, Violet | Base: Sandalwood, Vetiver, Musk', image_url: '/uploads/cedar-noir.jpg', price: 3500, cost_price: 1500, stock: 18 }
    ];
    for (const p of products) insert.run(p);
    console.log('✓ Sample products seeded');
  }

  console.log('✓ Database ready');
}

module.exports = { db, initDB };
