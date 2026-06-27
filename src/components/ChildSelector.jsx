import { useEffect, useState } from 'react'
import { api } from '../api'
import { setActiveChildId } from '../lib/childSession'

// Modal that appears after parent login. Lets them pick which child is playing
// today, or add a first child. Designed so adult and kid can use it.

const AVATARS = ['🐣','🐥','🐤','🦅','🐉','🦄','🐶','🐱','🐰','🐻','🦊','🐼']

export default function ChildSelector({ open, onClose, onSelected }) {
  const [children, setChildren] = useState([])
  const [tier, setTier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('select') // select | add
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    let loadingTimer = setTimeout(() => alive && setLoading(true), 50)
    api.getChildren()
      .then(d => {
        if (!alive) return
        clearTimeout(loadingTimer)
        setChildren(d.children)
        setTier(d.tier)
        setMode(d.children.length === 0 ? 'add' : 'select')
        setLoading(false)
      })
      .catch(() => { if (alive) { clearTimeout(loadingTimer); setLoading(false) } })
    return () => { alive = false; clearTimeout(loadingTimer) }
  }, [open])

  if (!open) return null

  const pick = (child) => {
    setActiveChildId(child.id)
    onSelected?.(child)
    onClose?.()
  }

  const addChild = async () => {
    setError(null)
    if (!name.trim()) { setError('Vardas privalomas'); return }
    try {
      const { child } = await api.createChild({
        name: name.trim(),
        age: age ? Number(age) : null,
        avatar,
      })
      setChildren(prev => [...prev, child])
      setActiveChildId(child.id)
      onSelected?.(child)
      onClose?.()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={s.modal}>
        <button onClick={onClose} style={s.closeBtn} aria-label="Uždaryti">×</button>
        <h2 style={s.title}>
          {mode === 'add' ? 'Pridėk vaiko profilį' : 'Kas šiandien žais? 👋'}
        </h2>

        {loading && <div style={s.loading}>Kraunama…</div>}

        {!loading && mode === 'select' && (
          <>
            <p style={s.subtitle}>Pasirink savo profilį — taškai išliks tavo paskyroje.</p>
            <div style={s.childrenGrid}>
              {children.map(c => (
                <button key={c.id} onClick={() => pick(c)} style={s.childCard}>
                  <span style={s.childAvatar}>{c.avatar || '🐣'}</span>
                  <span style={s.childName}>{c.name}</span>
                  {c.age && <span style={s.childAge}>{c.age} m.</span>}
                </button>
              ))}
              {tier && !tier.atLimit && (
                <button onClick={() => setMode('add')} style={s.addCard}>
                  <span style={{ fontSize: 36 }}>+</span>
                  <span style={s.childName}>Pridėti vaiką</span>
                </button>
              )}
            </div>
            {tier && tier.atLimit && (
              <div style={s.upgrade}>
                ⭐ <b>{tier.name}</b> plane gali turėti {tier.maxChildren} vaikus.
                <a href="#" onClick={(e) => { e.preventDefault(); onClose?.(); window.location.hash = '#membership' }} style={s.upgradeLink}>
                  Pakelti į Šeimos planą →
                </a>
              </div>
            )}
          </>
        )}

        {!loading && mode === 'add' && (
          <div style={s.addForm}>
            <label style={s.label}>Vaiko vardas
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="pvz. Jonukas"
                style={s.input}
                autoFocus
              />
            </label>
            <label style={s.label}>Amžius (nebūtina)
              <input
                type="number" min="2" max="14"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="6"
                style={s.input}
              />
            </label>
            <div style={s.label}>Pasirink avatarą</div>
            <div style={s.avatarGrid}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  style={{
                    ...s.avatarBtn,
                    background: avatar === a ? 'linear-gradient(135deg,#6C63FF,#9B7BFF)' : 'white',
                    transform: avatar === a ? 'scale(1.1)' : 'scale(1)',
                  }}
                >{a}</button>
              ))}
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.actions}>
              {children.length > 0 && (
                <button onClick={() => setMode('select')} style={s.secondaryBtn}>← Atgal</button>
              )}
              <button onClick={addChild} style={s.primaryBtn}>✓ Pridėti</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(45,42,69,0.55)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'calmIn 0.3s ease-out',
  },
  modal: {
    background: 'white', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 560,
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
    position: 'relative', maxHeight: '90vh', overflowY: 'auto',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    background: 'transparent', border: 'none', fontSize: 32,
    cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1,
  },
  title: {
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26,
    color: 'var(--ink)', marginBottom: 6, textAlign: 'center',
  },
  subtitle: { color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 22, fontSize: 14 },
  loading: { textAlign: 'center', padding: 30, color: 'var(--text-muted)' },
  childrenGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 },
  childCard: {
    background: 'linear-gradient(160deg,#FFFFFF,#FBF1D9)',
    border: '2px solid var(--border-soft)',
    borderRadius: 16, padding: 16,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    transition: 'all 0.2s',
  },
  childAvatar: { fontSize: 48 },
  childName: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' },
  childAge: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 },
  addCard: {
    background: 'transparent',
    border: '2px dashed var(--border-strong)',
    borderRadius: 16, padding: 16, cursor: 'pointer',
    fontFamily: 'inherit', color: 'var(--primary)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  upgrade: {
    marginTop: 18, padding: 14, borderRadius: 12,
    background: 'linear-gradient(135deg,#FBF1D9,#FCDDD6)',
    color: 'var(--ink)', fontWeight: 600, fontSize: 14, textAlign: 'center',
  },
  upgradeLink: { display: 'block', marginTop: 6, color: 'var(--primary)', fontWeight: 800 },
  addForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontWeight: 700, fontSize: 14, color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 6 },
  input: {
    padding: '12px 14px', borderRadius: 12,
    border: '2px solid var(--border-strong)', background: 'white',
    fontFamily: 'var(--font)', fontSize: 16, color: 'var(--ink)', outline: 'none',
  },
  avatarGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  avatarBtn: {
    aspectRatio: '1', border: '2px solid var(--border-soft)',
    borderRadius: 12, fontSize: 28, cursor: 'pointer',
    transition: 'transform 0.15s, background 0.15s',
  },
  error: { color: 'var(--coral)', fontWeight: 700, fontSize: 14 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  primaryBtn: {
    background: 'var(--primary)', color: 'white', border: 'none',
    borderRadius: 12, padding: '12px 22px', fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', fontSize: 15,
  },
  secondaryBtn: {
    background: 'white', color: 'var(--ink)',
    border: '2px solid var(--border-strong)', borderRadius: 12,
    padding: '12px 22px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
}
