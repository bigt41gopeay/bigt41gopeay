import { useEffect, useRef, useState, useCallback } from 'react'
import Countdown from '../components/Countdown'

// Paukštelio nuotykiai — web variant inspired by phonethantko/StappieBird.
// Original is a Python+OpenCV desktop game using webcam hand detection;
// this is a browser Canvas remake with the same therapeutic ADHD intent:
// short bursts, immediate feedback, focus + reaction practice.
//
// Controls: Space / ↑ / click / tap to flap.
// Press Space again to start/restart.

const W = 480
const H = 640
const BIRD_X = 110
const BIRD_R = 22
const GRAVITY = 0.42
const FLAP_VY = -7.6
const PIPE_W = 70
const PIPE_GAP_MIN = 150
const PIPE_GAP_MAX = 200
const SPAWN_EVERY = 1500    // ms between pipes (eases over time)
const SCROLL = 2.4

const COLORS = {
  sky:     '#FFF9F0',
  cloud:   '#FFFFFF',
  ground:  '#FFD166',
  pipe:    '#4FD1A5',
  pipeDk:  '#2A9D7C',
  pipeRim: '#1F7B61',
  bird:    '#FFC845',
  birdDk:  '#C8881E',
  text:    '#2D2A45',
  shadow:  'rgba(45,42,69,0.15)',
}

const HS_KEY = 'flapBirdHighScore'

function rand(min, max) { return min + Math.random() * (max - min) }

function makeInitialState() {
  return {
    birdY: H / 2,
    vy: 0,
    pipes: [],
    lastSpawn: 0,
    tStart: 0,
    clouds: [
      { x: 60,  y: 80,  r: 22 },
      { x: 240, y: 130, r: 18 },
      { x: 380, y: 60,  r: 24 },
      { x: 150, y: 200, r: 16 },
    ],
    groundOffset: 0,
  }
}

export default function FlapBirdGame({ onScore }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(makeInitialState())
  const audioCtxRef = useRef(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem(HS_KEY) || '0', 10) } catch { return 0 }
  })
  const [phase, setPhase] = useState('ready') // 'ready' | 'countdown' | 'playing' | 'dead'

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }, [])

  const beep = useCallback((freq, dur, type = 'triangle', g = 0.16) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = type; o.frequency.value = freq; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.stop(ctx.currentTime + dur)
  }, [ensureAudio])

  const reset = useCallback(() => {
    stateRef.current = makeInitialState()
    setScore(0)
  }, [])

  const flap = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    if (phase === 'ready') {
      setPhase('countdown')
      return
    }
    if (phase === 'countdown') return
    if (phase === 'playing') {
      s.vy = FLAP_VY
      beep(560, 0.07, 'square', 0.1)
    }
    if (phase === 'dead') {
      reset()
      setPhase('ready')
    }
  }, [phase, reset, beep])

  const onCountdownDone = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.tStart = performance.now()
    s.lastSpawn = performance.now() - SPAWN_EVERY
    setPhase('playing')
  }, [])

  // input
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        flap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flap])

  // game loop
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    let raf = 0
    let lastT = performance.now()

    const draw = (t) => {
      const dt = Math.min(33, t - lastT)
      lastT = t
      const s = stateRef.current

      // background sky
      ctx.fillStyle = COLORS.sky
      ctx.fillRect(0, 0, W, H)

      // clouds slow drift
      ctx.fillStyle = COLORS.cloud
      s.clouds.forEach(c => {
        c.x -= 0.15
        if (c.x < -40) c.x = W + 40
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
        ctx.arc(c.x + c.r * 0.8, c.y + 4, c.r * 0.7, 0, Math.PI * 2)
        ctx.arc(c.x - c.r * 0.8, c.y + 4, c.r * 0.7, 0, Math.PI * 2)
        ctx.fill()
      })

      // physics + spawn (only when playing)
      if (phase === 'playing') {
        s.vy += GRAVITY
        s.birdY += s.vy

        // spawn pipes — interval shrinks slightly over time (max 30% faster)
        const elapsed = (t - s.tStart) / 1000
        const interval = Math.max(SPAWN_EVERY * 0.7, SPAWN_EVERY - elapsed * 25)
        if (t - s.lastSpawn >= interval) {
          const gap = rand(PIPE_GAP_MIN, PIPE_GAP_MAX)
          const top = rand(60, H - 140 - gap)
          s.pipes.push({ x: W + 20, top, gap, passed: false })
          s.lastSpawn = t
        }

        // move pipes + scoring
        const groundY = H - 80
        s.pipes.forEach(p => {
          p.x -= SCROLL + Math.min(2, elapsed * 0.05)
          if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.passed = true
            setScore(prev => {
              const next = prev + 1
              onScore?.(next)
              beep(880, 0.08, 'triangle', 0.18)
              setTimeout(() => beep(1320, 0.1, 'triangle', 0.18), 80)
              return next
            })
          }
        })
        // cull off-screen
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 5)

        // collisions
        const dead =
          s.birdY - BIRD_R < 0 ||
          s.birdY + BIRD_R > groundY ||
          s.pipes.some(p =>
            BIRD_X + BIRD_R > p.x &&
            BIRD_X - BIRD_R < p.x + PIPE_W &&
            (s.birdY - BIRD_R < p.top || s.birdY + BIRD_R > p.top + p.gap)
          )

        if (dead) {
          beep(180, 0.18, 'sawtooth', 0.18)
          setTimeout(() => beep(120, 0.22, 'sawtooth', 0.16), 140)
          setPhase('dead')
          setHighScore(prev => {
            setScore(curr => {
              if (curr > prev) {
                try { localStorage.setItem(HS_KEY, String(curr)) } catch { /* ignore */ }
              }
              return curr
            })
            return Math.max(prev, score)
          })
        }

        // ground scroll
        s.groundOffset = (s.groundOffset + SCROLL) % 32
      }

      // draw pipes
      const groundY = H - 80
      s.pipes.forEach(p => {
        // top pipe
        ctx.fillStyle = COLORS.pipe
        ctx.fillRect(p.x, 0, PIPE_W, p.top)
        ctx.fillStyle = COLORS.pipeDk
        ctx.fillRect(p.x + PIPE_W - 8, 0, 8, p.top)
        ctx.fillStyle = COLORS.pipeRim
        ctx.fillRect(p.x - 4, p.top - 18, PIPE_W + 8, 18)
        // bottom pipe
        ctx.fillStyle = COLORS.pipe
        ctx.fillRect(p.x, p.top + p.gap, PIPE_W, groundY - (p.top + p.gap))
        ctx.fillStyle = COLORS.pipeDk
        ctx.fillRect(p.x + PIPE_W - 8, p.top + p.gap, 8, groundY - (p.top + p.gap))
        ctx.fillStyle = COLORS.pipeRim
        ctx.fillRect(p.x - 4, p.top + p.gap, PIPE_W + 8, 18)
      })

      // ground
      ctx.fillStyle = COLORS.ground
      ctx.fillRect(0, groundY, W, H - groundY)
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      for (let i = -32; i < W + 32; i += 32) {
        ctx.fillRect(i + s.groundOffset, groundY, 16, 6)
      }

      // bird shadow
      ctx.fillStyle = COLORS.shadow
      ctx.beginPath()
      ctx.ellipse(BIRD_X, groundY - 4, 20, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // bird (rotated by velocity)
      const rot = Math.max(-0.5, Math.min(0.9, s.vy / 12))
      ctx.save()
      ctx.translate(BIRD_X, s.birdY)
      ctx.rotate(rot)
      // body
      ctx.fillStyle = COLORS.bird
      ctx.beginPath()
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2)
      ctx.fill()
      // belly
      ctx.fillStyle = '#FFF3DA'
      ctx.beginPath()
      ctx.arc(-3, 6, BIRD_R - 8, 0, Math.PI * 2)
      ctx.fill()
      // wing (animates with vy)
      ctx.fillStyle = COLORS.birdDk
      const wingFlap = Math.sin(t / 90) * 4
      ctx.beginPath()
      ctx.ellipse(-4, 2 + wingFlap, 11, 7, -0.2, 0, Math.PI * 2)
      ctx.fill()
      // beak
      ctx.fillStyle = '#FF7A6B'
      ctx.beginPath()
      ctx.moveTo(BIRD_R - 2, -2)
      ctx.lineTo(BIRD_R + 10, 0)
      ctx.lineTo(BIRD_R - 2, 4)
      ctx.closePath()
      ctx.fill()
      // eye
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.arc(6, -6, 6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = COLORS.text
      ctx.beginPath(); ctx.arc(7, -6, 3, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // score (in-game)
      if (phase !== 'ready') {
        ctx.fillStyle = COLORS.text
        ctx.font = 'bold 56px Baloo 2, Nunito, sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 6
        const txt = String(score)
        ctx.strokeText(txt, W / 2, 90)
        ctx.fillText(txt, W / 2, 90)
        ctx.textAlign = 'start'
      }

      // overlays
      if (phase === 'ready') drawReady(ctx)
      if (phase === 'dead')  drawGameOver(ctx, score, Math.max(highScore, score))

      raf = requestAnimationFrame(draw)
      void dt
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [phase, score, highScore, beep, onScore])

  // touch
  const onPointer = (e) => {
    e.preventDefault()
    ensureAudio()
    flap()
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div style={styles.title}>🐦 Paukštelio nuotykiai</div>
        <div style={styles.hsPill}>🏆 Rekordas: {Math.max(highScore, score)}</div>
      </div>
      <div style={{ ...styles.canvasWrap, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={styles.canvas}
          onMouseDown={onPointer}
          onTouchStart={onPointer}
        />
        {phase === 'countdown' && <Countdown onDone={onCountdownDone} />}
      </div>
      <div style={styles.help}>
        Spauskite <b>Tarpą</b>, rodyklę aukštyn arba liesk ekraną, kad paukštelis pakiltų aukštyn.
      </div>
    </div>
  )
}

function drawReady(ctx) {
  ctx.fillStyle = 'rgba(45,42,69,0.55)'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFF9F0'
  roundedRect(ctx, W / 2 - 180, H / 2 - 110, 360, 220, 22)
  ctx.fill()
  ctx.fillStyle = COLORS.text
  ctx.font = 'bold 32px Baloo 2, Nunito, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Pasiruošk skristi!', W / 2, H / 2 - 50)
  ctx.font = '600 16px Nunito, sans-serif'
  ctx.fillText('Spausk TARPĄ arba bakstelėk', W / 2, H / 2 - 10)
  ctx.fillText('Praskridęs tarp vamzdžių —', W / 2, H / 2 + 18)
  ctx.fillText('gauni tašką ⭐', W / 2, H / 2 + 44)
  ctx.font = 'bold 18px Baloo 2, Nunito, sans-serif'
  ctx.fillStyle = COLORS.pipeDk
  ctx.fillText('▶ Pradėti', W / 2, H / 2 + 86)
  ctx.textAlign = 'start'
}

function drawGameOver(ctx, score, hs) {
  ctx.fillStyle = 'rgba(45,42,69,0.6)'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFF9F0'
  roundedRect(ctx, W / 2 - 180, H / 2 - 130, 360, 260, 22)
  ctx.fill()
  ctx.fillStyle = '#FF7A6B'
  ctx.font = 'bold 30px Baloo 2, Nunito, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Ai! Atsitrenkėm…', W / 2, H / 2 - 70)
  ctx.fillStyle = COLORS.text
  ctx.font = '600 18px Nunito, sans-serif'
  ctx.fillText('Tavo taškai:', W / 2, H / 2 - 30)
  ctx.font = 'bold 56px Baloo 2, Nunito, sans-serif'
  ctx.fillStyle = '#6C63FF'
  ctx.fillText(String(score), W / 2, H / 2 + 24)
  ctx.font = '600 15px Nunito, sans-serif'
  ctx.fillStyle = '#8A86A0'
  ctx.fillText(`Aukščiausias rekordas: ${hs}`, W / 2, H / 2 + 56)
  ctx.font = 'bold 18px Baloo 2, Nunito, sans-serif'
  ctx.fillStyle = COLORS.pipeDk
  ctx.fillText('🔄 Spausk TARPĄ — bandyk dar', W / 2, H / 2 + 96)
  ctx.textAlign = 'start'
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const styles = {
  wrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: W,
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: 22,
    color: 'var(--ink)',
  },
  hsPill: {
    background: 'white',
    border: '2px solid var(--border-strong)',
    borderRadius: 999,
    padding: '6px 14px',
    fontWeight: 800,
    fontSize: 14,
    color: 'var(--ink)',
  },
  canvasWrap: {
    width: '100%',
    maxWidth: W,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(45,42,69,0.18)',
    background: 'var(--cream)',
  },
  canvas: {
    width: '100%',
    height: 'auto',
    display: 'block',
    touchAction: 'manipulation',
    cursor: 'pointer',
  },
  help: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontWeight: 600,
    textAlign: 'center',
  },
}
