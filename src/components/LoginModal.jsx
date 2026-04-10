import { useState } from 'react'

export default function LoginModal({ onClose, onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isRegister && name && email && password) {
      onLogin({ name, email, membership: 'free' })
    } else if (!isRegister && email && password) {
      onLogin({ name: email.split('@')[0], email, membership: 'free' })
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <div style={styles.header}>
          <span style={{ fontSize: '3rem' }}>📖✨</span>
          <h2 style={styles.title}>
            {isRegister ? 'Sukurti paskyrą' : 'Sveiki sugrįžę!'}
          </h2>
          <p style={styles.subtitle}>
            {isRegister
              ? 'Prisijunkite prie MažųjųPasaulis bendruomenės'
              : 'Prisijunkite prie savo paskyros'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <div style={styles.field}>
              <label style={styles.label}>👤 Vardas</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jūsų vardas"
                style={styles.input}
                required
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>📧 El. paštas</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jusu@pastas.lt"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>🔒 Slaptažodis</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn}>
            {isRegister ? '🚀 Registruotis' : '🔑 Prisijungti'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>arba</span>
        </div>

        <button
          onClick={() => setIsRegister(!isRegister)}
          style={styles.switchBtn}
        >
          {isRegister
            ? 'Jau turite paskyrą? Prisijunkite'
            : 'Neturite paskyros? Registruokitės'}
        </button>

        <div style={styles.demoNote}>
          <span>💡</span>
          <span>Demo režimas: įveskite bet kokius duomenis</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: 'white',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '440px',
    width: '100%',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    animation: 'fadeInUp 0.3s ease-out',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#F5F5F5',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 900,
    marginTop: '12px',
    color: '#2D3436',
  },
  subtitle: {
    color: '#636E72',
    fontSize: '0.95rem',
    marginTop: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#2D3436',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    fontSize: '1rem',
    fontFamily: 'var(--font)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '16px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.05rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginTop: '8px',
    boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
    transition: 'all 0.2s ease',
  },
  divider: {
    textAlign: 'center',
    margin: '24px 0',
    position: 'relative',
    height: '1px',
    background: '#E8ECF1',
  },
  dividerText: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'white',
    padding: '0 16px',
    color: '#B2BEC3',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  switchBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#F5F5F5',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#6C63FF',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  demoNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(108, 99, 255, 0.05)',
    fontSize: '0.8rem',
    color: '#636E72',
    justifyContent: 'center',
  },
}
