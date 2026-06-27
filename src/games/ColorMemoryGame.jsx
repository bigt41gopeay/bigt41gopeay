import { useCallback, useEffect, useRef, useState } from 'react'

// Spalvų atmintis (Simon Says) — inspiruota welshDog/Ultimate-ADHD-Brain-Arcade
// „Color Cascade" žaidimo. Klasikinis sekos atminties testas: kompiuteris
// rodo spalvų seką, vaikas turi pakartoti. Su kiekvienu raundu seka ilgėja.

const PADS = [
  { id: 0, name: 'Žalia',     color: '#4FD1A5', dim: '#2A9D7C', freq: 392 }, // G4
  { id: 1, name: 'Raudona',   color: '#FF7A6B', dim: '#B8443A', freq: 330 }, // E4
  { id: 2, name: 'Geltona',   color: '#FFC845', dim: '#C8881E', freq: 494 }, // B4
  { id: 3, name: 'Mėlyna',    color: '#6C63FF', dim: '#5048C7', freq: 262 }, // C4
]

const FLASH_MS = 520
const PAUSE_MS = 280

export default function ColorMemoryGame({ onScore }) {
  const [phase, setPhase] = useState('ready') // ready | showing | input | win | lose
  const [sequence, setSequence] = useState([])
  const [inputIdx, setInputIdx] = useState(0)
  const [activePad, setActivePad] = useState(null)
  const [round, setRound] = useState(0)
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem('colorMemoryBest') || '0', 10) } catch { return 0 }
  })
  const audioRef = useRef(null)
  const seqTimerRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }, [])

  const playTone = useCallback((freq, duration = 0.35, type = 'sine', gain = 0.18) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.value = gain
    o.connect(g); g.connect(ctx.destination); o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    o.stop(ctx.currentTime + duration)
  }, [ensureAudio])

  const showSequence = useCallback((seq) => {
    setPhase('showing')
    let i = 0
    const tick = () => {
      if (i >= seq.length) {
        setActivePad(null)
        setPhase('input')
        setInputIdx(0)
        return
      }
      const padId = seq[i]
      const pad = PADS[padId]
      setActivePad(padId)
      playTone(pad.freq, FLASH_MS / 1000)
      seqTimerRef.current = setTimeout(() => {
        setActivePad(null)
        seqTimerRef.current = setTimeout(() => {
          i++
          tick()
        }, PAUSE_MS)
      }, FLASH_MS)
    }
    tick()
  }, [playTone])

  const start = useCallback(() => {
    ensureAudio()
    const first = [Math.floor(Math.random() * PADS.length)]
    setSequence(first)
    setRound(1)
    setTimeout(() => showSequence(first), 400)
  }, [ensureAudio, showSequence])

  const press = (padId) => {
    if (phase !== 'input') return
    const pad = PADS[padId]
    setActivePad(padId)
    playTone(pad.freq, 0.18)
    setTimeout(() => setActivePad(null), 200)

    if (sequence[inputIdx] !== padId) {
      // wrong
      setPhase('lose')
      playTone(120, 0.4, 'sawtooth', 0.18)
      setTimeout(() => playTone(80, 0.6, 'sawtooth', 0.16), 250)
      setBest(prev => {
        const v = Math.max(prev, round)
        try { localStorage.setItem('colorMemoryBest', String(v)) } catch { /* ignore */ }
        return v
      })
      onScore?.(round)
      return
    }

    if (inputIdx + 1 === sequence.length) {
      // round complete
      setPhase('win-round')
      // next round
      setTimeout(() => {
        const next = [...sequence, Math.floor(Math.random() * PADS.length)]
        setSequence(next)
        setRound(r => r + 1)
        showSequence(next)
      }, 600)
    } else {
      setInputIdx(i => i + 1)
    }
  }

  useEffect(() => () => clearTimeout(seqTimerRef.current), [])

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.title}>🎨 Spalvų atmintis</div>
        <div style={s.scores}>
          <div style={s.scorePill}>📍 Raundas: <b>{round}</b></div>
          <div style={s.scorePill}>🏆 Rekordas: <b>{best}</b></div>
        </div>
      </div>

      <div style={s.padGrid}>
        {PADS.map(pad => (
          <button
            key={pad.id}
            disabled={phase !== 'input'}
            onClick={() => press(pad.id)}
            style={{
              ...s.pad,
              background: activePad === pad.id ? pad.color : pad.dim,
              boxShadow: activePad === pad.id
                ? `0 0 36px ${pad.color}, 0 8px 18px rgba(0,0,0,0.2)`
                : '0 6px 14px rgba(0,0,0,0.15)',
              transform: activePad === pad.id ? 'scale(1.05)' : 'scale(1)',
              filter: activePad === pad.id ? 'brightness(1.15)' : 'none',
              cursor: phase === 'input' ? 'pointer' : 'default',
            }}
          >
            <span style={s.padName}>{pad.name}</span>
          </button>
        ))}
      </div>

      <div style={s.status}>
        {phase === 'ready' && (
          <button onClick={start} style={s.bigBtn}>▶ Pradėti</button>
        )}
        {phase === 'showing' && (
          <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>👀 Žiūrėk seką…</span>
        )}
        {phase === 'input' && (
          <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
            🖐️ Pakartok ({inputIdx}/{sequence.length})
          </span>
        )}
        {phase === 'win-round' && (
          <span style={{ color: 'var(--green-dark)', fontWeight: 800 }}>✓ Šaunuolis! Kitas raundas…</span>
        )}
        {phase === 'lose' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--coral)', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Ai! Praleidai. Pasiekei {round} raundą.
            </div>
            <button onClick={() => { setPhase('ready'); setSequence([]); setRound(0) }} style={s.bigBtn}>
              🔄 Bandyti dar
            </button>
          </div>
        )}
      </div>

      <div style={s.help}>
        Žiūrėk, kuria tvarka spalvos sušvinta, ir tada paspausk jas ta pačia tvarka.
        Kiekviename raunde seka ilgėja vienu žingsniu.
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' },
  scores: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  scorePill: {
    background: 'white', padding: '6px 12px', borderRadius: 999,
    fontWeight: 700, fontSize: 13, color: 'var(--ink)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  padGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
    maxWidth: 440, margin: '0 auto 20px',
  },
  pad: {
    aspectRatio: '1', borderRadius: 24, border: 'none',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18,
    color: 'white', cursor: 'pointer',
    transition: 'transform 0.12s, box-shadow 0.12s, background 0.1s, filter 0.1s',
    display: 'flex', alignItems: 'end', justifyContent: 'center',
    padding: 18,
  },
  padName: { textShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  status: {
    textAlign: 'center', minHeight: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bigBtn: {
    background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 28px', fontSize: 16, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer',
    boxShadow: '0 10px 22px rgba(108,99,255,0.35)',
  },
  help: {
    marginTop: 12, textAlign: 'center', fontSize: 13,
    color: 'var(--text-secondary)', fontWeight: 600, maxWidth: 480, margin: '12px auto 0',
  },
}
