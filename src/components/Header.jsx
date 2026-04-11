import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'home', label: 'Pradžia', icon: '🏠' },
  { id: 'books', label: 'Knygos', icon: '📚' },
  { id: 'games', label: 'Žaidimai', icon: '🎮' },
  { id: 'courses', label: 'Mokymai', icon: '🎓' },
  { id: 'store', label: 'Parduotuvė', icon: '🛒' },
  { id: 'membership', label: 'Narystė', icon: '⭐' },
]

export default function Header({ currentPage, onNavigate, cartCount, user, onLogin, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <div style={styles.logo} onClick={() => onNavigate('home')}>
          <span style={styles.logoIcon}>📖✨</span>
          <div>
            <span style={styles.logoText}>MažųjųPasaulis</span>
            <span style={styles.logoSub}>Mokymasis su džiaugsmu!</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                ...styles.navItem,
                ...(currentPage === item.id ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
              {item.id === 'store' && cartCount > 0 && (
                <span style={styles.cartBadge}>{cartCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.actions}>
          {user ? (
            <div style={styles.userMenu}>
              {user.role === 'admin' && (
                <button onClick={() => onNavigate('admin')} style={styles.adminLink} title="Admin skydelis">
                  ⚙️
                </button>
              )}
              <span style={styles.userAvatar}>{user.name.charAt(0)}</span>
              <span style={styles.userName}>{user.name}</span>
              <button onClick={onLogout} style={styles.logoutBtn}>Atsijungti</button>
            </div>
          ) : (
            <button onClick={onLogin} style={styles.loginBtn}>
              Prisijungti
            </button>
          )}
        </div>

        <button
          style={styles.mobileToggle}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setMobileMenuOpen(false) }}
              style={{
                ...styles.mobileNavItem,
                ...(currentPage === item.id ? styles.mobileNavItemActive : {}),
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
          {user ? (
            <button onClick={() => { onLogout(); setMobileMenuOpen(false) }} style={styles.mobileNavItem}>
              👋 Atsijungti
            </button>
          ) : (
            <button onClick={() => { onLogin(); setMobileMenuOpen(false) }} style={styles.mobileNavItem}>
              🔑 Prisijungti
            </button>
          )}
        </div>
      )}
    </header>
  )
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '2px solid #E8ECF1',
    height: 'var(--header-height)',
  },
  container: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoIcon: {
    fontSize: '1.8rem',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'block',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '0.7rem',
    color: '#636E72',
    fontWeight: 600,
    display: 'block',
    lineHeight: 1,
  },
  nav: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '12px',
    background: 'none',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    fontFamily: 'var(--font)',
  },
  navItemActive: {
    background: 'rgba(108, 99, 255, 0.1)',
    color: '#6C63FF',
  },
  navIcon: {
    fontSize: '1.1rem',
  },
  cartBadge: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    background: '#FF6B35',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '0.7rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loginBtn: {
    padding: '10px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
    transition: 'all 0.2s ease',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.9rem',
  },
  userName: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#2D3436',
  },
  logoutBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    background: '#F5F5F5',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  adminLink: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileToggle: {
    display: 'none',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '8px',
  },
  mobileMenu: {
    position: 'absolute',
    top: 'var(--header-height)',
    left: 0,
    right: 0,
    background: 'white',
    borderBottom: '2px solid #E8ECF1',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
  },
  mobileNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font)',
  },
  mobileNavItemActive: {
    background: 'rgba(108, 99, 255, 0.1)',
    color: '#6C63FF',
  },
}

// Add responsive CSS via style tag
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    @media (max-width: 900px) {
      header nav { display: none !important; }
      header [style*="mobileToggle"] { display: block !important; }
    }
    @media (max-width: 900px) {
      .header-actions { display: none !important; }
    }
  `
  if (!document.getElementById('header-responsive-styles')) {
    styleEl.id = 'header-responsive-styles'
    document.head.appendChild(styleEl)
  }
}
