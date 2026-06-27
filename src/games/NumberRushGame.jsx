import { useCallback, useEffect, useRef, useState } from 'react'
import Countdown from '../components/Countdown'

// Skaičių sprintas — inspiruota welshDog/Ultimate-ADHD-Brain-Arcade
// „Number Rush" žaidimo. 60 sek. greitos matematikos. Lavina aritmetikos
// reflexus ir veikia kaip „flow state" treniruoklis ADHD vaikams.

const DURATION_S = 60

function gen(level) {
  // level grows over time: starts +/- up to 10, scales up
  const max = Math.min(30, 5 + level * 2)
  const a = 1 + Math.floor(Math.random() * max)
  const b = 1 + Math.floor(Math.random() * max)
  const op = level < 3 ? '+' : (Math.random() < 0.55 ? '+' : '-')
  if (op === '+') return { text: `${a} + ${b}`, answer: a + b }
  // ensure non-negative
  const bigger = Math.max(a, b), smaller = Math.min(a, b)
  return { text: `${bigger} − ${smaller}`, answer: bigger - smaller }
}

export default function NumberRushGame({ onScore }) {
  const [phase, setPhase] = useState('intro') // intro | playing | done
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem('numberRushBest') || '0', 10) } catch { return 0 }
  })
  const tickRef = useRef(null)
  const audioRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }, [])

  const beep = useCallback((f, d, type = 'triangle', g = 0.18) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = type; o.frequency.value = f; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d)
    o.stop(ctx.currentTime + d)
  }, [ensureAudio])

  const start = useCallback(() => {
    ensureAudio()
    setScore(0)
    setWrong(0)
    setStreak(0)
    setBestStreak(0)
    setInput('')
    setTimeLeft(DURATION_S)
    setQuestion(gen(1))
    setPhase('countdown')
  }, [ensureAudio])

  const onCountdownDone = useCallback(() => setPhase('playing'), [])

  useEffect(() => {
    if (phase !== 'playing') return
    tickRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(tickRef.current)
          setPhase('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [phase])

  useEffect(() => {
    if (phase === 'done') {
      setBest(prev => {
        const v = Math.max(prev, score)
        try { localStorage.setItem('numberRushBest', String(v)) } catch { /* ignore */ }
        return v
      })
      onScore?.(score)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const submit = useCallback(() => {
    if (phase !== 'playing' || !question || input === '') return
    const guess = parseInt(input, 10)
    if (Number.isNaN(guess)) return
    if (guess === question.answer) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setBestStreak(b => Math.max(b, newStreak))
      const bonus = Math.min(5, Math.floor(newStreak / 3))
      setScore(s => s + 1 + bonus)
      beep(660, 0.07, 'triangle', 0.18)
      const level = Math.max(1, Math.floor((DURATION_S - timeLeft) / 8))
      setQuestion(gen(level))
    } else {
      setWrong(w => w + 1)
      setStreak(0)
      beep(180, 0.14, 'square', 0.1)
    }
    setInput('')
  }, [phase, question, input, streak, timeLeft, beep])

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== 'playing') return
      if (e.key >= '0' && e.key <= '9') setInput(prev => prev.length < 3 ? prev + e.key : prev)
      else if (e.key === 'Backspace') setInput(prev => prev.slice(0, -1))
      else if (e.key === 'Enter') submit()
      else if (e.key === '-' && !input) setInput('-')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, input, submit])

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <div style={s.title}>🔢 Skaičių sprintas</div>
        <div style={s.intro}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
            <b>Tikslas:</b> per <b>{DURATION_S} sekundes</b> teisingai atsakyk į kuo daugiau aritmetikos uždavinių.
          </p>
          <ul style={{ paddingLeft: 18, fontSize: 15, color: 'var(--ink)', lineHeight: 1.6 }}>
            <li>Įvesk atsakymą skaitmenimis (rodyklių mygtukais ar klaviatūra)</li>
            <li>Spausk <b>Enter</b> arba ✓ — patvirtinti</li>
            <li>Iš eilės teisingi atsakymai duoda bonus taškų</li>
            <li>Sunkumas didėja per sesiją</li>
          </ul>
        </div>
        <button onClick={start} style={s.bigBtn}>▶ Pradėti ({DURATION_S}s)</button>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: 'var(--text-muted)' }}>
          🏆 Geriausias rezultatas: <b>{best}</b>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div style={s.wrap}>
        <div style={s.title}>🏁 Laikas baigėsi!</div>
        <div style={s.results}>
          <div style={s.bigScore}>{score}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: -4 }}>taškai</div>
          <div style={s.statsRow}>
            <div style={s.stat}>
              <div style={s.statLabel}>Geriausias eilėje</div>
              <div style={s.statValue}>🔥 {bestStreak}</div>
            </div>
            <div style={s.stat}>
              <div style={s.statLabel}>Klaidos</div>
              <div style={s.statValue}>❌ {wrong}</div>
            </div>
            <div style={s.stat}>
              <div style={s.statLabel}>Rekordas</div>
              <div style={s.statValue}>🏆 {Math.max(best, score)}</div>
            </div>
          </div>
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Bandyti dar</button>
      </div>
    )
  }

  // playing / countdown
  return (
    <div style={{ ...s.wrap, position: 'relative' }}>
      {phase === 'countdown' && <Countdown onDone={onCountdownDone} />}
      <div style={s.hud}>
        <div style={s.scorePill}>⭐ {score}</div>
        <div style={{ ...s.timerPill, color: timeLeft <= 10 ? '#FF7A6B' : 'var(--ink)' }}>
          ⏱ {timeLeft}s
        </div>
        <div style={s.scorePill}>🔥 {streak}</div>
      </div>

      <div style={s.questionWrap}>
        <div style={s.question}>{question?.text}</div>
        <div style={{ ...s.answerBox, color: input === '' ? 'var(--text-muted)' : 'var(--ink)' }}>
          {input === '' ? '?' : input}
        </div>
      </div>

      <div style={s.pad}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => setInput(p => p.length < 3 ? p + n : p)} style={s.padBtn}>{n}</button>
        ))}
        <button onClick={() => setInput(p => p.slice(0, -1))} style={{ ...s.padBtn, background: '#FEE2E2', color: '#991B1B' }}>⌫</button>
        <button onClick={() => setInput(p => p.length < 3 ? p + '0' : p)} style={s.padBtn}>0</button>
        <button onClick={submit} style={{ ...s.padBtn, background: 'linear-gradient(135deg,#4FD1A5,#06D6A0)', color: 'white' }}>✓</button>
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: {
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24,
    color: 'var(--ink)', textAlign: 'center', marginBottom: 16,
  },
  intro: {
    background: 'white', borderRadius: 18, padding: 22,
    boxShadow: 'var(--shadow-card)', marginBottom: 18,
  },
  bigBtn: {
    background: 'linear-gradient(135deg,#FF7A6B,#FFC845)', color: 'white',
    border: 'none', borderRadius: 14,
    padding: '16px 32px', fontSize: 18, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer',
    display: 'block', margin: '0 auto',
    boxShadow: '0 10px 22px rgba(255,122,107,0.4)',
  },
  hud: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 22, gap: 10, flexWrap: 'wrap',
  },
  scorePill: {
    background: 'white', padding: '8px 16px', borderRadius: 999,
    fontWeight: 800, color: 'var(--ink)', fontSize: 15,
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  timerPill: {
    background: 'white', padding: '10px 20px', borderRadius: 999,
    fontWeight: 900, fontSize: 18,
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
    fontFamily: 'var(--font-heading)',
  },
  questionWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 14, marginBottom: 22, flexWrap: 'wrap',
  },
  question: {
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 56,
    color: 'var(--ink)', minWidth: 180, textAlign: 'center',
    background: 'white', borderRadius: 20, padding: '18px 28px',
    boxShadow: 'var(--shadow-card)',
  },
  answerBox: {
    width: 120, height: 100, borderRadius: 20,
    background: 'white', border: '4px solid var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 56,
  },
  pad: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    maxWidth: 320, margin: '0 auto',
  },
  padBtn: {
    height: 56, borderRadius: 12, border: 'none',
    background: '#F1F5F9', fontWeight: 800, fontSize: 22,
    cursor: 'pointer', fontFamily: 'var(--font-heading)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
    color: 'var(--ink)',
  },
  results: {
    background: 'linear-gradient(135deg,#EFEBFF,#FFF3DA)',
    borderRadius: 24, padding: '28px 22px', textAlign: 'center',
    marginBottom: 20,
  },
  bigScore: {
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 80,
    color: 'var(--primary)', lineHeight: 1,
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20,
  },
  stat: { background: 'white', borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' },
  statValue: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginTop: 4 },
}
