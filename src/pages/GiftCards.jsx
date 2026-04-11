import { useState, useEffect } from 'react'
import { api } from '../api'

const PRESET_AMOUNTS = [10, 20, 30, 50, 100]

export default function GiftCards({ user, onLogin }) {
  const [amount, setAmount] = useState(20)
  const [customAmount, setCustomAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchased, setPurchased] = useState(null)
  const [myCards, setMyCards] = useState([])
  const [showMine, setShowMine] = useState(false)

  useEffect(() => {
    if (user) {
      api.getMyGiftCards().then(setMyCards).catch(() => {})
    }
  }, [user])

  const handlePurchase = async (e) => {
    e.preventDefault()
    if (!user) return onLogin?.()
    const finalAmount = customAmount ? parseFloat(customAmount) : amount
    if (!finalAmount || finalAmount < 5) {
      alert('Minimali suma: €5')
      return
    }
    setPurchasing(true)
    try {
      const result = await api.purchaseGiftCard({
        amount: finalAmount,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        message,
      })
      setPurchased(result)
      // Refresh my cards
      if (user) api.getMyGiftCards().then(setMyCards).catch(() => {})
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setPurchasing(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
    alert('✅ Kodas nukopijuotas!')
  }

  if (purchased) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: '600px' }}>
          <div style={styles.success}>
            <div style={{ fontSize: '5rem' }}>🎁</div>
            <h1 style={{ marginTop: '16px' }}>Dovanų kortelė sukurta!</h1>
            <p style={{ color: '#636E72', marginTop: '8px' }}>
              Sukurta €{purchased.amount.toFixed(2)} vertės dovanų kortelė
            </p>

            <div style={styles.cardPreview}>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>MažųjųPasaulis</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0' }}>€{purchased.amount.toFixed(2)}</div>
              <div style={styles.cardCode}>{purchased.code}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '12px' }}>
                Galioja iki: {new Date(purchased.expires_at).toLocaleDateString('lt-LT')}
              </div>
            </div>

            <button onClick={() => copyCode(purchased.code)} style={styles.copyBtn}>
              📋 Kopijuoti kodą
            </button>

            {recipientEmail && (
              <p style={{ color: '#06D6A0', marginTop: '16px', fontSize: '0.9rem', fontWeight: 700 }}>
                ✉️ Kodas taip pat išsiųstas el. paštu: {recipientEmail}
              </p>
            )}

            <button onClick={() => { setPurchased(null); setCustomAmount(''); setRecipientName(''); setRecipientEmail(''); setMessage('') }} style={styles.newBtn}>
              ➕ Sukurti dar vieną
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '4rem' }}>🎁</span>
          <h1 style={{ fontSize: '2.5rem', marginTop: '12px' }}>Dovanų kortelės</h1>
          <p style={{ color: '#636E72', fontSize: '1.1rem', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Puiki dovana draugams, šeimai ar vaikams! Gavėjas galės pats pasirinkti,
            ką nori įsigyti MažųjųPasaulis.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: user ? '2fr 1fr' : '1fr', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
          {/* Purchase form */}
          <form onSubmit={handlePurchase} style={styles.form}>
            <h2 style={{ marginBottom: '24px' }}>✨ Sukurti dovanų kortelę</h2>

            <div style={styles.field}>
              <label style={styles.label}>💰 Pasirinkite sumą</label>
              <div style={styles.amounts}>
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(a); setCustomAmount('') }}
                    style={{
                      ...styles.amountBtn,
                      ...(amount === a && !customAmount ? styles.amountBtnActive : {}),
                    }}
                  >
                    €{a}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="5"
                max="500"
                step="0.01"
                placeholder="Arba įveskite savo sumą (€5 - €500)"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                style={{ ...styles.input, marginTop: '12px' }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>👤 Gavėjo vardas (neprivaloma)</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="pvz. Onutė"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>📧 Gavėjo el. paštas (neprivaloma)</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="onute@example.com"
                style={styles.input}
              />
              <p style={styles.hint}>
                💡 Jei įvesite – automatiškai išsiųsime dovanų kortelę gavėjui
              </p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>💌 Asmeninė žinutė (neprivaloma)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="pvz. Su gimtadieniu! Tikiuosi, kad šios knygos atneš daug džiaugsmo!"
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                maxLength={300}
              />
            </div>

            {/* Card preview */}
            <div style={styles.cardPreview}>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>MažųjųPasaulis</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0' }}>
                €{(customAmount ? parseFloat(customAmount) || 0 : amount).toFixed(2)}
              </div>
              <div style={styles.cardCode}>GIFT-XXXX-XXXX-XXXX</div>
              {recipientName && <div style={{ marginTop: '12px', fontSize: '0.9rem' }}>Dovana: {recipientName}</div>}
            </div>

            <button type="submit" disabled={purchasing} style={styles.submitBtn}>
              {purchasing ? '⏳ Kuriama...' : user ? `🎁 Pirkti už €${(customAmount ? parseFloat(customAmount) || 0 : amount).toFixed(2)}` : '🔑 Prisijunkite, kad galėtumėte pirkti'}
            </button>
          </form>

          {/* My gift cards sidebar */}
          {user && (
            <div style={styles.sidebar}>
              <h3 style={{ marginBottom: '16px' }}>🎫 Mano dovanų kortelės</h3>
              {myCards.length === 0 ? (
                <p style={{ color: '#636E72', fontSize: '0.9rem', padding: '16px', textAlign: 'center' }}>
                  Dar nesukūrėte nei vienos kortelės
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myCards.map(c => (
                    <div key={c.id} style={styles.myCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#6C63FF', fontSize: '1.1rem' }}>€{c.balance.toFixed(2)}</strong>
                          <span style={{ color: '#B2BEC3', fontSize: '0.8rem', marginLeft: '6px' }}>
                            / €{c.initial_amount.toFixed(2)}
                          </span>
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: c.balance > 0 ? '#06D6A0' : '#B2BEC3',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}>
                          {c.balance > 0 ? 'Aktyvus' : 'Išnaudotas'}
                        </span>
                      </div>
                      <div
                        onClick={() => copyCode(c.code)}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: '#636E72',
                          marginTop: '6px',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          background: '#F9FAFB',
                        }}
                      >
                        📋 {c.code}
                      </div>
                      {c.recipient_name && (
                        <div style={{ fontSize: '0.75rem', color: '#636E72', marginTop: '4px' }}>
                          🎁 {c.recipient_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info section */}
        <div style={styles.info}>
          <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>💡 Kaip tai veikia?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { icon: '💰', title: '1. Pasirinkite sumą', desc: '€5 - €500' },
              { icon: '💌', title: '2. Palikite žinutę', desc: 'Asmeninis tekstas gavėjui' },
              { icon: '📧', title: '3. Automatinis siuntimas', desc: 'El. paštu gavėjui' },
              { icon: '🎁', title: '4. Galioja 1 metus', desc: 'Nuo pirkimo datos' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
                <h4 style={{ marginTop: '8px' }}>{item.title}</h4>
                <p style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '4px' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  form: {
    background: 'white',
    padding: '32px',
    borderRadius: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#2D3436',
    marginBottom: '8px',
  },
  amounts: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  amountBtn: {
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s',
  },
  amountBtnActive: {
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    color: 'white',
    borderColor: '#FF6B35',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    fontSize: '0.95rem',
    fontFamily: 'var(--font)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '0.8rem',
    color: '#B2BEC3',
    marginTop: '6px',
  },
  cardPreview: {
    padding: '24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #FFD166 0%, #FF6B35 100%)',
    color: 'white',
    textAlign: 'center',
    margin: '20px 0',
    boxShadow: '0 8px 30px rgba(255, 107, 53, 0.3)',
  },
  cardCode: {
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    letterSpacing: '2px',
    padding: '8px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  submitBtn: {
    width: '100%',
    padding: '18px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    color: 'white',
    border: 'none',
    fontSize: '1.05rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
  },
  sidebar: {
    background: 'white',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    height: 'fit-content',
  },
  myCard: {
    padding: '14px',
    background: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E8ECF1',
  },
  success: {
    background: 'white',
    padding: '48px',
    borderRadius: '24px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  copyBtn: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: '#F5F5F5',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginTop: '16px',
  },
  newBtn: {
    display: 'block',
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginTop: '24px',
  },
  info: {
    marginTop: '64px',
    padding: '40px',
    background: 'rgba(255, 209, 102, 0.08)',
    borderRadius: '24px',
  },
}
