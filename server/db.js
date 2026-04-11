import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data', 'mazuju.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// === SCHEMA ===
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    membership TEXT DEFAULT 'free',
    avatar TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    original_price REAL,
    category TEXT NOT NULL,
    type TEXT DEFAULT 'physical',
    emoji TEXT DEFAULT '📦',
    badge TEXT DEFAULT '',
    bg TEXT DEFAULT 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    image_url TEXT DEFAULT '',
    stock INTEGER DEFAULT 100,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    shipping_name TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_zip TEXT,
    shipping_phone TEXT,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '📖',
    category TEXT DEFAULT 'general',
    age_group TEXT DEFAULT '3-12',
    difficulty TEXT DEFAULT 'beginner',
    is_free INTEGER DEFAULT 0,
    bg TEXT DEFAULT 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    image_url TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_free INTEGER DEFAULT 0,
    duration_min INTEGER DEFAULT 5,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    UNIQUE(user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER,
    course_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    title TEXT DEFAULT '',
    comment TEXT DEFAULT '',
    is_approved INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    source TEXT DEFAULT 'website',
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    discount_type TEXT DEFAULT 'percent',
    discount_value REAL NOT NULL,
    min_order REAL DEFAULT 0,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    valid_from DATETIME,
    valid_until DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupon_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL,
    user_id INTEGER,
    order_id INTEGER,
    discount_amount REAL NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );
`)

// Migration: add image_url to products if missing
try {
  db.prepare('SELECT image_url FROM products LIMIT 1').get()
} catch {
  db.exec('ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT ""')
}

// Migration: add discount fields to orders
try {
  db.prepare('SELECT coupon_code FROM orders LIMIT 1').get()
} catch {
  db.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT ''")
  db.exec('ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0')
  db.exec('ALTER TABLE orders ADD COLUMN subtotal REAL DEFAULT 0')
}

export default db
