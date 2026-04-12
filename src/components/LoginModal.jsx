import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

// Google Sign-In Client ID (set via env or hardcode)
const GOOGLE_CLIENT_ID = window.__GOOGLE_CLIENT_ID__ || ''

export default function LoginModal({ onClose, onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef(null)

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    if (document.getElementById('google-gsi-script')) return

    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%',
          locale: 'lt',
        })
      }
    }
    document.head.appendChild(script)
  }, [])

  // Also try rendering if script already loaded
  useEffect(() => {
    if (GOOGLE_CLIENT_ID && window.google && googleBtnRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: '100%',
        locale: 'lt',
      })
    }
  }, [googleBtnRef.current])

  const handleGoogleResponse = async (response) => {
    if (!response.credential) return
    setGoogleLoading(true)
    setError('')

    try {
      // Decode JWT to get user info (Google ID token is a JWT)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      const result = await api.googleLogin({
        credential: response.credential,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      })
      onLogin(result.user, result.token)
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        setError('Serveris nepasiekiamas. Bandykite vėliau.')
      } else {
        setError(err.message)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  // Manual Google popup (fallback when GSI script not loaded)
  const handleGoogleManual = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google prisijungimas dar nesukonfigūruotas. Naudokite el. paštą.')
      return
    }

    const width = 500, height = 600
    const left = (window.innerWidth - width) / 2
    const top = (window.innerHeight - height) / 2
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: Math.random().toString(36).slice(2),
    })
    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-login',
      `width=${width},height=${height},left=${left},top=${top}`
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let result
      if (isRegister) {
        result = await api.register(name, email, password)
      } else {
        result = await api.login(email, password)
      }
      onLogin(result.user, result.token)
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        const offlineUser = {
          name: isRegister ? name : email.split('@')[0],
          email,
          membership: 'free',
          role: 'user',
        }
        onLogin(offlineUser, null)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
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

          {error && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,107,138,0.1)', color: '#FF6B8A', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '⏳ Palaukite...' : isRegister ? '🚀 Registruotis' : '🔑 Prisijungti'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>arba</span>
        </div>

        {/* Google Sign-In */}
        {GOOGLE_CLIENT_ID ? (
          <div style={{ marginBottom: '16px' }}>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            {googleLoading && (
              <p style={{ textAlign: 'center', color: '#636E72', fontSize: '0.85rem', marginTop: '8px' }}>
                ⏳ Jungiamasi per Google...
              </p>
            )}
          </div>
        ) : (
          <button onClick={handleGoogleManual} style={styles.googleBtn} disabled={googleLoading}>
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Prisijungti su Google
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={styles.switchBtn}
          >
            {isRegister
              ? 'Jau turite paskyrą? Prisijunkite'
              : 'Neturite paskyros? Registruokitės'}
          </button>
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
  googleBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: 'white',
    border: '2px solid #E8ECF1',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#2D3436',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '12px',
    transition: 'all 0.2s',
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
