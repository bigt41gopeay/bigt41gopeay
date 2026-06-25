import { useState, useEffect, useRef } from 'react'

const NAV_ITEMS = [
  { id: 'books', label: 'Knygos' },
  { id: 'games', label: 'Žaidimai' },
  { id: 'courses', label: 'Mokymai' },
  { id: 'about', label: 'Apie mus' },
]

export function LogoMark({ size = 42 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 14,
      background: 'var(--gradient-logo)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 16px rgba(108,99,255,0.35)',
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 40 40" width="64%" height="64%" style={{ display: 'block' }}>
        <ellipse cx="20" cy="20" rx="17" ry="7.5" transform="rotate(-28 20 20)"
                 stroke="#fff" strokeOpacity="0.5" strokeWidth="2.4" fill="none" />
        <circle cx="20" cy="20" r="9.5" fill="#fff" />
        <circle cx="35" cy="12" r="3.6" fill="#FFC845" />
      </svg>
    </span>
  )
}

export function LogoWordmark() {
  return (
    <span style={{
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 21,
      color: 'var(--ink)',
      letterSpacing: '-0.3px',
    }}>
      Mažųjų<span style={{ color: 'var(--primary)' }}>Pasaulis</span>
    </span>
  )
}

export default function Header({ currentPage, onNavigate, cartCount, user, onLogin, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const nav = (id) => { onNavigate(id); setMobileOpen(false) }

  // map design "books" / "games" nav to existing store page
  const navTarget = (id) => {
    if (id === 'books' || id === 'games') return 'store'
    return id
  }

  return (
    <header style={styles.header}>
      <nav style={styles.nav}>
        <a
          onClick={() => nav('home')}
          style={styles.logoLink}
        >
          <LogoMark />
          <LogoWordmark />
        </a>

        <div style={styles.navLinks} className="header-nav-desktop">
          {NAV_ITEMS.map(item => {
            const target = navTarget(item.id)
            const active = currentPage === target
            return (
              <a
                key={item.id}
                onClick={() => nav(target)}
                style={{
                  ...styles.navLink,
                  color: active ? 'var(--primary)' : 'var(--ink)',
                  fontWeight: active ? 700 : 600,
                }}
              >
                {item.label}
              </a>
            )
          })}
        </div>

        <div style={styles.actions}>
          <a
            onClick={() => nav('store')}
            style={styles.cartBtn}
            aria-label="Krepšelis"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span style={styles.cartBadge}>{cartCount}</span>
            )}
          </a>

          {user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={styles.userBtn}
              >
                <span style={styles.userAvatar}>{user.name?.charAt(0).toUpperCase() || '?'}</span>
                <span className="header-name-desktop" style={{ fontWeight: 700 }}>{user.name}</span>
              </button>
              {userMenuOpen && (
                <div style={styles.userDropdown}>
                  <button onClick={() => { nav('profile'); setUserMenuOpen(false) }} style={styles.dropdownItem}>👤 Profilis</button>
                  <button onClick={() => { nav('orders'); setUserMenuOpen(false) }} style={styles.dropdownItem}>📦 Mano užsakymai</button>
                  <button onClick={() => { nav('giftcards'); setUserMenuOpen(false) }} style={styles.dropdownItem}>🎁 Dovanų kuponai</button>
                  <button onClick={() => { nav('affiliate'); setUserMenuOpen(false) }} style={styles.dropdownItem}>💸 Partnerystė</button>
                  {user.role === 'admin' && (
                    <button onClick={() => { nav('admin'); setUserMenuOpen(false) }} style={styles.dropdownItem}>⚙️ Administratoriaus skydas</button>
                  )}
                  <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                  <button onClick={() => { onLogout(); setUserMenuOpen(false) }} style={{ ...styles.dropdownItem, color: 'var(--coral)' }}>🚪 Atsijungti</button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: 15 }}
            >
              Prisijungti
            </button>
          )}

          <button
            className="header-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={styles.hamburger}
            aria-label="Meniu"
          >
            <span style={{ ...styles.hamburgerBar, transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ ...styles.hamburgerBar, opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ ...styles.hamburgerBar, transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={styles.mobileMenu}>
          {NAV_ITEMS.map(item => {
            const target = navTarget(item.id)
            const active = currentPage === target
            return (
              <a
                key={item.id}
                onClick={() => nav(target)}
                style={{
                  ...styles.mobileLink,
                  color: active ? 'var(--primary)' : 'var(--ink)',
                  background: active ? 'var(--violet-soft)' : 'transparent',
                }}
              >
                {item.label}
              </a>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 880px) {
          .header-nav-desktop { display: none !important; }
          .header-hamburger { display: inline-flex !important; }
          .header-name-desktop { display: none !important; }
        }
        @media (min-width: 881px) {
          .header-hamburger { display: none !important; }
        }
      `}</style>
    </header>
  )
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(255,249,240,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
  },
  nav: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 30,
  },
  navLink: {
    cursor: 'pointer',
    fontSize: 16,
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  cartBtn: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 14,
    border: '2px solid var(--border-strong)',
    background: 'white',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    textDecoration: 'none',
    flexShrink: 0,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    background: 'var(--coral)',
    color: 'white',
    fontSize: 11,
    fontWeight: 800,
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--cream)',
    fontFamily: 'var(--font)',
  },
  userBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 14,
    background: 'white',
    border: '2px solid var(--border-strong)',
    cursor: 'pointer',
    color: 'var(--ink)',
    fontFamily: 'var(--font)',
    fontSize: 14,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--gradient-logo)',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  userDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'white',
    borderRadius: 16,
    boxShadow: 'var(--shadow-hover)',
    border: '1px solid var(--border)',
    minWidth: 220,
    padding: 6,
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    color: 'var(--ink)',
    borderRadius: 10,
    fontFamily: 'var(--font)',
    fontSize: 14,
  },
  hamburger: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: '2px solid var(--border-strong)',
    background: 'white',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  hamburgerBar: {
    width: 18,
    height: 2,
    background: 'var(--ink)',
    borderRadius: 2,
    transition: 'all 0.2s',
  },
  mobileMenu: {
    background: 'white',
    borderTop: '1px solid var(--border)',
    padding: '12px 24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  mobileLink: {
    cursor: 'pointer',
    padding: '12px 14px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: 'none',
    transition: 'background 0.2s',
  },
}
