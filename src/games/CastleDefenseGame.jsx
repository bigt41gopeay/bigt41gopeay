import { useCallback, useEffect, useRef, useState } from 'react'
import Countdown from '../components/Countdown'

// 🏰 Pilies gynyba — pabaisos artėja iš dešinės. Kad sustabdytum, paspausk
// pabaisą ir teisingai išspręsk matematikos uždavinį. Vis greitėjantys
// bangos lavina greitą skaičiavimą ir dėmesį.

const FIELD_W = 600
const FIELD_H = 280
const CASTLE_X = 60

function gen(level) {
  const max = Math.min(20, 5 + level * 2)
  const a = 1 + Math.floor(Math.random() * max)
  const b = 1 + Math.floor(Math.random() * max)
  const op = level < 2 ? '+' : (Math.random() < 0.6 ? '+' : '-')
  if (op === '+') return { text: `${a}+${b}`, answer: a + b }
  const bigger = Math.max(a, b), smaller = Math.min(a, b)
  return { text: `${bigger}−${smaller}`, answer: bigger - smaller }
}

const MONSTERS = ['👹','🐉','🧟','👻','🦇','🐲']

export default function CastleDefenseGame({ onScore }) {
  const [phase, setPhase] = useState('intro')
  const [monsters, setMonsters] = useState([])
  const [hp, setHp] = useState(5)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [selected, setSelected] = useState(null)
  const [input, setInput] = useState('')
  const monsterIdRef = useRef(0)
  const audioRef = useRef(null)
  const lastSpawnRef = useRef(0)
  const rafRef = useRef(0)

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
    setMonsters([])
    setHp(5)
    setScore(0)
    setWave(1)
    setSelected(null)
    setInput('')
    monsterIdRef.current = 0
    lastSpawnRef.current = 0
    setPhase('countdown')
  }, [ensureAudio])

  const onCountdownDone = useCallback(() => {
    lastSpawnRef.current = 0
    setPhase('playing')
  }, [])

  const spawn = useCallback((t) => {
    setMonsters(prev => {
      const q = gen(wave)
      return [
        ...prev,
        {
          id: ++monsterIdRef.current,
          x: FIELD_W,
          y: 30 + Math.random() * (FIELD_H - 110),
          emoji: MONSTERS[Math.floor(Math.random() * MONSTERS.length)],
          speed: 0.35 + wave * 0.06 + Math.random() * 0.2,
          q,
        },
      ]
    })
    lastSpawnRef.current = t
  }, [wave])

  useEffect(() => {
    if (phase !== 'playing') return
    let lastT = performance.now()
    const tick = (t) => {
      const dt = Math.min(40, t - lastT)
      lastT = t

      // spawn (interval shrinks as wave grows)
      const interval = Math.max(900, 1800 - wave * 100)
      if (t - lastSpawnRef.current > interval) spawn(t)

      // move + collide with castle
      setMonsters(prev => {
        let dmg = 0
        const next = prev
          .map(m => ({ ...m, x: m.x - m.speed * dt * 0.06 }))
          .filter(m => {
            if (m.x <= CASTLE_X + 20) { dmg++; return false }
            return true
          })
        if (dmg > 0) {
          setHp(h => {
            const v = h - dmg
            beep(180, 0.18, 'sawtooth', 0.18)
            if (v <= 0) {
              setPhase('over')
              onScore?.(score)
            }
            return Math.max(0, v)
          })
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, wave, spawn])

  // wave progression
  useEffect(() => {
    if (phase !== 'playing') return
    if (score > 0 && score % 5 === 0) {
      setWave(w => Math.min(8, w + 1))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  const tap = (m) => {
    setSelected(m)
    setInput('')
  }

  const submit = useCallback(() => {
    if (!selected) return
    const guess = parseInt(input, 10)
    if (Number.isNaN(guess)) return
    if (guess === selected.q.answer) {
      setMonsters(prev => prev.filter(x => x.id !== selected.id))
      setScore(s => s + 1)
      beep(660, 0.1, 'triangle', 0.18)
      setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 80)
    } else {
      beep(220, 0.14, 'square', 0.1)
    }
    setSelected(null)
    setInput('')
  }, [selected, input, beep])

  useEffect(() => {
    if (!selected) return
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') setInput(p => p.length < 3 ? p + e.key : p)
      else if (e.key === 'Backspace') setInput(p => p.slice(0, -1))
      else if (e.key === 'Enter') submit()
      else if (e.key === 'Escape') { setSelected(null); setInput('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, submit])

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🏰 Pilies gynyba</h3>
        <div style={s.intro}>
          <p style={{ marginBottom: 10 }}>Pabaisos artėja link tavo pilies! Norėdamas jas sustabdyti:</p>
          <ol style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Spustelėk ant pabaisos</li>
            <li>Atsiras matematikos uždavinys</li>
            <li>Įvesk atsakymą ir spausk Enter / ✓</li>
            <li>Teisingai? Pabaisa dingsta. Klaida? Lieka eit toliau.</li>
          </ol>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>Turi 5 širdis. Pabaisai pasiekus pilį — netenki vienos.</p>
        </div>
        <button onClick={start} style={s.bigBtn}>⚔️ Pradėti gynybą</button>
      </div>
    )
  }

  if (phase === 'over') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>💀 Pilis krito</h3>
        <div style={{ ...s.intro, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 60, color: 'var(--primary)' }}>{score}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>nukautų pabaisų · {wave} banga pasiekta</div>
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Bandyti dar</button>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.hud}>
        <div style={s.scorePill}>⭐ {score}</div>
        <div style={s.hearts}>{'❤️'.repeat(hp)}{'🖤'.repeat(Math.max(0, 5 - hp))}</div>
        <div style={s.scorePill}>🌊 Banga {wave}</div>
      </div>

      <div style={s.field}>
        {phase === 'countdown' && <Countdown onDone={onCountdownDone} />}
        {/* castle */}
        <div style={{ ...s.castle, left: 0 }}>🏰</div>

        {monsters.map(m => (
          <button
            key={m.id}
            onClick={() => tap(m)}
            style={{
              ...s.monster,
              left: m.x,
              top: m.y,
              outline: selected?.id === m.id ? '4px solid #FFC845' : 'none',
            }}
          >
            <span style={s.monsterQ}>{m.q.text}</span>
            <span style={{ fontSize: 36 }}>{m.emoji}</span>
          </button>
        ))}

        {/* ground */}
        <div style={s.ground} />
      </div>

      {selected && (
        <div style={s.solveBox}>
          <div style={s.solveTitle}>
            <span style={{ fontSize: 28 }}>{selected.emoji}</span>
            <span>Išspręsk: <b>{selected.q.text} = ?</b></span>
          </div>
          <div style={s.solveRow}>
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
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', textAlign: 'center', marginBottom: 16 },
  intro: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 18, fontSize: 15, lineHeight: 1.55, color: 'var(--ink)' },
  bigBtn: {
    background: 'linear-gradient(135deg,#FF7A6B,#9B5DE5)', color: 'white',
    border: 'none', borderRadius: 14, padding: '16px 32px', fontSize: 18, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', display: 'block', margin: '0 auto',
    boxShadow: '0 10px 22px rgba(155,93,229,0.4)',
  },
  hud: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  scorePill: { background: 'white', padding: '8px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 14, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  hearts: { fontSize: 18, letterSpacing: 2 },
  field: {
    position: 'relative',
    width: '100%',
    maxWidth: FIELD_W,
    height: FIELD_H,
    margin: '0 auto',
    background: 'linear-gradient(180deg, #C7E8FF 0%, #9DD1FF 50%, #6FB4E8 100%)',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)',
  },
  castle: {
    position: 'absolute', bottom: 40, left: 12,
    fontSize: 80, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
    zIndex: 2,
  },
  ground: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
    background: 'linear-gradient(180deg, #4FD1A5, #2A9D7C)',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.15)',
  },
  monster: {
    position: 'absolute',
    background: 'rgba(255,255,255,0.95)',
    border: 'none',
    borderRadius: 14,
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
    transition: 'outline 0.1s',
    zIndex: 3,
  },
  monsterQ: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--ink)' },
  solveBox: { marginTop: 14, background: 'white', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)' },
  solveTitle: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--ink)', marginBottom: 14 },
  solveRow: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14, alignItems: 'center' },
  answerBox: {
    width: 100, height: 100, borderRadius: 18,
    border: '4px solid var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 48, color: 'var(--ink)',
  },
  pad: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 },
  padBtn: { height: 44, borderRadius: 10, border: 'none', background: '#F1F5F9', fontWeight: 800, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
}
