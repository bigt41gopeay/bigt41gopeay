import { useEffect, useRef, useState } from 'react'
import { speak as libSpeak } from '../lib/speak'

const LETTERS = ['A','Ą','B','C','Č','D','E','Ę','Ė','F','G','H','I','Į','Y','J','K','L','M','N','O','P','R','S','Š','T','U','Ų','Ū','V','Z','Ž']
const NUMBERS = ['0','1','2','3','4','5','6','7','8','9']

const CELL_SIZE = 88
const PLAYER_SIZE = 70
const SPEED = 6
const CELL_BG = ['#FDE68A','#FECACA','#BBF7D0','#BAE6FD','#DDD6FE','#FBCFE8','#FED7AA','#A7F3D0']

// Finger hint per Lithuanian QWERTY layout (used for the small "press with" pill)
const KEY_FINGER = {
  'Q':'☝🏼 maž. kair.', 'A':'☝🏼 maž. kair.', 'Z':'☝🏼 maž. kair.',
  'W':'🤞 bevardis kair.','S':'🤞 bevardis kair.','X':'🤞 bevardis kair.',
  'E':'🖕 vid. kair.','D':'🖕 vid. kair.','C':'🖕 vid. kair.',
  'R':'👆 rodom. kair.','F':'👆 rodom. kair.','V':'👆 rodom. kair.',
  'T':'👆 rodom. kair.','G':'👆 rodom. kair.','B':'👆 rodom. kair.',
  'Y':'👆 rodom. deš.','H':'👆 rodom. deš.','N':'👆 rodom. deš.',
  'U':'👆 rodom. deš.','J':'👆 rodom. deš.','M':'👆 rodom. deš.',
  'I':'🖕 vid. deš.','K':'🖕 vid. deš.',
  'O':'🤞 bevardis deš.','L':'🤞 bevardis deš.',
  'P':'☝🏼 maž. deš.',
  'Ą':'☝🏼 maž. kair.','Č':'🤞 bevardis kair.','Ę':'🖕 vid. kair.',
  'Ė':'👆 rodom. kair.','Į':'👆 rodom. kair.',
  'Š':'👆 rodom. deš.','Ų':'👆 rodom. deš.',
  'Ū':'🖕 vid. deš.','Ž':'☝🏼 maž. deš.',
  '1':'☝🏼 maž. kair.','2':'🤞 bevardis kair.','3':'🖕 vid. kair.',
  '4':'👆 rodom. kair.','5':'👆 rodom. kair.',
  '6':'👆 rodom. deš.','7':'👆 rodom. deš.','8':'🖕 vid. deš.',
  '9':'🤞 bevardis deš.','0':'☝🏼 maž. deš.',
}

export default function DriveGame({ mode = 'letters', onScore }) {
  const boardRef = useRef(null)
  const stateRef = useRef({
    cells: [],
    target: null,
    player: { x: 40, y: 60, lastDx: 1 },
    trail: [],
    keys: {},
    running: false,
    audioCtx: null,
    engineGain: null,
    engineOsc: null,
    voices: [],
    lastEngineUpdate: 0,
    combo: 0,
    shake: 0,
  })

  const [, forceRender] = useState(0)
  const [score, setScore] = useState(0)
  const [targetLabel, setTargetLabel] = useState('?')
  const [combo, setCombo] = useState(0)
  const [showFireworks, setShowFireworks] = useState(false)

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

  const winSound = (level = 0) => {
    const base = 660 + level * 80
    beep(base, 0.12, 'triangle', 0.22)
    setTimeout(() => beep(base * 1.33, 0.12, 'triangle', 0.22), 110)
    setTimeout(() => beep(base * 2, 0.2, 'triangle', 0.22), 220)
    if (level >= 3) setTimeout(() => beep(base * 2.5, 0.25, 'triangle', 0.22), 360)
  }

  const setEngine = (active) => {
    const s = stateRef.current
    const ctx = ensureAudio()
    if (!ctx) return
    if (active && !s.engineOsc) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 90
      gain.gain.value = 0.025
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      s.engineOsc = osc
      s.engineGain = gain
    } else if (!active && s.engineOsc) {
      try { s.engineOsc.stop() } catch { /* ignore */ }
      s.engineOsc = null
      s.engineGain = null
    }
  }

  const speak = (text) => libSpeak(text)

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
    setShowFireworks(true)
    speak('Šauniai pavyko! Žaidžiam dar!')
    bigFireworks()
    setTimeout(() => {
      setShowFireworks(false)
      if (stateRef.current.running) buildBoard()
    }, 2200)
  }

  const buildBoard = () => {
    const s = stateRef.current
    const count = mode === 'letters' ? 10 : 8
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
    const positions = randomPositions(count, CELL_SIZE + 22)
    s.cells = shuffled.map((ch, i) => ({
      ch,
      x: positions[i]?.x ?? (30 + i * 96),
      y: positions[i]?.y ?? 40,
      collected: false,
      bg: CELL_BG[i % CELL_BG.length],
      wobble: Math.random() * Math.PI * 2,
    }))
    const pp = findFreePlayerSpot(s.cells)
    s.player.x = pp.x
    s.player.y = pp.y
    s.trail = []
    s.combo = 0
    setCombo(0)
    forceRender(n => n + 1)
    pickTarget()
  }

  const confettiBurst = (x, y, count = 28) => {
    const board = boardRef.current
    if (!board) return
    const colors = ['#EF4444','#F59E0B','#22C55E','#3B82F6','#A855F7','#EC4899','#06D6A0','#FFD166']
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'drive-confetti'
      const angle = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 140
      el.style.left = (x) + 'px'
      el.style.top = (y) + 'px'
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
      el.style.setProperty('--dy', `${Math.sin(angle) * dist + 60}px`)
      el.style.background = colors[i % colors.length]
      el.style.transform = `rotate(${Math.random() * 360}deg)`
      board.appendChild(el)
      setTimeout(() => el.remove(), 1300)
    }
  }

  const bigFireworks = () => {
    const board = boardRef.current
    if (!board) return
    const W = board.clientWidth
    const H = board.clientHeight
    for (let burst = 0; burst < 5; burst++) {
      setTimeout(() => {
        confettiBurst(Math.random() * W, Math.random() * H * 0.6 + 40, 40)
        beep(440 + burst * 110, 0.2, 'triangle', 0.18)
      }, burst * 280)
    }
  }

  const triggerShake = (intensity = 1) => {
    stateRef.current.shake = intensity
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
      s.combo += 1
      setCombo(s.combo)
      winSound(Math.min(s.combo - 1, 4))
      confettiBurst(s.target.x + CELL_SIZE / 2, s.target.y + CELL_SIZE / 2, 26 + s.combo * 4)
      triggerShake(Math.min(s.combo, 4))
      setScore(prev => {
        const gained = 1 + Math.floor(s.combo / 3)
        const next = prev + gained
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
    const moving = dx !== 0 || dy !== 0

    if (board && moving) {
      const maxX = board.clientWidth - PLAYER_SIZE
      const maxY = board.clientHeight - PLAYER_SIZE
      s.player.x = Math.max(0, Math.min(maxX, s.player.x + dx))
      s.player.y = Math.max(0, Math.min(maxY, s.player.y + dy))
      if (dx !== 0) s.player.lastDx = dx > 0 ? 1 : -1
      s.player.tilt = dx * 1.2
      s.trail.push({ x: s.player.x + PLAYER_SIZE / 2, y: s.player.y + PLAYER_SIZE / 2, age: 0 })
      if (s.trail.length > 16) s.trail.shift()
      checkCollision()
    }
    // age trail
    s.trail.forEach(t => t.age += 1)
    s.trail = s.trail.filter(t => t.age < 20)

    // engine: on while moving
    setEngine(moving)
    if (s.engineGain && moving) {
      const now = performance.now()
      if (now - s.lastEngineUpdate > 60) {
        s.engineGain.gain.value = 0.03 + (Math.random() * 0.01)
        s.engineOsc.frequency.value = 70 + Math.random() * 30
        s.lastEngineUpdate = now
      }
    }

    // shake decay
    if (s.shake > 0) s.shake = Math.max(0, s.shake - 0.18)

    // wobble cells
    s.cells.forEach(c => { if (!c.collected) c.wobble += 0.06 })

    forceRender(n => n + 1)
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
      setEngine(false)
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', onResize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

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
  const flip = s.player.lastDx < 0
  const tilt = Math.max(-15, Math.min(15, (s.player.tilt || 0)))
  const shake = s.shake
  const shakeX = (Math.random() - 0.5) * shake * 8
  const shakeY = (Math.random() - 0.5) * shake * 8
  const fingerHint = (mode === 'letters' || mode === 'numbers') && targetLabel && KEY_FINGER[targetLabel]

  return (
    <div style={styles.wrap}>
      <style>{`
        @keyframes drivePop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.35) rotate(-8deg); }
          100% { transform: scale(0) rotate(14deg); opacity: 0; }
        }
        @keyframes drivePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        .drive-cell { transition: transform 0.15s; }
        .drive-cell.collected { animation: drivePop 0.4s ease-out forwards; }
        .drive-cell.is-target {
          outline: 4px dashed #ef4444;
          outline-offset: 4px;
          animation: drivePulse 0.9s ease-in-out infinite;
        }
        .drive-confetti {
          position: absolute; width: 10px; height: 14px;
          pointer-events: none; z-index: 20; border-radius: 2px;
          animation: driveFall 1.3s cubic-bezier(.2,.6,.4,1) forwards;
        }
        @keyframes driveFall {
          0%   { transform: translate(0,0) rotate(0); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(540deg); opacity: 0; }
        }
        @keyframes comboShout {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          40%{ transform: scale(1.2) rotate(4deg);  opacity: 1; }
          100%{transform: scale(1)   rotate(0);     opacity: 0; }
        }
        .drive-combo {
          position: absolute; top: 30%; left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg,#FFD166,#FF6B8A);
          color: white; padding: 8px 24px; border-radius: 16px;
          font-size: 26px; font-weight: 900; pointer-events: none;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
          animation: comboShout 1s ease-out forwards;
          z-index: 30;
        }
        .drive-trail {
          position: absolute; width: 14px; height: 14px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, #ffffff99, transparent);
        }
        .drive-grid::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            radial-gradient(rgba(255,255,255,0.4) 2px, transparent 2px),
            radial-gradient(rgba(255,255,255,0.3) 2px, transparent 2px);
          background-size: 60px 60px, 60px 60px;
          background-position: 0 0, 30px 30px;
          opacity: 0.6; pointer-events: none;
        }
      `}</style>

      <div style={styles.hud}>
        <div style={styles.banner}>
          Rask: <span style={styles.bigCh}>{targetLabel}</span>
          <button onClick={announceTarget} style={styles.iconBtn} title="Pakartoti">🔊</button>
        </div>
        <div style={styles.score}>⭐ {score}</div>
      </div>

      {fingerHint && (
        <div style={styles.fingerHint}>
          <span style={{ fontWeight: 700 }}>Spaudžiama:</span> {fingerHint}
        </div>
      )}

      <div
        ref={boardRef}
        className="drive-grid"
        style={{
          ...styles.board,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {s.trail.map((t, i) => (
          <div
            key={i}
            className="drive-trail"
            style={{
              left: t.x - 7,
              top: t.y - 7,
              opacity: Math.max(0, 1 - t.age / 20) * 0.6,
              transform: `scale(${1 - t.age / 30})`,
            }}
          />
        ))}

        {s.cells.map((c, i) => {
          const isTarget = s.target === c && !c.collected
          const bob = Math.sin(c.wobble) * 3
          return (
            <div
              key={i}
              className={'drive-cell' + (c.collected ? ' collected' : '') + (isTarget ? ' is-target' : '')}
              style={{
                ...styles.cell,
                left: c.x,
                top: c.y + bob,
                background: c.bg,
              }}
            >
              {c.ch}
            </div>
          )
        })}

        <div
          style={{
            ...styles.player,
            left: s.player.x,
            top: s.player.y,
            transform: `${flip ? 'scaleX(-1)' : 'scaleX(1)'} rotate(${flip ? -tilt : tilt}deg)`,
          }}
        >🚗</div>

        {combo >= 2 && (
          <div className="drive-combo" key={'combo-' + score}>
            ✨ {combo}x ✨
          </div>
        )}

        {showFireworks && (
          <div style={styles.fireworksOverlay}>
            <div style={styles.fireworksText}>🎉 🏆 ŠAUNUOLIS! 🏆 🎉</div>
          </div>
        )}
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
    marginBottom: 10,
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
  fingerHint: {
    marginBottom: 8,
    fontSize: 14,
    color: '#475569',
    background: '#F1F5F9',
    border: '1px dashed #CBD5E1',
    borderRadius: 10,
    padding: '6px 12px',
    display: 'inline-block',
  },
  board: {
    position: 'relative',
    width: '100%',
    height: 460,
    borderRadius: 20,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #93C5FD 0%, #C4B5FD 60%, #FBCFE8 100%)',
    touchAction: 'none',
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.08)',
    transition: 'transform 0.05s linear',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 50,
    fontWeight: 900,
    color: '#1E293B',
    borderRadius: 18,
    boxShadow: '0 6px 0 rgba(0,0,0,0.18), 0 10px 20px rgba(0,0,0,0.18)',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 56,
    pointerEvents: 'none',
    zIndex: 5,
    filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.25))',
    transition: 'transform 0.08s',
  },
  fireworksOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none', zIndex: 40,
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.4), transparent 60%)',
  },
  fireworksText: {
    background: 'linear-gradient(135deg, #FFD166, #FF6B8A, #9B5DE5)',
    color: 'white', padding: '16px 36px', borderRadius: 20,
    fontSize: 32, fontWeight: 900,
    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
    transform: 'scale(1.1)',
  },
  help: {
    marginTop: 10,
    textAlign: 'center',
    color: '#636E72',
    fontSize: 14,
    fontWeight: 600,
  },
}
