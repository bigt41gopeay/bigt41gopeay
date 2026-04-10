import { useState } from 'react'

const CATEGORIES = [
  { id: 'all', label: 'Visos', icon: '📚' },
  { id: 'confidence', label: 'Pasitikėjimas', icon: '💪' },
  { id: 'emotions', label: 'Emocijos', icon: '❤️' },
  { id: 'adventure', label: 'Nuotykiai', icon: '🗺️' },
  { id: 'learning', label: 'Mokymasis', icon: '🎓' },
  { id: 'creativity', label: 'Kūrybiškumas', icon: '🎨' },
]

const AGES = [
  { id: 'all', label: 'Visi amžiai' },
  { id: '3-5', label: '3-5 metai' },
  { id: '6-8', label: '6-8 metai' },
  { id: '9-12', label: '9-12 metai' },
]

const BOOKS = [
  { id: 1, emoji: '🦁', title: 'Drąsusis liūtukas', author: 'A. Petrauskienė', price: 12.99, rating: 5, category: 'confidence', age: '3-5', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', badge: 'Bestseleris', desc: 'Istorija apie mažą liūtuką, kuris mokosi būti drąsus ir tikėti savimi.' },
  { id: 2, emoji: '🌟', title: 'Aš galiu viską!', author: 'R. Kazlauskaitė', price: 10.99, rating: 5, category: 'confidence', age: '3-5', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', badge: 'Naujiena', desc: 'Knyga, kuri moko vaikus, kad jie gali pasiekti bet ką, ko tik nori.' },
  { id: 3, emoji: '🦋', title: 'Mažoji drugelė', author: 'L. Jonaitis', price: 9.99, rating: 4, category: 'emotions', age: '3-5', bg: 'linear-gradient(135deg, #FF6B8A, #FF6B35)', badge: 'Top 10', desc: 'Jautri istorija apie draugystę ir empatiją.' },
  { id: 4, emoji: '🌈', title: 'Spalvų pasaulis', author: 'D. Ramanauskienė', price: 11.99, rating: 5, category: 'creativity', age: '3-5', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', badge: 'Rekomenduojama', desc: 'Kūrybinga knyga, skatinanti vaiko vaizduotę ir meninį pojūtį.' },
  { id: 5, emoji: '🚀', title: 'Kosmoso kelionė', author: 'M. Stankevičius', price: 14.99, rating: 5, category: 'adventure', age: '6-8', bg: 'linear-gradient(135deg, #2D3436, #6C63FF)', badge: 'Populiarus', desc: 'Nuotykinga kelionė po kosmosą, kuri moko apie planetas ir žvaigždes.' },
  { id: 6, emoji: '🧙', title: 'Mažasis burtininkas', author: 'V. Šimkūnaitė', price: 13.99, rating: 4, category: 'adventure', age: '6-8', bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)', badge: '', desc: 'Magiškas pasakojimas apie berniuką, kuris atranda savo ypatingas galias.' },
  { id: 7, emoji: '🌱', title: 'Augti drąsiai', author: 'K. Paulauskienė', price: 10.99, rating: 5, category: 'confidence', age: '6-8', bg: 'linear-gradient(135deg, #06D6A0, #FFD166)', badge: 'Tėvų pasirinkimas', desc: 'Praktinė knyga su užduotimis, padedanti vaikams ugdyti pasitikėjimą.' },
  { id: 8, emoji: '❤️', title: 'Mano jausmai – mano draugai', author: 'I. Mockutė', price: 11.99, rating: 5, category: 'emotions', age: '6-8', bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)', badge: 'Naujiena', desc: 'Knyga, mokanti vaikus pažinti ir valdyti savo emocijas.' },
  { id: 9, emoji: '🔬', title: 'Mokslo paslaptys', author: 'P. Grigas', price: 15.99, rating: 4, category: 'learning', age: '9-12', bg: 'linear-gradient(135deg, #4CC9F0, #6C63FF)', badge: '', desc: 'Įdomūs eksperimentai ir faktai, kurie atvers mokslo pasaulį.' },
  { id: 10, emoji: '📖', title: 'Rašymo pamokos', author: 'A. Mikulskis', price: 12.99, rating: 4, category: 'learning', age: '9-12', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)', badge: '', desc: 'Kūrybingo rašymo vadovas jauniesiems autoriams.' },
  { id: 11, emoji: '💪', title: 'Stipresnis nei manai', author: 'E. Balčiūnienė', price: 13.99, rating: 5, category: 'confidence', age: '9-12', bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)', badge: 'Naujiena', desc: 'Įkvepianti knyga vyresniems vaikams apie savo galimybes.' },
  { id: 12, emoji: '🎨', title: 'Spalvink savo pasaulį', author: 'G. Mikutienė', price: 8.99, rating: 5, category: 'creativity', age: '3-5', bg: 'linear-gradient(135deg, #FFD166, #FF6B8A)', badge: 'Pigu!', desc: 'Spalvinimo ir kūrybinių užduočių knyga mažiausiems.' },
]

export default function Books({ onAddToCart }) {
  const [category, setCategory] = useState('all')
  const [age, setAge] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = BOOKS.filter(b => {
    if (category !== 'all' && b.category !== category) return false
    if (age !== 'all' && b.age !== age) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={{ fontSize: '2.5rem' }}>📚 Knygos vaikams</h1>
            <p style={{ color: '#636E72', marginTop: '8px', fontSize: '1.1rem' }}>
              Pasitikėjimą ugdančios knygos, kurios padeda jūsų vaikui augti
            </p>
          </div>
          <div style={styles.searchBox}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Ieškoti knygų..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Kategorija:</span>
            <div style={styles.filterBtns}>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    ...styles.filterBtn,
                    ...(category === c.id ? styles.filterBtnActive : {}),
                  }}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Amžius:</span>
            <div style={styles.filterBtns}>
              {AGES.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAge(a.id)}
                  style={{
                    ...styles.filterBtn,
                    ...(age === a.id ? styles.filterBtnActive : {}),
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <p style={styles.resultCount}>Rasta knygų: {filtered.length}</p>

        {/* Books Grid */}
        <div className="grid-4">
          {filtered.map(book => (
            <div key={book.id} className="card" style={styles.bookCard}>
              <div style={{ ...styles.bookCover, background: book.bg }}>
                <span style={{ fontSize: '3.5rem' }}>{book.emoji}</span>
                {book.badge && <span style={styles.bookBadge}>{book.badge}</span>}
              </div>
              <div style={styles.bookInfo}>
                <h4 style={styles.bookTitle}>{book.title}</h4>
                <p style={styles.bookAuthor}>✍️ {book.author}</p>
                <p style={styles.bookDesc}>{book.desc}</p>
                <div style={styles.bookMeta}>
                  <span style={styles.bookAge}>📅 {book.age} m.</span>
                  <div className="stars">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</div>
                </div>
                <div style={styles.bookFooter}>
                  <span style={styles.bookPrice}>€{book.price.toFixed(2)}</span>
                  <button
                    onClick={() => onAddToCart(book)}
                    style={styles.addToCartBtn}
                  >
                    🛒 Į krepšelį
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={styles.empty}>
            <span style={{ fontSize: '3rem' }}>📭</span>
            <h3>Knygų nerasta</h3>
            <p style={{ color: '#636E72' }}>Pabandykite pakeisti filtrus arba paieškos žodį</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '24px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderRadius: '14px',
    border: '2px solid #E8ECF1',
    background: 'white',
    minWidth: '280px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    fontFamily: 'var(--font)',
    width: '100%',
    background: 'transparent',
  },
  filters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
    padding: '24px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#2D3436',
    minWidth: '90px',
  },
  filterBtns: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    background: '#6C63FF',
    color: 'white',
    borderColor: '#6C63FF',
  },
  resultCount: {
    color: '#636E72',
    fontSize: '0.9rem',
    marginBottom: '24px',
    fontWeight: 600,
  },
  bookCard: {
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  bookCover: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bookBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.9)',
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#2D3436',
  },
  bookInfo: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  bookTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
  },
  bookAuthor: {
    fontSize: '0.85rem',
    color: '#636E72',
  },
  bookDesc: {
    fontSize: '0.85rem',
    color: '#636E72',
    lineHeight: 1.5,
    flex: 1,
  },
  bookMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  bookAge: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#636E72',
  },
  bookFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #E8ECF1',
  },
  bookPrice: {
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  addToCartBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
}
