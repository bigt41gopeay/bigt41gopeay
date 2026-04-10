import { useState, useEffect } from 'react'

const COLORS = [
  { name: 'Raudona', hex: '#FF4444', emoji: '🔴' },
  { name: 'Mėlyna', hex: '#4488FF', emoji: '🔵' },
  { name: 'Žalia', hex: '#44CC44', emoji: '🟢' },
  { name: 'Geltona', hex: '#FFCC00', emoji: '🟡' },
  { name: 'Oranžinė', hex: '#FF8800', emoji: '🟠' },
  { name: 'Violetinė', hex: '#9944FF', emoji: '🟣' },
  { name: 'Rožinė', hex: '#FF69B4', emoji: '💗' },
  { name: 'Ruda', hex: '#8B4513', emoji: '🟤' },
]

const MIX_CHALLENGES = [
  { mix: ['Raudona', 'Mėlyna'], result: 'Violetinė', emoji: '🟣' },
  { mix: ['Raudona', 'Geltona'], result: 'Oranžinė', emoji: '🟠' },
  { mix: ['Mėlyna', 'Geltona'], result: 'Žalia', emoji: '🟢' },
  { mix: ['Raudona', 'Rožinė'], result: 'Rožinė', emoji: '💗' },
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ColorGame({ onScore }) {
  const [mode, setMode] = useState('identify') // identify, mix
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [totalRounds] = useState(10)
  const [currentColor, setCurrentColor] = useState(null)
  const [options, setOptions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [streak, setStreak] = useState(0)
  const [mixChallenge, setMixChallenge] = useState(null)
  const [gameOver, setGameOver] = useState(false)

  const startIdentifyRound = () => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const wrongColors = shuffleArray(COLORS.filter(c => c.name !== color.name)).slice(0, 3)
    setCurrentColor(color)
    setOptions(shuffleArray([color, ...wrongColors]))
    setMixChallenge(null)
  }

  const startMixRound = () => {
    const challenge = MIX_CHALLENGES[Math.floor(Math.random() * MIX_CHALLENGES.length)]
    const wrongAnswers = shuffleArray(COLORS.filter(c => c.name !== challenge.result)).slice(0, 3)
    const resultColor = COLORS.find(c => c.name === challenge.result)
    setMixChallenge(challenge)
    setCurrentColor(null)
    setOptions(shuffleArray([resultColor, ...wrongAnswers]))
  }

  useEffect(() => {
    if (round < totalRounds && !gameOver) {
      if (round % 3 === 2 && round > 0) {
        startMixRound()
      } else {
        startIdentifyRound()
      }
    } else if (round >= totalRounds) {
      setGameOver(true)
      onScore(score)
    }
  }, [round])

  useEffect(() => {
    startIdentifyRound()
  }, [])

  const handleAnswer = (color) => {
    const isCorrect = mixChallenge
      ? color.name === mixChallenge.result
      : color.name === currentColor.name

    if (isCorrect) {
      const points = 10 + streak * 2
      setScore(s => s + points)
      setStreak(s => s + 1)
      setFeedback({ correct: true, text: `Teisingai! +${points} tšk.`, colorName: color.name })
    } else {
      setStreak(0)
      const correctName = mixChallenge ? mixChallenge.result : currentColor.name
      setFeedback({ correct: false, text: `Neteisingai. Teisingas: ${correctName}` })
    }

    setTimeout(() => {
      setFeedback(null)
      setRound(r => r + 1)
    }, 1200)
  }

  const resetGame = () => {
    setScore(0)
    setRound(0)
    setStreak(0)
    setFeedback(null)
    setGameOver(false)
    setMode('identify')
    startIdentifyRound()
  }

  if (gameOver) {
    return (
      <div style={styles.gameOver}>
        <span style={{ fontSize: '3rem' }}>🎨</span>
        <h3>Puiku! Žaidimas baigtas!</h3>
        <div style={styles.finalStats}>
          <div style={styles.finalStat}>
            <span style={styles.finalNum}>{score}</span>
            <span>Taškai</span>
          </div>
          <div style={styles.finalStat}>
            <span style={styles.finalNum}>{totalRounds}</span>
            <span>Raundai</span>
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
          <span>🎯</span>
          <span style={styles.statValue}>{round + 1}/{totalRounds}</span>
        </div>
        <div style={styles.statItem}>
          <span>🔥</span>
          <span style={styles.statValue}>{streak} iš eilės</span>
        </div>
        <button onClick={resetGame} style={styles.resetBtn}>🔄 Iš naujo</button>
      </div>

      {/* Progress */}
      <div style={styles.progress}>
        <div style={{ ...styles.progressFill, width: `${((round) / totalRounds) * 100}%` }} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          ...styles.feedback,
          background: feedback.correct ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 138, 0.1)',
          borderColor: feedback.correct ? '#06D6A0' : '#FF6B8A',
          color: feedback.correct ? '#06D6A0' : '#FF6B8A',
        }}>
          {feedback.text}
        </div>
      )}

      {/* Challenge */}
      <div style={styles.challenge}>
        {mixChallenge ? (
          <>
            <h3 style={styles.challengeTitle}>🎨 Kokia spalva gaunasi sumaišius?</h3>
            <div style={styles.mixDisplay}>
              <div style={{
                ...styles.colorCircle,
                background: COLORS.find(c => c.name === mixChallenge.mix[0])?.hex,
              }} />
              <span style={{ fontSize: '2rem', fontWeight: 900 }}>+</span>
              <div style={{
                ...styles.colorCircle,
                background: COLORS.find(c => c.name === mixChallenge.mix[1])?.hex,
              }} />
              <span style={{ fontSize: '2rem', fontWeight: 900 }}>=</span>
              <div style={styles.questionCircle}>?</div>
            </div>
          </>
        ) : currentColor && (
          <>
            <h3 style={styles.challengeTitle}>Kokia tai spalva?</h3>
            <div style={{
              ...styles.bigColorCircle,
              background: currentColor.hex,
            }}>
              <span style={{ fontSize: '3rem' }}>{currentColor.emoji}</span>
            </div>
          </>
        )}
      </div>

      {/* Options */}
      <div style={styles.options}>
        {options.map((color, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(color)}
            style={styles.optionBtn}
          >
            <div style={{ ...styles.optionColor, background: color.hex }} />
            <span style={{ fontWeight: 800 }}>{color.name}</span>
          </button>
        ))}
      </div>

      <div style={styles.hint}>
        💡 <strong>Patarimas:</strong> {mixChallenge
          ? 'Pagalvok, kokia spalva gaunasi sumaišius dvi spalvas!'
          : 'Atpažink spalvą ir pasirink teisingą atsakymą!'}
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
  progress: {
    height: '6px',
    borderRadius: '3px',
    background: '#E8ECF1',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(135deg, #FF6B8A, #FFD166)',
    transition: 'width 0.5s ease',
  },
  feedback: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: '2px solid',
    fontWeight: 800,
    marginBottom: '20px',
    textAlign: 'center',
  },
  challenge: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  challengeTitle: {
    marginBottom: '24px',
    fontSize: '1.3rem',
  },
  mixDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  colorCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
  },
  questionCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '4px dashed #E8ECF1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#636E72',
  },
  bigColorCircle: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  },
  options: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '14px',
    border: '3px solid #E8ECF1',
    background: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  optionColor: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    flexShrink: 0,
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
  finalNum: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  playAgainBtn: {
    padding: '14px 32px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FF6B8A, #FFD166)',
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
