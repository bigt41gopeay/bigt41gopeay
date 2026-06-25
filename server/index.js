import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import db from './db.js'
import { sendEmail, onOrderCreated, onUserRegistered, onMembershipChanged } from './email.js'
import { createCheckoutSession, handleStripeWebhook, stripeEnabled } from './payments.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'mazuju-pasaulis-secret-2026'

// Ensure data & uploads directory exists
const dataDir = join(__dirname, 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
const uploadsDir = join(__dirname, 'uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

// Middleware
app.use(cors())

// Stripe webhook MUST use raw body (before express.json)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

app.use(express.json())

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir))

// Serve static frontend files
const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
}

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    if (!allowed.includes(ext)) return cb(new Error('Leidžiami tik paveikslėliai'))
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

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

  // Send welcome email (fire and forget)
  onUserRegistered({ name, email }).catch(err => console.warn('Email failed:', err.message))

  res.json({ token, user: { id: result.lastInsertRowid, name, email, role: 'user', membership: 'free' } })
})

// Change password
app.put('/api/auth/password', auth, (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) return res.status(400).json({ error: 'Visi laukai privalomi' })
  if (new_password.length < 6) return res.status(400).json({ error: 'Naujas slaptažodis per trumpas (min. 6 simboliai)' })

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id)
  if (!user || !bcrypt.compareSync(current_password, user.password)) {
    return res.status(401).json({ error: 'Neteisingas dabartinis slaptažodis' })
  }

  const hash = bcrypt.hashSync(new_password, 10)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id)
  res.json({ message: 'Slaptažodis pakeistas' })
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

// Google Sign-In
app.post('/api/auth/google', (req, res) => {
  const { credential, name, email, picture } = req.body
  if (!email) return res.status(400).json({ error: 'Trūksta el. pašto' })

  // Check if user exists
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  if (user) {
    // Existing user - login
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, membership: user.membership }, JWT_SECRET, { expiresIn: '30d' })
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, membership: user.membership } })
  }

  // New user - register with Google
  const displayName = name || email.split('@')[0]
  const hash = bcrypt.hashSync(Math.random().toString(36).slice(2) + Date.now(), 10) // random password
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(displayName, email, hash)

  const token = jwt.sign({ id: result.lastInsertRowid, email, name: displayName, role: 'user', membership: 'free' }, JWT_SECRET, { expiresIn: '30d' })

  // Send welcome email
  onUserRegistered({ name: displayName, email }).catch(err => console.warn('Email failed:', err.message))

  res.json({ token, user: { id: result.lastInsertRowid, name: displayName, email, role: 'user', membership: 'free' } })
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
  const { items, shipping, coupon_code, gift_card_code, affiliate_code } = req.body
  if (!items || items.length === 0) return res.status(400).json({ error: 'Krepšelis tuščias' })

  const subtotal = items.reduce((sum, item) => {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id)
    return sum + (product ? product.price * (item.quantity || 1) : 0)
  }, 0)

  // Apply coupon if provided
  let discount = 0
  let appliedCoupon = null
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1').get(coupon_code.trim())
    if (coupon) {
      const now = new Date()
      const validFrom = !coupon.valid_from || new Date(coupon.valid_from) <= now
      const validUntil = !coupon.valid_until || new Date(coupon.valid_until) >= now
      const withinLimit = coupon.max_uses === 0 || coupon.used_count < coupon.max_uses
      const meetsMin = subtotal >= coupon.min_order

      if (validFrom && validUntil && withinLimit && meetsMin) {
        if (coupon.discount_type === 'percent') {
          discount = (subtotal * coupon.discount_value) / 100
        } else {
          discount = Math.min(coupon.discount_value, subtotal)
        }
        appliedCoupon = coupon
      }
    }
  }

  // Apply affiliate discount
  let affiliate = null
  if (affiliate_code) {
    affiliate = db.prepare('SELECT * FROM affiliates WHERE code = ? AND is_active = 1').get(affiliate_code.trim())
    if (affiliate && affiliate.discount_for_buyer > 0) {
      const affDiscount = (subtotal * affiliate.discount_for_buyer) / 100
      discount += affDiscount
    }
  }

  // Apply gift card
  const afterDiscount = Math.max(0, subtotal - discount)
  let giftCardAmount = 0
  let giftCard = null
  if (gift_card_code) {
    giftCard = db.prepare('SELECT * FROM gift_cards WHERE code = ? COLLATE NOCASE AND is_active = 1').get(gift_card_code.trim())
    if (giftCard && giftCard.balance > 0) {
      const isExpired = giftCard.expires_at && new Date(giftCard.expires_at) < new Date()
      if (!isExpired) {
        giftCardAmount = Math.min(giftCard.balance, afterDiscount)
      }
    }
  }

  const total = Math.max(0, afterDiscount - giftCardAmount)

  const result = db.prepare(`
    INSERT INTO orders (user_id, total, subtotal, discount, coupon_code, gift_card_code, gift_card_amount, affiliate_code,
                        shipping_name, shipping_address, shipping_city, shipping_zip, shipping_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, total, subtotal, discount, appliedCoupon?.code || '',
    giftCard?.code || '', giftCardAmount, affiliate?.code || '',
    shipping?.name || '', shipping?.address || '', shipping?.city || '', shipping?.zip || '', shipping?.phone || ''
  )

  // Deduct gift card balance
  if (giftCard && giftCardAmount > 0) {
    db.prepare('UPDATE gift_cards SET balance = balance - ? WHERE id = ?').run(giftCardAmount, giftCard.id)
    db.prepare('INSERT INTO gift_card_uses (gift_card_id, order_id, user_id, amount_used) VALUES (?, ?, ?, ?)').run(
      giftCard.id, result.lastInsertRowid, req.user.id, giftCardAmount
    )
  }

  // Track affiliate conversion
  if (affiliate) {
    const commission = (total * affiliate.commission_rate) / 100
    db.prepare(`
      INSERT INTO affiliate_conversions (affiliate_id, order_id, order_total, commission)
      VALUES (?, ?, ?, ?)
    `).run(affiliate.id, result.lastInsertRowid, total, commission)
    db.prepare(`
      UPDATE affiliates SET total_earnings = total_earnings + ?, total_sales = total_sales + ?, total_conversions = total_conversions + 1
      WHERE id = ?
    `).run(commission, total, affiliate.id)
  }

  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
  for (const item of items) {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id)
    if (product) {
      itemStmt.run(result.lastInsertRowid, item.product_id, item.quantity || 1, product.price)
    }
  }

  // Track coupon usage
  if (appliedCoupon) {
    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(appliedCoupon.id)
    db.prepare('INSERT INTO coupon_uses (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)').run(
      appliedCoupon.id, req.user.id, result.lastInsertRowid, discount
    )
  }

  // Fire order notification email
  const orderItems = db.prepare('SELECT oi.*, p.title, p.emoji FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(result.lastInsertRowid)
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id)
  onOrderCreated({ order: { id: result.lastInsertRowid, total, subtotal, discount, coupon_code: appliedCoupon?.code, shipping }, items: orderItems, user }).catch(err => console.warn('Email failed:', err.message))

  res.json({
    id: result.lastInsertRowid,
    total,
    subtotal,
    discount,
    coupon_applied: !!appliedCoupon,
    message: appliedCoupon ? `Užsakymas sukurtas! Pritaikyta nuolaida: €${discount.toFixed(2)}` : 'Užsakymas sukurtas!',
  })
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
// IMAGE UPLOAD
// ==========================================
app.post('/api/products/:id/image', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nėra failo' })
  const imageUrl = `/uploads/${req.file.filename}`
  db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(imageUrl, req.params.id)
  res.json({ image_url: imageUrl, message: 'Nuotrauka įkelta' })
})

app.delete('/api/products/:id/image', adminAuth, (req, res) => {
  db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run('', req.params.id)
  res.json({ message: 'Nuotrauka pašalinta' })
})

// ==========================================
// COURSE CONTENT MANAGEMENT
// ==========================================
app.post('/api/admin/courses', adminAuth, (req, res) => {
  const { title, description, emoji, category, age_group, difficulty, is_free, bg } = req.body
  const result = db.prepare('INSERT INTO courses (title, description, emoji, category, age_group, difficulty, is_free, bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    title, description || '', emoji || '📖', category || 'general', age_group || '3-12', difficulty || 'beginner', is_free ? 1 : 0, bg || 'linear-gradient(135deg, #6C63FF, #9B5DE5)'
  )
  res.json({ id: result.lastInsertRowid, message: 'Kursas sukurtas' })
})

app.put('/api/admin/courses/:id', adminAuth, (req, res) => {
  const { title, description, emoji, category, age_group, difficulty, is_free, bg, is_active } = req.body
  db.prepare('UPDATE courses SET title=?, description=?, emoji=?, category=?, age_group=?, difficulty=?, is_free=?, bg=?, is_active=? WHERE id=?').run(
    title, description, emoji, category, age_group, difficulty, is_free ? 1 : 0, bg, is_active ?? 1, req.params.id
  )
  res.json({ message: 'Kursas atnaujintas' })
})

app.delete('/api/admin/courses/:id', adminAuth, (req, res) => {
  db.prepare('UPDATE courses SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ message: 'Kursas pašalintas' })
})

app.get('/api/admin/courses/:id/lessons', adminAuth, (req, res) => {
  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order').all(req.params.id)
  res.json(lessons)
})

app.post('/api/admin/courses/:id/lessons', adminAuth, (req, res) => {
  const { title, content, video_url, is_free, duration_min } = req.body
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM lessons WHERE course_id = ?').get(req.params.id).m
  const result = db.prepare('INSERT INTO lessons (course_id, title, content, video_url, sort_order, is_free, duration_min) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    req.params.id, title, content || '', video_url || '', maxOrder + 1, is_free ? 1 : 0, duration_min || 5
  )
  res.json({ id: result.lastInsertRowid, message: 'Pamoka sukurta' })
})

app.put('/api/admin/lessons/:id', adminAuth, (req, res) => {
  const { title, content, video_url, is_free, duration_min, sort_order } = req.body
  db.prepare('UPDATE lessons SET title=?, content=?, video_url=?, is_free=?, duration_min=?, sort_order=? WHERE id=?').run(
    title, content, video_url, is_free ? 1 : 0, duration_min, sort_order, req.params.id
  )
  res.json({ message: 'Pamoka atnaujinta' })
})

app.delete('/api/admin/lessons/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id)
  res.json({ message: 'Pamoka pašalinta' })
})

// ==========================================
// PAYMENTS (STRIPE)
// ==========================================
app.get('/api/payments/config', (req, res) => {
  res.json({ enabled: stripeEnabled() })
})

app.post('/api/payments/checkout', auth, async (req, res) => {
  const { order_id } = req.body
  if (!order_id) return res.status(400).json({ error: 'Reikalingas užsakymo ID' })

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id)
  if (!order) return res.status(404).json({ error: 'Užsakymas nerastas' })

  const items = db.prepare('SELECT oi.*, p.title, p.image_url FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(order_id)

  try {
    const session = await createCheckoutSession({ order, items, user: req.user })
    res.json({ url: session.url, id: session.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==========================================
// REVIEWS
// ==========================================
app.get('/api/products/:id/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? AND r.is_approved = 1
    ORDER BY r.created_at DESC
  `).all(req.params.id)

  const stats = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(AVG(rating), 0) as avg_rating,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1
    FROM reviews WHERE product_id = ? AND is_approved = 1
  `).get(req.params.id)

  res.json({ reviews, stats })
})

app.post('/api/products/:id/reviews', auth, (req, res) => {
  const { rating, title, comment } = req.body
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Įvertinimas turi būti 1-5' })

  // Check if user already reviewed
  const existing = db.prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (existing) {
    db.prepare('UPDATE reviews SET rating=?, title=?, comment=? WHERE id=?').run(rating, title || '', comment || '', existing.id)
    res.json({ message: 'Atsiliepimas atnaujintas', id: existing.id })
  } else {
    const result = db.prepare('INSERT INTO reviews (product_id, user_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)').run(
      req.params.id, req.user.id, rating, title || '', comment || ''
    )
    res.json({ message: 'Atsiliepimas pridėtas', id: result.lastInsertRowid })
  }
})

app.delete('/api/reviews/:id', auth, (req, res) => {
  const review = db.prepare('SELECT user_id FROM reviews WHERE id = ?').get(req.params.id)
  if (!review) return res.status(404).json({ error: 'Atsiliepimas nerastas' })
  if (review.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Neturite teisių' })
  }
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id)
  res.json({ message: 'Atsiliepimas pašalintas' })
})

app.get('/api/admin/reviews', adminAuth, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.email as user_email, p.title as product_title, p.emoji as product_emoji
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN products p ON p.id = r.product_id
    ORDER BY r.created_at DESC
  `).all()
  res.json(reviews)
})

app.put('/api/admin/reviews/:id', adminAuth, (req, res) => {
  const { is_approved } = req.body
  db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?').run(is_approved ? 1 : 0, req.params.id)
  res.json({ message: 'Atnaujinta' })
})

// ==========================================
// NEWSLETTER
// ==========================================
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email, name, source } = req.body
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Neteisingas el. paštas' })

  const existing = db.prepare('SELECT id, is_active FROM newsletter_subscribers WHERE email = ?').get(email)
  if (existing) {
    if (existing.is_active) return res.json({ message: 'Jau esate prenumeratorius!' })
    db.prepare('UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL, name = ? WHERE id = ?').run(name || '', existing.id)
  } else {
    db.prepare('INSERT INTO newsletter_subscribers (email, name, source) VALUES (?, ?, ?)').run(email, name || '', source || 'website')
  }
  res.json({ message: '✅ Sėkmingai užsiprenumeravote! Ačiū!' })
})

app.post('/api/newsletter/unsubscribe', (req, res) => {
  const { email } = req.body
  db.prepare('UPDATE newsletter_subscribers SET is_active = 0, unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ?').run(email)
  res.json({ message: 'Sėkmingai atsiprenumeravote' })
})

app.get('/api/admin/newsletter', adminAuth, (req, res) => {
  const subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC').all()
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(is_active) as active,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as unsubscribed
    FROM newsletter_subscribers
  `).get()
  res.json({ subscribers, stats })
})

app.delete('/api/admin/newsletter/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(req.params.id)
  res.json({ message: 'Prenumeratorius pašalintas' })
})

// ==========================================
// COUPONS
// ==========================================
app.post('/api/coupons/validate', (req, res) => {
  const { code, order_total } = req.body
  if (!code) return res.status(400).json({ error: 'Įveskite kodą' })

  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1').get(code.trim())
  if (!coupon) return res.status(404).json({ error: 'Kodas nerastas arba neaktyvus' })

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return res.status(400).json({ error: 'Kodas dar neaktyvus' })
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return res.status(400).json({ error: 'Kodo galiojimas pasibaigęs' })
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Kodo panaudojimo limitas pasiektas' })
  if (coupon.min_order > 0 && order_total < coupon.min_order) return res.status(400).json({ error: `Minimali užsakymo suma: €${coupon.min_order.toFixed(2)}` })

  let discount = 0
  if (coupon.discount_type === 'percent') {
    discount = (order_total * coupon.discount_value) / 100
  } else {
    discount = Math.min(coupon.discount_value, order_total)
  }

  res.json({
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_amount: parseFloat(discount.toFixed(2)),
  })
})

app.get('/api/admin/coupons', adminAuth, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all()
  res.json(coupons)
})

app.post('/api/admin/coupons', adminAuth, (req, res) => {
  const { code, description, discount_type, discount_value, min_order, max_uses, valid_from, valid_until } = req.body
  if (!code || !discount_value) return res.status(400).json({ error: 'Kodas ir nuolaidos dydis privalomi' })

  try {
    const result = db.prepare(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_uses, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase().trim(),
      description || '',
      discount_type || 'percent',
      parseFloat(discount_value),
      parseFloat(min_order) || 0,
      parseInt(max_uses) || 0,
      valid_from || null,
      valid_until || null
    )
    res.json({ id: result.lastInsertRowid, message: 'Kuponas sukurtas' })
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Toks kodas jau egzistuoja' })
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/admin/coupons/:id', adminAuth, (req, res) => {
  const { code, description, discount_type, discount_value, min_order, max_uses, valid_from, valid_until, is_active } = req.body
  db.prepare(`
    UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order=?, max_uses=?, valid_from=?, valid_until=?, is_active=?
    WHERE id=?
  `).run(
    code.toUpperCase().trim(),
    description || '',
    discount_type,
    parseFloat(discount_value),
    parseFloat(min_order) || 0,
    parseInt(max_uses) || 0,
    valid_from || null,
    valid_until || null,
    is_active ? 1 : 0,
    req.params.id
  )
  res.json({ message: 'Kuponas atnaujintas' })
})

app.delete('/api/admin/coupons/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id)
  res.json({ message: 'Kuponas pašalintas' })
})

// ==========================================
// GIFT CARDS
// ==========================================
function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GIFT-'
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    if (i < 3) code += '-'
  }
  return code
}

app.post('/api/giftcards/validate', (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Įveskite kodą' })

  const card = db.prepare('SELECT * FROM gift_cards WHERE code = ? COLLATE NOCASE AND is_active = 1').get(code.trim())
  if (!card) return res.status(404).json({ error: 'Dovanų kortelė nerasta' })

  if (card.balance <= 0) return res.status(400).json({ error: 'Dovanų kortelė išnaudota' })
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Dovanų kortelės galiojimas pasibaigęs' })
  }

  res.json({
    valid: true,
    code: card.code,
    balance: card.balance,
    initial_amount: card.initial_amount,
  })
})

app.post('/api/giftcards/purchase', auth, (req, res) => {
  const { amount, recipient_name, recipient_email, message } = req.body
  const parsedAmount = parseFloat(amount)
  if (!parsedAmount || parsedAmount < 5 || parsedAmount > 500) {
    return res.status(400).json({ error: 'Suma turi būti tarp €5 ir €500' })
  }

  // Generate unique code
  let code
  let attempts = 0
  do {
    code = generateGiftCode()
    attempts++
    if (attempts > 10) return res.status(500).json({ error: 'Nepavyko sugeneruoti kodo' })
  } while (db.prepare('SELECT id FROM gift_cards WHERE code = ?').get(code))

  // Expires in 1 year
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id)
  const result = db.prepare(`
    INSERT INTO gift_cards (code, initial_amount, balance, purchaser_id, purchaser_email, recipient_name, recipient_email, message, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, parsedAmount, parsedAmount, req.user.id, user.email, recipient_name || '', recipient_email || '', message || '', expiresAt.toISOString())

  // Send email to recipient if provided
  if (recipient_email) {
    import('./email.js').then(({ sendEmail }) => {
      sendEmail({
        to: recipient_email,
        subject: `🎁 Jums dovana nuo ${user.name}!`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <div style="background: linear-gradient(135deg, #FFD166, #FF6B35); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 2rem;">🎁 Dovana!</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Jums dovana nuo ${user.name}</p>
            </div>
            <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
              <h2 style="margin: 0 0 16px;">€${parsedAmount.toFixed(2)} dovanų kortelė</h2>
              ${message ? `<p style="padding: 16px; background: #F9FAFB; border-radius: 10px; font-style: italic;">„${message}"</p>` : ''}
              <div style="padding: 20px; background: #FAFBFF; border: 2px dashed #6C63FF; border-radius: 12px; text-align: center; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.85rem; color: #636E72;">Jūsų kodas:</p>
                <strong style="font-family: monospace; font-size: 1.5rem; color: #6C63FF; letter-spacing: 2px;">${code}</strong>
              </div>
              <p style="color: #636E72; font-size: 0.9rem;">Naudokite kodą apmokėdami užsakymus MažųjųPasaulis. Galioja 1 metus.</p>
            </div>
          </div>
        `,
      }).catch(() => {})
    })
  }

  res.json({
    id: result.lastInsertRowid,
    code,
    amount: parsedAmount,
    expires_at: expiresAt.toISOString(),
    message: 'Dovanų kortelė sukurta!',
  })
})

app.get('/api/giftcards/my', auth, (req, res) => {
  const cards = db.prepare('SELECT * FROM gift_cards WHERE purchaser_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json(cards)
})

app.get('/api/admin/giftcards', adminAuth, (req, res) => {
  const cards = db.prepare(`
    SELECT gc.*, u.name as purchaser_name
    FROM gift_cards gc
    LEFT JOIN users u ON u.id = gc.purchaser_id
    ORDER BY gc.created_at DESC
  `).all()
  res.json(cards)
})

app.post('/api/admin/giftcards', adminAuth, (req, res) => {
  const { amount, recipient_name, recipient_email, message, expires_days } = req.body
  const parsedAmount = parseFloat(amount)
  if (!parsedAmount || parsedAmount < 1) return res.status(400).json({ error: 'Neteisinga suma' })

  let code
  do { code = generateGiftCode() } while (db.prepare('SELECT id FROM gift_cards WHERE code = ?').get(code))

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (parseInt(expires_days) || 365))

  const result = db.prepare(`
    INSERT INTO gift_cards (code, initial_amount, balance, recipient_name, recipient_email, message, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(code, parsedAmount, parsedAmount, recipient_name || '', recipient_email || '', message || '', expiresAt.toISOString())

  res.json({ id: result.lastInsertRowid, code, message: 'Dovanų kortelė sukurta' })
})

app.delete('/api/admin/giftcards/:id', adminAuth, (req, res) => {
  db.prepare('UPDATE gift_cards SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ message: 'Pašalinta' })
})

// ==========================================
// AFFILIATES
// ==========================================
function generateAffiliateCode(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'aff'
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${random}`
}

app.post('/api/affiliates/apply', auth, (req, res) => {
  const existing = db.prepare('SELECT id FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (existing) return res.status(400).json({ error: 'Jūs jau esate affiliate' })

  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id)
  let code
  do { code = generateAffiliateCode(user.name) } while (db.prepare('SELECT id FROM affiliates WHERE code = ?').get(code))

  const result = db.prepare(`
    INSERT INTO affiliates (user_id, code, name, email)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, code, user.name, user.email)

  res.json({
    id: result.lastInsertRowid,
    code,
    link: `https://mazujupasaulis.lt/?ref=${code}`,
    message: '🎉 Tapote affiliate! Dalinkitės savo nuoroda ir uždirbkite komisiją.',
  })
})

app.get('/api/affiliates/my', auth, (req, res) => {
  const affiliate = db.prepare('SELECT * FROM affiliates WHERE user_id = ?').get(req.user.id)
  if (!affiliate) return res.json(null)

  // Last 30 days stats
  const recentClicks = db.prepare(`
    SELECT DATE(clicked_at) as date, COUNT(*) as count
    FROM affiliate_clicks
    WHERE affiliate_id = ? AND clicked_at >= datetime('now', '-30 days')
    GROUP BY DATE(clicked_at)
    ORDER BY date DESC
  `).all(affiliate.id)

  const conversions = db.prepare(`
    SELECT ac.*, o.created_at as order_date
    FROM affiliate_conversions ac
    LEFT JOIN orders o ON o.id = ac.order_id
    WHERE ac.affiliate_id = ?
    ORDER BY ac.created_at DESC
    LIMIT 20
  `).all(affiliate.id)

  res.json({
    ...affiliate,
    link: `https://mazujupasaulis.lt/?ref=${affiliate.code}`,
    recent_clicks: recentClicks,
    conversions,
  })
})

app.post('/api/affiliates/track/:code', (req, res) => {
  const affiliate = db.prepare('SELECT id FROM affiliates WHERE code = ? AND is_active = 1').get(req.params.code)
  if (!affiliate) return res.status(404).json({ error: 'Not found' })

  db.prepare(`
    INSERT INTO affiliate_clicks (affiliate_id, ip, user_agent, referer)
    VALUES (?, ?, ?, ?)
  `).run(affiliate.id, req.ip || '', req.headers['user-agent'] || '', req.headers.referer || '')

  db.prepare('UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = ?').run(affiliate.id)

  res.json({ tracked: true })
})

app.get('/api/admin/affiliates', adminAuth, (req, res) => {
  const affiliates = db.prepare(`
    SELECT a.*, u.email as user_email
    FROM affiliates a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.total_earnings DESC
  `).all()
  res.json(affiliates)
})

app.put('/api/admin/affiliates/:id', adminAuth, (req, res) => {
  const { commission_rate, discount_for_buyer, is_active } = req.body
  db.prepare(`
    UPDATE affiliates SET commission_rate = ?, discount_for_buyer = ?, is_active = ?
    WHERE id = ?
  `).run(
    parseFloat(commission_rate) || 10,
    parseFloat(discount_for_buyer) || 5,
    is_active ? 1 : 0,
    req.params.id
  )
  res.json({ message: 'Affiliate atnaujintas' })
})

// ==========================================
// SEO: sitemap.xml & robots.txt
// ==========================================
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://mazujupasaulis.lt'
  const pages = ['', '/knygos', '/zaidimai', '/mokymai', '/parduotuve', '/naryste']
  const products = db.prepare('SELECT id FROM products WHERE is_active = 1').all()
  const courses = db.prepare('SELECT id FROM courses WHERE is_active = 1').all()

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const page of pages) {
    xml += `  <url><loc>${baseUrl}${page}</loc><changefreq>weekly</changefreq><priority>${page === '' ? '1.0' : '0.8'}</priority></url>\n`
  }
  for (const p of products) {
    xml += `  <url><loc>${baseUrl}/parduotuve/${p.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`
  }
  for (const c of courses) {
    xml += `  <url><loc>${baseUrl}/mokymai/${c.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`
  }

  xml += '</urlset>'
  res.type('application/xml').send(xml)
})

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://mazujupasaulis.lt'
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`)
})

// ==========================================
// SPA FALLBACK
// ==========================================
app.get(/.*/, (req, res) => {
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
