export default function Home({ onNavigate }) {
  return (
    <div>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>🌟 Nr. 1 vaikų mokymosi platforma Lietuvoje</div>
          <h1 style={styles.heroTitle}>
            Kur mokymasis virsta{' '}
            <span style={styles.heroHighlight}>nuotykiu!</span>
          </h1>
          <p style={styles.heroDesc}>
            Atraskite knygas, kurios stiprina pasitikėjimą savimi, ir žaidimus,
            kurie lavina protą. Sukurta specialiai vaikams nuo 3 iki 12 metų.
          </p>
          <div style={styles.heroActions}>
            <button className="btn btn-lg" style={styles.heroBtnPrimary} onClick={() => onNavigate('books')}>
              📚 Tyrinėti knygas
            </button>
            <button className="btn btn-lg" style={styles.heroBtnSecondary} onClick={() => onNavigate('games')}>
              🎮 Žaisti žaidimus
            </button>
          </div>
          <div style={styles.heroStats}>
            <div style={styles.stat}>
              <span style={styles.statNum}>500+</span>
              <span style={styles.statLabel}>Knygų</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statNum}>50+</span>
              <span style={styles.statLabel}>Žaidimų</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statNum}>10k+</span>
              <span style={styles.statLabel}>Vaikų</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statNum}>⭐ 4.9</span>
              <span style={styles.statLabel}>Vertinimas</span>
            </div>
          </div>
        </div>
        <div style={styles.heroVisual}>
          <div style={styles.heroEmojis}>
            <span style={{ ...styles.floatingEmoji, top: '5%', left: '10%', animationDelay: '0s' }}>📚</span>
            <span style={{ ...styles.floatingEmoji, top: '15%', right: '15%', animationDelay: '0.5s' }}>🎨</span>
            <span style={{ ...styles.floatingEmoji, top: '50%', left: '5%', animationDelay: '1s' }}>🧩</span>
            <span style={{ ...styles.floatingEmoji, bottom: '20%', right: '10%', animationDelay: '1.5s' }}>🌈</span>
            <span style={{ ...styles.floatingEmoji, bottom: '10%', left: '20%', animationDelay: '2s' }}>⭐</span>
            <span style={{ ...styles.floatingEmoji, top: '35%', right: '5%', animationDelay: '0.7s' }}>🎮</span>
          </div>
          <div style={styles.heroCard}>
            <div style={styles.heroCardInner}>
              <span style={{ fontSize: '4rem' }}>🧒📖</span>
              <h3 style={{ color: 'white', marginTop: '16px' }}>Mokytis smagu!</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '8px' }}>
                Interaktyvus mokymasis kiekvienam vaikui
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features} className="section">
        <div className="container">
          <div className="section-title">
            <h2>Kodėl rinktis MažųjųPasaulis?</h2>
            <p>Mes tikime, kad kiekvienas vaikas gali būti drąsus, protingas ir laimingas</p>
          </div>
          <div className="grid-3">
            {FEATURES.map((f, i) => (
              <div key={i} style={styles.featureCard}>
                <div style={{ ...styles.featureIcon, background: f.bg }}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Books Preview */}
      <section style={styles.preview} className="section">
        <div className="container">
          <div className="section-title">
            <h2>🔥 Populiariausios knygos</h2>
            <p>Knygos, kurios padeda vaikams augti ir tikėti savimi</p>
          </div>
          <div className="grid-4">
            {POPULAR_BOOKS.map((book, i) => (
              <div key={i} className="card" style={styles.bookCard}>
                <div style={{ ...styles.bookCover, background: book.bg }}>
                  <span style={{ fontSize: '3rem' }}>{book.emoji}</span>
                </div>
                <div style={styles.bookInfo}>
                  <span className="badge badge-popular">{book.badge}</span>
                  <h4 style={styles.bookTitle}>{book.title}</h4>
                  <p style={styles.bookAuthor}>{book.author}</p>
                  <div style={styles.bookPrice}>
                    <span style={styles.price}>{book.price}</span>
                    <div className="stars">★★★★★</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={styles.viewAll}>
            <button className="btn btn-primary" onClick={() => onNavigate('books')}>
              Visos knygos →
            </button>
          </div>
        </div>
      </section>

      {/* Games Preview */}
      <section className="section" style={{ background: '#F0F0FF' }}>
        <div className="container">
          <div className="section-title">
            <h2>🎮 Populiariausi žaidimai</h2>
            <p>Mokymasis per žaidimą – geriausias būdas tobulėti</p>
          </div>
          <div className="grid-3">
            {POPULAR_GAMES.map((game, i) => (
              <div key={i} className="card" style={styles.gameCard}>
                <div style={{ ...styles.gameCover, background: game.bg }}>
                  <span style={{ fontSize: '3.5rem' }}>{game.emoji}</span>
                  <span style={styles.gameType}>{game.type}</span>
                </div>
                <div style={styles.gameInfo}>
                  <h4>{game.title}</h4>
                  <p style={styles.gameDesc}>{game.desc}</p>
                  <div style={styles.gameMeta}>
                    <span style={styles.gameAge}>{game.age}</span>
                    <span className="badge badge-free">{game.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={styles.viewAll}>
            <button className="btn btn-cool" onClick={() => onNavigate('games')}>
              Visi žaidimai →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.cta}>
        <div className="container" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🚀</span>
          <h2 style={{ color: 'white', marginTop: '16px', fontSize: '2.4rem' }}>
            Paruošti, dėmesio, mokomės!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '500px', margin: '16px auto 32px', fontSize: '1.1rem' }}>
            Prisijunkite prie tūkstančių šeimų, kurios renkasi MažųjųPasaulis
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-lg" style={{ background: 'white', color: '#6C63FF', fontWeight: 800 }} onClick={() => onNavigate('membership')}>
              ⭐ Tapti nariu
            </button>
            <button className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }} onClick={() => onNavigate('store')}>
              🛒 Parduotuvė
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>💬 Tėvų atsiliepimai</h2>
          </div>
          <div className="grid-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={styles.testimonial}>
                <div className="stars" style={{ marginBottom: '12px' }}>★★★★★</div>
                <p style={styles.testimonialText}>„{t.text}"</p>
                <div style={styles.testimonialAuthor}>
                  <div style={{ ...styles.testimonialAvatar, background: t.bg }}>{t.initial}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span style={styles.testimonialRole}>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

const FEATURES = [
  {
    icon: '📚', title: 'Pasitikėjimo knygos',
    desc: 'Specialiai atrinktos knygos, kurios padeda vaikams atrasti savo stiprybes ir tikėti savimi.',
    bg: 'linear-gradient(135deg, #FF6B8A20, #FF6B3520)',
  },
  {
    icon: '🎮', title: 'Lavinamieji žaidimai',
    desc: 'Interaktyvūs žaidimai, kurie lavina loginį mąstymą, atmintį, kūrybiškumą ir kitas svarbias savybes.',
    bg: 'linear-gradient(135deg, #6C63FF20, #4CC9F020)',
  },
  {
    icon: '🏆', title: 'Pasiekimų sistema',
    desc: 'Vaikai renka žvaigždutes ir apdovanojimus, kurie motyvuoja mokytis ir tobulėti kiekvieną dieną.',
    bg: 'linear-gradient(135deg, #FFD16620, #06D6A020)',
  },
  {
    icon: '👨‍👩‍👧‍👦', title: 'Šeimos erdvė',
    desc: 'Tėvai gali sekti vaikų progresą, matyti jų pasiekimus ir kartu džiaugtis mokymosi kelione.',
    bg: 'linear-gradient(135deg, #06D6A020, #4CC9F020)',
  },
  {
    icon: '🎨', title: 'Kūrybinės užduotys',
    desc: 'Piešimo, rašymo ir meninės veiklos, kurios leidžia vaikams laisvai reikšti save.',
    bg: 'linear-gradient(135deg, #9B5DE520, #FF6B8A20)',
  },
  {
    icon: '🔒', title: 'Saugus turinys',
    desc: '100% saugus ir amžiui pritaikytas turinys. Jokių reklamų, tik kokybiškas mokomasis turinys.',
    bg: 'linear-gradient(135deg, #4CC9F020, #6C63FF20)',
  },
]

const POPULAR_BOOKS = [
  { emoji: '🦁', title: 'Drąsusis liūtukas', author: 'A. Petrauskienė', price: '€12.99', badge: 'Bestseleris', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },
  { emoji: '🌟', title: 'Aš galiu viską!', author: 'R. Kazlauskaitė', price: '€10.99', badge: 'Naujiena', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' },
  { emoji: '🦋', title: 'Mažoji drugelė', author: 'L. Jonaitis', price: '€9.99', badge: 'Top 10', bg: 'linear-gradient(135deg, #FF6B8A, #FF6B35)' },
  { emoji: '🌈', title: 'Spalvų pasaulis', author: 'D. Ramanauskienė', price: '€11.99', badge: 'Rekomenduojama', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
]

const POPULAR_GAMES = [
  { emoji: '🧩', title: 'Atminties iššūkis', desc: 'Lavink atmintį atversdamas korteles', type: 'Atmintis', age: '4-8 m.', badge: 'Nemokamas', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)' },
  { emoji: '🔢', title: 'Matematikos burtininkas', desc: 'Spręsk matematinius galvosūkius', type: 'Matematika', age: '6-10 m.', badge: 'Populiarus', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)' },
  { emoji: '📝', title: 'Žodžių medžioklė', desc: 'Atrask paslėptus žodžius', type: 'Kalbos', age: '7-12 m.', badge: 'Naujas', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
]

const TESTIMONIALS = [
  { text: 'Mano dukra labai myli šiuos žaidimus! Per mėnesį pastebėjau didelį progresą matematikoje.', name: 'Ingrida M.', role: 'Mama, 2 vaikai', initial: 'I', bg: 'linear-gradient(135deg, #FF6B8A, #FF6B35)' },
  { text: 'Geriausias pasirinkimas mūsų šeimai. Vaikai mokosi su džiaugsmu ir nori dar daugiau!', name: 'Tomas K.', role: 'Tėtis, 3 vaikai', initial: 'T', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)' },
  { text: 'Knygos apie pasitikėjimą padėjo mano sūnui tapti drąsesniu ir labiau tikėti savimi.', name: 'Rasa V.', role: 'Mama, 1 vaikas', initial: 'R', bg: 'linear-gradient(135deg, #06D6A0, #FFD166)' },
]

const styles = {
  hero: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '48px',
    alignItems: 'center',
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '80px 24px',
    minHeight: '80vh',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    borderRadius: '50px',
    background: 'rgba(108, 99, 255, 0.08)',
    color: '#6C63FF',
    fontWeight: 700,
    fontSize: '0.9rem',
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: '-2px',
  },
  heroHighlight: {
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroDesc: {
    fontSize: '1.15rem',
    color: '#636E72',
    lineHeight: 1.7,
    maxWidth: '500px',
  },
  heroActions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  heroBtnPrimary: {
    padding: '18px 36px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 20px rgba(108, 99, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heroBtnSecondary: {
    padding: '18px 36px',
    borderRadius: '16px',
    background: 'white',
    color: '#6C63FF',
    border: '2px solid #6C63FF',
    fontSize: '1.1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heroStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statNum: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#2D3436',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#636E72',
    fontWeight: 600,
  },
  statDivider: {
    width: '1px',
    height: '40px',
    background: '#E8ECF1',
  },
  heroVisual: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  heroEmojis: {
    position: 'absolute',
    inset: 0,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: '2.5rem',
    animation: 'float 3s ease-in-out infinite',
  },
  heroCard: {
    width: '300px',
    height: '360px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
    animation: 'float 4s ease-in-out infinite',
  },
  heroCardInner: {
    textAlign: 'center',
    padding: '32px',
  },
  features: {
    background: 'var(--bg-warm)',
  },
  featureCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
  featureIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto 20px',
  },
  featureTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    marginBottom: '8px',
  },
  featureDesc: {
    color: '#636E72',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  bookCard: {
    borderRadius: '16px',
    overflow: 'hidden',
  },
  bookCover: {
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bookTitle: {
    fontSize: '1rem',
    fontWeight: 800,
  },
  bookAuthor: {
    fontSize: '0.85rem',
    color: '#636E72',
  },
  bookPrice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  price: {
    fontWeight: 900,
    color: '#6C63FF',
    fontSize: '1.1rem',
  },
  viewAll: {
    textAlign: 'center',
    marginTop: '40px',
  },
  preview: {},
  gameCard: {
    borderRadius: '16px',
    overflow: 'hidden',
  },
  gameCover: {
    height: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  gameType: {
    color: 'white',
    fontWeight: 700,
    fontSize: '0.8rem',
    padding: '4px 14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.2)',
  },
  gameInfo: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  gameDesc: {
    color: '#636E72',
    fontSize: '0.9rem',
  },
  gameMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  gameAge: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#636E72',
  },
  cta: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '80px 0',
  },
  testimonial: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  testimonialText: {
    fontSize: '1rem',
    lineHeight: 1.7,
    color: '#636E72',
    fontStyle: 'italic',
    marginBottom: '20px',
  },
  testimonialAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  testimonialAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 800,
    fontSize: '1.1rem',
  },
  testimonialRole: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#B2BEC3',
  },
}

// Responsive hero
if (typeof document !== 'undefined' && !document.getElementById('home-responsive')) {
  const s = document.createElement('style')
  s.id = 'home-responsive'
  s.textContent = `
    @media (max-width: 900px) {
      section[style*="gridTemplateColumns"] {
        grid-template-columns: 1fr !important;
        min-height: auto !important;
        padding: 48px 16px !important;
        text-align: center;
      }
    }
  `
  document.head.appendChild(s)
}
