export default function Footer({ onNavigate }) {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          <div style={styles.brand}>
            <div style={styles.logo}>
              <span style={{ fontSize: '2rem' }}>📖✨</span>
              <span style={styles.logoText}>MažųjųPasaulis</span>
            </div>
            <p style={styles.desc}>
              Padedame vaikams augti, mokytis ir atrasti save per knygas, žaidimus
              ir kūrybiškas veiklas. Kiekvienas vaikas yra ypatingas!
            </p>
            <div style={styles.social}>
              <span style={styles.socialIcon}>📘</span>
              <span style={styles.socialIcon}>📸</span>
              <span style={styles.socialIcon}>🎵</span>
              <span style={styles.socialIcon}>▶️</span>
            </div>
          </div>

          <div>
            <h4 style={styles.heading}>Navigacija</h4>
            <div style={styles.links}>
              <button onClick={() => onNavigate('home')} style={styles.link}>Pradžia</button>
              <button onClick={() => onNavigate('books')} style={styles.link}>Knygos</button>
              <button onClick={() => onNavigate('games')} style={styles.link}>Žaidimai</button>
              <button onClick={() => onNavigate('store')} style={styles.link}>Parduotuvė</button>
              <button onClick={() => onNavigate('membership')} style={styles.link}>Narystė</button>
            </div>
          </div>

          <div>
            <h4 style={styles.heading}>Amžiaus grupės</h4>
            <div style={styles.links}>
              <span style={styles.linkText}>👶 3-5 metai</span>
              <span style={styles.linkText}>🧒 6-8 metai</span>
              <span style={styles.linkText}>👦 9-11 metai</span>
              <span style={styles.linkText}>🧑 12+ metai</span>
            </div>
          </div>

          <div>
            <h4 style={styles.heading}>Kontaktai</h4>
            <div style={styles.links}>
              <span style={styles.linkText}>📧 info@mazujupasaulis.lt</span>
              <span style={styles.linkText}>📞 +370 600 12345</span>
              <span style={styles.linkText}>📍 Vilnius, Lietuva</span>
            </div>
          </div>
        </div>

        <div style={styles.bottom}>
          <p style={styles.copyright}>
            © 2026 MažųjųPasaulis. Visos teisės saugomos. Sukurta su ❤️ vaikams.
          </p>
          <div style={styles.bottomLinks}>
            <span style={styles.bottomLink}>Privatumo politika</span>
            <span style={styles.bottomLink}>Naudojimo sąlygos</span>
            <span style={styles.bottomLink}>Slapukai</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

const styles = {
  footer: {
    background: 'linear-gradient(180deg, #2D3436 0%, #1A1D1E 100%)',
    color: '#B2BEC3',
    padding: '64px 0 0',
    marginTop: 'auto',
  },
  container: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '0 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '48px',
    paddingBottom: '48px',
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 900,
    color: 'white',
  },
  desc: {
    fontSize: '0.9rem',
    lineHeight: 1.7,
    maxWidth: '320px',
  },
  social: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  socialIcon: {
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  heading: {
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 800,
    marginBottom: '16px',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#B2BEC3',
    fontSize: '0.9rem',
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
    fontFamily: 'var(--font)',
    fontWeight: 600,
    transition: 'color 0.2s',
  },
  linkText: {
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '24px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  copyright: {
    fontSize: '0.85rem',
  },
  bottomLinks: {
    display: 'flex',
    gap: '24px',
  },
  bottomLink: {
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
}

// Responsive footer
if (typeof document !== 'undefined' && !document.getElementById('footer-responsive')) {
  const s = document.createElement('style')
  s.id = 'footer-responsive'
  s.textContent = `
    @media (max-width: 768px) {
      footer > div > div:first-child {
        grid-template-columns: 1fr !important;
        gap: 32px !important;
      }
    }
  `
  document.head.appendChild(s)
}
