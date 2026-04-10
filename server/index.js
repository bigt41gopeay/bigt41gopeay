import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'mazuju-pasaulis-secret-2026'

// Ensure data directory exists
const dataDir = join(__dirname, 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

// Middleware
app.use(cors())
app.use(express.json())

// Serve static frontend files
const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
}

// === AUTH MIDDLEWARE ===
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Reikalingas prisijungimas' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Negaliojantis token' })
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET) } catch {}
  }
  next()
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Neturite teisių' })
    next()
  })
}

// ==========================================
// AUTH ROUTES
// ==========================================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Visi laukai privalomi' })
  if (password.length < 6) return res.status(400).json({ error: 'Slaptažodis per trumpas (min. 6 simboliai)' })

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(400).json({ error: 'Šis el. paštas jau registruotas' })

  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash)

  const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'user', membership: 'free' }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: result.lastInsertRowid, name, email, role: 'user', membership: 'free' } })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Įveskite el. paštą ir slaptažodį' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ error: 'Neteisingi prisijungimo duomenys' })

  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Neteisingi prisijungimo duomenys' })

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, membership: user.membership }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, membership: user.membership } })
})

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, membership, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Vartotojas nerastas' })
  res.json(user)
})

// ==========================================
// PRODUCTS ROUTES
// ==========================================
app.get('/api/products', (req, res) => {
  const { category, type, search } = req.query
  let sql = 'SELECT * FROM products WHERE is_active = 1'
  const params = []

  if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category) }
  if (type) { sql += ' AND type = ?'; params.push(type) }
  if (search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

  sql += ' ORDER BY id ASC'
  res.json(db.prepare(sql).all(...params))
})

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Produktas nerastas' })
  res.json(product)
})

app.post('/api/products', adminAuth, (req, res) => {
  const { title, description, price, original_price, category, type, emoji, badge, bg } = req.body
  const result = db.prepare('INSERT INTO products (title, description, price, original_price, category, type, emoji, badge, bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    title, description, price, original_price || null, category || 'physical', type || 'physical', emoji || '📦', badge || '', bg || 'linear-gradient(135deg, #6C63FF, #9B5DE5)'
  )
  res.json({ id: result.lastInsertRowid, message: 'Produktas sukurtas' })
})

app.put('/api/products/:id', adminAuth, (req, res) => {
  const { title, description, price, original_price, category, type, emoji, badge, bg, stock, is_active } = req.body
  db.prepare('UPDATE products SET title=?, description=?, price=?, original_price=?, category=?, type=?, emoji=?, badge=?, bg=?, stock=?, is_active=? WHERE id=?').run(
    title, description, price, original_price, category, type, emoji, badge, bg, stock, is_active, req.params.id
  )
  res.json({ message: 'Produktas atnaujintas' })
})

app.delete('/api/products/:id', adminAuth, (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ message: 'Produktas pašalintas' })
})

// ==========================================
// ORDERS ROUTES
// ==========================================
app.post('/api/orders', auth, (req, res) => {
  const { items, shipping } = req.body
  if (!items || items.length === 0) return res.status(400).json({ error: 'Krepšelis tuščias' })

  const total = items.reduce((sum, item) => {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id)
    return sum + (product ? product.price * (item.quantity || 1) : 0)
  }, 0)

  const result = db.prepare('INSERT INTO orders (user_id, total, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_phone) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    req.user.id, total, shipping?.name || '', shipping?.address || '', shipping?.city || '', shipping?.zip || '', shipping?.phone || ''
  )

  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
  for (const item of items) {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id)
    if (product) {
      itemStmt.run(result.lastInsertRowid, item.product_id, item.quantity || 1, product.price)
    }
  }

  res.json({ id: result.lastInsertRowid, total, message: 'Užsakymas sukurtas!' })
})

app.get('/api/orders', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  for (const order of orders) {
    order.items = db.prepare(`
      SELECT oi.*, p.title, p.emoji FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).all(order.id)
  }
  res.json(orders)
})

app.get('/api/admin/orders', adminAuth, (req, res) => {
  const orders = db.prepare('SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC').all()
  for (const order of orders) {
    order.items = db.prepare('SELECT oi.*, p.title, p.emoji FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(order.id)
  }
  res.json(orders)
})

app.put('/api/admin/orders/:id', adminAuth, (req, res) => {
  const { status } = req.body
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ message: 'Statusas atnaujintas' })
})

// ==========================================
// COURSES ROUTES
// ==========================================
app.get('/api/courses', optionalAuth, (req, res) => {
  const { category, age_group } = req.query
  let sql = 'SELECT * FROM courses WHERE is_active = 1'
  const params = []

  if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category) }
  if (age_group) { sql += ' AND age_group = ?'; params.push(age_group) }

  sql += ' ORDER BY id ASC'
  const courses = db.prepare(sql).all(...params)

  // Add lesson count and progress
  for (const course of courses) {
    course.lesson_count = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ?').get(course.id).c
    course.free_lesson_count = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND is_free = 1').get(course.id).c
    if (req.user) {
      course.completed_count = db.prepare(`
        SELECT COUNT(*) as c FROM user_progress up
        JOIN lessons l ON l.id = up.lesson_id
        WHERE l.course_id = ? AND up.user_id = ? AND up.completed = 1
      `).get(course.id, req.user.id).c
    }
  }

  res.json(courses)
})

app.get('/api/courses/:id', optionalAuth, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND is_active = 1').get(req.params.id)
  if (!course) return res.status(404).json({ error: 'Kursas nerastas' })

  course.lessons = db.prepare('SELECT id, title, sort_order, is_free, duration_min FROM lessons WHERE course_id = ? ORDER BY sort_order').all(course.id)

  // Add progress
  if (req.user) {
    for (const lesson of course.lessons) {
      const progress = db.prepare('SELECT completed FROM user_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id)
      lesson.completed = progress?.completed || 0
    }
  }

  res.json(course)
})

app.get('/api/lessons/:id', optionalAuth, (req, res) => {
  const lesson = db.prepare('SELECT l.*, c.title as course_title, c.is_free as course_is_free FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?').get(req.params.id)
  if (!lesson) return res.status(404).json({ error: 'Pamoka nerasta' })

  // Check access
  if (!lesson.is_free && !lesson.course_is_free) {
    if (!req.user) return res.status(401).json({ error: 'Prisijunkite norėdami peržiūrėti šią pamoką' })
    const membership = db.prepare('SELECT membership FROM users WHERE id = ?').get(req.user.id)
    if (!membership || membership.membership === 'free') {
      return res.status(403).json({ error: 'Ši pamoka prieinama tik nariams. Pasirinkite narystės planą!' })
    }
  }

  if (req.user) {
    const progress = db.prepare('SELECT completed FROM user_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id)
    lesson.completed = progress?.completed || 0
  }

  res.json(lesson)
})

app.post('/api/lessons/:id/complete', auth, (req, res) => {
  const lessonId = req.params.id
  db.prepare(`
    INSERT INTO user_progress (user_id, lesson_id, completed, completed_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
  `).run(req.user.id, lessonId)
  res.json({ message: 'Pamoka pažymėta kaip baigta!' })
})

// ==========================================
// USER ROUTES
// ==========================================
app.put('/api/user/profile', auth, (req, res) => {
  const { name } = req.body
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id)
  res.json({ message: 'Profilis atnaujintas' })
})

app.put('/api/user/membership', auth, (req, res) => {
  const { membership } = req.body
  if (['free', 'basic', 'premium'].includes(membership)) {
    db.prepare('UPDATE users SET membership = ? WHERE id = ?').run(membership, req.user.id)
    res.json({ message: `Narystė pakeista į: ${membership}` })
  } else {
    res.status(400).json({ error: 'Neteisingas planas' })
  }
})

app.get('/api/user/progress', auth, (req, res) => {
  const progress = db.prepare(`
    SELECT up.*, l.title as lesson_title, l.course_id, c.title as course_title, c.emoji
    FROM user_progress up
    JOIN lessons l ON l.id = up.lesson_id
    JOIN courses c ON c.id = l.course_id
    WHERE up.user_id = ? AND up.completed = 1
    ORDER BY up.completed_at DESC
  `).all(req.user.id)
  res.json(progress)
})

// ==========================================
// ADMIN STATS
// ==========================================
app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json({
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    products: db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c,
    courses: db.prepare('SELECT COUNT(*) as c FROM courses WHERE is_active = 1').get().c,
    revenue: db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders').get().total,
    recent_orders: db.prepare('SELECT o.*, u.name as user_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 5').all(),
  })
})

app.get('/api/admin/users', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, membership, created_at FROM users ORDER BY created_at DESC').all())
})

// ==========================================
// SPA FALLBACK
// ==========================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpointas nerastas' })
  const indexPath = join(distPath, 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send('MažųjųPasaulis API veikia! Frontend dar nesubuildintas.')
  }
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌟 MažųjųPasaulis serveris paleistas!`)
  console.log(`📡 http://localhost:${PORT}`)
  console.log(`📡 http://88.198.130.212\n`)
})
