import { useEffect, useRef, useState, useCallback } from 'react'

// Žodžių paieška — inspiruota renansouz/ADHD-WordSearch-ReactNative.
// Originalas yra React Native mobiliam, čia padaryta web versija lietuvių
// kalbai. Lavina vokabulą, dėmesį ir vizualinę paiešką.

const THEMES = [
  {
    id: 'gyvunai', emoji: '🐾', name: 'Gyvūnai',
    words: ['KATĖ', 'ŠUO', 'LAPĖ', 'BITĖ', 'PELĖ', 'ANTIS', 'MEŠKA'],
  },
  {
    id: 'gamta', emoji: '🌳', name: 'Gamta',
    words: ['SAULĖ', 'GĖLĖ', 'MEDIS', 'LIETUS', 'VĖJAS', 'DEBESIS'],
  },
  {
    id: 'seima', emoji: '👨‍👩‍👧', name: 'Šeima',
    words: ['MAMA', 'TĖTĖ', 'SESĖ', 'BROLIS', 'TĖVAI', 'NAMAI'],
  },
  {
    id: 'maistas', emoji: '🍎', name: 'Maistas',
    words: ['DUONA', 'OBUOLYS', 'PIENAS', 'SŪRIS', 'MORKA', 'BULVĖ'],
  },
]

const GRID_SIZE = 9
const ALPHABET = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

// 8 directions: right, down, diag down-right, diag up-right, left, up, diag up-left, diag down-left
const DIRS = [
  [1, 0], [0, 1], [1, 1], [1, -1],
  [-1, 0], [0, -1], [-1, -1], [-1, 1],
]

function makeEmpty(n) {
  return Array.from({ length: n }, () => Array(n).fill(''))
}

function placeWords(words) {
  const grid = makeEmpty(GRID_SIZE)
  const placements = []
  for (const word of words) {
    let placed = false
    for (let tries = 0; tries < 200 && !placed; tries++) {
      const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)]
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      const endX = x + dx * (word.length - 1)
      const endY = y + dy * (word.length - 1)
      if (endX < 0 || endX >= GRID_SIZE || endY < 0 || endY >= GRID_SIZE) continue
      // check fit
      let ok = true
      for (let i = 0; i < word.length; i++) {
        const cx = x + dx * i, cy = y + dy * i
        const cell = grid[cy][cx]
        if (cell && cell !== word[i]) { ok = false; break }
      }
      if (!ok) continue
      // place
      const cells = []
      for (let i = 0; i < word.length; i++) {
        const cx = x + dx * i, cy = y + dy * i
        grid[cy][cx] = word[i]
        cells.push([cx, cy])
      }
      placements.push({ word, cells })
      placed = true
    }
  }
  // fill empties with random letters
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x]) grid[y][x] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    }
  }
  return { grid, placements }
}

function sameCell(a, b) { return a[0] === b[0] && a[1] === b[1] }
function getLine(start, end) {
  // returns array of [x,y] cells from start to end if they lie on a straight line (8-dir), else null
  const [sx, sy] = start, [ex, ey] = end
  const dx = ex - sx, dy = ey - sy
  const adx = Math.abs(dx), ady = Math.abs(dy)
  if (dx !== 0 && dy !== 0 && adx !== ady) return null // not straight or diagonal
  const len = Math.max(adx, ady)
  if (len === 0) return [start]
  const stepX = Math.sign(dx), stepY = Math.sign(dy)
  const cells = []
  for (let i = 0; i <= len; i++) {
    cells.push([sx + stepX * i, sy + stepY * i])
  }
  return cells
}

export default function WordSearchGame({ onScore }) {
  const [themeIdx, setThemeIdx] = useState(0)
  const [{ grid, placements }, setBoard] = useState(() => placeWords(THEMES[0].words))
  const [foundWords, setFoundWords] = useState(new Set())
  const [dragStart, setDragStart] = useState(null)
  const [dragCells, setDragCells] = useState([])
  const [foundCells, setFoundCells] = useState(new Map()) // word -> cells
  const [score, setScore] = useState(0)
  const containerRef = useRef(null)
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

  const newTheme = (idx) => {
    setThemeIdx(idx)
    setBoard(placeWords(THEMES[idx].words))
    setFoundWords(new Set())
    setFoundCells(new Map())
    setDragStart(null)
    setDragCells([])
  }

  const checkWord = useCallback((cells) => {
    if (!cells || cells.length < 2) return
    const letters = cells.map(([x, y]) => grid[y][x]).join('')
    const reversed = letters.split('').reverse().join('')
    for (const p of placements) {
      if (foundWords.has(p.word)) continue
      if (p.word === letters || p.word === reversed) {
        setFoundWords(prev => new Set([...prev, p.word]))
        setFoundCells(prev => {
          const next = new Map(prev)
          next.set(p.word, cells)
          return next
        })
        setScore(prev => {
          const v = prev + p.word.length * 5
          onScore?.(v)
          return v
        })
        beep(660, 0.1, 'triangle', 0.2)
        setTimeout(() => beep(990, 0.14, 'triangle', 0.2), 90)
        return true
      }
    }
    return false
  }, [grid, placements, foundWords, onScore, beep])

  // pointer events on cells
  const cellsRef = useRef([])
  cellsRef.current = []

  const getCellFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY)
    if (!el || !el.dataset || el.dataset.cell === undefined) return null
    const [x, y] = el.dataset.cell.split(',').map(Number)
    return [x, y]
  }

  const startDrag = (cell) => {
    ensureAudio()
    setDragStart(cell)
    setDragCells([cell])
  }

  const moveDrag = (cell) => {
    if (!dragStart) return
    const line = getLine(dragStart, cell)
    if (line) setDragCells(line)
  }

  const endDrag = () => {
    if (dragCells.length >= 2) checkWord(dragCells)
    setDragStart(null)
    setDragCells([])
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!dragStart) return
      e.preventDefault()
      const touch = e.touches ? e.touches[0] : e
      const cell = getCellFromPoint(touch.clientX, touch.clientY)
      if (cell) moveDrag(cell)
    }
    const onUp = () => endDrag()
    if (dragStart) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('touchmove', onMove, { passive: false })
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchend', onUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragStart, dragCells])

  const inDragCells = (x, y) => dragCells.some(c => c[0] === x && c[1] === y)
  const inFoundCells = (x, y) => {
    for (const cells of foundCells.values()) {
      if (cells.some(c => c[0] === x && c[1] === y)) return true
    }
    return false
  }

  const allFound = foundWords.size === THEMES[themeIdx].words.length

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.themePicker}>
          {THEMES.map((t, i) => (
            <button
              key={t.id}
              onClick={() => newTheme(i)}
              style={{
                ...s.themeBtn,
                background: i === themeIdx ? 'linear-gradient(135deg,#6C63FF,#9B7BFF)' : 'white',
                color: i === themeIdx ? 'white' : 'var(--ink)',
              }}
            >{t.emoji} {t.name}</button>
          ))}
        </div>
        <div style={s.scorePill}>⭐ {score}</div>
      </div>

      <div style={s.layout}>
        <div ref={containerRef} style={s.grid}>
          {grid.map((row, y) => row.map((ch, x) => {
            const isDrag = inDragCells(x, y)
            const isFound = inFoundCells(x, y)
            const startCell = sameCell(dragCells[0] || [-1, -1], [x, y])
            return (
              <div
                key={`${x},${y}`}
                data-cell={`${x},${y}`}
                onMouseDown={() => startDrag([x, y])}
                onTouchStart={(e) => { e.preventDefault(); startDrag([x, y]) }}
                style={{
                  ...s.cell,
                  background: isFound
                    ? 'linear-gradient(135deg,#4FD1A5,#06D6A0)'
                    : isDrag
                      ? 'linear-gradient(135deg,#FFC845,#FF7A6B)'
                      : 'white',
                  color: isFound || isDrag ? 'white' : 'var(--ink)',
                  transform: startCell ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isFound || isDrag
                    ? '0 4px 12px rgba(0,0,0,0.18)'
                    : '0 2px 6px rgba(45,42,69,0.08)',
                }}
              >
                {ch}
              </div>
            )
          }))}
        </div>

        <div style={s.wordList}>
          <h4 style={s.wordListTitle}>Surask šiuos žodžius:</h4>
          <div style={s.words}>
            {THEMES[themeIdx].words.map(w => (
              <div
                key={w}
                style={{
                  ...s.wordChip,
                  background: foundWords.has(w) ? '#4FD1A5' : 'white',
                  color: foundWords.has(w) ? 'white' : 'var(--ink)',
                  textDecoration: foundWords.has(w) ? 'line-through' : 'none',
                  opacity: foundWords.has(w) ? 0.7 : 1,
                }}
              >
                {foundWords.has(w) && '✓ '}{w}
              </div>
            ))}
          </div>
          {allFound && (
            <div style={s.victory}>
              🎉 Šaunuolis! Visus žodžius radai!
              <button onClick={() => newTheme(themeIdx)} style={s.againBtn}>
                🔄 Žaisti dar
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={s.help}>
        Spustelėk ir tempk per raides, kad sudėtum žodį. Žodžiai gali eiti į visas 8 puses.
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, flexWrap: 'wrap', marginBottom: 16,
  },
  themePicker: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  themeBtn: {
    border: '1px solid var(--border-strong)', borderRadius: 12,
    padding: '8px 14px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  scorePill: {
    background: 'white', padding: '8px 14px', borderRadius: 12,
    fontWeight: 800, color: 'var(--ink)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  layout: {
    display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16,
  },
  grid: {
    display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
    gap: 4, padding: 12,
    background: 'var(--cream)', borderRadius: 16,
    aspectRatio: '1',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
    touchAction: 'none', userSelect: 'none',
  },
  cell: {
    aspectRatio: '1', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18,
    cursor: 'pointer', transition: 'background 0.15s, transform 0.1s',
  },
  wordList: {
    background: 'white', borderRadius: 16, padding: 16,
    boxShadow: 'var(--shadow-card)', alignSelf: 'start',
  },
  wordListTitle: {
    fontFamily: 'var(--font-heading)', fontWeight: 600,
    fontSize: 16, color: 'var(--ink)', marginBottom: 12,
  },
  words: { display: 'flex', flexDirection: 'column', gap: 6 },
  wordChip: {
    padding: '8px 12px', borderRadius: 10,
    fontWeight: 800, fontSize: 14, textAlign: 'center',
    border: '1px solid var(--border)',
    transition: 'all 0.2s',
  },
  victory: {
    marginTop: 16, padding: 14,
    background: 'linear-gradient(135deg,#FFF3DA,#FFC845)',
    borderRadius: 12, textAlign: 'center',
    fontWeight: 800, color: 'var(--ink)',
  },
  againBtn: {
    display: 'block', margin: '12px auto 0',
    padding: '10px 18px', borderRadius: 12,
    background: 'var(--primary)', color: 'white',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 700, fontSize: 14,
  },
  help: {
    marginTop: 14, textAlign: 'center',
    fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600,
  },
}
