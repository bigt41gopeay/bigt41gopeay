import { useState } from 'react'

const STORE_ITEMS = [
  // === RINKINIAI ===
  { id: 101, emoji: '📦', title: 'Starto rinkinys "Drąsus vaikas"', desc: '2 spausdintos knygos (Drąsusis liūtukas + Aš galiu viską!) + Emocijų kortelių rinkinys. Puikus startas!', price: 29.99, originalPrice: 37.97, category: 'bundle', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', badge: '-21%', type: 'Rinkinys' },
  { id: 102, emoji: '🎁', title: 'ADHD draugiškas rinkinys', desc: '2 knygos + ramybės kortelės + vizualus laikmatis (PDF) + sensorinis fidget žaislas.', price: 34.99, originalPrice: 49.99, category: 'bundle', bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)', badge: 'ADHD', type: 'Rinkinys' },
  { id: 103, emoji: '🌟', title: 'Viskas viename MEGA', desc: '2 knygos + emocijų kortelės + spalvinimo rinkinys (PDF) + dienotvarkės lenta + apdovanojimų lipdukai.', price: 44.99, originalPrice: 69.99, category: 'bundle', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', badge: '-36%', type: 'Mega rinkinys' },

  // === FIZINIAI PRODUKTAI ===
  { id: 104, emoji: '😊', title: 'Emocijų kortelių rinkinys', desc: '36 spalvingos kortelės su emocijomis lietuvių kalba. Padeda vaikams atpažinti ir įvardinti jausmus. Tinka ADHD.', price: 14.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)', badge: 'Bestseleris', type: 'Edukacinės kortelės' },
  { id: 105, emoji: '⭐', title: 'Pasiekimų lipdukai (200 vnt.)', desc: 'Motyvuojantys lipdukai: žvaigždutės, medaliai, šypsenėlės. Už gerus darbus, mokymąsi, tvarką.', price: 7.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', badge: 'Mažiausia kaina', type: 'Lipdukai' },
  { id: 106, emoji: '🧸', title: 'Sensorinis fidget žaislas', desc: 'Tylus, spalvingas sensorinis žaislas, padedantis vaikams susikaupti. Idealus mokyklai ir namams. Tinka ADHD.', price: 9.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', badge: 'ADHD draugiškas', type: 'Sensorinis žaislas' },
  { id: 107, emoji: '⏱️', title: 'Vizualus laikmatis vaikams', desc: 'Spalvotas smėlio tipo laikmatis (15 min.). Padeda suprasti laiko tėkmę, planuoti užduotis. Būtinas ADHD.', price: 12.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)', badge: 'ADHD būtinas', type: 'Mokymosi priemonė' },
  { id: 108, emoji: '🧲', title: 'Dienotvarkės magnetinė lenta', desc: 'Magnetinė lenta su 40 magnetukų: rytas, mokykla, namų darbai, žaidimas, miegas. Vizuali struktūra dienai.', price: 19.99, originalPrice: null, category: 'physical', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)', badge: 'Naujiena', type: 'Organizavimo priemonė' },

  // === SKAITMENINIAI PRODUKTAI (PDF) ===
  { id: 109, emoji: '📋', title: 'Darbo kortelės: raidės ir skaičiai (PDF)', desc: '60 spausdinamų darbo lapų: raidžių rašymas, skaičiavimas, spalvinimas. Atsisiųskite ir spausdinkite!', price: 6.99, originalPrice: null, category: 'digital', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)', badge: 'PDF', type: 'Spausdinamas PDF' },
  { id: 110, emoji: '🎨', title: 'Spalvinimo puslapiai: emocijos (PDF)', desc: '30 unikalių spalvinimo puslapių, kiekvienas susietas su emocija. Terapinė veikla vaikams.', price: 4.99, originalPrice: null, category: 'digital', bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)', badge: 'PDF', type: 'Spausdinamas PDF' },
  { id: 111, emoji: '📅', title: 'Vaiko dienotvarkė / rutinos planas (PDF)', desc: 'Spausdinama vizuali dienotvarkė su paveikslėliais. Rytas-vakaras struktūra. Ypač naudinga ADHD vaikams.', price: 3.99, originalPrice: null, category: 'digital', bg: 'linear-gradient(135deg, #06D6A0, #FFD166)', badge: 'ADHD', type: 'Spausdinamas PDF' },
  { id: 112, emoji: '🏆', title: 'Elgesio žvaigždučių lentelė (PDF)', desc: 'Spausdinama motyvacijos lentelė su lipdukai. Teigiamo elgesio skatinimas per žvaigždučių rinkimą.', price: 3.99, originalPrice: null, category: 'digital', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', badge: 'PDF', type: 'Spausdinamas PDF' },
  { id: 113, emoji: '🧘', title: 'Ramybės pratimai vaikams (PDF)', desc: '20 iliustruotų ramybės ir kvėpavimo pratimų kortelių. Spausdink, kirpk ir naudok kasdien.', price: 5.99, originalPrice: null, category: 'digital', bg: 'linear-gradient(135deg, #9B5DE5, #4CC9F0)', badge: 'Mindfulness', type: 'Spausdinamas PDF' },
]

const STORE_CATEGORIES = [
  { id: 'all', label: 'Visi produktai', icon: '🏪' },
  { id: 'bundle', label: 'Rinkiniai', icon: '📦' },
  { id: 'physical', label: 'Fiziniai produktai', icon: '🧸' },
  { id: 'digital', label: 'PDF atsisiuntimui', icon: '📋' },
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
