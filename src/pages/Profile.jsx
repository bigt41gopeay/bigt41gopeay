import { useState, useEffect } from 'react'
import { api } from '../api'

const TABS = [
  { id: 'profile', label: 'Profilis', icon: '👤' },
  { id: 'password', label: 'Slaptažodis', icon: '🔒' },
  { id: 'membership', label: 'Narystė', icon: '⭐' },
  { id: 'progress', label: 'Progresas', icon: '🏆' },
]

export default function Profile({ user, onUserUpdate, onNavigate }) {
  const [tab, setTab] = useState('profile')

  if (!user) {
    return (
      <div className="section">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <span style={{ fontSize: '4rem' }}>🔐</span>
          <h2 style={{ marginTop: '16px' }}>Prisijunkite</h2>
          <p style={{ color: '#636E72', marginTop: '8px' }}>
            Norėdami peržiūrėti savo profilį, prisijunkite prie paskyros.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <div style={styles.header}>
          <div style={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <h1 style={{ fontSize: '2rem' }}>{user.name}</h1>
            <p style={{ color: '#636E72', marginTop: '4px' }}>{user.email}</p>
            <span style={styles.membershipBadge}>
              {user.membership === 'premium' ? '👑 Premium narys'
                : user.membership === 'basic' ? '⭐ Šeimos narys'
                : '🌱 Nemokamas planas'}
            </span>
          </div>
        </div>

        <div style={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnActive : {}) }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {tab === 'profile' && <ProfileTab user={user} onUserUpdate={onUserUpdate} />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'membership' && <MembershipTab user={user} onUserUpdate={onUserUpdate} onNavigate={onNavigate} />}
          {tab === 'progress' && <ProgressTab />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ user, onUserUpdate }) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateProfile({ name })
      const updated = await api.getMe()
      onUserUpdate?.(updated)
      setMessage({ type: 'success', text: '✅ Profilis atnaujintas!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>👤 Asmeniniai duomenys</h3>
      {message && (
        <div style={{ ...styles.message, background: message.type === 'success' ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 138, 0.1)', color: message.type === 'success' ? '#06D6A0' : '#FF6B8A' }}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSave} style={styles.form}>
        <label style={styles.label}>
          Vardas
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
        </label>
        <label style={styles.label}>
          El. paštas (negalima keisti)
          <input type="email" value={user.email} disabled style={{ ...styles.input, background: '#F5F5F5', color: '#B2BEC3' }} />
        </label>
        <button type="submit" disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ Išsaugoma...' : '💾 Išsaugoti'}
        </button>
      </form>
    </div>
  )
}

function PasswordTab() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (newPass !== confirm) {
      setMessage({ type: 'error', text: 'Slaptažodžiai nesutampa' })
      return
    }
    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'Naujas slaptažodis per trumpas (min. 6 simboliai)' })
      return
    }
    setSaving(true)
    try {
      await api.changePassword(current, newPass)
      setMessage({ type: 'success', text: '✅ Slaptažodis pakeistas!' })
      setCurrent(''); setNewPass(''); setConfirm('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>🔒 Pakeisti slaptažodį</h3>
      {message && (
        <div style={{ ...styles.message, background: message.type === 'success' ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 138, 0.1)', color: message.type === 'success' ? '#06D6A0' : '#FF6B8A' }}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSave} style={styles.form}>
        <label style={styles.label}>
          Dabartinis slaptažodis
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={styles.input} required />
        </label>
        <label style={styles.label}>
          Naujas slaptažodis (min. 6 simboliai)
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={styles.input} required minLength={6} />
        </label>
        <label style={styles.label}>
          Pakartokite naują slaptažodį
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={styles.input} required />
        </label>
        <button type="submit" disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ Keičiama...' : '🔒 Pakeisti slaptažodį'}
        </button>
      </form>
    </div>
  )
}

function MembershipTab({ user, onUserUpdate, onNavigate }) {
  const plans = [
    { id: 'free', name: 'Nemokamas', icon: '🌱', color: '#06D6A0', features: ['3 knygos per mėn.', '2 žaidimai', 'Bazinė pagalba'] },
    { id: 'basic', name: 'Šeimos', icon: '⭐', color: '#6C63FF', features: ['Visos knygos', 'Visi žaidimai', 'Visi kursai', '3 vaikų profiliai'] },
    { id: 'premium', name: 'Premium', icon: '👑', color: '#FF6B35', features: ['Viskas iš Šeimos', 'Offline atsisiuntimai', 'Neribotai profilių', 'Prioritetinė pagalba'] },
  ]

  return (
    <div>
      <h3 style={{ marginBottom: '8px' }}>⭐ Jūsų narystės planas</h3>
      <p style={{ color: '#636E72', marginBottom: '20px' }}>
        Šiuo metu naudojate: <strong>{user.membership === 'premium' ? 'Premium' : user.membership === 'basic' ? 'Šeimos' : 'Nemokamas'}</strong> planą
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {plans.map(p => (
          <div key={p.id} style={{ ...styles.planCard, borderColor: user.membership === p.id ? p.color : '#E8ECF1' }}>
            <span style={{ fontSize: '2rem' }}>{p.icon}</span>
            <h4 style={{ marginTop: '8px' }}>{p.name}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', fontSize: '0.85rem', color: '#636E72' }}>
              {p.features.map((f, i) => <li key={i} style={{ padding: '4px 0' }}>✓ {f}</li>)}
            </ul>
            {user.membership === p.id ? (
              <div style={{ padding: '8px', background: p.color, color: 'white', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', textAlign: 'center' }}>
                ✓ Dabartinis
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button onClick={() => onNavigate?.('membership')} style={styles.saveBtn}>
        ⭐ Keisti planą
      </button>
    </div>
  )
}

function ProgressTab() {
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProgress()
      .then(setProgress)
      .catch(() => setProgress([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Kraunama...</div>

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>🏆 Mano mokymosi progresas</h3>
      {progress.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span style={{ fontSize: '3rem' }}>📚</span>
          <p style={{ marginTop: '12px', color: '#636E72' }}>
            Dar neturite užbaigtų pamokų. Pradėkite mokytis!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {progress.map(p => (
            <div key={p.id} style={{ padding: '14px 18px', background: '#F9FAFB', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <strong>{p.lesson_title}</strong>
                <div style={{ fontSize: '0.85rem', color: '#636E72' }}>{p.course_title}</div>
              </div>
              <span style={{ color: '#06D6A0', fontWeight: 700 }}>✅ Baigta</span>
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
    gap: '24px',
    marginBottom: '32px',
    padding: '32px',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(255, 107, 138, 0.05))',
    borderRadius: '20px',
  },
  avatar: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    fontWeight: 900,
  },
  membershipBadge: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '4px 14px',
    borderRadius: '20px',
    background: 'white',
    color: '#6C63FF',
    fontSize: '0.85rem',
    fontWeight: 800,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #E8ECF1',
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
    minHeight: '300px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '500px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#2D3436',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    fontSize: '1rem',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  saveBtn: {
    padding: '14px 28px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    alignSelf: 'flex-start',
  },
  message: {
    padding: '14px 20px',
    borderRadius: '12px',
    fontWeight: 700,
    marginBottom: '20px',
  },
  planCard: {
    padding: '20px',
    border: '2px solid #E8ECF1',
    borderRadius: '16px',
    background: 'white',
    textAlign: 'center',
  },
}
