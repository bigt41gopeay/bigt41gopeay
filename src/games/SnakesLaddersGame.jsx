import { useCallback, useEffect, useRef, useState } from 'react'

// 🪜 Gyvatukai ir kopėtėlės — klasika su matematikos klausimais.
// Vaikas rita kauliuką, bet kad galėtų pajudėti, turi teisingai išspręsti
// uždavinį. Gyvatukai grąžina atgal, kopėčios kelia į priekį. Tikslas
// pasiekti 30 langelį.

const SIZE = 30
const COLS = 6
const ROWS = SIZE / COLS // 5

// snake: from -> to (down). ladder: from -> to (up)
const SNAKES = { 17: 4, 22: 8, 26: 14 }
const LADDERS = { 3: 11, 9: 20, 15: 24 }

function gen(level) {
  const max = Math.min(20, 4 + level * 2)
  const a = 1 + Math.floor(Math.random() * max)
  const b = 1 + Math.floor(Math.random() * max)
  const op = level < 2 ? '+' : (Math.random() < 0.6 ? '+' : '-')
  if (op === '+') return { text: `${a} + ${b}`, answer: a + b }
  const bigger = Math.max(a, b), smaller = Math.min(a, b)
  return { text: `${bigger} − ${smaller}`, answer: bigger - smaller }
}

function squareCenter(num) {
  // 1 is bottom-left. Rows zigzag.
  const i = num - 1
  const row = Math.floor(i / COLS)
  let col = i % COLS
  if (row % 2 === 1) col = COLS - 1 - col
  const x = col + 0.5 // 0.5..5.5
  const y = (ROWS - 1) - row + 0.5
  return { x, y }
}

export default function SnakesLaddersGame({ onScore }) {
  const [phase, setPhase] = useState('intro') // intro | rolling | solving | sliding | win
  const [pos, setPos] = useState(1)
  const [dice, setDice] = useState(null)
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [moves, setMoves] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [animatingTarget, setAnimatingTarget] = useState(null)
  const audioRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }, [])
  const beep = useCallback((f, d, type = 'triangle', g = 0.16) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = type; o.frequency.value = f; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d)
    o.stop(ctx.currentTime + d)
  }, [ensureAudio])

  const start = useCallback(() => {
    ensureAudio()
    setPos(1); setDice(null); setQuestion(null); setInput('')
    setMoves(0); setWrong(0); setAnimatingTarget(null)
    setPhase('rolling')
  }, [ensureAudio])

  const rollDice = () => {
    if (phase !== 'rolling') return
    const d = 1 + Math.floor(Math.random() * 6)
    setDice(d)
    beep(440, 0.08, 'square', 0.1)
    setTimeout(() => beep(660, 0.1, 'triangle', 0.14), 100)
    const level = Math.floor((pos - 1) / 6) + 1
    setQuestion(gen(level))
    setInput('')
    setPhase('solving')
  }

  const submit = useCallback(() => {
    if (phase !== 'solving' || !question) return
    const guess = parseInt(input, 10)
    if (Number.isNaN(guess)) return
    if (guess === question.answer) {
      beep(660, 0.1, 'triangle', 0.18)
      setTimeout(() => beep(990, 0.12, 'triangle', 0.18), 80)
      setMoves(m => m + 1)
      const target = Math.min(SIZE, pos + dice)
      setAnimatingTarget(target)
      setPhase('sliding')
      setTimeout(() => {
        let final = target
        if (SNAKES[target]) {
          final = SNAKES[target]
          beep(200, 0.3, 'sawtooth', 0.14)
        } else if (LADDERS[target]) {
          final = LADDERS[target]
          beep(1100, 0.16, 'triangle', 0.18)
          setTimeout(() => beep(1500, 0.16, 'triangle', 0.18), 100)
        }
        setPos(final)
        setAnimatingTarget(null)
        if (final >= SIZE) {
          setPhase('win')
          onScore?.(Math.max(0, 100 - wrong * 5))
        } else {
          setTimeout(() => { setDice(null); setPhase('rolling') }, 500)
        }
      }, 700)
    } else {
      setWrong(w => w + 1)
      beep(220, 0.14, 'square', 0.1)
      // wrong answer: skip the move
      setTimeout(() => {
        setDice(null); setQuestion(null); setPhase('rolling')
      }, 800)
    }
  }, [phase, question, input, pos, dice, wrong, onScore, beep])

  useEffect(() => {
    if (phase !== 'solving') return
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') setInput(p => p.length < 3 ? p + e.key : p)
      else if (e.key === 'Backspace') setInput(p => p.slice(0, -1))
      else if (e.key === 'Enter') submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, submit])

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🪜 Gyvatukai ir kopėtėlės</h3>
        <div style={s.intro}>
          <p style={{ marginBottom: 10 }}>Pasiek <b>30 langelį</b> nors ir gyvatukai trauks atgal.</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>🎲 Rita kauliuką</li>
            <li>🧮 Atsakyk į matematikos uždavinį teisingai</li>
            <li>📈 Pajudėk pirmyn pagal kauliuko skaičių</li>
            <li>🪜 Užlipi ant kopėčių? Pakili aukštyn!</li>
            <li>🐍 Užlipi ant gyvatuko? Slysti žemyn.</li>
          </ul>
        </div>
        <button onClick={start} style={s.bigBtn}>🎲 Pradėti</button>
      </div>
    )
  }

  if (phase === 'win') {
    const score = Math.max(0, 100 - wrong * 5)
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🏆 Pavyko!</h3>
        <div style={{ ...s.intro, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 56, color: 'var(--primary)' }}>{score}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>taškai · {moves} ėjimų · {wrong} klaidų</div>
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Žaisti dar</button>
      </div>
    )
  }

  // playing
  return (
    <div style={s.wrap}>
      <div style={s.hud}>
        <div style={s.scorePill}>📍 {pos} / {SIZE}</div>
        <div style={s.scorePill}>🎯 {moves} ėjimų</div>
        <div style={s.scorePill}>❌ {wrong}</div>
      </div>

      <div style={s.board}>
        {/* squares */}
        {Array.from({ length: SIZE }, (_, idx) => {
          const num = idx + 1
          const { x, y } = squareCenter(num)
          const isSnake = !!SNAKES[num]
          const isLadder = !!LADDERS[num]
          const isPlayer = pos === num
          const isTarget = animatingTarget === num
          return (
            <div
              key={num}
              style={{
                ...s.cell,
                left: `${(x - 0.5) * (100 / COLS)}%`,
                top: `${(y - 0.5) * (100 / ROWS)}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
                background: isPlayer
                  ? 'linear-gradient(135deg,#FFC845,#FF7A6B)'
                  : isTarget
                    ? '#FEF3C7'
                    : isSnake ? 'rgba(255,122,107,0.15)'
                    : isLadder ? 'rgba(79,209,165,0.18)'
                    : (num + Math.floor((num - 1) / COLS)) % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(239,235,255,0.85)',
                outline: num === SIZE ? '3px solid #FFC845' : 'none',
              }}
            >
              <div style={s.cellNum}>{num}</div>
              {isSnake && <div style={s.cellIcon}>🐍</div>}
              {isLadder && <div style={s.cellIcon}>🪜</div>}
              {num === SIZE && <div style={s.cellIcon}>🏆</div>}
              {isPlayer && <div style={s.player}>🐢</div>}
            </div>
          )
        })}
      </div>

      <div style={s.controlsRow}>
        {phase === 'rolling' && (
          <button onClick={rollDice} style={s.bigBtn}>🎲 Rita kauliuką</button>
        )}
        {phase === 'solving' && question && (
          <div style={s.solveBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={s.diceShow}>🎲 {dice}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                {question.text} = ?
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={s.answerBox}>{input || '?'}</div>
              <div style={s.pad}>
                {[1,2,3,4,5,6,7,8,9,0].map(n => (
                  <button key={n} onClick={() => setInput(p => p.length < 3 ? p + n : p)} style={s.padBtn}>{n}</button>
                ))}
                <button onClick={() => setInput(p => p.slice(0, -1))} style={{ ...s.padBtn, background: '#FEE2E2' }}>⌫</button>
                <button onClick={submit} style={{ ...s.padBtn, background: 'linear-gradient(135deg,#4FD1A5,#06D6A0)', color: 'white' }}>✓</button>
              </div>
            </div>
          </div>
        )}
        {phase === 'sliding' && (
          <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>… judam …</div>
        )}
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', textAlign: 'center', marginBottom: 16 },
  intro: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 18, fontSize: 15, lineHeight: 1.55, color: 'var(--ink)' },
  bigBtn: {
    background: 'linear-gradient(135deg,#4FD1A5,#6C63FF)', color: 'white',
    border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 16, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', margin: '0 auto', display: 'block',
    boxShadow: '0 10px 22px rgba(108,99,255,0.35)',
  },
  hud: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  scorePill: { background: 'white', padding: '6px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 13, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  board: {
    position: 'relative',
    width: '100%',
    aspectRatio: `${COLS} / ${ROWS}`,
    background: 'linear-gradient(180deg,#FFF3DA,#EFEBFF)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  cell: {
    position: 'absolute',
    border: '1px solid rgba(108,99,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.25s',
  },
  cellNum: { position: 'absolute', top: 4, left: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' },
  cellIcon: { fontSize: 24, opacity: 0.8 },
  player: { fontSize: 32, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' },
  controlsRow: { minHeight: 70 },
  solveBox: { background: 'white', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)' },
  diceShow: {
    background: 'var(--primary)', color: 'white',
    padding: '8px 16px', borderRadius: 12,
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22,
  },
  answerBox: {
    width: 90, height: 80, borderRadius: 16,
    border: '4px solid var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, color: 'var(--ink)',
  },
  pad: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, flex: 1 },
  padBtn: { height: 38, borderRadius: 10, border: 'none', background: '#F1F5F9', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
}
