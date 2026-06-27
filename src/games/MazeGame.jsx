import { useCallback, useEffect, useRef, useState } from 'react'

// 🗺️ Labirintai — inspiruota skgandikota/mazepad. Auto-generuojami labirintai
// 10 lygių, vis didesni. Vaikas vairuoja personažą iki finišo rodyklėmis arba
// braukimu pirštu. Lavina erdvinę orientaciją ir planavimą.

const LEVELS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  size: 5 + i * 2, // 5, 7, 9, ..., 23
  label: `Lygis ${i + 1}`,
}))

function generateMaze(size) {
  // Recursive backtracking; cells store wall bits (top/right/bottom/left).
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ N: true, E: true, S: true, W: true, visited: false }))
  )
  const opp = { N: 'S', S: 'N', E: 'W', W: 'E' }
  const dxy = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }

  const stack = [[0, 0]]
  grid[0][0].visited = true
  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const neighbours = Object.entries(dxy)
      .map(([dir, [dx, dy]]) => ({ dir, nx: x + dx, ny: y + dy }))
      .filter(({ nx, ny }) => nx >= 0 && ny >= 0 && nx < size && ny < size && !grid[ny][nx].visited)
    if (!neighbours.length) {
      stack.pop()
      continue
    }
    const { dir, nx, ny } = neighbours[Math.floor(Math.random() * neighbours.length)]
    grid[y][x][dir] = false
    grid[ny][nx][opp[dir]] = false
    grid[ny][nx].visited = true
    stack.push([nx, ny])
  }
  return grid
}

export default function MazeGame({ onScore }) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [maze, setMaze] = useState(() => generateMaze(LEVELS[0].size))
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const audioRef = useRef(null)
  const containerRef = useRef(null)

  const size = LEVELS[levelIdx].size

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

  const resetLevel = useCallback((idx) => {
    setLevelIdx(idx)
    setMaze(generateMaze(LEVELS[idx].size))
    setPos({ x: 0, y: 0 })
    setMoves(0)
    setStartTime(performance.now())
    setElapsed(0)
    setWon(false)
  }, [])

  // timer
  useEffect(() => {
    if (won) return
    const id = setInterval(() => setElapsed(Math.floor((performance.now() - startTime) / 1000)), 200)
    return () => clearInterval(id)
  }, [startTime, won])

  const move = useCallback((dir) => {
    if (won) return
    ensureAudio()
    setPos(prev => {
      const cell = maze[prev.y][prev.x]
      if (cell[dir]) return prev // wall
      const next = { ...prev }
      if (dir === 'N') next.y -= 1
      if (dir === 'S') next.y += 1
      if (dir === 'E') next.x += 1
      if (dir === 'W') next.x -= 1
      if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) return prev
      beep(540 + Math.random() * 60, 0.04, 'triangle', 0.08)
      setMoves(m => m + 1)
      if (next.x === size - 1 && next.y === size - 1) {
        setWon(true)
        beep(660, 0.12, 'triangle', 0.2)
        setTimeout(() => beep(990, 0.14, 'triangle', 0.2), 100)
        setTimeout(() => beep(1320, 0.18, 'triangle', 0.2), 220)
        onScore?.(Math.max(0, 100 + (LEVELS[levelIdx].id * 10) - moves))
      }
      return next
    })
  }, [maze, size, won, beep, ensureAudio, levelIdx, moves, onScore])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp')    { e.preventDefault(); move('N') }
      if (e.key === 'ArrowDown')  { e.preventDefault(); move('S') }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); move('W') }
      if (e.key === 'ArrowRight') { e.preventDefault(); move('E') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  // touch swipe
  const touchRef = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'E' : 'W')
    else move(dy > 0 ? 'S' : 'N')
    touchRef.current = null
  }

  const cellSize = `calc(min(72vw, 500px) / ${size})`

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.levelPicker}>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => resetLevel(i)}
              style={{
                ...s.lvlBtn,
                background: i === levelIdx ? 'linear-gradient(135deg,#6C63FF,#4FD1A5)' : 'white',
                color: i === levelIdx ? 'white' : 'var(--ink)',
              }}
            >{l.id}</button>
          ))}
        </div>
        <div style={s.stats}>
          <span style={s.statPill}>📍 {pos.x + 1}, {pos.y + 1}</span>
          <span style={s.statPill}>👣 {moves}</span>
          <span style={s.statPill}>⏱ {elapsed}s</span>
        </div>
      </div>

      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          ...s.board,
          gridTemplateColumns: `repeat(${size}, ${cellSize})`,
          gridTemplateRows: `repeat(${size}, ${cellSize})`,
        }}
      >
        {maze.map((row, y) => row.map((c, x) => {
          const isPlayer = pos.x === x && pos.y === y
          const isStart = x === 0 && y === 0
          const isFinish = x === size - 1 && y === size - 1
          return (
            <div
              key={`${x},${y}`}
              style={{
                background: isFinish ? '#FFC845' : isStart ? '#E0E7FF' : 'white',
                borderTop:    c.N ? '2px solid var(--ink)' : '2px solid transparent',
                borderRight:  c.E ? '2px solid var(--ink)' : '2px solid transparent',
                borderBottom: c.S ? '2px solid var(--ink)' : '2px solid transparent',
                borderLeft:   c.W ? '2px solid var(--ink)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `min(8vw, 28px)`,
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              {isFinish && '🏁'}
              {isPlayer && <span style={s.player}>🐭</span>}
            </div>
          )
        }))}
      </div>

      {won && (
        <div style={s.winBox}>
          🎉 Pavyko! {moves} žingsnių · {elapsed}s
          <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => resetLevel(levelIdx)} style={s.smallBtn}>🔄 Bandyti dar</button>
            {levelIdx + 1 < LEVELS.length && (
              <button onClick={() => resetLevel(levelIdx + 1)} style={{ ...s.smallBtn, background: 'linear-gradient(135deg,#4FD1A5,#06D6A0)' }}>
                ➡ Kitas lygis
              </button>
            )}
          </div>
        </div>
      )}

      <div style={s.controls}>
        <button onClick={() => move('N')} style={{ ...s.dpadBtn, gridArea: 'up' }}>▲</button>
        <button onClick={() => move('W')} style={{ ...s.dpadBtn, gridArea: 'left' }}>◀</button>
        <button onClick={() => move('S')} style={{ ...s.dpadBtn, gridArea: 'down' }}>▼</button>
        <button onClick={() => move('E')} style={{ ...s.dpadBtn, gridArea: 'right' }}>▶</button>
      </div>

      <div style={s.help}>
        Rodyklės klaviatūroje ⬅ ⬆ ⬇ ➡ arba braukite pirštu — pasiek 🏁 finišą.
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', width: '100%', marginBottom: 12 },
  levelPicker: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  lvlBtn: {
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid var(--border-strong)',
    fontWeight: 800, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  statPill: { background: 'white', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  board: {
    display: 'grid', gap: 0, padding: 12,
    background: 'linear-gradient(180deg,#EFEBFF,#FFF3DA)', borderRadius: 14,
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
    touchAction: 'none', userSelect: 'none',
    marginBottom: 14,
  },
  player: { fontSize: 'inherit', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' },
  winBox: {
    background: 'linear-gradient(135deg,#FFF3DA,#FFC845)',
    borderRadius: 14, padding: 16, marginBottom: 14,
    fontWeight: 800, color: 'var(--ink)', textAlign: 'center',
    boxShadow: '0 8px 20px rgba(255,200,69,0.4)',
  },
  smallBtn: {
    background: 'var(--primary)', color: 'white', border: 'none',
    borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  controls: {
    display: 'grid',
    gridTemplateAreas: '". up ." "left . right" ". down ."',
    gap: 6, marginBottom: 12,
  },
  dpadBtn: {
    width: 48, height: 48, borderRadius: 12,
    border: 'none', background: 'var(--primary)',
    color: 'white', fontSize: 18, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 var(--primary-dark), 0 6px 12px rgba(108,99,255,0.3)',
  },
  help: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' },
}
