import { useEffect, useRef, useState } from 'react'

const LETTERS = ['A','Ą','B','C','Č','D','E','Ę','Ė','F','G','H','I','Į','Y','J','K','L','M','N','O','P','R','S','Š','T','U','Ų','Ū','V','Z','Ž']
const NUMBERS = ['0','1','2','3','4','5','6','7','8','9']

const CELL_SIZE = 84
const PLAYER_SIZE = 68
const SPEED = 6
const CELL_BG = ['#FDE68A','#FECACA','#BBF7D0','#BAE6FD','#DDD6FE','#FBCFE8','#FED7AA','#A7F3D0']

function pickVoice(voices) {
  if (!voices || !voices.length) return null
  return voices.find(v => /^lt(-LT)?$/i.test(v.lang)) ||
         voices.find(v => /^lt/i.test(v.lang)) ||
         voices.find(v => /^en/i.test(v.lang)) ||
         voices[0]
}

export default function DriveGame({ mode = 'letters', onScore }) {
  const boardRef = useRef(null)
  const stateRef = useRef({
    cells: [],
    target: null,
    player: { x: 40, y: 60 },
    keys: {},
    running: false,
    audioCtx: null,
    voices: [],
  })

  const [, forceRender] = useState(0)
  const [score, setScore] = useState(0)
  const [targetLabel, setTargetLabel] = useState('?')

  const pool = mode === 'letters' ? LETTERS : NUMBERS
  const wordPrefix = mode === 'letters' ? 'Raidė ' : 'Skaičius '

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        stateRef.current.voices = window.speechSynthesis.getVoices()
      }
    }
    loadVoices()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const ensureAudio = () => {
    const s = stateRef.current
    if (!s.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) s.audioCtx = new Ctx()
    }
    return s.audioCtx
  }

  const beep = (freq, duration, type = 'sine', gainVal = 0.18) => {
    const ctx = ensureAudio()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = gainVal
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration)
  }

  const winSound = () => {
    beep(660, 0.14, 'triangle', 0.22)
    setTimeout(() => beep(880, 0.14, 'triangle', 0.22), 140)
    setTimeout(() => beep(1320, 0.22, 'triangle', 0.22), 280)
  }

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice(stateRef.current.voices)
      if (v) u.voice = v
      u.lang = v ? v.lang : 'lt-LT'
      u.rate = 0.85
      u.pitch = 1.12
      window.speechSynthesis.speak(u)
    } catch { /* ignore */ }
  }

  const randomPositions = (count, minDist) => {
    const board = boardRef.current
    if (!board) return []
    const pad = 16
    const W = Math.max(1, board.clientWidth - CELL_SIZE - pad * 2)
    const H = Math.max(1, board.clientHeight - CELL_SIZE - pad * 2)
    const positions = []
    let tries = 0
    while (positions.length < count && tries < 5000) {
      const x = pad + Math.random() * W
      const y = pad + Math.random() * H
      let ok = true
      for (const p of positions) {
        const dx = p.x - x
        const dy = p.y - y
        if (dx * dx + dy * dy < minDist * minDist) { ok = false; break }
      }
      if (ok) positions.push({ x, y })
      tries++
    }
    return positions
  }

  const findFreePlayerSpot = (cells) => {
    const board = boardRef.current
    if (!board) return { x: 20, y: 20 }
    const pad = 12
    for (let i = 0; i < 400; i++) {
      const x = pad + Math.random() * (board.clientWidth - PLAYER_SIZE - pad * 2)
      const y = pad + Math.random() * (board.clientHeight - PLAYER_SIZE - pad * 2)
      let ok = true
      for (const c of cells) {
        if (c.collected) continue
        const cx = c.x + CELL_SIZE / 2
        const cy = c.y + CELL_SIZE / 2
        const px = x + PLAYER_SIZE / 2
        const py = y + PLAYER_SIZE / 2
        const d2 = (cx - px) * (cx - px) + (cy - py) * (cy - py)
        if (d2 < 90 * 90) { ok = false; break }
      }
      if (ok) return { x, y }
    }
    return { x: 10, y: 10 }
  }

  const pickTarget = () => {
    const s = stateRef.current
    const remaining = s.cells.filter(c => !c.collected)
    if (!remaining.length) {
      finishRound()
      return
    }
    const t = remaining[Math.floor(Math.random() * remaining.length)]
    s.target = t
    setTargetLabel(t.ch)
    speak(wordPrefix + t.ch)
  }

  const announceTarget = () => {
    const t = stateRef.current.target
    if (t) speak(wordPrefix + t.ch)
  }

  const finishRound = () => {
    stateRef.current.target = null
    setTargetLabel('🏆')
    speak('Šauniai pavyko! Žaidžiam dar!')
    setTimeout(() => {
      if (stateRef.current.running) buildBoard()
    }, 1600)
  }

  const buildBoard = () => {
    const s = stateRef.current
    const count = mode === 'letters' ? 10 : 8
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
    const positions = randomPositions(count, CELL_SIZE + 20)
    s.cells = shuffled.map((ch, i) => ({
      ch,
      x: positions[i]?.x ?? (30 + i * 96),
      y: positions[i]?.y ?? 40,
      collected: false,
      bg: CELL_BG[i % CELL_BG.length],
    }))
    const pp = findFreePlayerSpot(s.cells)
    s.player.x = pp.x
    s.player.y = pp.y
    forceRender(n => n + 1)
    pickTarget()
  }

  const confettiBurst = (x, y) => {
    const board = boardRef.current
    if (!board) return
    const colors = ['#EF4444','#F59E0B','#22C55E','#3B82F6','#A855F7','#EC4899']
    for (let i = 0; i < 22; i++) {
      const el = document.createElement('div')
      el.className = 'drive-confetti'
      el.style.left = (x + (Math.random() * 100 - 50)) + 'px'
      el.style.top = (y + (Math.random() * 40 - 20)) + 'px'
      el.style.background = colors[i % colors.length]
      el.style.transform = `rotate(${Math.random() * 360}deg)`
      board.appendChild(el)
      setTimeout(() => el.remove(), 1300)
    }
  }

  const checkCollision = () => {
    const s = stateRef.current
    if (!s.target || s.target.collected) return
    const px = s.player.x + PLAYER_SIZE / 2
    const py = s.player.y + PLAYER_SIZE / 2
    const cx = s.target.x + CELL_SIZE / 2
    const cy = s.target.y + CELL_SIZE / 2
    const d2 = (cx - px) * (cx - px) + (cy - py) * (cy - py)
    const hit = CELL_SIZE / 2 + PLAYER_SIZE / 2 - 18
    if (d2 < hit * hit) {
      s.target.collected = true
      winSound()
      confettiBurst(s.target.x + CELL_SIZE / 2 - 5, s.target.y + CELL_SIZE / 2 - 5)
      setScore(prev => {
        const next = prev + 1
        onScore?.(next)
        return next
      })
      forceRender(n => n + 1)
      setTimeout(pickTarget, 380)
    }
  }

  const step = () => {
    const s = stateRef.current
    if (!s.running) return
    let dx = 0, dy = 0
    if (s.keys['ArrowLeft']  || s.keys['a'] || s.keys['A']) dx -= SPEED
    if (s.keys['ArrowRight'] || s.keys['d'] || s.keys['D']) dx += SPEED
    if (s.keys['ArrowUp']    || s.keys['w'] || s.keys['W']) dy -= SPEED
    if (s.keys['ArrowDown']  || s.keys['s'] || s.keys['S']) dy += SPEED
    const board = boardRef.current
    if (board && (dx || dy)) {
      const maxX = board.clientWidth - PLAYER_SIZE
      const maxY = board.clientHeight - PLAYER_SIZE
      s.player.x = Math.max(0, Math.min(maxX, s.player.x + dx))
      s.player.y = Math.max(0, Math.min(maxY, s.player.y + dy))
      s.lastDx = dx
      forceRender(n => n + 1)
      checkCollision()
    }
    requestAnimationFrame(step)
  }

  useEffect(() => {
    const s = stateRef.current
    s.running = true
    ensureAudio()

    const handleKeyDown = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault()
      s.keys[e.key] = true
      if (e.key === ' ' || e.key === 'Enter') announceTarget()
    }
    const handleKeyUp = (e) => { s.keys[e.key] = false }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const onResize = () => { if (s.running) buildBoard() }
    window.addEventListener('resize', onResize)

    requestAnimationFrame(() => {
      buildBoard()
      requestAnimationFrame(step)
    })

    return () => {
      s.running = false
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', onResize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // touch controls
  const touchStartRef = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchMove = (e) => {
    const start = touchStartRef.current
    if (!start) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const k = stateRef.current.keys
    k.ArrowLeft  = dx < -8
    k.ArrowRight = dx >  8
    k.ArrowUp    = dy < -8
    k.ArrowDown  = dy >  8
  }
  const onTouchEnd = () => {
    touchStartRef.current = null
    const k = stateRef.current.keys
    k.ArrowLeft = k.ArrowRight = k.ArrowUp = k.ArrowDown = false
  }

  const s = stateRef.current
  const flip = (s.lastDx || 0) < 0

  return (
    <div style={styles.wrap}>
      <style>{`
        @keyframes drivePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3) rotate(-8deg); }
          100% { transform: scale(0) rotate(14deg); opacity: 0; }
        }
        .drive-cell.collected { animation: drivePop 0.4s ease-out forwards; }
        .drive-confetti {
          position: absolute; width: 10px; height: 14px;
          pointer-events: none; z-index: 20; border-radius: 2px;
          animation: driveFall 1.2s ease-out forwards;
        }
        @keyframes driveFall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(220px) rotate(540deg); opacity: 0; }
        }
      `}</style>
      <div style={styles.hud}>
        <div style={styles.banner}>
          Rask: <span style={styles.bigCh}>{targetLabel}</span>
          <button onClick={announceTarget} style={styles.iconBtn} title="Pakartoti">🔊</button>
        </div>
        <div style={styles.score}>⭐ {score}</div>
      </div>

      <div
        ref={boardRef}
        style={styles.board}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {s.cells.map((c, i) => (
          <div
            key={i}
            className={'drive-cell' + (c.collected ? ' collected' : '')}
            style={{
              ...styles.cell,
              left: c.x,
              top: c.y,
              background: c.bg,
            }}
          >
            {c.ch}
          </div>
        ))}
        <div
          style={{
            ...styles.player,
            left: s.player.x,
            top: s.player.y,
            transform: flip ? 'scaleX(-1)' : 'scaleX(1)',
          }}
        >🚗</div>
      </div>

      <div style={styles.help}>
        Rodyklės ⬅ ⬆ ⬇ ➡ (arba W A S D). Telefone – braukite pirštu.
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'relative',
    width: '100%',
    minHeight: 460,
    userSelect: 'none',
  },
  hud: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  banner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'white',
    borderRadius: 14,
    padding: '8px 16px',
    fontSize: 18,
    fontWeight: 800,
    color: '#1F2937',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
  },
  bigCh: {
    display: 'inline-block',
    minWidth: '1.3em',
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 1,
    color: '#E11D48',
  },
  iconBtn: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: 18,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  score: {
    background: 'white',
    borderRadius: 14,
    padding: '8px 16px',
    fontSize: 18,
    fontWeight: 800,
    color: '#1F2937',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
  },
  board: {
    position: 'relative',
    width: '100%',
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #E0F2FE 0%, #EDE9FE 100%)',
    touchAction: 'none',
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.06)',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    fontWeight: 900,
    color: '#1E293B',
    borderRadius: 16,
    boxShadow: '0 5px 0 rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.12)',
    transition: 'transform 0.15s',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 50,
    pointerEvents: 'none',
    zIndex: 5,
    filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.25))',
    transition: 'transform 0.1s',
  },
  help: {
    marginTop: 10,
    textAlign: 'center',
    color: '#636E72',
    fontSize: 14,
    fontWeight: 600,
  },
}
