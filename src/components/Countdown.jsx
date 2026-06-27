import { useEffect, useRef, useState } from 'react'

// 3-2-1-Pirmyn countdown shown before action games start.
// Plays a tick sound per digit and a higher "go" tone on launch.
// Renders over its parent (parent must be position: relative).
//
// Usage:
//   <Countdown onDone={() => start()} />          // 3..2..1..PIRMYN!
//   <Countdown from={5} label="Pasiruošk!" />     // custom
//   <Countdown onDone={fn} skipWith="Space" />   // press Space to skip

export default function Countdown({
  from = 3,
  label = 'Pasiruošk',
  goText = 'PIRMYN!',
  perDigitMs = 900,
  onDone,
  skipWith = ' ',
}) {
  const [n, setN] = useState(from)
  const [phase, setPhase] = useState('counting') // counting | go | done
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx) audioRef.current = new Ctx()
    return () => {
      try { audioRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  const beep = (freq, dur, type = 'sine', g = 0.18) => {
    const ctx = audioRef.current; if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = type; o.frequency.value = freq; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.stop(ctx.currentTime + dur)
  }

  useEffect(() => {
    if (phase !== 'counting') return
    beep(440, 0.12, 'triangle', 0.18)
    timerRef.current = setTimeout(() => {
      if (n > 1) {
        setN(prev => prev - 1)
      } else {
        setPhase('go')
        beep(660, 0.18, 'triangle', 0.22)
        setTimeout(() => beep(990, 0.22, 'triangle', 0.22), 100)
        setTimeout(() => {
          setPhase('done')
          onDone?.()
        }, 700)
      }
    }, perDigitMs)
    return () => clearTimeout(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, phase])

  useEffect(() => {
    if (!skipWith) return
    const onKey = (e) => {
      if (e.key === skipWith || (skipWith === ' ' && e.code === 'Space')) {
        e.preventDefault()
        clearTimeout(timerRef.current)
        setPhase('done')
        onDone?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipWith])

  if (phase === 'done') return null

  return (
    <div className="countdown-overlay" role="status" aria-live="polite">
      <div className="countdown-ring" />
      <div className="countdown-label">{phase === 'go' ? ' ' : label}</div>
      {phase === 'counting'
        ? <div key={n} className="countdown-digit">{n}</div>
        : <div className="countdown-go">{goText}</div>}
      {skipWith === ' ' && phase === 'counting' && (
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 12, fontWeight: 600 }}>
          (spausk TARPĄ — praleisti)
        </div>
      )}
    </div>
  )
}
