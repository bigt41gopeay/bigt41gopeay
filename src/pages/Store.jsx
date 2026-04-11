import { useState, useEffect } from 'react'
import { api } from '../api'
import Reviews from '../components/Reviews'

const STORE_CATEGORIES = [
  { id: 'all', label: 'Visi produktai', icon: '🏪' },
  { id: 'books', label: 'Knygos', icon: '📚' },
  { id: 'bundles', label: 'Rinkiniai', icon: '📦' },
  { id: 'physical', label: 'Fiziniai produktai', icon: '🧸' },
  { id: 'digital', label: 'PDF atsisiuntimui', icon: '📋' },
]

export default function Store({ cart, onAddToCart, onRemoveFromCart, user, onLogin }) {
  const [category, setCategory] = useState('all')
  const [showCart, setShowCart] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)
  const [shipping, setShipping] = useState({ name: '', address: '', city: '', zip: '', phone: '' })
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponChecking, setCouponChecking] = useState(false)

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
    fetch('/api/payments/config')
      .then(r => r.json())
      .then(d => setPaymentsEnabled(d.enabled))
      .catch(() => {})
  }, [])

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponChecking(true)
    setCouponError('')
    try {
      const result = await api.validateCoupon(couponCode, cartTotal)
      setCouponApplied(result)
      setCouponError('')
    } catch (err) {
      setCouponError(err.message)
      setCouponApplied(null)
    } finally {
      setCouponChecking(false)
    }
  }

  const removeCoupon = () => {
    setCouponApplied(null)
    setCouponCode('')
    setCouponError('')
  }

  const filtered = category === 'all'
    ? products
    : products.filter(i => i.category === category)

  const cartTotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0)

  const handleCheckout = async () => {
    if (!user) {
      onLogin?.()
      return
    }
    if (!shipping.name || !shipping.address) {
      setShowCheckout(true)
      return
    }
    setCheckingOut(true)
    try {
      const items = cart.map(c => ({ product_id: c.id, quantity: c.qty || 1 }))
      const order = await api.createOrder(items, shipping, couponApplied?.code)

      if (paymentsEnabled) {
        const token = localStorage.getItem('mazuju_token')
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ order_id: order.id }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }

      alert(`✅ Užsakymas #${order.id} pateiktas! Susisieksime su jumis el. paštu.`)
      cart.forEach((_, i) => onRemoveFromCart(0))
      setShowCheckout(false)
      setShowCart(false)
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setCheckingOut(false)
    }
  }

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
                {/* Coupon input */}
                <div style={styles.couponSection}>
                  {couponApplied ? (
                    <div style={styles.couponApplied}>
                      <div>
                        <strong>🎉 {couponApplied.code}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#06D6A0', marginTop: '2px' }}>
                          {couponApplied.description} · -€{couponApplied.discount_amount.toFixed(2)}
                        </div>
                      </div>
                      <button onClick={removeCoupon} style={styles.couponRemove}>✕</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="🎯 Nuolaidos kodas"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          style={styles.couponInput}
                        />
                        <button onClick={applyCoupon} disabled={couponChecking || !couponCode} style={styles.couponBtn}>
                          {couponChecking ? '⏳' : 'Taikyti'}
                        </button>
                      </div>
                      {couponError && (
                        <div style={{ color: '#FF6B8A', fontSize: '0.8rem', marginTop: '6px', fontWeight: 700 }}>
                          ❌ {couponError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {couponApplied && (
                  <div style={styles.cartRow}>
                    <span>Tarpinė suma:</span>
                    <span>€{cartTotal.toFixed(2)}</span>
                  </div>
                )}
                {couponApplied && (
                  <div style={{ ...styles.cartRow, color: '#06D6A0' }}>
                    <span>Nuolaida ({couponApplied.code}):</span>
                    <strong>-€{couponApplied.discount_amount.toFixed(2)}</strong>
                  </div>
                )}
                <div style={styles.cartTotal}>
                  <span>Viso:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6C63FF' }}>
                    €{Math.max(0, cartTotal - (couponApplied?.discount_amount || 0)).toFixed(2)}
                  </span>
                </div>

                {showCheckout && (
                  <div style={{ marginTop: '16px', padding: '20px', background: '#F9FAFB', borderRadius: '12px' }}>
                    <h4 style={{ marginBottom: '12px' }}>📦 Pristatymo duomenys</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input type="text" placeholder="Vardas Pavardė *" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #E8ECF1', fontFamily: 'var(--font)' }} />
                      <input type="tel" placeholder="Telefonas" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #E8ECF1', fontFamily: 'var(--font)' }} />
                      <input type="text" placeholder="Adresas *" value={shipping.address} onChange={e => setShipping({...shipping, address: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #E8ECF1', fontFamily: 'var(--font)', gridColumn: '1 / -1' }} />
                      <input type="text" placeholder="Miestas" value={shipping.city} onChange={e => setShipping({...shipping, city: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #E8ECF1', fontFamily: 'var(--font)' }} />
                      <input type="text" placeholder="Pašto kodas" value={shipping.zip} onChange={e => setShipping({...shipping, zip: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #E8ECF1', fontFamily: 'var(--font)' }} />
                    </div>
                  </div>
                )}

                <button onClick={handleCheckout} disabled={checkingOut} style={styles.checkoutBtn}>
                  {checkingOut ? '⏳ Palaukite...' : !user ? '🔑 Prisijunkite apmokėjimui' : paymentsEnabled ? '💳 Apmokėti su Stripe' : '📧 Patvirtinti užsakymą'}
                </button>
                {!paymentsEnabled && user && (
                  <p style={{ fontSize: '0.8rem', color: '#636E72', textAlign: 'center', marginTop: '8px' }}>
                    💡 Susisieksime su jumis dėl apmokėjimo pavedimu
                  </p>
                )}
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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '2rem' }}>⏳</span>
            <p style={{ color: '#636E72', marginTop: '12px' }}>Kraunami produktai...</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && (
          <div className="grid-3">
            {filtered.map(item => (
              <div key={item.id} className="card" style={styles.productCard}>
                <div
                  style={{ ...styles.productCover, background: item.bg, backgroundImage: item.image_url ? `url(${item.image_url})` : item.bg, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}
                  onClick={() => setSelectedProduct(item)}
                >
                  {!item.image_url && <span style={{ fontSize: '3.5rem' }}>{item.emoji}</span>}
                  {item.badge && <span style={styles.productBadge}>{item.badge}</span>}
                  {!item.image_url && <span style={styles.productType}>{item.type === 'digital' ? '📋 Skaitmeninis' : '🧸 Fizinis'}</span>}
                </div>
                <div style={styles.productInfo}>
                  <h4 style={{ cursor: 'pointer' }} onClick={() => setSelectedProduct(item)}>{item.title}</h4>
                  <p style={styles.productDesc}>{item.description || item.desc}</p>
                  <div style={styles.productFooter}>
                    <div style={styles.priceBlock}>
                      <span style={styles.currentPrice}>€{item.price.toFixed(2)}</span>
                      {(item.original_price || item.originalPrice) && (
                        <span style={styles.originalPrice}>€{(item.original_price || item.originalPrice).toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => onAddToCart({ ...item, desc: item.description || item.desc })}
                      style={styles.addBtn}
                    >
                      🛒 Pirkti
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Details Modal with Reviews */}
        {selectedProduct && (
          <div style={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedProduct(null)} style={styles.modalClose}>✕</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{
                  height: '300px',
                  borderRadius: '16px',
                  background: selectedProduct.image_url ? `url(${selectedProduct.image_url}) center/cover` : selectedProduct.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {!selectedProduct.image_url && <span style={{ fontSize: '6rem' }}>{selectedProduct.emoji}</span>}
                </div>
                <div>
                  <h2>{selectedProduct.title}</h2>
                  {selectedProduct.badge && (
                    <span style={{ ...styles.productBadge, position: 'static', display: 'inline-block', marginTop: '8px' }}>
                      {selectedProduct.badge}
                    </span>
                  )}
                  <p style={{ color: '#636E72', marginTop: '16px', lineHeight: 1.6 }}>
                    {selectedProduct.description || selectedProduct.desc}
                  </p>
                  <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ ...styles.currentPrice, fontSize: '2rem' }}>€{selectedProduct.price.toFixed(2)}</span>
                    {(selectedProduct.original_price || selectedProduct.originalPrice) && (
                      <span style={{ ...styles.originalPrice, fontSize: '1.1rem' }}>
                        €{(selectedProduct.original_price || selectedProduct.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onAddToCart({ ...selectedProduct, desc: selectedProduct.description || selectedProduct.desc })
                      setSelectedProduct(null)
                    }}
                    style={{ ...styles.addBtn, marginTop: '24px', padding: '16px 32px', fontSize: '1.05rem', width: '100%' }}
                  >
                    🛒 Pridėti į krepšelį
                  </button>
                </div>
              </div>
              <Reviews productId={selectedProduct.id} user={user} onLogin={onLogin} />
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '3rem' }}>📭</span>
            <h3 style={{ marginTop: '12px' }}>Produktų šioje kategorijoje nėra</h3>
          </div>
        )}

        {/* Promo Banner */}
        <div style={styles.promo}>
          <div style={styles.promoContent}>
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <div>
              <h3 style={{ color: 'white' }}>Atidarymo akcija!</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>
                Naudokite kodą <strong>STARTAS2026</strong> ir gaukite <strong>20% nuolaidą</strong> bet kuriam rinkiniui! Galioja pirmiesiems 100 pirkėjų.
              </p>
            </div>
          </div>
        </div>

        {/* PDF Info */}
        <div style={styles.pdfInfo}>
          <div style={styles.pdfInfoContent}>
            <h3>📋 Kaip veikia PDF produktai?</h3>
            <div style={styles.pdfSteps}>
              <div style={styles.pdfStep}>
                <span style={styles.pdfStepNum}>1</span>
                <p>Nusipirkite ir atsisiųskite PDF failą</p>
              </div>
              <div style={styles.pdfStep}>
                <span style={styles.pdfStepNum}>2</span>
                <p>Atspausdinkite namų spausdintuvu</p>
              </div>
              <div style={styles.pdfStep}>
                <span style={styles.pdfStepNum}>3</span>
                <p>Naudokite su vaiku ir mokykitės kartu!</p>
              </div>
            </div>
            <p style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '12px' }}>
              Pirkite vieną kartą – spausdinkite kiek norite! Idealus sprendimas taupantiems tėvams.
            </p>
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
    borderTop: '2px solid #E8ECF1',
    marginTop: '8px',
  },
  cartRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '0.9rem',
    color: '#636E72',
  },
  couponSection: {
    marginTop: '16px',
    padding: '14px',
    background: '#F9FAFB',
    borderRadius: '12px',
  },
  couponInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    fontSize: '0.9rem',
    fontWeight: 700,
    fontFamily: 'var(--font)',
    textTransform: 'uppercase',
    outline: 'none',
  },
  couponBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    color: 'white',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    whiteSpace: 'nowrap',
  },
  couponApplied: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(6, 214, 160, 0.1)',
    border: '2px solid #06D6A0',
    borderRadius: '10px',
  },
  couponRemove: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'white',
    border: '2px solid #06D6A0',
    color: '#06D6A0',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#F5F5F5',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    fontWeight: 800,
    zIndex: 1,
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
  pdfInfo: {
    marginTop: '32px',
    padding: '32px',
    borderRadius: '20px',
    background: 'rgba(108, 99, 255, 0.04)',
    border: '2px solid rgba(108, 99, 255, 0.1)',
  },
  pdfInfoContent: {
    textAlign: 'center',
  },
  pdfSteps: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  pdfStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '180px',
  },
  pdfStepNum: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1.1rem',
  },
}
