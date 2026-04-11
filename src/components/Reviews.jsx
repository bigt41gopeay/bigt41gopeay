import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Reviews({ productId, user, onLogin }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 5, title: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    api.getReviews(productId)
      .then(setData)
      .catch(() => setData({ reviews: [], stats: { count: 0, avg_rating: 0 } }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [productId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      onLogin?.()
      return
    }
    setSubmitting(true)
    try {
      await api.addReview(productId, form)
      setForm({ rating: 5, title: '', comment: '' })
      setShowForm(false)
      load()
    } catch (err) {
      alert('Klaida: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tikrai norite ištrinti atsiliepimą?')) return
    try {
      await api.deleteReview(id)
      load()
    } catch (err) { alert('Klaida: ' + err.message) }
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#636E72' }}>⏳ Kraunami atsiliepimai...</div>
  }

  const stats = data?.stats || { count: 0, avg_rating: 0 }
  const reviews = data?.reviews || []
  const avgRounded = Math.round(stats.avg_rating * 10) / 10

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>💬 Atsiliepimai ({stats.count})</h3>
        {stats.count > 0 && (
          <div style={styles.avgRating}>
            <StarRating value={avgRounded} size="1.2rem" />
            <strong style={{ fontSize: '1.3rem', color: '#6C63FF' }}>{avgRounded}</strong>
            <span style={{ color: '#636E72', fontSize: '0.85rem' }}>/ 5.0</span>
          </div>
        )}
      </div>

      {/* Rating distribution */}
      {stats.count > 0 && (
        <div style={styles.distribution}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats[`stars_${star}`] || 0
            const percent = stats.count > 0 ? (count / stats.count) * 100 : 0
            return (
              <div key={star} style={styles.distRow}>
                <span style={{ minWidth: '20px', fontWeight: 700, color: '#636E72' }}>{star}★</span>
                <div style={styles.distTrack}>
                  <div style={{ ...styles.distFill, width: `${percent}%` }} />
                </div>
                <span style={{ minWidth: '30px', color: '#636E72', fontSize: '0.85rem' }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Add review button */}
      {!showForm && (
        <button
          onClick={() => user ? setShowForm(true) : onLogin?.()}
          style={styles.addBtn}
        >
          ✍️ {user ? 'Parašyti atsiliepimą' : 'Prisijunkite, kad parašytumėte atsiliepimą'}
        </button>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h4 style={{ marginBottom: '12px' }}>Jūsų atsiliepimas</h4>
          <div style={styles.starInput}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2D3436' }}>Įvertinimas:</span>
            <StarInput value={form.rating} onChange={r => setForm({ ...form, rating: r })} />
          </div>
          <input
            type="text"
            placeholder="Antraštė (neprivaloma)"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            style={styles.input}
            maxLength={100}
          />
          <textarea
            placeholder="Jūsų patirtis su šiuo produktu..."
            value={form.comment}
            onChange={e => setForm({ ...form, comment: e.target.value })}
            style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
            maxLength={1000}
            required
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Atšaukti</button>
            <button type="submit" disabled={submitting} style={styles.submitBtn}>
              {submitting ? '⏳ Siunčiama...' : '💬 Pateikti'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p style={{ padding: '32px', textAlign: 'center', color: '#636E72' }}>
          Dar nėra atsiliepimų. Būkite pirmas! 🌟
        </p>
      ) : (
        <div style={styles.list}>
          {reviews.map(r => (
            <div key={r.id} style={styles.reviewCard}>
              <div style={styles.reviewHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={styles.reviewAvatar}>{r.user_name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{r.user_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#B2BEC3' }}>
                      {new Date(r.created_at).toLocaleDateString('lt-LT')}
                    </div>
                  </div>
                </div>
                <StarRating value={r.rating} size="1rem" />
              </div>
              {r.title && <h5 style={{ marginTop: '8px' }}>{r.title}</h5>}
              {r.comment && <p style={{ color: '#636E72', marginTop: '8px', lineHeight: 1.6 }}>{r.comment}</p>}
              {user && (user.id === r.user_id || user.role === 'admin') && (
                <button onClick={() => handleDelete(r.id)} style={styles.deleteBtn}>🗑️ Ištrinti</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StarRating({ value, size = '1rem' }) {
  const full = Math.floor(value)
  const hasHalf = value - full >= 0.5
  return (
    <span style={{ display: 'inline-flex', gap: '2px', fontSize: size, color: '#FFD166' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}>
          {i <= full ? '★' : i === full + 1 && hasHalf ? '⯨' : '☆'}
        </span>
      ))}
    </span>
  )
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'inline-flex', gap: '4px', fontSize: '2rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: i <= (hover || value) ? '#FFD166' : '#E8ECF1',
            fontSize: '2rem',
            padding: 0,
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const styles = {
  container: {
    marginTop: '24px',
    padding: '24px',
    background: 'white',
    borderRadius: '16px',
    border: '2px solid #E8ECF1',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  avgRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  distribution: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '20px',
    padding: '16px',
    background: '#F9FAFB',
    borderRadius: '12px',
  },
  distRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  distTrack: {
    flex: 1,
    height: '8px',
    background: '#E8ECF1',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    transition: 'width 0.3s',
  },
  addBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    background: '#F9FAFB',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  starInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    fontSize: '0.95rem',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reviewCard: {
    padding: '16px',
    background: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E8ECF1',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },
  deleteBtn: {
    marginTop: '12px',
    padding: '6px 12px',
    borderRadius: '8px',
    background: '#FFF0F0',
    border: 'none',
    color: '#FF6B8A',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
}
