import { useCallback, useEffect, useRef, useState } from 'react'

// 🏺 Archeologo iššūkis — inspiruota sadikarahman066/indiana-aardewerk
// (priešistorinė keramika). 8×8 dirt grid, kasi langelius ratu apie radinį,
// kad jo nesutrupintum. Trim įrankiais: kastuvas (3×3 plotas), kastuvėlis
// (kryžius), šepetėlis (vienas langelis). Ribotas energijos kiekis.

const COLS = 8
const ROWS = 7
const TOTAL_CELLS = COLS * ROWS

// artifact types with point value
const ARTIFACTS = [
  { id: '🏺', name: 'Puodas',  pts: 30 },
  { id: '🦴', name: 'Kaulas',  pts: 20 },
  { id: '💎', name: 'Brangakmenis', pts: 50 },
  { id: '🗿', name: 'Statulėlė', pts: 40 },
  { id: '🪙', name: 'Moneta',  pts: 25 },
]

const TOOLS = [
  { id: 'shovel',  emoji: '⛏️',  name: 'Kastuvas',    cost: 3, area: '3×3',    desc: 'Greitas, bet sutrupina radinius' },
  { id: 'trowel',  emoji: '🪓', name: 'Mažas kastuvas', cost: 1, area: 'kryžius', desc: 'Vidutinis (kastuvėlis + 4 šonai)' },
  { id: 'brush',   emoji: '🖌️', name: 'Šepetėlis',   cost: 1, area: '1', desc: 'Saugus — tik 1 langelis' },
]

function buildBoard() {
  // Place 4-5 artifacts at random positions, surround them with "dirt"
  const cells = Array.from({ length: TOTAL_CELLS }, () => ({
    revealed: false,
    artifact: null,
    broken: false,
  }))
  const artifactCount = 5
  const used = new Set()
  for (let i = 0; i < artifactCount; i++) {
    let pos
    do {
      pos = Math.floor(Math.random() * TOTAL_CELLS)
    } while (used.has(pos))
    used.add(pos)
    cells[pos].artifact = ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)]
  }
  return cells
}

function affectedIndices(idx, tool) {
  const x = idx % COLS
  const y = Math.floor(idx / COLS)
  const out = []
  const push = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return
    out.push(cy * COLS + cx)
  }
  if (tool === 'shovel') {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push(x + dx, y + dy)
  } else if (tool === 'trowel') {
    push(x, y); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  } else {
    push(x, y)
  }
  return out
}

const TOTAL_ENERGY = 20

export default function ArchaeologyGame({ onScore }) {
  const [phase, setPhase] = useState('intro')
  const [board, setBoard] = useState(() => buildBoard())
  const [tool, setTool] = useState('brush')
  const [energy, setEnergy] = useState(TOTAL_ENERGY)
  const [found, setFound] = useState([])  // list of artifact objects found intact
  const [broken, setBroken] = useState([]) // broken
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
    setBoard(buildBoard())
    setTool('brush')
    setEnergy(TOTAL_ENERGY)
    setFound([])
    setBroken([])
    setPhase('playing')
  }, [ensureAudio])

  const dig = (idx) => {
    if (phase !== 'playing') return
    const t = TOOLS.find(x => x.id === tool)
    if (energy < t.cost) {
      beep(180, 0.14, 'sawtooth', 0.12)
      return
    }
    const indices = affectedIndices(idx, tool)
    setBoard(prev => {
      const next = [...prev]
      const newFound = []
      const newBroken = []
      indices.forEach(i => {
        const cell = next[i]
        if (!cell || cell.revealed) return
        const revealed = { ...cell, revealed: true }
        if (cell.artifact) {
          if (tool === 'shovel') {
            // shovel breaks artifacts
            revealed.broken = true
            newBroken.push(cell.artifact)
          } else if (tool === 'trowel' && i !== idx) {
            // trowel partially damages edges
            revealed.broken = Math.random() < 0.3
            if (revealed.broken) newBroken.push(cell.artifact)
            else newFound.push(cell.artifact)
          } else {
            newFound.push(cell.artifact)
          }
        }
        next[i] = revealed
      })
      if (newFound.length) {
        beep(660, 0.1, 'triangle', 0.18)
        setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 90)
        setFound(prev => [...prev, ...newFound])
      }
      if (newBroken.length) {
        beep(180, 0.16, 'sawtooth', 0.12)
        setBroken(prev => [...prev, ...newBroken])
      }
      return next
    })
    setEnergy(e => {
      const next = e - t.cost
      if (next <= 0) {
        setTimeout(() => setPhase('result'), 600)
      }
      return Math.max(0, next)
    })
  }

  useEffect(() => {
    if (phase !== 'playing') return
    if (energy <= 0) return
    const remaining = board.filter(c => c.artifact && !c.revealed).length
    if (remaining === 0) {
      // all artifacts dealt with → done
      setPhase('result')
    }
  }, [board, energy, phase])

  useEffect(() => {
    if (phase === 'result') {
      const ptsFound = found.reduce((acc, a) => acc + a.pts, 0)
      onScore?.(ptsFound)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🏺 Archeologo iššūkis</h3>
        <div style={s.intro}>
          <p style={{ marginBottom: 10 }}>Žemėje paslėpti senoviniai radiniai. Tavo užduotis — surasti juos NEsulaužus!</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>{TOOLS[0].emoji} <b>{TOOLS[0].name}</b> — greitas, bet sulaužo radinius (3×3)</li>
            <li>{TOOLS[1].emoji} <b>{TOOLS[1].name}</b> — gali pažeisti pakraščius (kryžius)</li>
            <li>{TOOLS[2].emoji} <b>{TOOLS[2].name}</b> — saugus, bet lėtas (1 langelis)</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>
            Turi <b>{TOTAL_ENERGY} energijos taškų</b>. Kastuvas kainuoja 3, kiti — 1.
          </p>
        </div>
        <button onClick={start} style={s.bigBtn}>⛏️ Pradėti iškasimą</button>
      </div>
    )
  }

  if (phase === 'result') {
    const totalPts = found.reduce((acc, a) => acc + a.pts, 0)
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>📜 Iškasimo ataskaita</h3>
        <div style={s.results}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 56, color: 'var(--primary)' }}>{totalPts}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>taškai</div>
          <div style={s.resultsGrid}>
            <div style={{ ...s.resultBox, background: '#ECFDF5' }}>
              <div style={{ fontWeight: 800, color: '#065F46' }}>Rasta nepažeisti</div>
              <div style={{ fontSize: 28, margin: '8px 0' }}>{found.map((a, i) => <span key={i}>{a.id}</span>)}</div>
              <div style={{ fontSize: 14, color: '#065F46' }}>{found.length} radinių</div>
            </div>
            <div style={{ ...s.resultBox, background: '#FEF2F2' }}>
              <div style={{ fontWeight: 800, color: '#991B1B' }}>Sulaužyti</div>
              <div style={{ fontSize: 28, margin: '8px 0', filter: 'grayscale(0.6)' }}>{broken.map((a, i) => <span key={i}>{a.id}</span>)}</div>
              <div style={{ fontSize: 14, color: '#991B1B' }}>{broken.length} radinių</div>
            </div>
          </div>
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Naujas iškasimas</button>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.hud}>
        <div style={s.scorePill}>🔋 {energy} / {TOTAL_ENERGY}</div>
        <div style={s.scorePill}>🏺 Rasta: {found.length}</div>
        <div style={s.scorePill}>💔 Sulaužyta: {broken.length}</div>
      </div>

      <div style={{ ...s.board, gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => dig(i)}
            disabled={c.revealed}
            style={{
              ...s.cell,
              background: c.revealed
                ? (c.artifact ? (c.broken ? '#FECACA' : '#BBF7D0') : '#FCD34D33')
                : 'linear-gradient(135deg,#8B5A2B,#6B4423)',
              cursor: c.revealed ? 'default' : 'pointer',
            }}
          >
            {c.revealed && c.artifact && (
              <span style={{ filter: c.broken ? 'grayscale(1) opacity(0.6)' : 'none' }}>
                {c.artifact.id}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={s.tools}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            style={{
              ...s.toolBtn,
              background: tool === t.id ? 'linear-gradient(135deg,#FFC845,#FF7A6B)' : 'white',
              color: tool === t.id ? 'white' : 'var(--ink)',
              outline: tool === t.id ? '3px solid var(--primary)' : 'none',
            }}
          >
            <div style={{ fontSize: 28 }}>{t.emoji}</div>
            <div style={s.toolName}>{t.name}</div>
            <div style={s.toolMeta}>Plotas: {t.area} · 🔋 {t.cost}</div>
          </button>
        ))}
      </div>

      <div style={s.help}>
        Pasirink įrankį → spustelėk ant tamsios žemės. Šepetėlis saugus radiniams, kastuvas viską sulaužo.
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', textAlign: 'center', marginBottom: 16 },
  intro: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 18, fontSize: 15, color: 'var(--ink)' },
  bigBtn: {
    background: 'linear-gradient(135deg,#8B5A2B,#FFC845)', color: 'white',
    border: 'none', borderRadius: 14, padding: '16px 32px', fontSize: 17, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', display: 'block', margin: '0 auto',
    boxShadow: '0 10px 22px rgba(139,90,43,0.4)',
  },
  hud: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  scorePill: { background: 'white', padding: '8px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 13, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  board: {
    display: 'grid', gap: 4,
    padding: 12,
    background: 'linear-gradient(180deg,#A87B4E,#6B4423)',
    borderRadius: 14,
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
    marginBottom: 16,
  },
  cell: {
    aspectRatio: '1',
    borderRadius: 6,
    border: 'none',
    fontSize: 'min(7vw, 28px)',
    fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    transition: 'background 0.2s',
  },
  tools: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginBottom: 12,
  },
  toolBtn: {
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
  },
  toolName: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, marginTop: 4 },
  toolMeta: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 },
  help: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' },
  results: {
    background: 'linear-gradient(135deg,#FFF3DA,#EFEBFF)',
    borderRadius: 18, padding: 22, marginBottom: 18, textAlign: 'center',
    boxShadow: 'var(--shadow-card)',
  },
  resultsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 },
  resultBox: { padding: 14, borderRadius: 12 },
}
