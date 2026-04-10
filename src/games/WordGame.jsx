import { useState, useEffect } from 'react'

const WORDS = [
  { word: 'SAULĖ', hint: 'Šviečia danguje dieną ☀️', category: 'Gamta' },
  { word: 'KATĖ', hint: 'Naminis gyvūnėlis, kuris murka 🐱', category: 'Gyvūnai' },
  { word: 'MEDIS', hint: 'Auga miške, turi lapus 🌳', category: 'Gamta' },
  { word: 'KNYGA', hint: 'Ją skaitome ir mokomės 📖', category: 'Daiktai' },
  { word: 'ŽUVIS', hint: 'Gyvena vandenyje 🐟', category: 'Gyvūnai' },
  { word: 'NAMAS', hint: 'Čia gyvename 🏠', category: 'Daiktai' },
  { word: 'OBUOLYS', hint: 'Raudonas ar žalias vaisius 🍎', category: 'Maistas' },
  { word: 'ŠIRDIS', hint: 'Plaka mūsų krūtinėje ❤️', category: 'Kūnas' },
  { word: 'VANDUO', hint: 'Jį geriame kiekvieną dieną 💧', category: 'Gamta' },
  { word: 'PIEŠTI', hint: 'Kuriame paveikslus 🎨', category: 'Veikla' },
  { word: 'MĖNULIS', hint: 'Šviečia danguje naktį 🌙', category: 'Gamta' },
  { word: 'DRUGELIS', hint: 'Skraido ir turi spalvingus sparnus 🦋', category: 'Gyvūnai' },
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WordGame({ onScore }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [guessed, setGuessed] = useState([])
  const [wrong, setWrong] = useState(0)
  const [score, setScore] = useState(0)
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [gameWords] = useState(() => shuffleArray(WORDS).slice(0, 8))
  const [showHint, setShowHint] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const currentWord = gameWords[wordIndex]
  const maxWrong = 6
  const isWordComplete = currentWord && currentWord.word.split('').every(l => guessed.includes(l))
  const isGameOver = wrong >= maxWrong
  const allDone = wordIndex >= gameWords.length

  useEffect(() => {
    if (isWordComplete && !allDone) {
      const bonus = showHint ? 5 : 10
      const wordScore = bonus + Math.max(0, (maxWrong - wrong) * 3)
      setScore(s => s + wordScore)
      setWordsCompleted(w => w + 1)
      setFeedback({ text: `Teisingai! +${wordScore} tšk.`, type: 'success' })

      setTimeout(() => {
        setFeedback(null)
        if (wordIndex + 1 < gameWords.length) {
          setWordIndex(i => i + 1)
          setGuessed([])
          setWrong(0)
          setShowHint(false)
        } else {
          onScore(score + wordScore)
        }
      }, 1500)
    }
  }, [isWordComplete])

  useEffect(() => {
    if (isGameOver) {
      setFeedback({ text: `Žodis buvo: ${currentWord.word}`, type: 'error' })
      setTimeout(() => {
        setFeedback(null)
        if (wordIndex + 1 < gameWords.length) {
          setWordIndex(i => i + 1)
          setGuessed([])
          setWrong(0)
          setShowHint(false)
        } else {
          onScore(score)
        }
      }, 2000)
    }
  }, [isGameOver])

  const handleLetter = (letter) => {
    if (guessed.includes(letter) || isWordComplete || isGameOver) return
    setGuessed([...guessed, letter])
    if (!currentWord.word.includes(letter)) {
      setWrong(w => w + 1)
    }
  }

  const resetGame = () => {
    setWordIndex(0)
    setGuessed([])
    setWrong(0)
    setScore(0)
    setWordsCompleted(0)
    setShowHint(false)
    setFeedback(null)
  }

  const ALPHABET = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

  if (allDone) {
    return (
      <div style={styles.gameOver}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h3>Žaidimas baigtas!</h3>
        <div style={styles.finalStats}>
          <div style={styles.finalStat}>
            <span style={styles.finalStatNum}>{score}</span>
            <span>Taškai</span>
          </div>
          <div style={styles.finalStat}>
            <span style={styles.finalStatNum}>{wordsCompleted}</span>
            <span>Atspėta</span>
          </div>
        </div>
        <button onClick={resetGame} style={styles.playAgainBtn}>🔄 Žaisti dar kartą</button>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span>🏆</span>
          <span style={styles.statValue}>{score} tšk.</span>
        </div>
        <div style={styles.statItem}>
          <span>📖</span>
          <span style={styles.statValue}>{wordIndex + 1}/{gameWords.length}</span>
        </div>
        <div style={styles.statItem}>
          <span>❤️</span>
          <span style={styles.statValue}>{maxWrong - wrong} gyvybės</span>
        </div>
        <div style={styles.statItem}>
          <span>🏷️</span>
          <span style={styles.statValue}>{currentWord.category}</span>
        </div>
        <button onClick={resetGame} style={styles.resetBtn}>🔄 Iš naujo</button>
      </div>

      {/* Lives */}
      <div style={styles.lives}>
        {Array.from({ length: maxWrong }).map((_, i) => (
          <span key={i} style={{ fontSize: '1.5rem', opacity: i < wrong ? 0.2 : 1 }}>
            ❤️
          </span>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          ...styles.feedback,
          background: feedback.type === 'success' ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 138, 0.1)',
          borderColor: feedback.type === 'success' ? '#06D6A0' : '#FF6B8A',
          color: feedback.type === 'success' ? '#06D6A0' : '#FF6B8A',
        }}>
          {feedback.text}
        </div>
      )}

      {/* Word Display */}
      <div style={styles.wordDisplay}>
        {currentWord.word.split('').map((letter, i) => (
          <div key={i} style={{
            ...styles.letterBox,
            ...(guessed.includes(letter) ? styles.letterRevealed : {}),
          }}>
            {guessed.includes(letter) ? letter : ''}
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={styles.hintArea}>
        {showHint ? (
          <p style={styles.hintText}>💡 {currentWord.hint}</p>
        ) : (
          <button onClick={() => setShowHint(true)} style={styles.hintBtn}>
            💡 Rodyti užuominą (-5 tšk.)
          </button>
        )}
      </div>

      {/* Keyboard */}
      <div style={styles.keyboard}>
        {ALPHABET.map(letter => {
          const isGuessed = guessed.includes(letter)
          const isCorrect = isGuessed && currentWord.word.includes(letter)
          const isWrong = isGuessed && !currentWord.word.includes(letter)
          return (
            <button
              key={letter}
              onClick={() => handleLetter(letter)}
              disabled={isGuessed}
              style={{
                ...styles.keyBtn,
                ...(isCorrect ? styles.keyCorrect : {}),
                ...(isWrong ? styles.keyWrong : {}),
                ...(isGuessed ? { cursor: 'default' } : {}),
              }}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '16px',
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
  lives: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  feedback: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: '2px solid',
    fontWeight: 800,
    marginBottom: '20px',
    textAlign: 'center',
  },
  wordDisplay: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  letterBox: {
    width: '52px',
    height: '60px',
    borderRadius: '12px',
    border: '3px solid #E8ECF1',
    background: '#F9FAFB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#2D3436',
    transition: 'all 0.3s ease',
  },
  letterRevealed: {
    borderColor: '#06D6A0',
    background: 'rgba(6, 214, 160, 0.1)',
    color: '#06D6A0',
  },
  hintArea: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  hintText: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'rgba(255, 209, 102, 0.1)',
    fontSize: '1rem',
    color: '#636E72',
    display: 'inline-block',
  },
  hintBtn: {
    padding: '10px 24px',
    borderRadius: '12px',
    border: '2px solid #FFD166',
    background: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  keyboard: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '6px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  keyBtn: {
    width: '42px',
    height: '46px',
    borderRadius: '10px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '1rem',
    fontWeight: 800,
    color: '#2D3436',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  keyCorrect: {
    background: '#06D6A0',
    color: 'white',
    borderColor: '#06D6A0',
  },
  keyWrong: {
    background: '#FF6B8A',
    color: 'white',
    borderColor: '#FF6B8A',
    opacity: 0.5,
  },
  gameOver: {
    textAlign: 'center',
    padding: '48px',
  },
  finalStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    margin: '24px 0',
  },
  finalStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.85rem',
    color: '#636E72',
    fontWeight: 600,
  },
  finalStatNum: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  playAgainBtn: {
    padding: '14px 32px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
}
