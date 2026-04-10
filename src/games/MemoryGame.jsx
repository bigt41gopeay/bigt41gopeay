import { useState, useEffect } from 'react'

const EMOJIS = ['🦁', '🐻', '🦊', '🐸', '🐙', '🦋', '🌺', '🌟']

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createBoard() {
  const pairs = [...EMOJIS, ...EMOJIS]
  return shuffleArray(pairs).map((emoji, index) => ({
    id: index,
    emoji,
    flipped: false,
    matched: false,
  }))
}

export default function MemoryGame({ onScore }) {
  const [cards, setCards] = useState(createBoard)
  const [selected, setSelected] = useState([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let interval
    if (running && !gameOver) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [running, gameOver])

  useEffect(() => {
    if (matches === EMOJIS.length) {
      setGameOver(true)
      setRunning(false)
      const score = Math.max(100 - (moves - EMOJIS.length) * 5, 10)
      onScore(score)
    }
  }, [matches, moves, onScore])

  const handleCardClick = (id) => {
    if (selected.length === 2) return
    if (cards[id].flipped || cards[id].matched) return
    if (!running) setRunning(true)

    const newCards = [...cards]
    newCards[id].flipped = true
    setCards(newCards)

    const newSelected = [...selected, id]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      setMoves(m => m + 1)
      const [first, second] = newSelected

      if (newCards[first].emoji === newCards[second].emoji) {
        setTimeout(() => {
          const updated = [...newCards]
          updated[first].matched = true
          updated[second].matched = true
          setCards(updated)
          setMatches(m => m + 1)
          setSelected([])
        }, 500)
      } else {
        setTimeout(() => {
          const updated = [...newCards]
          updated[first].flipped = false
          updated[second].flipped = false
          setCards(updated)
          setSelected([])
        }, 1000)
      }
    }
  }

  const resetGame = () => {
    setCards(createBoard())
    setSelected([])
    setMoves(0)
    setMatches(0)
    setGameOver(false)
    setTimer(0)
    setRunning(false)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div>
      {/* Stats bar */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span>⏱️</span>
          <span style={styles.statValue}>{formatTime(timer)}</span>
        </div>
        <div style={styles.statItem}>
          <span>🔄</span>
          <span style={styles.statValue}>{moves} ėjimai</span>
        </div>
        <div style={styles.statItem}>
          <span>✅</span>
          <span style={styles.statValue}>{matches}/{EMOJIS.length} poros</span>
        </div>
        <button onClick={resetGame} style={styles.resetBtn}>🔄 Iš naujo</button>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div style={styles.gameOver}>
          <span style={{ fontSize: '3rem' }}>🎉</span>
          <h3>Puiku! Radai visas poras!</h3>
          <p style={{ color: '#636E72' }}>
            Ėjimai: {moves} | Laikas: {formatTime(timer)} | Taškai: {Math.max(100 - (moves - EMOJIS.length) * 5, 10)}
          </p>
          <button onClick={resetGame} style={styles.playAgainBtn}>🔄 Žaisti dar kartą</button>
        </div>
      )}

      {/* Board */}
      <div style={styles.board}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            style={{
              ...styles.card,
              ...(card.flipped || card.matched ? styles.cardFlipped : {}),
              ...(card.matched ? styles.cardMatched : {}),
            }}
          >
            {card.flipped || card.matched ? (
              <span style={{ fontSize: '2.5rem' }}>{card.emoji}</span>
            ) : (
              <span style={{ fontSize: '2rem' }}>❓</span>
            )}
          </button>
        ))}
      </div>

      <div style={styles.hint}>
        💡 <strong>Patarimas:</strong> Stenkis atsiminti, kur mačiau kiekvieną gyvūnėlį!
      </div>
    </div>
  )
}

const styles = {
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '24px',
    padding: '16px 24px',
    borderRadius: '14px',
    background: '#F9FAFB',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.95rem',
  },
  statValue: {
    fontWeight: 800,
    color: '#2D3436',
  },
  resetBtn: {
    marginLeft: 'auto',
    padding: '8px 18px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  card: {
    aspectRatio: '1',
    borderRadius: '16px',
    border: '3px solid #E8ECF1',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'var(--font)',
    minHeight: '80px',
  },
  cardFlipped: {
    background: 'white',
    border: '3px solid #6C63FF',
    transform: 'rotateY(0deg)',
  },
  cardMatched: {
    background: 'rgba(6, 214, 160, 0.1)',
    border: '3px solid #06D6A0',
    opacity: 0.8,
  },
  gameOver: {
    textAlign: 'center',
    padding: '32px',
    marginBottom: '24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.05), rgba(108, 99, 255, 0.05))',
    border: '2px solid rgba(6, 214, 160, 0.2)',
  },
  playAgainBtn: {
    marginTop: '16px',
    padding: '12px 28px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  hint: {
    marginTop: '24px',
    padding: '14px 20px',
    borderRadius: '12px',
    background: 'rgba(255, 209, 102, 0.1)',
    fontSize: '0.9rem',
    color: '#636E72',
    textAlign: 'center',
  },
}
