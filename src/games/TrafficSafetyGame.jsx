import { useCallback, useEffect, useRef, useState } from 'react'

// 🚦 Saugus eismas — inspiruota stennu718/traffic-game. Lavina vaikų
// reakciją ir mokoma eismo taisyklių: žalia = eik, raudona = stok.
// Klaidos (perėjimas per raudoną arba praleistas žalias) sumažina taškus.

const LIGHTS = ['red', 'yellow', 'green']
const COLORS = { red: '#FF7A6B', yellow: '#FFC845', green: '#4FD1A5' }

const ROUNDS = 20

function pickLight() {
  // 50% green, 40% red, 10% yellow
  const r = Math.random()
  if (r < 0.5) return 'green'
  if (r < 0.9) return 'red'
  return 'yellow'
}

const GREEN_TIPS = [
  'Žalia — gali eiti! Bet pirma apsidairyk.',
  'Žalia šviečia — saugus kelias.',
  'Pirma kairė, tada dešinė, tada pirmyn.',
]
const RED_TIPS = [
  'Raudona — stok! Niekada nebėk.',
  'Net jei skubi, raudonai šviečiant — stovi.',
  'Stok ir lauk žalios šviesos.',
]
const YELLOW_TIPS = [
  'Geltona — bus raudona. Stok ir lauk.',
  'Geltona reiškia „pasiruošk stoti".',
]

export default function TrafficSafetyGame({ onScore }) {
  const [phase, setPhase] = useState('intro') // intro | playing | result | feedback
  const [light, setLight] = useState('red')
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(null) // { ok, kind, tip }
  const [crossed, setCrossed] = useState(false) // child decided to cross this round
  const lightTimerRef = useRef(null)
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
    setScore(0)
    setRound(0)
    setCrossed(false)
    setFeedback(null)
    setLight('red')
    setPhase('playing')
  }, [ensureAudio])

  // sequence: show light for 2-3s, then evaluate
  useEffect(() => {
    if (phase !== 'playing') return
    if (round >= ROUNDS) {
      setPhase('result')
      onScore?.(score)
      return
    }
    const newLight = pickLight()
    setLight(newLight)
    setCrossed(false)
    const showTime = 1800 + Math.random() * 1200
    lightTimerRef.current = setTimeout(() => {
      // evaluate decision
      let ok = false
      let tip = ''
      if (newLight === 'green') {
        ok = crossedRef.current
        tip = ok
          ? GREEN_TIPS[Math.floor(Math.random() * GREEN_TIPS.length)]
          : 'Žalia degė — galėjai eiti! Praleidai progą.'
      } else if (newLight === 'red') {
        ok = !crossedRef.current
        tip = ok
          ? RED_TIPS[Math.floor(Math.random() * RED_TIPS.length)]
          : '⚠️ Praėjai per raudoną! Tai labai pavojinga gatvėje.'
      } else {
        // yellow — best to wait
        ok = !crossedRef.current
        tip = ok
          ? YELLOW_TIPS[Math.floor(Math.random() * YELLOW_TIPS.length)]
          : 'Geltona — geriau buvo palaukti.'
      }
      if (ok) {
        beep(660, 0.1, 'triangle', 0.18)
        setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 100)
        setScore(s => s + (newLight === 'red' ? 8 : newLight === 'yellow' ? 6 : 5))
      } else {
        beep(180, 0.2, 'sawtooth', 0.18)
      }
      setFeedback({ ok, kind: newLight, tip })
      setPhase('feedback')
    }, showTime)
    return () => clearTimeout(lightTimerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round])

  const crossedRef = useRef(crossed)
  useEffect(() => { crossedRef.current = crossed }, [crossed])

  const nextRound = () => {
    setFeedback(null)
    setRound(r => r + 1)
    setPhase('playing')
  }

  const cross = () => {
    if (phase !== 'playing' || crossed) return
    setCrossed(true)
  }

  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🚦 Saugus eismas</h3>
        <div style={s.intro}>
          <p style={{ marginBottom: 10 }}>Stebi šviesoforą ir nuspręsk: <b>eiti ar stovėti</b>.</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li><span style={s.dotGreen} /> <b>Žalia</b> – paspausk „Eiti per gatvę"</li>
            <li><span style={s.dotRed} /> <b>Raudona</b> – stovi vietoje (nieko nespausk)</li>
            <li><span style={s.dotYellow} /> <b>Geltona</b> – geriau palauk</li>
          </ul>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>{ROUNDS} sankryžų. Kuo mažiau klaidų — tuo daugiau taškų.</p>
        </div>
        <button onClick={start} style={s.bigBtn}>🚶 Pradėti</button>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🏆 Sankryžos baigtos</h3>
        <div style={{ ...s.intro, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 60, color: 'var(--primary)' }}>{score}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>taškai · {ROUNDS} sankryžų</div>
        </div>
        <button onClick={start} style={s.bigBtn}>🔄 Bandyti dar</button>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.hud}>
        <div style={s.scorePill}>⭐ {score}</div>
        <div style={s.scorePill}>🚦 {round + 1} / {ROUNDS}</div>
      </div>

      {/* scene */}
      <div style={s.scene}>
        {/* light box */}
        <div style={s.lightBox}>
          {LIGHTS.map(l => (
            <div
              key={l}
              style={{
                ...s.lamp,
                background: light === l ? COLORS[l] : '#1F2937',
                boxShadow: light === l ? `0 0 32px ${COLORS[l]}` : 'inset 0 4px 8px rgba(0,0,0,0.5)',
              }}
            />
          ))}
        </div>

        {/* road */}
        <div style={s.road}>
          <div style={s.zebra}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={s.stripe} />)}
          </div>
          <div style={{ ...s.kid, left: crossed ? '70%' : '8%' }}>🧒</div>
        </div>
      </div>

      {phase === 'playing' && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            onClick={cross}
            disabled={crossed}
            style={{
              ...s.crossBtn,
              opacity: crossed ? 0.5 : 1,
              cursor: crossed ? 'default' : 'pointer',
            }}
          >
            {crossed ? '🚶 Einu…' : '🚶 Eiti per gatvę'}
          </button>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
            Jei mano, kad reikia stovėti — nieko nespausk
          </p>
        </div>
      )}

      {phase === 'feedback' && feedback && (
        <div style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          background: feedback.ok ? 'linear-gradient(135deg,#BBF7D0,#4FD1A5)' : 'linear-gradient(135deg,#FECACA,#FF7A6B)',
          color: 'white',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
            {feedback.ok ? '✓ Šaunu!' : '✗ Klaida'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{feedback.tip}</div>
          <button onClick={nextRound} style={{ ...s.crossBtn, marginTop: 14, background: 'white', color: 'var(--ink)' }}>
            Sekanti sankryža →
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', textAlign: 'center', marginBottom: 16 },
  intro: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 18, fontSize: 15, color: 'var(--ink)' },
  bigBtn: {
    background: 'linear-gradient(135deg,#FF7A6B,#FFC845,#4FD1A5)', color: 'white',
    border: 'none', borderRadius: 14, padding: '16px 32px', fontSize: 17, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', display: 'block', margin: '0 auto',
    boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
  },
  hud: { display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  scorePill: { background: 'white', padding: '8px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 14, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  dotGreen:  { display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: COLORS.green,  verticalAlign: 'middle', marginRight: 8 },
  dotRed:    { display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: COLORS.red,    verticalAlign: 'middle', marginRight: 8 },
  dotYellow: { display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: COLORS.yellow, verticalAlign: 'middle', marginRight: 8 },
  scene: {
    background: 'linear-gradient(180deg,#C7E8FF,#9DD1FF)',
    borderRadius: 18,
    padding: 20,
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08)',
    position: 'relative',
  },
  lightBox: {
    width: 70,
    background: '#1F2937',
    border: '4px solid #0F172A',
    borderRadius: 14,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    margin: '0 auto 18px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
  },
  lamp: {
    width: 50, height: 50, borderRadius: '50%',
    transition: 'background 0.15s, box-shadow 0.15s',
  },
  road: {
    background: '#475569',
    borderRadius: 12,
    height: 100,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3)',
  },
  zebra: {
    position: 'absolute', top: 10, bottom: 10, left: '40%', width: '20%',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  stripe: { height: 10, background: 'white', borderRadius: 2 },
  kid: {
    position: 'absolute', bottom: 12, fontSize: 48,
    transition: 'left 1.2s cubic-bezier(.5,.0,.4,1)',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
  },
  crossBtn: {
    background: 'var(--primary)', color: 'white', border: 'none',
    borderRadius: 14, padding: '14px 28px', fontSize: 16, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(108,99,255,0.35)',
  },
}
