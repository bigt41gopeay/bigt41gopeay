import { useState, useEffect } from 'react'
import { api } from '../api'

const TABS = [
  { id: 'stats', label: 'Statistika', icon: '📊' },
  { id: 'orders', label: 'Užsakymai', icon: '📦' },
  { id: 'products', label: 'Produktai', icon: '🛒' },
  { id: 'courses', label: 'Kursai', icon: '🎓' },
  { id: 'users', label: 'Vartotojai', icon: '👥' },
  { id: 'reviews', label: 'Atsiliepimai', icon: '💬' },
  { id: 'coupons', label: 'Kuponai', icon: '🎯' },
  { id: 'giftcards', label: 'Dovanų kortelės', icon: '🎁' },
  { id: 'affiliates', label: 'Affiliates', icon: '🤝' },
  { id: 'newsletter', label: 'Naujienlaiškis', icon: '📬' },
]

export default function Admin({ user }) {
  const [tab, setTab] = useState('stats')

  if (!user || user.role !== 'admin') {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <span style={{ fontSize: '4rem' }}>🔒</span>
          <h2 style={{ marginTop: '16px' }}>Neturite prieigos</h2>
          <p style={{ color: '#636E72', marginTop: '8px' }}>Šis puslapis skirtas tik administratoriams.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <div style={styles.header}>
          <div>
            <h1 style={{ fontSize: '2.2rem' }}>⚙️ Admin skydelis</h1>
            <p style={{ color: '#636E72', marginTop: '8px' }}>
              Sveiki, <strong>{user.name}</strong>! Valdykite svetainės turinį ir užsakymus.
            </p>
          </div>
          <div style={styles.adminBadge}>👑 Administratorius</div>
        </div>

        <div style={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...styles.tabBtn,
                ...(tab === t.id ? styles.tabBtnActive : {}),
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {tab === 'stats' && <StatsTab />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'courses' && <CoursesTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'coupons' && <CouponsTab />}
          {tab === 'giftcards' && <GiftCardsTab />}
          {tab === 'affiliates' && <AffiliatesTab />}
          {tab === 'newsletter' && <NewsletterTab />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// STATS TAB
// ============================================
function StatsTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>
  if (!stats) return <div style={styles.error}>❌ Klaida kraunant statistiką</div>

  const cards = [
    { icon: '👥', label: 'Vartotojai', value: stats.users, bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' },
    { icon: '📦', label: 'Užsakymai', value: stats.orders, bg: 'linear-gradient(135deg, #FF6B35, #FFD166)' },
    { icon: '🛒', label: 'Produktai', value: stats.products, bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
    { icon: '🎓', label: 'Kursai', value: stats.courses, bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)' },
    { icon: '💰', label: 'Pajamos', value: `€${(stats.revenue || 0).toFixed(2)}`, bg: 'linear-gradient(135deg, #FFD166, #06D6A0)' },
  ]

  return (
    <div>
      <div style={styles.statsGrid}>
        {cards.map((c, i) => (
          <div key={i} style={{ ...styles.statCard, background: c.bg }}>
            <span style={styles.statIcon}>{c.icon}</span>
            <span style={styles.statValue}>{c.value}</span>
            <span style={styles.statLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>📋 Naujausi užsakymai</h3>
      {stats.recent_orders && stats.recent_orders.length > 0 ? (
        <div style={styles.recentList}>
          {stats.recent_orders.map(o => (
            <div key={o.id} style={styles.recentItem}>
              <div>
                <strong>#{o.id}</strong> – {o.user_name}
                <span style={styles.orderStatus}>{o.status}</span>
              </div>
              <strong style={{ color: '#6C63FF' }}>€{o.total.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#636E72', padding: '20px', textAlign: 'center' }}>
          Kol kas nėra užsakymų
        </p>
      )}
    </div>
  )
}

// ============================================
// ORDERS TAB
// ============================================
function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getAdminOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    try {
      await api.updateOrderStatus(id, status)
      load()
    } catch (err) {
      alert('Klaida: ' + err.message)
    }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>📦 Visi užsakymai ({orders.length})</h3>
      {orders.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#636E72' }}>Dar nėra užsakymų</p>
      ) : (
        <div style={styles.ordersList}>
          {orders.map(o => (
            <div key={o.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <div>
                  <strong>Užsakymas #{o.id}</strong>
                  <span style={{ color: '#636E72', marginLeft: '12px', fontSize: '0.85rem' }}>
                    {new Date(o.created_at).toLocaleString('lt-LT')}
                  </span>
                </div>
                <strong style={{ fontSize: '1.2rem', color: '#6C63FF' }}>€{o.total.toFixed(2)}</strong>
              </div>
              <div style={styles.orderCustomer}>
                👤 {o.user_name} ({o.user_email})
                {o.shipping_address && ` • 📍 ${o.shipping_address}, ${o.shipping_city}`}
              </div>
              <div style={styles.orderItems}>
                {o.items?.map((item, i) => (
                  <span key={i} style={styles.orderItem}>
                    {item.emoji} {item.title} × {item.quantity}
                  </span>
                ))}
              </div>
              <div style={styles.orderActions}>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  style={styles.select}
                >
                  <option value="pending">⏳ Laukia</option>
                  <option value="processing">📦 Ruošiamas</option>
                  <option value="shipped">🚚 Išsiųstas</option>
                  <option value="delivered">✅ Pristatytas</option>
                  <option value="cancelled">❌ Atšauktas</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// PRODUCTS TAB
// ============================================
function ProductsTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = () => {
    setLoading(true)
    api.getProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Tikrai norite pašalinti šį produktą?')) return
    try {
      await api.deleteProduct(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h3>🛒 Produktai ({products.length})</h3>
        <button onClick={() => setShowNew(true)} style={styles.addBtn}>
          ➕ Naujas produktas
        </button>
      </div>

      {showNew && <ProductForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}

      <div style={styles.productList}>
        {products.map(p => (
          <div key={p.id} style={styles.productRow}>
            <div style={{ ...styles.productEmoji, background: p.bg }}>{p.emoji}</div>
            <div style={{ flex: 1 }}>
              <strong>{p.title}</strong>
              <div style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '2px' }}>
                {p.category} • {p.type}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ color: '#6C63FF' }}>€{p.price.toFixed(2)}</strong>
              {p.original_price && (
                <div style={{ fontSize: '0.8rem', color: '#B2BEC3', textDecoration: 'line-through' }}>
                  €{p.original_price.toFixed(2)}
                </div>
              )}
            </div>
            <div style={styles.productActions}>
              <button onClick={() => setEditing(p)} style={styles.editBtn}>✏️</button>
              <button onClick={() => handleDelete(p.id)} style={styles.deleteBtn}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category: product?.category || 'books',
    type: product?.type || 'physical',
    emoji: product?.emoji || '📦',
    badge: product?.badge || '',
    bg: product?.bg || 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    stock: product?.stock || 100,
    is_active: product?.is_active ?? 1,
  })
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
      }

      let productId = product?.id
      if (product) {
        await api.updateProduct(product.id, data)
      } else {
        const res = await api.createProduct(data)
        productId = res.id
      }

      // Upload image if selected
      if (imageFile && productId) {
        const formData = new FormData()
        formData.append('image', imageFile)
        const token = localStorage.getItem('mazuju_token')
        await fetch(`/api/products/${productId}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
      }

      onSaved()
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalForm} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3>{product ? '✏️ Redaguoti produktą' : '➕ Naujas produktas'}</h3>
          <button onClick={onClose} style={styles.closeX}>✕</button>
        </div>
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.formLabel}>
              Pavadinimas *
              <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <div style={styles.formRow}>
            <label style={styles.formLabel}>
              Aprašymas
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...styles.formInput, minHeight: '80px' }} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Kaina (€) *
              <input type="number" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={styles.formInput} />
            </label>
            <label style={styles.formLabel}>
              Sena kaina (€)
              <input type="number" step="0.01" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Kategorija
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={styles.formInput}>
                <option value="books">📚 Knygos</option>
                <option value="bundles">📦 Rinkiniai</option>
                <option value="physical">🧸 Fiziniai</option>
                <option value="digital">📋 Skaitmeniniai</option>
              </select>
            </label>
            <label style={styles.formLabel}>
              Tipas
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={styles.formInput}>
                <option value="physical">Fizinis</option>
                <option value="digital">Skaitmeninis</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Emoji
              <input type="text" value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} style={styles.formInput} />
            </label>
            <label style={styles.formLabel}>
              Ženklelis
              <input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} style={styles.formInput} placeholder="pvz. Bestseleris" />
            </label>
            <label style={styles.formLabel}>
              Kiekis
              <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <div style={styles.formRow}>
            <label style={styles.formLabel}>
              📸 Nuotrauka (JPG/PNG)
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0])} style={styles.formInput} />
            </label>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Atšaukti</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? '⏳ Išsaugoma...' : '💾 Išsaugoti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// COURSES TAB - full editor
// ============================================
function CoursesTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState(null)
  const [managingLessons, setManagingLessons] = useState(null)

  const load = () => {
    setLoading(true)
    api.getCourses().then(setCourses).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Tikrai norite pašalinti šį kursą?')) return
    try {
      await api.deleteCourse(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h3>🎓 Kursai ({courses.length})</h3>
        <button onClick={() => setEditingCourse({})} style={styles.addBtn}>➕ Naujas kursas</button>
      </div>

      {editingCourse && <CourseForm course={editingCourse.id ? editingCourse : null} onClose={() => setEditingCourse(null)} onSaved={() => { setEditingCourse(null); load() }} />}
      {managingLessons && <LessonsManager course={managingLessons} onClose={() => { setManagingLessons(null); load() }} />}

      <div style={styles.courseList}>
        {courses.map(c => (
          <div key={c.id} style={styles.courseRow}>
            <div style={{ ...styles.productEmoji, background: c.bg }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <strong>{c.title}</strong>
              <div style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '2px' }}>
                {c.category} • {c.age_group} m. • {c.lesson_count} pamokos ({c.free_lesson_count} nemokamos)
              </div>
            </div>
            <span style={{ ...styles.badge, background: c.is_free ? '#06D6A0' : '#FF6B35' }}>
              {c.is_free ? 'Nemokamas' : 'Mokamas'}
            </span>
            <div style={styles.productActions}>
              <button onClick={() => setManagingLessons(c)} style={styles.editBtn} title="Valdyti pamokas">📝</button>
              <button onClick={() => setEditingCourse(c)} style={styles.editBtn} title="Redaguoti">✏️</button>
              <button onClick={() => handleDelete(c.id)} style={styles.deleteBtn} title="Ištrinti">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CourseForm({ course, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: course?.title || '',
    description: course?.description || '',
    emoji: course?.emoji || '📖',
    category: course?.category || 'emotions',
    age_group: course?.age_group || '3-7',
    difficulty: course?.difficulty || 'beginner',
    is_free: course?.is_free || 0,
    bg: course?.bg || 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form, is_free: form.is_free ? 1 : 0 }
      if (course?.id) {
        await api.updateCourse(course.id, { ...data, is_active: 1 })
      } else {
        await api.createCourse(data)
      }
      onSaved()
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalForm} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3>{course ? '✏️ Redaguoti kursą' : '➕ Naujas kursas'}</h3>
          <button onClick={onClose} style={styles.closeX}>✕</button>
        </div>
        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.formLabel}>
            Pavadinimas *
            <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={styles.formInput} />
          </label>
          <label style={styles.formLabel}>
            Aprašymas
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...styles.formInput, minHeight: '100px' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Emoji
              <input type="text" value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} style={styles.formInput} />
            </label>
            <label style={styles.formLabel}>
              Amžius
              <input type="text" value={form.age_group} onChange={e => setForm({ ...form, age_group: e.target.value })} style={styles.formInput} placeholder="3-7" />
            </label>
            <label style={styles.formLabel}>
              Sunkumas
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} style={styles.formInput}>
                <option value="beginner">Pradedantiems</option>
                <option value="intermediate">Vidutinis</option>
                <option value="advanced">Pažengusiems</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Kategorija
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={styles.formInput}>
                <option value="emotions">😊 Emocijos</option>
                <option value="confidence">💪 Pasitikėjimas</option>
                <option value="adhd">🧠 ADHD</option>
                <option value="creativity">🎨 Kūrybiškumas</option>
                <option value="learning">📖 Mokymasis</option>
                <option value="social">🤝 Socialiniai</option>
              </select>
            </label>
            <label style={{ ...styles.formLabel, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
                <input type="checkbox" checked={!!form.is_free} onChange={e => setForm({ ...form, is_free: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                <span>Nemokamas kursas</span>
              </div>
            </label>
          </div>
          <label style={styles.formLabel}>
            CSS fono gradientas
            <input type="text" value={form.bg} onChange={e => setForm({ ...form, bg: e.target.value })} style={styles.formInput} />
          </label>
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Atšaukti</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? '⏳ Išsaugoma...' : '💾 Išsaugoti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LessonsManager({ course, onClose }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    api.getAdminLessons(course.id)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Tikrai ištrinti šią pamoką?')) return
    try {
      await api.deleteLesson(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modalForm, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3>📝 {course.title} – pamokos ({lessons.length})</h3>
          <button onClick={onClose} style={styles.closeX}>✕</button>
        </div>

        {editing ? (
          <LessonForm
            lesson={editing.id ? editing : null}
            courseId={course.id}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); load() }}
          />
        ) : (
          <>
            <button onClick={() => setEditing({})} style={{ ...styles.addBtn, marginBottom: '16px' }}>
              ➕ Nauja pamoka
            </button>

            {loading ? (
              <div style={styles.loading}>⏳ Kraunama...</div>
            ) : lessons.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>
                Kol kas nėra pamokų. Pridėkite pirmąją!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lessons.map((l, idx) => (
                  <div key={l.id} style={styles.lessonRow}>
                    <span style={styles.lessonNum}>{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <strong>{l.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#636E72', marginTop: '2px' }}>
                        ⏱️ {l.duration_min} min · {l.is_free ? '🆓 Nemokama' : '🔒 Mokama'}
                        {l.video_url && ' · 🎬 Video'}
                      </div>
                    </div>
                    <div style={styles.productActions}>
                      <button onClick={() => setEditing(l)} style={styles.editBtn}>✏️</button>
                      <button onClick={() => handleDelete(l.id)} style={styles.deleteBtn}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LessonForm({ lesson, courseId, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    content: lesson?.content || '',
    video_url: lesson?.video_url || '',
    duration_min: lesson?.duration_min || 5,
    is_free: lesson?.is_free || 0,
    sort_order: lesson?.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form, is_free: form.is_free ? 1 : 0, duration_min: parseInt(form.duration_min) }
      if (lesson?.id) {
        await api.updateLesson(lesson.id, data)
      } else {
        await api.createLesson(courseId, data)
      }
      onSaved()
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} style={styles.form}>
      <label style={styles.formLabel}>
        Pamokos pavadinimas *
        <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={styles.formInput} />
      </label>
      <label style={styles.formLabel}>
        Turinys (Markdown palaikomas)
        <textarea
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          style={{ ...styles.formInput, minHeight: '200px', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}
          placeholder="## Pamokos turinys&#10;&#10;Pamokos tekstas, klausimai, užduotys..."
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
        <label style={styles.formLabel}>
          Video URL (YouTube embed)
          <input type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} style={styles.formInput} placeholder="https://youtube.com/..." />
        </label>
        <label style={styles.formLabel}>
          Trukmė (min)
          <input type="number" min="1" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          Eilės nr.
          <input type="number" min="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} style={styles.formInput} />
        </label>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input type="checkbox" checked={!!form.is_free} onChange={e => setForm({ ...form, is_free: e.target.checked })} style={{ width: '18px', height: '18px' }} />
        <span>Nemokama pamoka (prieinama visiems)</span>
      </label>
      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>Atšaukti</button>
        <button type="submit" disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ Išsaugoma...' : '💾 Išsaugoti pamoką'}
        </button>
      </div>
    </form>
  )
}

// ============================================
// USERS TAB
// ============================================
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAdminUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>👥 Vartotojai ({users.length})</h3>
      <div style={styles.userList}>
        {users.map(u => (
          <div key={u.id} style={styles.userRow}>
            <div style={styles.userAvatar}>{u.name.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <strong>{u.name}</strong> {u.role === 'admin' && <span style={styles.adminTag}>👑 Admin</span>}
              <div style={{ color: '#636E72', fontSize: '0.85rem' }}>{u.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ ...styles.badge, background: u.membership === 'premium' ? '#FF6B35' : u.membership === 'basic' ? '#6C63FF' : '#06D6A0' }}>
                {u.membership === 'premium' ? '👑 Premium' : u.membership === 'basic' ? '⭐ Šeimos' : '🌱 Nemokamas'}
              </span>
              <div style={{ fontSize: '0.75rem', color: '#B2BEC3', marginTop: '4px' }}>
                {new Date(u.created_at).toLocaleDateString('lt-LT')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// REVIEWS TAB
// ============================================
function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getAdminReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggleApproval = async (id, current) => {
    try {
      await api.approveReview(id, !current)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Ištrinti atsiliepimą?')) return
    try {
      await api.deleteReview(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>💬 Atsiliepimai ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>Dar nėra atsiliepimų</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map(r => (
            <div key={r.id} style={{ ...styles.orderCard, opacity: r.is_approved ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{r.product_emoji}</span>
                  <div>
                    <strong>{r.product_title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#636E72' }}>
                      {r.user_name} ({r.user_email}) · {new Date(r.created_at).toLocaleDateString('lt-LT')}
                    </div>
                  </div>
                </div>
                <span style={{ color: '#FFD166', fontSize: '1.1rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.title && <strong>{r.title}</strong>}
              {r.comment && <p style={{ color: '#636E72', marginTop: '8px', lineHeight: 1.5 }}>{r.comment}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => toggleApproval(r.id, r.is_approved)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: r.is_approved ? '#06D6A0' : '#E8ECF1',
                    color: r.is_approved ? 'white' : '#636E72',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {r.is_approved ? '✓ Patvirtinta' : '⏸ Paslėpta'}
                </button>
                <button onClick={() => handleDelete(r.id)} style={styles.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// COUPONS TAB
// ============================================
function CouponsTab() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    api.getAdminCoupons().then(setCoupons).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Ištrinti kuponą?')) return
    try {
      await api.deleteCoupon(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h3>🎯 Nuolaidų kuponai ({coupons.length})</h3>
        <button onClick={() => setEditing({})} style={styles.addBtn}>➕ Naujas kuponas</button>
      </div>

      {editing && <CouponForm coupon={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}

      {coupons.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>Kol kas nėra kuponų</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {coupons.map(c => (
            <div key={c.id} style={{ ...styles.productRow, opacity: c.is_active ? 1 : 0.5 }}>
              <div style={{ ...styles.productEmoji, background: 'linear-gradient(135deg, #FFD166, #FF6B35)' }}>🎯</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem' }}>{c.code}</strong>
                <div style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '2px' }}>
                  {c.description}
                </div>
                <div style={{ color: '#B2BEC3', fontSize: '0.75rem', marginTop: '4px' }}>
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : `€${c.discount_value}`} nuolaida ·
                  min. €{c.min_order} ·
                  panaudota {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                </div>
              </div>
              <span style={{ ...styles.badge, background: c.is_active ? '#06D6A0' : '#B2BEC3' }}>
                {c.is_active ? 'Aktyvus' : 'Neaktyvus'}
              </span>
              <div style={styles.productActions}>
                <button onClick={() => setEditing(c)} style={styles.editBtn}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={styles.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CouponForm({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percent',
    discount_value: coupon?.discount_value || 10,
    min_order: coupon?.min_order || 0,
    max_uses: coupon?.max_uses || 0,
    valid_from: coupon?.valid_from?.slice(0, 10) || '',
    valid_until: coupon?.valid_until?.slice(0, 10) || '',
    is_active: coupon?.is_active ?? 1,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (coupon?.id) {
        await api.updateCoupon(coupon.id, form)
      } else {
        await api.createCoupon(form)
      }
      onSaved()
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalForm} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3>{coupon ? '✏️ Redaguoti kuponą' : '➕ Naujas kuponas'}</h3>
          <button onClick={onClose} style={styles.closeX}>✕</button>
        </div>
        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.formLabel}>
            Kodas * (pvz. SUMMER20)
            <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ ...styles.formInput, fontFamily: 'monospace', textTransform: 'uppercase' }} />
          </label>
          <label style={styles.formLabel}>
            Aprašymas
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={styles.formInput} placeholder="pvz. Vasaros akcija" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Tipas
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} style={styles.formInput}>
                <option value="percent">% nuolaida</option>
                <option value="fixed">€ nuolaida</option>
              </select>
            </label>
            <label style={styles.formLabel}>
              Dydis *
              <input type="number" step="0.01" min="0" required value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Min. užsakymo suma (€)
              <input type="number" step="0.01" min="0" value={form.min_order} onChange={e => setForm({ ...form, min_order: e.target.value })} style={styles.formInput} />
            </label>
            <label style={styles.formLabel}>
              Max. panaudojimų (0 = neriboti)
              <input type="number" min="0" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={styles.formLabel}>
              Galioja nuo
              <input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} style={styles.formInput} />
            </label>
            <label style={styles.formLabel}>
              Galioja iki
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} style={styles.formInput} />
            </label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} style={{ width: '18px', height: '18px' }} />
            <span>Aktyvus kuponas</span>
          </label>
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Atšaukti</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? '⏳ Išsaugoma...' : '💾 Išsaugoti'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// GIFT CARDS TAB
// ============================================
function GiftCardsTab() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newCard, setNewCard] = useState({ amount: 20, recipient_name: '', recipient_email: '', message: '', expires_days: 365 })

  const load = () => {
    setLoading(true)
    api.getAdminGiftCards().then(setCards).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.createAdminGiftCard(newCard)
      setCreating(false)
      setNewCard({ amount: 20, recipient_name: '', recipient_email: '', message: '', expires_days: 365 })
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Pašalinti dovanų kortelę?')) return
    try {
      await api.deleteGiftCard(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  const totalValue = cards.reduce((sum, c) => sum + (c.is_active ? c.balance : 0), 0)
  const activeCards = cards.filter(c => c.is_active && c.balance > 0).length

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h3>🎁 Dovanų kortelės ({cards.length})</h3>
        <button onClick={() => setCreating(true)} style={styles.addBtn}>➕ Nauja kortelė</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FFD166, #FF6B35)' }}>
          <span style={styles.statIcon}>🎁</span>
          <span style={styles.statValue}>{cards.length}</span>
          <span style={styles.statLabel}>Iš viso kortelių</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' }}>
          <span style={styles.statIcon}>✅</span>
          <span style={styles.statValue}>{activeCards}</span>
          <span style={styles.statLabel}>Aktyvios</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' }}>
          <span style={styles.statIcon}>💰</span>
          <span style={styles.statValue}>€{totalValue.toFixed(2)}</span>
          <span style={styles.statLabel}>Bendras likutis</span>
        </div>
      </div>

      {creating && (
        <div style={styles.modalOverlay} onClick={() => setCreating(false)}>
          <div style={styles.modalForm} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>➕ Sukurti dovanų kortelę</h3>
              <button onClick={() => setCreating(false)} style={styles.closeX}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={styles.form}>
              <label style={styles.formLabel}>
                Suma (€) *
                <input type="number" step="0.01" min="1" required value={newCard.amount} onChange={e => setNewCard({ ...newCard, amount: e.target.value })} style={styles.formInput} />
              </label>
              <label style={styles.formLabel}>
                Galiojimo dienos
                <input type="number" min="1" value={newCard.expires_days} onChange={e => setNewCard({ ...newCard, expires_days: e.target.value })} style={styles.formInput} />
              </label>
              <label style={styles.formLabel}>
                Gavėjo vardas (neprivaloma)
                <input type="text" value={newCard.recipient_name} onChange={e => setNewCard({ ...newCard, recipient_name: e.target.value })} style={styles.formInput} />
              </label>
              <label style={styles.formLabel}>
                Gavėjo el. paštas (neprivaloma)
                <input type="email" value={newCard.recipient_email} onChange={e => setNewCard({ ...newCard, recipient_email: e.target.value })} style={styles.formInput} />
              </label>
              <label style={styles.formLabel}>
                Žinutė
                <textarea value={newCard.message} onChange={e => setNewCard({ ...newCard, message: e.target.value })} style={{ ...styles.formInput, minHeight: '80px' }} />
              </label>
              <div style={styles.formActions}>
                <button type="button" onClick={() => setCreating(false)} style={styles.cancelBtn}>Atšaukti</button>
                <button type="submit" style={styles.saveBtn}>💾 Sukurti</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>Kol kas nėra dovanų kortelių</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cards.map(c => (
            <div key={c.id} style={{ ...styles.productRow, opacity: c.is_active ? 1 : 0.5 }}>
              <div style={{ ...styles.productEmoji, background: 'linear-gradient(135deg, #FFD166, #FF6B35)' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{c.code}</strong>
                <div style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '2px' }}>
                  €{c.balance.toFixed(2)} / €{c.initial_amount.toFixed(2)}
                  {c.recipient_name && ` · 🎁 ${c.recipient_name}`}
                  {c.purchaser_name && ` · 👤 ${c.purchaser_name}`}
                </div>
                <div style={{ color: '#B2BEC3', fontSize: '0.75rem', marginTop: '2px' }}>
                  {c.expires_at && `Galioja iki ${new Date(c.expires_at).toLocaleDateString('lt-LT')}`}
                </div>
              </div>
              <span style={{ ...styles.badge, background: c.balance > 0 ? '#06D6A0' : '#B2BEC3' }}>
                {c.balance > 0 ? 'Aktyvi' : 'Išnaudota'}
              </span>
              <button onClick={() => handleDelete(c.id)} style={styles.deleteBtn}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// AFFILIATES TAB
// ============================================
function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getAdminAffiliates().then(setAffiliates).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleUpdate = async (id, data) => {
    try {
      await api.updateAdminAffiliate(id, data)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  const totalEarnings = affiliates.reduce((sum, a) => sum + (a.total_earnings || 0), 0)
  const totalSales = affiliates.reduce((sum, a) => sum + (a.total_sales || 0), 0)
  const totalClicks = affiliates.reduce((sum, a) => sum + (a.total_clicks || 0), 0)

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>🤝 Affiliate programa ({affiliates.length} narių)</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' }}>
          <span style={styles.statIcon}>👥</span>
          <span style={styles.statValue}>{affiliates.length}</span>
          <span style={styles.statLabel}>Affiliates</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' }}>
          <span style={styles.statIcon}>👆</span>
          <span style={styles.statValue}>{totalClicks}</span>
          <span style={styles.statLabel}>Paspaudimai</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FF6B35, #FFD166)' }}>
          <span style={styles.statIcon}>🛒</span>
          <span style={styles.statValue}>€{totalSales.toFixed(2)}</span>
          <span style={styles.statLabel}>Pardavimai</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)' }}>
          <span style={styles.statIcon}>💰</span>
          <span style={styles.statValue}>€{totalEarnings.toFixed(2)}</span>
          <span style={styles.statLabel}>Išmokėtina komisija</span>
        </div>
      </div>

      {affiliates.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>Kol kas nėra affiliates</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {affiliates.map(a => (
            <div key={a.id} style={{ ...styles.productRow, opacity: a.is_active ? 1 : 0.5, alignItems: 'flex-start' }}>
              <div style={styles.userAvatar}>{a.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <strong>{a.name}</strong>
                <div style={{ color: '#636E72', fontSize: '0.85rem' }}>
                  {a.email} · Kodas: <code style={{ background: '#F5F5F5', padding: '1px 6px', borderRadius: '4px' }}>{a.code}</code>
                </div>
                <div style={{ color: '#B2BEC3', fontSize: '0.8rem', marginTop: '4px' }}>
                  👆 {a.total_clicks} · 🛒 {a.total_conversions} · 💵 €{(a.total_earnings || 0).toFixed(2)} uždirbta
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  Komisija:
                  <input
                    type="number"
                    value={a.commission_rate}
                    onChange={e => handleUpdate(a.id, { ...a, commission_rate: e.target.value })}
                    style={{ width: '50px', marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E8ECF1', fontFamily: 'var(--font)' }}
                  />%
                </div>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={!!a.is_active}
                    onChange={e => handleUpdate(a.id, { ...a, is_active: e.target.checked ? 1 : 0 })}
                  />
                  Aktyvus
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// NEWSLETTER TAB
// ============================================
function NewsletterTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getNewsletterSubs().then(setData).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Pašalinti prenumeratorių?')) return
    try {
      await api.deleteSubscriber(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>
  if (!data) return <div style={styles.error}>❌ Klaida kraunant</div>

  const { subscribers, stats } = data

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>📬 Naujienlaiškio prenumeratoriai</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' }}>
          <span style={styles.statIcon}>📧</span>
          <span style={styles.statValue}>{stats.total || 0}</span>
          <span style={styles.statLabel}>Iš viso</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' }}>
          <span style={styles.statIcon}>✅</span>
          <span style={styles.statValue}>{stats.active || 0}</span>
          <span style={styles.statLabel}>Aktyvūs</span>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FF6B8A, #FFD166)' }}>
          <span style={styles.statIcon}>🚫</span>
          <span style={styles.statValue}>{stats.unsubscribed || 0}</span>
          <span style={styles.statLabel}>Atsisakę</span>
        </div>
      </div>

      {subscribers.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#636E72' }}>Dar nėra prenumeratorių</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {subscribers.map(s => (
            <div key={s.id} style={{ ...styles.userRow, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={styles.userAvatar}>{(s.name || s.email).charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <strong>{s.email}</strong>
                {s.name && <div style={{ color: '#636E72', fontSize: '0.85rem' }}>{s.name}</div>}
                <div style={{ fontSize: '0.75rem', color: '#B2BEC3', marginTop: '2px' }}>
                  📍 {s.source} · {new Date(s.subscribed_at).toLocaleDateString('lt-LT')}
                </div>
              </div>
              <span style={{ ...styles.badge, background: s.is_active ? '#06D6A0' : '#B2BEC3' }}>
                {s.is_active ? 'Aktyvus' : 'Atsisakęs'}
              </span>
              <button onClick={() => handleDelete(s.id)} style={styles.deleteBtn}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  adminBadge: {
    padding: '10px 20px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    color: 'white',
    fontWeight: 800,
    fontSize: '0.9rem',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #E8ECF1',
    paddingBottom: '0',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s',
    marginBottom: '-2px',
  },
  tabBtnActive: {
    color: '#6C63FF',
    borderBottomColor: '#6C63FF',
  },
  content: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    minHeight: '400px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '1.1rem',
    color: '#636E72',
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '1rem',
    color: '#FF6B8A',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  statCard: {
    padding: '28px',
    borderRadius: '16px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  statIcon: { fontSize: '2rem' },
  statValue: { fontSize: '2rem', fontWeight: 900, marginTop: '8px' },
  statLabel: { fontSize: '0.9rem', opacity: 0.9, fontWeight: 600 },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: '#F9FAFB',
    borderRadius: '10px',
  },
  orderStatus: {
    marginLeft: '12px',
    padding: '2px 10px',
    borderRadius: '20px',
    background: 'rgba(108, 99, 255, 0.1)',
    color: '#6C63FF',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    padding: '20px',
    border: '2px solid #E8ECF1',
    borderRadius: '14px',
    background: '#FAFBFF',
  },
  orderHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  orderCustomer: {
    fontSize: '0.9rem',
    color: '#636E72',
    marginBottom: '10px',
  },
  orderItems: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  orderItem: {
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'white',
    border: '1px solid #E8ECF1',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  orderActions: {
    display: 'flex',
    gap: '8px',
  },
  select: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '2px solid #E8ECF1',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'var(--font)',
    cursor: 'pointer',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: '#F9FAFB',
    borderRadius: '12px',
  },
  productEmoji: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  productActions: {
    display: 'flex',
    gap: '6px',
  },
  editBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(108, 99, 255, 0.1)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  deleteBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255, 107, 138, 0.1)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  courseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  courseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: '#F9FAFB',
    borderRadius: '12px',
  },
  lessonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#F9FAFB',
    borderRadius: '10px',
    border: '1px solid #E8ECF1',
  },
  lessonNum: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 800,
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: '#F9FAFB',
    borderRadius: '12px',
  },
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  adminTag: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 209, 102, 0.2)',
    color: '#FF6B35',
    fontSize: '0.7rem',
    fontWeight: 800,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modalForm: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  closeX: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#F5F5F5',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'var(--font)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
  },
  formLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#2D3436',
  },
  formInput: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    fontSize: '0.95rem',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  saveBtn: {
    padding: '12px 28px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
}
