import { useState } from 'react'

const STORE_ITEMS = [
  { id: 101, emoji: '📦', title: 'Pradinukas rinkinys', desc: '5 knygos + 3 žaidimai pradedantiems. Puikus startas!', price: 39.99, originalPrice: 59.99, category: 'bundle', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', badge: '-33%', type: 'Rinkinys' },
  { id: 102, emoji: '🎁', title: 'Drąsos rinkinys', desc: '8 knygos apie pasitikėjimą savimi + veiklos kortelės.', price: 54.99, originalPrice: 79.99, category: 'bundle', bg: 'linear-gradient(135deg, #FF6B8A, #FF6B35)', badge: 'Bestseleris', type: 'Rinkinys' },
  { id: 103, emoji: '🌟', title: 'Viskas viename MEGA', desc: 'Visos knygos + visi žaidimai + narystė 1 metams!', price: 89.99, originalPrice: 149.99, category: 'bundle', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', badge: '-40%', type: 'Mega rinkinys' },
  { id: 104, emoji: '🃏', title: 'Atminties kortelės', desc: '48 spalvingos kortelės su gyvūnais ir daiktais.', price: 14.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', badge: 'Naujiena', type: 'Fizinis produktas' },
  { id: 105, emoji: '🧩', title: 'Dėlionių rinkinys', desc: '6 edukacinės dėlionės skirtingų sunkumų.', price: 24.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #4CC9F0, #6C63FF)', badge: '', type: 'Fizinis produktas' },
  { id: 106, emoji: '🎲', title: 'Stalo žaidimas "Mokslininkai"', desc: 'Šeimyninis stalo žaidimas, skatinantis smalsumą.', price: 29.99, originalPrice: 34.99, category: 'physical', bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)', badge: 'Populiarus', type: 'Stalo žaidimas' },
  { id: 107, emoji: '📱', title: 'Programėlė Premium (1 m.)', desc: 'Pilna prieiga prie visų žaidimų ir knygų mobiliajame.', price: 29.99, originalPrice: 47.88, category: 'digital', bg: 'linear-gradient(135deg, #2D3436, #6C63FF)', badge: 'Geriausias pasiūlymas', type: 'Skaitmeninis' },
  { id: 108, emoji: '🎨', title: 'Piešimo rinkinys', desc: 'Spalvinimo knyga + 24 flomasteriai + piešimo pamokos.', price: 19.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #FFD166, #06D6A0)', badge: '', type: 'Kūrybinis rinkinys' },
]

const STORE_CATEGORIES = [
  { id: 'all', label: 'Visi produktai', icon: '🏪' },
  { id: 'bundle', label: 'Rinkiniai', icon: '📦' },
  { id: 'physical', label: 'Fiziniai', icon: '🧩' },
  { id: 'digital', label: 'Skaitmeniniai', icon: '📱' },
]

export default function Store({ cart, onAddToCart, onRemoveFromCart }) {
  const [category, setCategory] = useState('all')
  const [showCart, setShowCart] = useState(false)

  const filtered = category === 'all'
    ? STORE_ITEMS
    : STORE_ITEMS.filter(i => i.category === category)

  const cartTotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0)

  return (
    <div className="section">
      <div className="container">
        <div style={styles.header}>
          <div>
            <h1 style={{ fontSize: '2.5rem' }}>🛒 Parduotuvė</h1>
            <p style={{ color: '#636E72', marginTop: '8px', fontSize: '1.1rem' }}>
              Rinkiniai, žaidimai ir edukacinės priemonės jūsų vaikams
            </p>
          </div>
          <button onClick={() => setShowCart(!showCart)} style={styles.cartBtn}>
            🛒 Krepšelis
            {cart.length > 0 && <span style={styles.cartCount}>{cart.length}</span>}
          </button>
        </div>

        {/* Cart Panel */}
        {showCart && (
          <div style={styles.cartPanel}>
            <h3 style={{ marginBottom: '16px' }}>🛒 Jūsų krepšelis</h3>
            {cart.length === 0 ? (
              <p style={{ color: '#636E72', textAlign: 'center', padding: '32px 0' }}>
                Krepšelis tuščias. Pridėkite produktų! 🛍️
              </p>
            ) : (
              <>
                {cart.map((item, idx) => (
                  <div key={idx} style={styles.cartItem}>
                    <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <strong>{item.title}</strong>
                      <span style={{ display: 'block', color: '#6C63FF', fontWeight: 800 }}>
                        €{item.price.toFixed(2)}
                      </span>
                    </div>
                    <button onClick={() => onRemoveFromCart(idx)} style={styles.removeBtn}>✕</button>
                  </div>
                ))}
                <div style={styles.cartTotal}>
                  <span>Viso:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6C63FF' }}>
                    €{cartTotal.toFixed(2)}
                  </span>
                </div>
                <button style={styles.checkoutBtn}>
                  💳 Apmokėti
                </button>
              </>
            )}
          </div>
        )}

        {/* Categories */}
        <div style={styles.categories}>
          {STORE_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                ...styles.catBtn,
                ...(category === c.id ? styles.catBtnActive : {}),
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid-3">
          {filtered.map(item => (
            <div key={item.id} className="card" style={styles.productCard}>
              <div style={{ ...styles.productCover, background: item.bg }}>
                <span style={{ fontSize: '3.5rem' }}>{item.emoji}</span>
                {item.badge && <span style={styles.productBadge}>{item.badge}</span>}
                <span style={styles.productType}>{item.type}</span>
              </div>
              <div style={styles.productInfo}>
                <h4>{item.title}</h4>
                <p style={styles.productDesc}>{item.desc}</p>
                <div style={styles.productFooter}>
                  <div style={styles.priceBlock}>
                    <span style={styles.currentPrice}>€{item.price.toFixed(2)}</span>
                    {item.originalPrice && (
                      <span style={styles.originalPrice}>€{item.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onAddToCart(item)}
                    style={styles.addBtn}
                  >
                    🛒 Pirkti
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Promo Banner */}
        <div style={styles.promo}>
          <div style={styles.promoContent}>
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <div>
              <h3 style={{ color: 'white' }}>Specialus pasiūlymas!</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>
                Naudokite kodą <strong>MOKYMASIS2026</strong> ir gaukite 15% nuolaidą bet kuriam rinkiniui!
              </p>
            </div>
          </div>
        </div>
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
  cartBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '14px',
    border: '2px solid #6C63FF',
    background: 'white',
    fontSize: '1rem',
    fontWeight: 800,
    color: '#6C63FF',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    position: 'relative',
  },
  cartCount: {
    background: '#FF6B35',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 800,
  },
  cartPanel: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '2px solid #E8ECF1',
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 0',
    borderBottom: '1px solid #E8ECF1',
  },
  removeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    background: '#FFF0F0',
    color: '#FF6B8A',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font)',
    fontWeight: 800,
  },
  cartTotal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  checkoutBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.05rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
  },
  categories: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  catBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  catBtnActive: {
    background: '#6C63FF',
    color: 'white',
    borderColor: '#6C63FF',
  },
  productCard: {
    borderRadius: '20px',
    overflow: 'hidden',
  },
  productCover: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: '12px',
  },
  productBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.95)',
    fontSize: '0.8rem',
    fontWeight: 800,
    color: '#2D3436',
  },
  productType: {
    color: 'white',
    fontWeight: 700,
    fontSize: '0.8rem',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.2)',
  },
  productInfo: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  productDesc: {
    color: '#636E72',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  productFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #E8ECF1',
  },
  priceBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  currentPrice: {
    fontSize: '1.3rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  originalPrice: {
    fontSize: '0.9rem',
    color: '#B2BEC3',
    textDecoration: 'line-through',
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  promo: {
    marginTop: '48px',
    padding: '32px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #FF6B35, #FFD166)',
    boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
  },
  promoContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
}
