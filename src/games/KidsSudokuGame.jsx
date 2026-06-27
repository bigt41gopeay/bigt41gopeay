import { useCallback, useEffect, useRef, useState } from 'react'

// 🔢 Sudoku vaikams — 4×4 (2×2 sub-grids) ir 6×6 (2×3 sub-grids) variantai.
// Lengvas variantas vaikams. Skaičiai pirmiausia, paskui simbolių režimas.
// Lavina logiką ir sisteminį mąstymą.

const VARIANTS = [
  {
    id: '4x4',
    label: '4×4 (lengva)',
    size: 4,
    boxR: 2, boxC: 2,
    given: 8, // how many pre-filled
  },
  {
    id: '6x6',
    label: '6×6 (vidutinis)',
    size: 6,
    boxR: 2, boxC: 3,
    given: 18,
  },
  {
    id: '9x9',
    label: '9×9 (klasika)',
    size: 9,
    boxR: 3, boxC: 3,
    given: 36,
  },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValid(grid, row, col, num, size, boxR, boxC) {
  // row
  for (let c = 0; c < size; c++) if (grid[row][c] === num) return false
  // col
  for (let r = 0; r < size; r++) if (grid[r][col] === num) return false
  // box
  const br = Math.floor(row / boxR) * boxR
  const bc = Math.floor(col / boxC) * boxC
  for (let r = br; r < br + boxR; r++)
    for (let c = bc; c < bc + boxC; c++)
      if (grid[r][c] === num) return false
  return true
}

function solve(grid, size, boxR, boxC, rand = false) {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === 0) {
        const nums = rand
          ? shuffle(Array.from({ length: size }, (_, i) => i + 1))
          : Array.from({ length: size }, (_, i) => i + 1)
        for (const num of nums) {
          if (isValid(grid, row, col, num, size, boxR, boxC)) {
            grid[row][col] = num
            if (solve(grid, size, boxR, boxC, rand)) return true
            grid[row][col] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function generatePuzzle(variant) {
  const { size, boxR, boxC, given } = variant
  // 1) start with empty, solve randomly to get full grid
  const full = Array.from({ length: size }, () => Array(size).fill(0))
  solve(full, size, boxR, boxC, true)
  // 2) blank out cells
  const total = size * size
  const blanks = total - given
  const positions = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, blanks)
  const puzzle = full.map(row => [...row])
  positions.forEach(p => {
    const r = Math.floor(p / size)
    const c = p % size
    puzzle[r][c] = 0
  })
  return { puzzle, solution: full }
}

export default function KidsSudokuGame({ onScore }) {
  const [variantIdx, setVariantIdx] = useState(0)
  const [{ puzzle, solution }, setBoard] = useState(() => generatePuzzle(VARIANTS[0]))
  const [grid, setGrid] = useState(() => puzzle.map(row => [...row]))
  const [selected, setSelected] = useState(null) // {r, c}
  const [errors, setErrors] = useState(0)
  const [done, setDone] = useState(false)
  const [startTime, setStartTime] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  const variant = VARIANTS[variantIdx]

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
    const v = VARIANTS[idx]
    const fresh = generatePuzzle(v)
    setVariantIdx(idx)
    setBoard(fresh)
    setGrid(fresh.puzzle.map(row => [...row]))
    setSelected(null)
    setErrors(0)
    setDone(false)
    setStartTime(performance.now())
    setElapsed(0)
  }, [ensureAudio])

  useEffect(() => {
    if (done) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((performance.now() - startTime) / 1000))
    }, 500)
    return () => clearInterval(timerRef.current)
  }, [startTime, done])

  const place = (num) => {
    if (!selected || done) return
    const { r, c } = selected
    if (puzzle[r][c] !== 0) return // given cell
    if (num === 0) {
      const next = grid.map(row => [...row])
      next[r][c] = 0
      setGrid(next)
      return
    }
    if (num === solution[r][c]) {
      const next = grid.map(row => [...row])
      next[r][c] = num
      setGrid(next)
      beep(440 + num * 20, 0.06, 'triangle', 0.14)
      // check completion
      const complete = next.every((row, rr) => row.every((val, cc) => val === solution[rr][cc]))
      if (complete) {
        setDone(true)
        const score = Math.max(0, 500 - elapsed - errors * 20)
        onScore?.(score)
        beep(660, 0.12, 'triangle', 0.2)
        setTimeout(() => beep(990, 0.14, 'triangle', 0.2), 100)
        setTimeout(() => beep(1320, 0.18, 'triangle', 0.2), 220)
      }
    } else {
      setErrors(e => e + 1)
      beep(180, 0.14, 'square', 0.1)
    }
  }

  // keyboard 1-9
  useEffect(() => {
    if (done) return
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key, 10)
        if (n <= variant.size) place(n)
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        place(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, grid, done])

  const cellSize = `min(${75 / variant.size}vw, ${360 / variant.size}px)`

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.variantPicker}>
          {VARIANTS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => reset(i)}
              style={{
                ...s.varBtn,
                background: variantIdx === i ? 'linear-gradient(135deg,#6C63FF,#4FD1A5)' : 'white',
                color: variantIdx === i ? 'white' : 'var(--ink)',
              }}
            >{v.label}</button>
          ))}
        </div>
        <div style={s.stats}>
          <div style={s.pill}>⏱ {elapsed}s</div>
          <div style={s.pill}>❌ {errors}</div>
        </div>
      </div>

      <div style={{
        ...s.board,
        gridTemplateColumns: `repeat(${variant.size}, ${cellSize})`,
        gridTemplateRows: `repeat(${variant.size}, ${cellSize})`,
      }}>
        {grid.map((row, r) => row.map((val, c) => {
          const given = puzzle[r][c] !== 0
          const isSelected = selected && selected.r === r && selected.c === c
          const sameNumber = selected && grid[selected.r][selected.c] && grid[selected.r][selected.c] === val
          const boxBorderR = (c + 1) % variant.boxC === 0 && c + 1 < variant.size
          const boxBorderB = (r + 1) % variant.boxR === 0 && r + 1 < variant.size
          return (
            <button
              key={`${r},${c}`}
              onClick={() => !given && !done && setSelected({ r, c })}
              disabled={given || done}
              style={{
                ...s.cell,
                background: isSelected ? '#FEF3C7' : sameNumber ? '#EFEBFF' : given ? '#F1F5F9' : 'white',
                color: given ? 'var(--ink)' : 'var(--primary)',
                fontWeight: given ? 800 : 700,
                borderRight: boxBorderR ? '3px solid var(--ink)' : '1px solid #CBD5E1',
                borderBottom: boxBorderB ? '3px solid var(--ink)' : '1px solid #CBD5E1',
                cursor: given || done ? 'default' : 'pointer',
              }}
            >
              {val !== 0 ? val : ''}
            </button>
          )
        }))}
      </div>

      <div style={s.pad}>
        {Array.from({ length: variant.size }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => place(n)} disabled={!selected || done} style={{
            ...s.padBtn,
            opacity: selected && !done ? 1 : 0.4,
          }}>{n}</button>
        ))}
        <button onClick={() => place(0)} disabled={!selected || done} style={{ ...s.padBtn, background: '#FEE2E2', opacity: selected && !done ? 1 : 0.4 }}>⌫</button>
      </div>

      {done && (
        <div style={s.winBox}>
          🏆 Pavyko! {elapsed}s · {errors} klaidų
          <button onClick={() => reset(variantIdx)} style={s.actionBtn}>🔄 Žaisti dar</button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  variantPicker: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  varBtn: {
    border: '1px solid var(--border-strong)', borderRadius: 10,
    padding: '6px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: { background: 'white', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  board: {
    display: 'grid', gap: 0,
    background: 'var(--ink)',
    padding: 3,
    borderRadius: 10,
    margin: '0 auto 16px',
    width: 'fit-content',
    boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
  },
  cell: {
    border: '1px solid #CBD5E1',
    fontFamily: 'var(--font-heading)',
    fontSize: 'min(6vw, 24px)',
    cursor: 'pointer',
    background: 'white',
    transition: 'background 0.15s',
  },
  pad: {
    display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
    margin: '0 auto', maxWidth: 400,
  },
  padBtn: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg,#6C63FF,#9B7BFF)',
    color: 'white', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18,
    border: 'none', cursor: 'pointer',
    boxShadow: '0 3px 0 rgba(0,0,0,0.15)',
  },
  winBox: {
    background: 'linear-gradient(135deg,#BBF7D0,#4FD1A5)',
    color: 'white', borderRadius: 16, padding: 18,
    fontWeight: 800, textAlign: 'center', marginTop: 16,
    fontFamily: 'var(--font-heading)', fontSize: 18,
  },
  actionBtn: {
    display: 'block', margin: '12px auto 0',
    background: 'white', color: 'var(--ink)',
    border: 'none', borderRadius: 12, padding: '10px 22px',
    fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
}
