import { useEffect, useRef, useState } from 'react'
import { speak as libSpeak } from '../lib/speak'

// NLP principles:
//  - storytelling/metaphor: math wrapped in characters and adventures
//  - VAK: voice tells story, emojis show items, tap each to count
//  - chunking: 5 stories per level
//  - pacing: level up only when streak ≥ 4 (Vygotsky zone)
//  - positive reframing: "Beveik!" + correct answer reveal

const LEVELS = [
  {
    id: 1, name: 'Skaičiavimas iki 5', emoji: '🐰',
    gen: () => {
      const a = 1 + Math.floor(Math.random() * 4)
      const stories = [
        { hero: '🐰', heroName: 'Zuikis Petras', item: '🥕', itemPlural: 'morkos' },
        { hero: '🐱', heroName: 'Katė Murka', item: '🐟', itemPlural: 'žuvys' },
        { hero: '🐶', heroName: 'Šuo Reksis', item: '🦴', itemPlural: 'kauliukai' },
        { hero: '🐻', heroName: 'Lokys Mikas', item: '🍯', itemPlural: 'medaus puodynės' },
      ]
      const s = stories[Math.floor(Math.random() * stories.length)]
      return {
        text: `${s.heroName} pievoje rado ${a} ${s.itemPlural}. Kiek ${s.itemPlural}?`,
        items: Array(a).fill(s.item),
        hero: s.hero,
        answer: a,
        op: 'count',
      }
    },
  },
  {
    id: 2, name: 'Sudėtis iki 10', emoji: '➕',
    gen: () => {
      const a = 1 + Math.floor(Math.random() * 4)
      const b = 1 + Math.floor(Math.random() * (10 - a - 1))
      const stories = [
        { hero: '🐰', name: 'Zuikis', item: '🥕', plural: 'morkos' },
        { hero: '🐿️', name: 'Voverytė', item: '🌰', plural: 'gilės' },
        { hero: '🐝', name: 'Bitutė', item: '🌸', plural: 'gėlės' },
        { hero: '🐦', name: 'Paukštelis', item: '🌾', plural: 'grūdai' },
      ]
      const s = stories[Math.floor(Math.random() * stories.length)]
      return {
        text: `${s.name} surinko ${a} ${s.plural}. Atbėgo draugas ir davė dar ${b}. Kiek viso?`,
        items: [...Array(a).fill(s.item), ...Array(b).fill(s.item)],
        groups: [a, b],
        hero: s.hero,
        answer: a + b,
        op: '+',
        a, b,
      }
    },
  },
  {
    id: 3, name: 'Atimtis', emoji: '➖',
    gen: () => {
      const a = 3 + Math.floor(Math.random() * 7)
      const b = 1 + Math.floor(Math.random() * (a - 1))
      const stories = [
        { hero: '🐱', name: 'Katė', item: '🐟', plural: 'žuvis', verb: 'suvalgė' },
        { hero: '🐶', name: 'Šuo', item: '🦴', plural: 'kauliukus', verb: 'paslėpė' },
        { hero: '🐻', name: 'Meška', item: '🍯', plural: 'medaus puodynių', verb: 'atidavė draugui' },
      ]
      const s = stories[Math.floor(Math.random() * stories.length)]
      return {
        text: `${s.name} turėjo ${a} ${s.plural}. ${b} ${s.verb}. Kiek liko?`,
        items: Array(a).fill(s.item),
        hero: s.hero,
        answer: a - b,
        eaten: b,
        op: '-',
        a, b,
      }
    },
  },
  {
    id: 4, name: 'Sudėtis iki 20', emoji: '🌟',
    gen: () => {
      const a = 5 + Math.floor(Math.random() * 6)
      const b = 3 + Math.floor(Math.random() * (20 - a - 1))
      const stories = [
        { hero: '🍎', name: 'Sode', item: '🍎', plural: 'obuoliai' },
        { hero: '🌷', name: 'Pievoje', item: '🌷', plural: 'tulpės' },
        { hero: '⭐', name: 'Danguje', item: '⭐', plural: 'žvaigždės' },
      ]
      const s = stories[Math.floor(Math.random() * stories.length)]
      return {
        text: `${s.name} buvo ${a} ${s.plural}. Pražydo dar ${b}. Kiek viso ${s.plural}?`,
        items: [...Array(a).fill(s.item), ...Array(b).fill(s.item)],
        groups: [a, b],
        hero: s.hero,
        answer: a + b,
        op: '+',
        a, b,
      }
    },
  },
]

function speak(text /* voices arg ignored */) {
  libSpeak(text)
}

export default function MathStoryGame({ onScore }) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [story, setStory] = useState(null)
  const [tapped, setTapped] = useState(new Set()) // indexes the child has tapped
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // 'ok' | 'nope' | null
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const voicesRef = useRef([])
  const audioRef = useRef(null)

  const level = LEVELS[levelIdx]

  useEffect(() => {
    const load = () => { if (window.speechSynthesis) voicesRef.current = window.speechSynthesis.getVoices() }
    load(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load
  }, [])

  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }
  const beep = (f, d, t = 'sine', g = 0.15) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = t; o.frequency.value = f; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d)
    o.stop(ctx.currentTime + d)
  }
  const tickSound = () => beep(440 + Math.random() * 80, 0.08, 'triangle', 0.14)
  const okSound = () => { beep(660, 0.1, 'triangle', 0.2); setTimeout(() => beep(1320, 0.16, 'triangle', 0.2), 110) }
  const nopeSound = () => beep(200, 0.14, 'square', 0.08)

  const nextStory = () => {
    const s = level.gen()
    setStory(s)
    setTapped(new Set())
    setInput('')
    setFeedback(null)
    setTimeout(() => speak(s.text, voicesRef.current), 200)
  }

  useEffect(() => { nextStory() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIdx])

  const submit = () => {
    if (!story) return
    const guess = parseInt(input, 10)
    if (Number.isNaN(guess)) return
    if (guess === story.answer) {
      okSound()
      setFeedback('ok')
      setStreak(s => s + 1)
      setCompleted(c => c + 1)
      const gained = 15 + Math.min(streak * 3, 30)
      setScore(s => {
        const next = s + gained
        onScore?.(next)
        return next
      })
      speak(`Teisingai! ${story.answer}.`, voicesRef.current)
      setTimeout(() => {
        if (streak + 1 >= 4 && levelIdx + 1 < LEVELS.length) {
          setStreak(0)
          setLevelIdx(levelIdx + 1)
          speak('Keliam lygį!', voicesRef.current)
        } else {
          nextStory()
        }
      }, 1500)
    } else {
      nopeSound()
      setFeedback('nope')
      setStreak(0)
      speak(`Beveik. Teisingas atsakymas ${story.answer}. Pabandom dar.`, voicesRef.current)
      setTimeout(() => nextStory(), 2400)
    }
  }

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setInput(prev => (prev.length < 2 ? prev + e.key : prev))
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, story])

  if (!story) return null

  const groupBoundary = story.groups ? story.groups[0] : null
  const eatenStart = story.op === '-' ? story.items.length - story.eaten : null

  const handleItemTap = (i) => {
    tickSound()
    setTapped(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.levelPicker}>
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setLevelIdx(i)}
              style={{
                ...styles.levelBtn,
                background: i === levelIdx ? 'linear-gradient(135deg,#FFD166,#FF6B35)' : 'white',
                color: i === levelIdx ? 'white' : '#1F2937',
              }}
            >
              {l.emoji} {l.name}
            </button>
          ))}
        </div>
        <div style={styles.score}>⭐ {score}</div>
      </div>

      <div style={styles.scene}>
        <div style={{ fontSize: 60 }}>{story.hero}</div>
        <div style={styles.storyText}>{story.text}</div>
        <button onClick={() => speak(story.text, voicesRef.current)} style={styles.replayBtn}>🔊 Pasakyk</button>
      </div>

      <div style={styles.itemsBox}>
        <div style={styles.itemsHelp}>Paspausk daiktelius ir suskaičiuok 🖱️</div>
        <div style={styles.items}>
          {story.items.map((it, i) => {
            const sep = (groupBoundary !== null && i === groupBoundary)
            const eaten = (eatenStart !== null && i >= eatenStart)
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {sep && <span style={styles.plus}>+</span>}
                <span
                  onClick={() => !eaten && handleItemTap(i)}
                  style={{
                    ...styles.item,
                    opacity: eaten ? 0.25 : 1,
                    textDecoration: eaten ? 'line-through' : 'none',
                    transform: tapped.has(i) ? 'translateY(-8px) scale(1.15)' : 'none',
                    filter: tapped.has(i) ? 'drop-shadow(0 0 10px #FFD166)' : 'none',
                    cursor: eaten ? 'default' : 'pointer',
                  }}
                >{it}</span>
              </span>
            )
          })}
        </div>
        <div style={styles.counter}>Paspausta: <b>{tapped.size}</b></div>
      </div>

      <div style={styles.answerRow}>
        <div style={{
          ...styles.answerBox,
          background: feedback === 'ok' ? '#BBF7D0' : feedback === 'nope' ? '#FEE2E2' : 'white',
          borderColor: feedback === 'ok' ? '#22C55E' : feedback === 'nope' ? '#EF4444' : '#CBD5E1',
        }}>
          {input || '?'}
        </div>
        <div style={styles.pad}>
          {[1,2,3,4,5,6,7,8,9,0].map(n => (
            <button
              key={n}
              onClick={() => setInput(prev => prev.length < 2 ? prev + n : prev)}
              style={styles.padBtn}
            >{n}</button>
          ))}
          <button onClick={() => setInput(prev => prev.slice(0, -1))} style={{ ...styles.padBtn, background: '#FEE2E2', color: '#991B1B' }}>⌫</button>
          <button onClick={submit} style={{ ...styles.padBtn, background: 'linear-gradient(135deg,#06D6A0,#4CC9F0)', color: 'white', gridColumn: 'span 2' }}>✓ Tikrinti</button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <span>🔥 Iš eilės: <b>{streak}</b></span>
        <span>✅ Įveikta: <b>{completed}</b></span>
        <span>📚 Lygis: <b>{level.name}</b></span>
      </div>
    </div>
  )
}

const styles = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  levelPicker: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  levelBtn: {
    border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  score: { background: 'white', padding: '8px 14px', borderRadius: 12, fontWeight: 800, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  scene: {
    background: 'linear-gradient(180deg,#A7F3D0 0%,#BAE6FD 100%)',
    borderRadius: 20, padding: 18, textAlign: 'center', marginBottom: 12,
  },
  storyText: { fontSize: 18, fontWeight: 700, color: '#1F2937', margin: '8px 16px', lineHeight: 1.5 },
  replayBtn: {
    background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
    padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  itemsBox: {
    background: 'white', borderRadius: 18, padding: 16, marginBottom: 12,
    boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
  },
  itemsHelp: { textAlign: 'center', color: '#64748B', fontSize: 13, marginBottom: 8 },
  items: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  item: {
    fontSize: 42, padding: 4, transition: 'transform 0.15s, filter 0.15s, opacity 0.2s',
    userSelect: 'none',
  },
  plus: { fontSize: 32, fontWeight: 900, color: '#6C63FF', margin: '0 8px' },
  counter: { textAlign: 'center', marginTop: 10, color: '#475569', fontWeight: 700 },
  answerRow: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center', marginBottom: 12,
  },
  answerBox: {
    width: 100, height: 100, borderRadius: 18,
    border: '4px solid #CBD5E1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 56, fontWeight: 900, color: '#1F2937',
    transition: 'all 0.2s',
  },
  pad: {
    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
  },
  padBtn: {
    height: 48, borderRadius: 10, border: 'none',
    background: '#F1F5F9', fontWeight: 800, fontSize: 18,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  statsRow: {
    display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
    gap: 10, fontSize: 13, color: '#475569', padding: '8px 0',
  },
}
