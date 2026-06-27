import { useCallback, useEffect, useRef, useState } from 'react'

// 🔢 Schulte lentelė — klasikinis dėmesio testas. Skaičiai 1-N
// pateikti atsitiktine tvarka tinklelyje. Vaikas turi paspausti
// juos iš eilės nuo 1. Skaičiuojamas laikas. Lavina vizualinę
// paiešką ir periferinį dėmesį.

const SIZES = [
  { n: 9,  label: '3×3 (lengva)',  cols: 3 },
  { n: 16, label: '4×4 (vidutinis)', cols: 4 },
  { n: 25, label: '5×5 (klasika)',  cols: 5 },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SchulteTableGame({ onScore }) {
  const [sizeIdx, setSizeIdx] = useState(2)
  const [numbers, setNumbers] = useState(() => shuffle(Array.from({ length: SIZES[2].n }, (_, i) => i + 1)))
  const [next, setNext] = useState(1)
  const startTimeRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState(0)
  const [best, setBest] = useState(() => {
    try { return JSON.parse(localStorage.getItem('schulteBest') || '{}') } catch { return {} }
  })
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  const size = SIZES[sizeIdx]

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

  const reset = useCallback((idx) => {
    ensureAudio()
    const sz = SIZES[idx]
    setSizeIdx(idx)
    setNumbers(shuffle(Array.from({ length: sz.n }, (_, i) => i + 1)))
    setNext(1)
    startTimeRef.current = null
    setElapsed(0)
    setDone(false)
    setErrors(0)
  }, [ensureAudio])

  // timer
  useEffect(() => {
    if (done) return
    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return
      setElapsed(((performance.now() - startTimeRef.current) / 1000).toFixed(1))
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [done, next])

  const tap = (n) => {
    if (done) return
    if (n !== next) {
      setErrors(e => e + 1)
      beep(180, 0.1, 'square', 0.1)
      return
    }
    // eslint-disable-next-line react-hooks/purity
    if (next === 1) startTimeRef.current = performance.now()
    beep(440 + (n / size.n) * 400, 0.06, 'triangle', 0.14)
    if (n === size.n) {
      // eslint-disable-next-line react-hooks/purity
      const now = performance.now()
      const finalTime = (now - (startTimeRef.current || now)) / 1000
      setElapsed(finalTime.toFixed(1))
      setDone(true)
      const key = `${size.n}`
      setBest(prev => {
        const prevBest = prev[key]
        if (!prevBest || finalTime < prevBest) {
          const v = { ...prev, [key]: finalTime }
          try { localStorage.setItem('schulteBest', JSON.stringify(v)) } catch { /* ignore */ }
          return v
        }
        return prev
      })
      const score = Math.max(0, Math.round(1000 - finalTime * 10 - errors * 50))
      onScore?.(score)
      setTimeout(() => beep(660, 0.12, 'triangle', 0.18), 80)
      setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 200)
    }
    setNext(n + 1)
  }

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.sizePicker}>
          {SIZES.map((sz, i) => (
            <button
              key={sz.n}
              onClick={() => reset(i)}
              style={{
                ...s.sizeBtn,
                background: sizeIdx === i ? 'linear-gradient(135deg,#6C63FF,#4FD1A5)' : 'white',
                color: sizeIdx === i ? 'white' : 'var(--ink)',
              }}
            >{sz.label}</button>
          ))}
        </div>
        <div style={s.stats}>
          <div style={s.pill}>⏱ {elapsed || '0.0'}s</div>
          <div style={s.pill}>📍 {next > size.n ? size.n : next} / {size.n}</div>
          <div style={s.pill}>❌ {errors}</div>
        </div>
      </div>

      <div style={s.guide}>
        Spauskite skaičius <b>iš eilės nuo 1 iki {size.n}</b>. Stenkitės nesidairyti — fiksuokite akis į vidurį.
      </div>

      <div style={{ ...s.table, gridTemplateColumns: `repeat(${size.cols}, 1fr)` }}>
        {numbers.map((n, i) => (
          <button
            key={i}
            onClick={() => tap(n)}
            disabled={done && n !== size.n}
            style={{
              ...s.cell,
              background: done && n < next ? '#BBF7D0' : n === next - 1 && n > 0 ? '#FEF3C7' : 'white',
              color: 'var(--ink)',
              cursor: done ? 'default' : 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {done && (
        <div style={s.winBox}>
          🏆 Pavyko! Laikas: <b>{elapsed}s</b> · Klaidos: <b>{errors}</b>
          {best[size.n] !== undefined && (
            <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-muted)' }}>
              Geriausias laikas {size.label}: <b>{best[size.n].toFixed(1)}s</b>
            </div>
          )}
          <button onClick={() => reset(sizeIdx)} style={s.bigBtn}>🔄 Žaisti dar</button>
        </div>
      )}

      {best[size.n] !== undefined && !done && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          🏆 Geriausias laikas {size.label}: <b>{best[size.n].toFixed(1)}s</b>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  sizePicker: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  sizeBtn: {
    border: '1px solid var(--border-strong)', borderRadius: 10,
    padding: '6px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: { background: 'white', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  guide: { textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 14 },
  table: {
    display: 'grid', gap: 6,
    padding: 16, maxWidth: 500, margin: '0 auto',
    background: 'linear-gradient(180deg,#EFEBFF,#FFF3DA)',
    borderRadius: 16,
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.06)',
  },
  cell: {
    aspectRatio: '1', border: 'none',
    borderRadius: 12,
    fontFamily: 'var(--font-heading)', fontWeight: 700,
    fontSize: 'min(7vw, 32px)',
    cursor: 'pointer',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08), 0 6px 12px rgba(45,42,69,0.06)',
    transition: 'background 0.2s, transform 0.05s',
  },
  winBox: {
    background: 'linear-gradient(135deg,#FFF3DA,#4FD1A5)',
    borderRadius: 16, padding: 20, textAlign: 'center',
    color: 'var(--ink)', fontWeight: 800,
    marginTop: 16,
    boxShadow: '0 8px 20px rgba(79,209,165,0.3)',
  },
  bigBtn: {
    display: 'block', margin: '12px auto 0',
    background: 'var(--primary)', color: 'white',
    border: 'none', borderRadius: 12, padding: '10px 24px',
    fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
}
