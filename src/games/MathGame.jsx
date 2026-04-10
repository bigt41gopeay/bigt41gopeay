import { useState, useEffect, useCallback } from 'react'

function generateProblem(difficulty) {
  const ops = ['+', '-', '×']
  const op = ops[Math.floor(Math.random() * (difficulty > 5 ? 3 : 2))]
  let a, b, answer

  if (op === '+') {
    a = Math.floor(Math.random() * (10 + difficulty * 5)) + 1
    b = Math.floor(Math.random() * (10 + difficulty * 3)) + 1
    answer = a + b
  } else if (op === '-') {
    a = Math.floor(Math.random() * (15 + difficulty * 5)) + 5
    b = Math.floor(Math.random() * a) + 1
    answer = a - b
  } else {
    a = Math.floor(Math.random() * (5 + difficulty)) + 1
    b = Math.floor(Math.random() * 10) + 1
    answer = a * b
  }

  const wrongAnswers = new Set()
  while (wrongAnswers.size < 3) {
    const wrong = answer + (Math.floor(Math.random() * 10) - 5)
    if (wrong !== answer && wrong >= 0) wrongAnswers.add(wrong)
  }

  const options = shuffleArray([answer, ...wrongAnswers])
  return { a, b, op, answer, options }
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MathGame({ onScore }) {
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [problem, setProblem] = useState(() => generateProblem(1))
  const [feedback, setFeedback] = useState(null)
  const [questionNum, setQuestionNum] = useState(1)
  const [timeLeft, setTimeLeft] = useState(30)
  const [gameActive, setGameActive] = useState(true)
  const [difficulty, setDifficulty] = useState(1)

  useEffect(() => {
    if (!gameActive) return
    if (timeLeft <= 0) {
      setGameActive(false)
      onScore(score)
      return
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, gameActive, score, onScore])

  const handleAnswer = useCallback((chosen) => {
    if (!gameActive) return

    if (chosen === problem.answer) {
      const points = 10 + streak * 2
      setScore(s => s + points)
      setStreak(s => {
        const newStreak = s + 1
        if (newStreak > bestStreak) setBestStreak(newStreak)
        return newStreak
      })
      setFeedback({ correct: true, points })
      setTimeLeft(t => Math.min(t + 3, 30))
      setDifficulty(d => Math.min(d + 0.3, 10))
    } else {
      setStreak(0)
      setFeedback({ correct: false, correctAnswer: problem.answer })
    }

    setTimeout(() => {
      setFeedback(null)
      setProblem(generateProblem(Math.floor(difficulty)))
      setQuestionNum(n => n + 1)
    }, 800)
  }, [gameActive, problem, streak, bestStreak, difficulty])

  const resetGame = () => {
    setScore(0)
    setStreak(0)
    setDifficulty(1)
    setProblem(generateProblem(1))
    setFeedback(null)
    setQuestionNum(1)
    setTimeLeft(30)
    setGameActive(true)
  }

  return (
    <div>
      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span>⏱️</span>
          <span style={{ ...styles.statValue, color: timeLeft <= 5 ? '#FF6B35' : '#2D3436' }}>
            {timeLeft}s
          </span>
        </div>
        <div style={styles.statItem}>
          <span>🏆</span>
          <span style={styles.statValue}>{score} tšk.</span>
        </div>
        <div style={styles.statItem}>
          <span>🔥</span>
          <span style={styles.statValue}>{streak} iš eilės</span>
        </div>
        <div style={styles.statItem}>
          <span>📊</span>
          <span style={styles.statValue}>#{questionNum}</span>
        </div>
        <button onClick={resetGame} style={styles.resetBtn}>🔄 Iš naujo</button>
      </div>

      {/* Timer bar */}
      <div style={styles.timerBar}>
        <div style={{ ...styles.timerFill, width: `${(timeLeft / 30) * 100}%`, background: timeLeft <= 5 ? '#FF6B35' : timeLeft <= 10 ? '#FFD166' : '#06D6A0' }} />
      </div>

      {/* Game Over */}
      {!gameActive && (
        <div style={styles.gameOver}>
          <span style={{ fontSize: '3rem' }}>🏆</span>
          <h3>Laikas baigėsi!</h3>
          <div style={styles.finalStats}>
            <div style={styles.finalStat}>
              <span style={styles.finalStatNum}>{score}</span>
              <span style={styles.finalStatLabel}>Taškai</span>
            </div>
            <div style={styles.finalStat}>
              <span style={styles.finalStatNum}>{questionNum - 1}</span>
              <span style={styles.finalStatLabel}>Klausimai</span>
            </div>
            <div style={styles.finalStat}>
              <span style={styles.finalStatNum}>{bestStreak}</span>
              <span style={styles.finalStatLabel}>Ger. serija</span>
            </div>
          </div>
          <button onClick={resetGame} style={styles.playAgainBtn}>🔄 Žaisti dar kartą</button>
        </div>
      )}

      {/* Problem */}
      {gameActive && (
        <div style={styles.problemArea}>
          {feedback && (
            <div style={{
              ...styles.feedback,
              background: feedback.correct ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 107, 138, 0.1)',
              borderColor: feedback.correct ? '#06D6A0' : '#FF6B8A',
              color: feedback.correct ? '#06D6A0' : '#FF6B8A',
            }}>
              {feedback.correct ? `✓ Teisingai! +${feedback.points} tšk.` : `✕ Neteisingai. Teisingas: ${feedback.correctAnswer}`}
            </div>
          )}

          <div style={styles.equation}>
            <span style={styles.number}>{problem.a}</span>
            <span style={styles.operator}>{problem.op}</span>
            <span style={styles.number}>{problem.b}</span>
            <span style={styles.equals}>=</span>
            <span style={styles.question}>?</span>
          </div>

          <div style={styles.options}>
            {problem.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                style={styles.optionBtn}
              >
                {opt}
              </button>
            ))}
          </div>

          {streak >= 3 && (
            <div style={styles.streakBanner}>
              🔥 {streak} teisingi iš eilės! Bonus +{streak * 2} tšk.!
            </div>
          )}
        </div>
      )}

      <div style={styles.hint}>
        💡 <strong>Patarimas:</strong> Kuo daugiau teisingų atsakymų iš eilės, tuo daugiau taškų gauni! +3s už kiekvieną teisingą.
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
  timerBar: {
    height: '6px',
    borderRadius: '3px',
    background: '#E8ECF1',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s linear, background 0.3s',
  },
  gameOver: {
    textAlign: 'center',
    padding: '40px',
    marginBottom: '24px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(255, 209, 102, 0.05))',
    border: '2px solid rgba(108, 99, 255, 0.1)',
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
  },
  finalStatNum: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  finalStatLabel: {
    fontSize: '0.85rem',
    color: '#636E72',
    fontWeight: 600,
  },
  playAgainBtn: {
    padding: '14px 32px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FF6B35, #FFD166)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  problemArea: {
    textAlign: 'center',
    padding: '24px 0',
  },
  feedback: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: '2px solid',
    fontWeight: 800,
    marginBottom: '24px',
    display: 'inline-block',
    animation: 'fadeInUp 0.3s ease-out',
  },
  equation: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  number: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#2D3436',
  },
  operator: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#6C63FF',
  },
  equals: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#636E72',
  },
  question: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#FF6B35',
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    background: 'rgba(255, 107, 53, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  optionBtn: {
    padding: '20px',
    borderRadius: '14px',
    border: '3px solid #E8ECF1',
    background: 'white',
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#2D3436',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
  },
  streakBanner: {
    marginTop: '20px',
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 209, 102, 0.1))',
    color: '#FF6B35',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'inline-block',
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
