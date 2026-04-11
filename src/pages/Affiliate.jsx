import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Affiliate({ user, onLogin }) {
  const [affiliate, setAffiliate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    api.getMyAffiliate()
      .then(setAffiliate)
      .catch(() => setAffiliate(null))
      .finally(() => setLoading(false))
  }, [user])

  const handleApply = async () => {
    setApplying(true)
    try {
      const result = await api.applyAffiliate()
      setAffiliate({ ...result, total_clicks: 0, total_conversions: 0, total_earnings: 0, total_sales: 0, commission_rate: 10, discount_for_buyer: 5, is_active: 1 })
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setApplying(false)
    }
  }

  const copyLink = (link) => {
    navigator.clipboard?.writeText(link)
    alert('✅ Nuoroda nukopijuota!')
  }

  if (!user) {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <span style={{ fontSize: '5rem' }}>🤝</span>
          <h1 style={{ marginTop: '16px', fontSize: '2.5rem' }}>Affiliate programa</h1>
          <p style={{ color: '#636E72', fontSize: '1.1rem', marginTop: '8px' }}>
            Tapkite partneriu ir uždirbkite komisinius už kiekvieną sėkmingą užsakymą!
          </p>
          <button onClick={onLogin} style={styles.cta}>
            🔑 Prisijunkite, kad pradėtumėte
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          ⏳ Kraunama...
        </div>
      </div>
    )
  }

  // Not yet affiliate - show apply page
  if (!affiliate) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '5rem' }}>🤝</span>
            <h1 style={{ fontSize: '2.5rem', marginTop: '16px' }}>Affiliate programa</h1>
            <p style={{ color: '#636E72', fontSize: '1.1rem', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
              Rekomenduokite MažųjųPasaulis draugams ir uždirbkite komisiją už kiekvieną pardavimą!
            </p>
          </div>

          <div style={styles.benefitGrid}>
            <div style={styles.benefit}>
              <div style={{ fontSize: '3rem' }}>💰</div>
              <h3 style={{ marginTop: '12px' }}>10% komisija</h3>
              <p style={{ color: '#636E72' }}>Nuo kiekvieno pardavimo per jūsų nuorodą</p>
            </div>
            <div style={styles.benefit}>
              <div style={{ fontSize: '3rem' }}>🎁</div>
              <h3 style={{ marginTop: '12px' }}>5% nuolaida klientams</h3>
              <p style={{ color: '#636E72' }}>Pirkėjai gauna nuolaidą naudojant jūsų nuorodą</p>
            </div>
            <div style={styles.benefit}>
              <div style={{ fontSize: '3rem' }}>📊</div>
              <h3 style={{ marginTop: '12px' }}>Statistika realiu laiku</h3>
              <p style={{ color: '#636E72' }}>Stebėkite paspaudimus, konversijas ir pajamas</p>
            </div>
            <div style={styles.benefit}>
              <div style={{ fontSize: '3rem' }}>🔗</div>
              <h3 style={{ marginTop: '12px' }}>Asmeninė nuoroda</h3>
              <p style={{ color: '#636E72' }}>Unikalus URL, kurį galite dalintis visur</p>
            </div>
          </div>

          <div style={styles.howItWorks}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>🚀 Kaip tai veikia?</h2>
            <div style={styles.steps}>
              <div style={styles.step}>
                <div style={styles.stepNum}>1</div>
                <h4>Užsiregistruokite</h4>
                <p>Paspauskite mygtuką žemiau ir gaukite savo nuorodą</p>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNum}>2</div>
                <h4>Dalinkitės</h4>
                <p>Siųskite nuorodą draugams, šeimai, socialiniuose tinkluose</p>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNum}>3</div>
                <h4>Uždirbkite</h4>
                <p>Gaukite komisiją už kiekvieną užsakymą per jūsų nuorodą</p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button onClick={handleApply} disabled={applying} style={styles.cta}>
              {applying ? '⏳ Kuriama...' : '✨ Tapti affiliate nemokamai'}
            </button>
            <p style={{ color: '#B2BEC3', fontSize: '0.85rem', marginTop: '12px' }}>
              Nėra jokių mokesčių · Galite atšaukti bet kada
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Already affiliate - show dashboard
  const conversionRate = affiliate.total_clicks > 0
    ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(1)
    : '0'

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem' }}>🤝 Affiliate skydelis</h1>
          <p style={{ color: '#636E72', marginTop: '8px' }}>
            Sveiki, <strong>{affiliate.name}</strong>! Jūsų affiliate statusas: {affiliate.is_active ? '✅ Aktyvus' : '⏸️ Nutrauktas'}
          </p>
        </div>

        {/* Stats cards */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' }}>
            <div style={{ fontSize: '2rem' }}>👆</div>
            <div style={styles.statValue}>{affiliate.total_clicks}</div>
            <div style={styles.statLabel}>Paspaudimai</div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FF6B35, #FFD166)' }}>
            <div style={{ fontSize: '2rem' }}>🛒</div>
            <div style={styles.statValue}>{affiliate.total_conversions}</div>
            <div style={styles.statLabel}>Pardavimai</div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' }}>
            <div style={{ fontSize: '2rem' }}>💵</div>
            <div style={styles.statValue}>€{(affiliate.total_earnings || 0).toFixed(2)}</div>
            <div style={styles.statLabel}>Uždirbta</div>
          </div>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)' }}>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <div style={styles.statValue}>{conversionRate}%</div>
            <div style={styles.statLabel}>Konversija</div>
          </div>
        </div>

        {/* Affiliate link */}
        <div style={styles.linkCard}>
          <h3 style={{ marginBottom: '16px' }}>🔗 Jūsų asmeninė nuoroda</h3>
          <div style={styles.linkBox}>
            <code style={styles.linkCode}>{affiliate.link}</code>
            <button onClick={() => copyLink(affiliate.link)} style={styles.copyBtn}>
              📋 Kopijuoti
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliate.link)}`}
               target="_blank" rel="noopener noreferrer" style={{ ...styles.shareBtn, background: '#1877F2' }}>
              📘 Facebook
            </a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(affiliate.link)}&text=${encodeURIComponent('Geriausi vaikų edukaciniai produktai Lietuvoje!')}`}
               target="_blank" rel="noopener noreferrer" style={{ ...styles.shareBtn, background: '#1DA1F2' }}>
              🐦 Twitter
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Patikrink MažųjųPasaulis - geriausi vaikų edukaciniai produktai: ${affiliate.link}`)}`}
               target="_blank" rel="noopener noreferrer" style={{ ...styles.shareBtn, background: '#25D366' }}>
              💬 WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent('MažųjųPasaulis')}&body=${encodeURIComponent(`Patikrink šią puikią vaikų edukacinę platformą: ${affiliate.link}`)}`}
               style={{ ...styles.shareBtn, background: '#EA4335' }}>
              📧 El. paštas
            </a>
          </div>
        </div>

        {/* Commission info */}
        <div style={styles.commissionInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2rem' }}>💰</span>
            <div style={{ flex: 1 }}>
              <strong>Jūsų komisijos sąlygos:</strong>
              <div style={{ color: '#636E72', fontSize: '0.9rem', marginTop: '4px' }}>
                {affiliate.commission_rate}% komisija jums · {affiliate.discount_for_buyer}% nuolaida pirkėjui · Viso parduota: €{(affiliate.total_sales || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Recent conversions */}
        {affiliate.conversions && affiliate.conversions.length > 0 && (
          <div style={styles.conversionsCard}>
            <h3 style={{ marginBottom: '16px' }}>📈 Paskutinės konversijos</h3>
            <div>
              {affiliate.conversions.map(c => (
                <div key={c.id} style={styles.convRow}>
                  <div>
                    <strong>Užsakymas #{c.order_id}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#636E72' }}>
                      {new Date(c.created_at).toLocaleString('lt-LT')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#06D6A0' }}>+€{c.commission.toFixed(2)}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#636E72' }}>
                      iš €{c.order_total.toFixed(2)}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: c.status === 'paid' ? '#06D6A0' : c.status === 'pending' ? '#FFD166' : '#B2BEC3',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}>
                    {c.status === 'paid' ? '✓ Apmokėta' : c.status === 'pending' ? '⏳ Laukia' : c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  cta: {
    padding: '18px 40px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginTop: '24px',
    boxShadow: '0 4px 20px rgba(108, 99, 255, 0.3)',
  },
  benefitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '48px',
  },
  benefit: {
    background: 'white',
    padding: '28px',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  howItWorks: {
    background: 'rgba(108, 99, 255, 0.04)',
    padding: '40px',
    borderRadius: '24px',
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  step: {
    textAlign: 'center',
    padding: '20px',
  },
  stepNum: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '24px',
    borderRadius: '20px',
    color: 'white',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 900,
    marginTop: '8px',
  },
  statLabel: {
    fontSize: '0.85rem',
    opacity: 0.9,
    fontWeight: 600,
  },
  linkCard: {
    background: 'white',
    padding: '32px',
    borderRadius: '20px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  linkBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#F9FAFB',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    flexWrap: 'wrap',
  },
  linkCode: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    color: '#6C63FF',
    fontWeight: 700,
    minWidth: '200px',
    wordBreak: 'break-all',
  },
  copyBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  shareBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    fontFamily: 'var(--font)',
  },
  commissionInfo: {
    padding: '20px 24px',
    background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.1), rgba(76, 201, 240, 0.1))',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '2px solid rgba(6, 214, 160, 0.2)',
  },
  conversionsCard: {
    background: 'white',
    padding: '32px',
    borderRadius: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  convRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px',
    background: '#F9FAFB',
    borderRadius: '10px',
    marginBottom: '8px',
    gap: '12px',
  },
}
