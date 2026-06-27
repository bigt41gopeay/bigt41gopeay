import { useCallback, useEffect, useRef, useState } from 'react'

// 🎨 Stroop testas — klasikinis vykdomųjų funkcijų testas. Ekrane spalva,
// rašytas spalvos pavadinimu — bet spalva ir žodis nesutampa. Vaikas turi
// atsakyti SPALVĄ, ne žodį. Lavina dėmesį ir slopinimo gebėjimą.

const COLORS = [
  { id: 'red',    name: 'Raudona', hex: '#FF7A6B' },
  { id: 'green',  name: 'Žalia',   hex: '#4FD1A5' },
  { id: 'blue',   name: 'Mėlyna',  hex: '#4CC9F0' },
  { id: 'yellow', name: 'Geltona', hex: '#FFC845' },
  { id: 'purple', name: 'Violetinė', hex: '#9B5DE5' },
]

const TOTAL_TRIALS = 25

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function genTrial() {
  const wordColor = COLORS[Math.floor(Math.random() * COLORS.length)]
  // 70% incongruent (word and color differ), 30% congruent
  let inkColor
  if (Math.random() < 0.3) {
    inkColor = wordColor
  } else {
    do {
      inkColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    } while (inkColor.id === wordColor.id)
  }
  return { word: wordColor.name, ink: inkColor }
}

export default function StroopTestGame({ onScore }) {
  const [phase, setPhase] = useState('intro')
  const [trial, setTrial] = useState(0)
  const [current, setCurrent] = useState(null)
  const [options, setOptions] = useState([])
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [rts, setRts] = useState([])
  const startTRef = useRef(0)
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

  const newTrial = useCallback(() => {
    const t = genTrial()
    setCurrent(t)
    // build 4 options: correct + 3 distractors
    const wrong = shuffle(COLORS.filter(c => c.id !== t.ink.id)).slice(0, 3)
    setOptions(shuffle([t.ink, ...wrong]))
    startTRef.current = performance.now()
  }, [])

  const start = useCallback(() => {
    ensureAudio()
    setTrial(0); setCorrect(0); setWrong(0); setRts([])
    newTrial()
    setPhase('playing')
  }, [ensureAudio, newTrial])

  const pick = (color) => {
    if (phase !== 'playing' || !current) return
    const rt = performance.now() - startTRef.current
    if (color.id === current.ink.id) {
      setCorrect(c => c + 1)
      setRts(prev => [...prev, rt])
      beep(660, 0.08, 'triangle', 0.18)
    } else {
      setWrong(w => w + 1)
      beep(180, 0.12, 'square', 0.1)
    }
    const next = trial + 1
    if (next >= TOTAL_TRIALS) {
      setPhase('result')
    } else {
      setTrial(next)
      newTrial()
    }
  }

  useEffect(() => {
    if (phase === 'result') {
      const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0
      const score = correct * 10 - wrong * 3 + Math.max(0, 500 - meanRT)
      onScore?.(Math.max(0, score))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🎨 Stroop testas</h3>
        <div style={s.intro}>
          <p style={{ marginBottom: 10 }}>Ekrane bus žodis (spalvos pavadinimas), bet jis bus parašytas kita spalva.</p>
          <p style={{ marginBottom: 12, fontWeight: 800, color: 'var(--primary)' }}>
            Tavo užduotis — paspausti SPALVĄ kuria parašyta, NE pavadinimą.
          </p>
          <p style={{ fontSize: 15 }}>Pavyzdys:</p>
          <div style={{ textAlign: 'center', margin: '14px 0' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 36, color: '#4CC9F0' }}>RAUDONA</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>← Žodis sako „raudona", bet spalva yra <b>mėlyna</b>. Reikia spausti mėlyną mygtuką.</p>
          <p style={{ marginTop: 14, fontSize: 14, color: 'var(--text-muted)' }}>{TOTAL_TRIALS} bandymų. Skaičiuojama greitis ir tikslumas.</p>
        </div>
        <button onClick={start} style={s.bigBtn}>▶ Pradėti</button>
      </div>
    )
  }

  if (phase === 'result') {
    const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0
    const accuracy = Math.round((correct / TOTAL_TRIALS) * 100)
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>📊 Stroop rezultatai</h3>
        <div style={s.stats}>
          <Stat label="Tikslumas"            value={`${accuracy}%`} hint={`${correct}/${TOTAL_TRIALS}`} color="#4FD1A5" />
          <Stat label="Vidutinis laikas"     value={`${meanRT} ms`}  hint="500-1500 ms tipinis" color="#6C63FF" />
          <Stat label="Klaidos"              value={String(wrong)}   hint="kuo mažiau, tuo geriau" color="#FF7A6B" />
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Bandyti dar</button>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.hud}>
        <div style={s.pill}>{trial + 1} / {TOTAL_TRIALS}</div>
        <div style={s.pill}>✓ {correct}</div>
        <div style={s.pill}>✗ {wrong}</div>
      </div>

      <div style={s.stage}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 'clamp(48px, 10vw, 90px)',
          color: current?.ink.hex,
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {current?.word}
        </div>
      </div>

      <div style={s.optionsGrid}>
        {options.map(c => (
          <button
            key={c.id}
            onClick={() => pick(c)}
            style={{
              ...s.optionBtn,
              background: c.hex,
            }}
          >
            <span style={s.optionLabel}>{c.name}</span>
          </button>
        ))}
      </div>

      <div style={s.help}>
        Paspausk spalvą, kuria <b>parašytas žodis</b>, ne pavadinimą.
      </div>
    </div>
  )
}

function Stat({ label, value, hint, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 16,
      textAlign: 'center', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 32, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{hint}</div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', textAlign: 'center', marginBottom: 16 },
  intro: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 18, fontSize: 15, color: 'var(--ink)', lineHeight: 1.55 },
  bigBtn: {
    background: 'linear-gradient(135deg,#9B5DE5,#FF7A6B,#FFC845)', color: 'white',
    border: 'none', borderRadius: 14, padding: '16px 32px', fontSize: 17, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', display: 'block', margin: '0 auto',
    boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
  },
  hud: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  pill: { background: 'white', padding: '6px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 13, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  stage: {
    background: 'white', borderRadius: 20,
    padding: '40px 16px', marginBottom: 18,
    minHeight: 180,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'var(--shadow-card)',
  },
  optionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
    marginBottom: 14, maxWidth: 480, margin: '0 auto 14px',
  },
  optionBtn: {
    aspectRatio: '3/1',
    border: 'none', borderRadius: 14,
    cursor: 'pointer', color: 'white',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18,
    boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
    transition: 'transform 0.08s',
  },
  optionLabel: { textShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  help: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
    marginBottom: 18,
  },
}
