import { useState, useEffect } from 'react'
import { api } from '../api'

const TABS = [
  { id: 'stats', label: 'Statistika', icon: '📊' },
  { id: 'orders', label: 'Užsakymai', icon: '📦' },
  { id: 'products', label: 'Produktai', icon: '🛒' },
  { id: 'courses', label: 'Kursai', icon: '🎓' },
  { id: 'users', label: 'Vartotojai', icon: '👥' },
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
// COURSES TAB
// ============================================
function CoursesTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loading}>⏳ Kraunama...</div>

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>🎓 Kursai ({courses.length})</h3>
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
          </div>
        ))}
      </div>
      <p style={{ marginTop: '20px', padding: '16px', background: 'rgba(108, 99, 255, 0.05)', borderRadius: '12px', fontSize: '0.9rem' }}>
        💡 <strong>Kursų turinio redagavimas</strong> kol kas vykdomas tiesiogiai per duomenų bazę ar API. Galutinis pamokų redaktorius bus pridėtas greitai.
      </p>
    </div>
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
