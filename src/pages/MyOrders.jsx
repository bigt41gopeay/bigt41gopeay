import { useState, useEffect } from 'react'
import { api } from '../api'

const STATUS_LABELS = {
  pending: { label: 'Laukia apmokėjimo', icon: '⏳', color: '#FFD166' },
  processing: { label: 'Ruošiamas', icon: '📦', color: '#6C63FF' },
  shipped: { label: 'Išsiųstas', icon: '🚚', color: '#4CC9F0' },
  delivered: { label: 'Pristatytas', icon: '✅', color: '#06D6A0' },
  cancelled: { label: 'Atšauktas', icon: '❌', color: '#FF6B8A' },
}

export default function MyOrders({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    api.getOrders()
      .then(setOrders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <span style={{ fontSize: '4rem' }}>🔐</span>
          <h2 style={{ marginTop: '16px' }}>Prisijunkite</h2>
          <p style={{ color: '#636E72', marginTop: '8px' }}>
            Norėdami peržiūrėti užsakymus, prisijunkite prie paskyros.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem' }}>📦 Mano užsakymai</h1>
          <p style={{ color: '#636E72', marginTop: '8px' }}>
            Peržiūrėkite savo užsakymų istoriją ir statusą
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <span style={{ fontSize: '2rem' }}>⏳</span>
            <p style={{ color: '#636E72', marginTop: '12px' }}>Kraunami užsakymai...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', background: 'rgba(255, 107, 138, 0.1)', color: '#FF6B8A', borderRadius: '12px', fontWeight: 700 }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '4rem' }}>🛒</span>
            <h3 style={{ marginTop: '16px' }}>Dar neturite užsakymų</h3>
            <p style={{ color: '#636E72', marginTop: '8px', marginBottom: '20px' }}>
              Apsilankykite mūsų parduotuvėje ir įsigykite produktų!
            </p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(order => {
              const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending
              return (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem' }}>Užsakymas #{order.id}</h3>
                      <p style={{ color: '#636E72', fontSize: '0.85rem', marginTop: '4px' }}>
                        📅 {new Date(order.created_at).toLocaleString('lt-LT')}
                      </p>
                    </div>
                    <span style={{ ...styles.statusBadge, background: status.color }}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  <div style={styles.itemsList}>
                    {order.items && order.items.map(item => (
                      <div key={item.id} style={styles.orderItem}>
                        <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <strong>{item.title}</strong>
                          <span style={{ color: '#636E72', fontSize: '0.85rem', marginLeft: '8px' }}>
                            × {item.quantity}
                          </span>
                        </div>
                        <strong style={{ color: '#6C63FF' }}>€{(item.price * item.quantity).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  {order.shipping_address && (
                    <div style={styles.shipping}>
                      📍 <strong>Pristatymas:</strong> {order.shipping_name}, {order.shipping_address}
                      {order.shipping_city && `, ${order.shipping_city}`}
                      {order.shipping_zip && ` ${order.shipping_zip}`}
                    </div>
                  )}

                  <div style={styles.orderFooter}>
                    <span style={{ color: '#636E72', fontSize: '0.9rem' }}>Iš viso:</span>
                    <span style={styles.total}>€{order.total.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  orderCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    border: '2px solid #E8ECF1',
  },
  orderHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #F5F5F5',
    flexWrap: 'wrap',
    gap: '12px',
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  orderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#F9FAFB',
    borderRadius: '10px',
  },
  shipping: {
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(108, 99, 255, 0.05)',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#636E72',
  },
  orderFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '2px solid #F5F5F5',
  },
  total: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
}
