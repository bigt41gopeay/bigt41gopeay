import { useEffect, useRef, useState } from 'react'

// Finger ids: L-pinky, L-ring, L-mid, L-idx, R-idx, R-mid, R-ring, R-pinky
const FINGER_COLORS = {
  'L-pinky':  '#F472B6',
  'L-ring':   '#FB923C',
  'L-mid':    '#FBBF24',
  'L-idx':    '#34D399',
  'R-idx':    '#60A5FA',
  'R-mid':    '#A78BFA',
  'R-ring':   '#F87171',
  'R-pinky':  '#FB7185',
}

const FINGER_NAME = {
  'L-pinky': 'kair. mažylis',
  'L-ring':  'kair. bevardis',
  'L-mid':   'kair. vidurinis',
  'L-idx':   'kair. rodomasis',
  'R-idx':   'deš. rodomasis',
  'R-mid':   'deš. vidurinis',
  'R-ring':  'deš. bevardis',
  'R-pinky': 'deš. mažylis',
}

const KEY_FINGER = {
  // top number row (Lithuanian diacritics in standard LT keyboard)
  '1':'L-pinky','Ą':'L-pinky',
  '2':'L-ring','Č':'L-ring',
  '3':'L-mid','Ę':'L-mid',
  '4':'L-idx','Ė':'L-idx',
  '5':'L-idx','Į':'L-idx',
  '6':'R-idx','Š':'R-idx',
  '7':'R-idx','Ų':'R-idx',
  '8':'R-mid','Ū':'R-mid',
  '9':'R-ring',
  '0':'R-pinky','Ž':'R-pinky',
  // qwerty
  'Q':'L-pinky','W':'L-ring','E':'L-mid','R':'L-idx','T':'L-idx',
  'Y':'R-idx','U':'R-idx','I':'R-mid','O':'R-ring','P':'R-pinky',
  'A':'L-pinky','S':'L-ring','D':'L-mid','F':'L-idx','G':'L-idx',
  'H':'R-idx','J':'R-idx','K':'R-mid','L':'R-ring',
  'Z':'L-pinky','X':'L-ring','C':'L-mid','V':'L-idx','B':'L-idx',
  'N':'R-idx','M':'R-idx',
}

const ROWS = [
  ['Ą','Č','Ę','Ė','Į','Š','Ų','Ū','Ž'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

const LESSONS = [
  {
    id: 1,
    emoji: '🏠',
    title: 'Namų eilutė',
    desc: 'F ir J – tavo pirštukų namai. F turi guzelį kairiajam rodomajam, J – dešiniajam.',
    sequence: ['F','J','F','J','F','J','F','F','J','J'],
  },
  {
    id: 2,
    emoji: '✋',
    title: 'Visi 8 pirštukai',
    desc: 'A S D F – kairė ranka; J K L – dešinė ranka. Vienas pirštas vienai raidei.',
    sequence: ['A','S','D','F','J','K','L','A','S','D','F','J','K','L'],
  },
  {
    id: 3,
    emoji: '⬆️',
    title: 'Viršutinė eilutė',
    desc: 'Q W E R T  –  Y U I O P. Pirštukai atšoka aukštyn.',
    sequence: ['Q','W','E','R','T','Y','U','I','O','P','Q','E','U','O'],
  },
  {
    id: 4,
    emoji: '⬇️',
    title: 'Apatinė eilutė',
    desc: 'Z X C V B  –  N M. Pirštukai pasilenkia žemyn.',
    sequence: ['Z','X','C','V','B','N','M','C','V','N','X','M','Z','B'],
  },
  {
    id: 5,
    emoji: '🇱🇹',
    title: 'Lietuviškos raidės',
    desc: 'Ą Č Ę Ė Į Š Ų Ū Ž — visos viršuje, ten kur skaičiai!',
    sequence: ['Ą','Č','Ę','Ė','Į','Š','Ų','Ū','Ž','Ė','Š','Ą','Ž','Ū'],
  },
  {
    id: 6,
    emoji: '📝',
    title: 'Žodžiai',
    desc: 'MAMA, TĖTĖ, KATĖ, ŠUO, NAMAS, GĖLĖ.',
    sequence: 'MAMA TĖTĖ KATĖ ŠUO NAMAS GĖLĖ DUONA SAULĖ MEDIS KNYGA'.split(' '),
    isWords: true,
  },
]

function pickVoice(voices) {
  if (!voices || !voices.length) return null
  return voices.find(v => /^lt(-LT)?$/i.test(v.lang)) ||
         voices.find(v => /^lt/i.test(v.lang)) ||
         voices[0]
}

function Hand({ side, activeFinger }) {
  // Side: 'L' or 'R'. Fingers from outside (pinky) inward (idx), then thumb.
  const isLeft = side === 'L'
  const fingerKeys = isLeft
    ? ['L-pinky','L-ring','L-mid','L-idx']
    : ['R-idx','R-mid','R-ring','R-pinky']
  const offsets = [0, 1, 2, 3]
  const fingerHeights = isLeft ? [70, 92, 100, 86] : [86, 100, 92, 70]

  return (
    <svg viewBox="0 0 180 200" style={{ width: '100%', maxWidth: 200, height: 'auto' }}>
      {/* palm */}
      <ellipse cx="90" cy="155" rx="56" ry="38" fill="#FBCFE8" stroke="#9B5DE5" strokeWidth="2.5" />
      {/* fingers */}
      {fingerKeys.map((fk, i) => {
        const x = 30 + offsets[i] * 36
        const h = fingerHeights[i]
        const y = 155 - h
        const active = activeFinger === fk
        return (
          <g key={fk}>
            <rect
              x={x - 14}
              y={y}
              width={28}
              height={h + 20}
              rx={14}
              fill={active ? FINGER_COLORS[fk] : '#FCE7F3'}
              stroke={active ? '#111' : '#9B5DE5'}
              strokeWidth={active ? 3 : 2}
              style={active ? { filter: 'drop-shadow(0 0 8px ' + FINGER_COLORS[fk] + ')' } : undefined}
            >
              {active && (
                <animate attributeName="opacity" values="1;0.7;1" dur="0.6s" repeatCount="indefinite" />
              )}
            </rect>
            {/* fingernail */}
            <ellipse
              cx={x}
              cy={y + 10}
              rx={9}
              ry={6}
              fill={active ? '#FFF' : '#FBCFE8'}
              stroke="#9B5DE5"
              strokeWidth="1.5"
            />
          </g>
        )
      })}
      {/* thumb */}
      <rect
        x={isLeft ? 130 : 22}
        y={140}
        width={26}
        height={48}
        rx={13}
        transform={`rotate(${isLeft ? 30 : -30} ${isLeft ? 143 : 35} 164)`}
        fill="#FCE7F3"
        stroke="#9B5DE5"
        strokeWidth="2"
      />
    </svg>
  )
}

function KeyboardOverview({ activeKey }) {
  return (
    <div style={kbStyles.wrap}>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
          {row.map(k => {
            const finger = KEY_FINGER[k]
            const color = FINGER_COLORS[finger] || '#E2E8F0'
            const isActive = activeKey && activeKey.toUpperCase() === k
            const isHome = k === 'F' || k === 'J'
            return (
              <div
                key={k}
                style={{
                  ...kbStyles.key,
                  background: color + (isActive ? '' : '55'),
                  outline: isActive ? '3px solid #111' : 'none',
                  transform: isActive ? 'translateY(-3px) scale(1.1)' : 'none',
                  boxShadow: isActive
                    ? `0 6px 0 rgba(0,0,0,0.25), 0 0 20px ${color}`
                    : '0 3px 0 rgba(0,0,0,0.15)',
                }}
              >
                <span>{k}</span>
                {isHome && <span style={kbStyles.bump}>•</span>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const kbStyles = {
  wrap: { padding: 12, background: '#F8FAFC', borderRadius: 14, marginTop: 16 },
  key: {
    width: 38, height: 44, borderRadius: 8,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 16, color: '#1F2937',
    border: '1px solid rgba(0,0,0,0.08)',
    transition: 'transform 0.08s, box-shadow 0.08s, background 0.15s',
    position: 'relative',
  },
  bump: { fontSize: 8, marginTop: -4, color: '#475569' },
}

function speak(text, voices) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(voices)
    if (v) u.voice = v
    u.lang = v ? v.lang : 'lt-LT'
    u.rate = 0.9
    u.pitch = 1.1
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export default function FingerGame({ onScore }) {
  const [screen, setScreen] = useState('menu') // menu, play, done
  const [lessonIdx, setLessonIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [letterIdx, setLetterIdx] = useState(0) // for word-mode within a step
  const [streak, setStreak] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState(null) // {ok: bool, ch: string}
  const [score, setScore] = useState(0)
  const voicesRef = useRef([])
  const audioRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const load = () => {
      if (window.speechSynthesis) voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load
  }, [])

  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }
  const beep = (freq, dur, type = 'sine', gain = 0.15) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.value = freq; g.gain.value = gain
    o.connect(g); g.connect(ctx.destination); o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.stop(ctx.currentTime + dur)
  }
  const okSound = () => { beep(660, 0.1, 'triangle', 0.18); setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 90) }
  const nopeSound = () => beep(200, 0.12, 'square', 0.08)

  const lesson = LESSONS[lessonIdx]
  const stepItem = lesson?.sequence[step] || ''
  const isWord = !!lesson?.isWords
  const targetChar = isWord ? (stepItem[letterIdx] || '') : stepItem

  // announce on letter change
  useEffect(() => {
    if (screen !== 'play') return
    if (!targetChar) return
    if (letterIdx === 0 || !isWord) {
      const text = isWord ? `Žodis ${stepItem}. ${targetChar}` : `Raidė ${targetChar}`
      speak(text, voicesRef.current)
    } else {
      speak(targetChar, voicesRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, lessonIdx, step, letterIdx])

  const advance = () => {
    if (isWord && letterIdx + 1 < stepItem.length) {
      setLetterIdx(letterIdx + 1)
      return
    }
    setLetterIdx(0)
    if (step + 1 < lesson.sequence.length) {
      setStep(step + 1)
    } else {
      // lesson done
      setScreen('done')
      const bonus = Math.max(0, 50 - mistakes * 5)
      const total = score + bonus
      setScore(total)
      onScore?.(total)
      speak('Šaunuolis! Pamoka įveikta.', voicesRef.current)
    }
  }

  useEffect(() => {
    if (screen !== 'play') return
    const onKey = (e) => {
      if (e.key === 'Escape') { setScreen('menu'); return }
      const k = (e.key || '').toUpperCase()
      if (!k || k.length !== 1) return
      // accept letters/digits and Lithuanian diacritics
      const wanted = targetChar.toUpperCase()
      if (k === wanted) {
        okSound()
        setStreak(s => s + 1)
        setScore(sc => sc + 10)
        setFeedback({ ok: true, ch: k })
        setTimeout(() => setFeedback(null), 250)
        advance()
      } else {
        nopeSound()
        setStreak(0)
        setMistakes(m => m + 1)
        setFeedback({ ok: false, ch: k })
        setTimeout(() => setFeedback(null), 350)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, lessonIdx, step, letterIdx, targetChar])

  const startLesson = (i) => {
    ensureAudio()
    setLessonIdx(i)
    setStep(0)
    setLetterIdx(0)
    setStreak(0)
    setMistakes(0)
    setScore(0)
    setScreen('play')
  }

  const activeFinger = targetChar ? KEY_FINGER[targetChar.toUpperCase()] : null

  if (screen === 'menu') {
    return (
      <div style={styles.menu}>
        <h3 style={styles.menuTitle}>🖐️ Pirštukų pamokos</h3>
        <p style={styles.menuDesc}>Mokomės rašyti tinkamais pirštukais. Pradžiai – F ir J. Po to – visa lietuviška abėcėlė!</p>
        <div style={styles.lessonGrid}>
          {LESSONS.map((l, i) => (
            <button key={l.id} onClick={() => startLesson(i)} style={styles.lessonBtn}>
              <div style={styles.lessonEmoji}>{l.emoji}</div>
              <div style={styles.lessonNum}>Pamoka {l.id}</div>
              <div style={styles.lessonTitle}>{l.title}</div>
              <div style={styles.lessonDesc}>{l.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen === 'done') {
    return (
      <div style={styles.done}>
        <div style={{ fontSize: 64 }}>🏆</div>
        <h3>Šaunuolis! Pamoka {lesson.id} įveikta!</h3>
        <p style={{ color: '#636E72' }}>Taškai: {score} · Klaidos: {mistakes}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={styles.actionBtn} onClick={() => startLesson(lessonIdx)}>🔁 Dar kartą</button>
          {lessonIdx + 1 < LESSONS.length && (
            <button
              style={{ ...styles.actionBtn, background: 'linear-gradient(135deg,#06D6A0,#4CC9F0)' }}
              onClick={() => startLesson(lessonIdx + 1)}
            >
              ➡️ Kita pamoka
            </button>
          )}
          <button style={{ ...styles.actionBtn, background: '#E2E8F0', color: '#1F2937' }} onClick={() => setScreen('menu')}>
            ← Į pamokų sąrašą
          </button>
        </div>
      </div>
    )
  }

  // PLAY screen
  const progress = (step + (isWord ? (letterIdx / Math.max(1, stepItem.length)) : 0)) / lesson.sequence.length

  return (
    <div ref={containerRef} style={styles.play}>
      <div style={styles.playHud}>
        <button onClick={() => setScreen('menu')} style={styles.smallBtn}>← Pamokos</button>
        <div style={styles.pillBlue}>{lesson.emoji} {lesson.title}</div>
        <div style={styles.pillScore}>⭐ {score}</div>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>

      <div style={styles.targetArea}>
        <div style={styles.handsRow}>
          <div style={styles.handCol}>
            <Hand side="L" activeFinger={activeFinger?.startsWith('L-') ? activeFinger : null} />
            <div style={styles.handLabel}>Kairė</div>
          </div>

          <div style={styles.bigLetterWrap}>
            {isWord && (
              <div style={styles.wordTrack}>
                {stepItem.split('').map((c, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.wordCh,
                      color: i < letterIdx ? '#22C55E' : (i === letterIdx ? '#E11D48' : '#94A3B8'),
                      textDecoration: i === letterIdx ? 'underline' : 'none',
                    }}
                  >{c}</span>
                ))}
              </div>
            )}
            <div
              style={{
                ...styles.bigLetter,
                background: feedback?.ok
                  ? 'linear-gradient(135deg,#06D6A0,#4CC9F0)'
                  : (feedback && !feedback.ok ? 'linear-gradient(135deg,#FFB86B,#FF6B8A)' : 'linear-gradient(135deg,#FFD166,#FF6B8A)'),
              }}
            >
              {targetChar}
            </div>
            <div style={styles.fingerLabel}>
              Spaudžiam <b>{FINGER_NAME[activeFinger] || '?'}</b> pirštu
            </div>
            <button onClick={() => speak(targetChar, voicesRef.current)} style={styles.smallBtn}>🔊 Pakartoti</button>
          </div>

          <div style={styles.handCol}>
            <Hand side="R" activeFinger={activeFinger?.startsWith('R-') ? activeFinger : null} />
            <div style={styles.handLabel}>Dešinė</div>
          </div>
        </div>

        <KeyboardOverview activeKey={targetChar} />

        <div style={styles.statsRow}>
          <span>🔥 Iš eilės: <b>{streak}</b></span>
          <span>❌ Klaidos: <b>{mistakes}</b></span>
          <span>📍 {step + 1} / {lesson.sequence.length}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  menu: { padding: 16 },
  menuTitle: { fontSize: 28, margin: '0 0 6px', textAlign: 'center' },
  menuDesc: { color: '#636E72', textAlign: 'center', margin: '0 0 24px' },
  lessonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  lessonBtn: {
    cursor: 'pointer', border: 'none', borderRadius: 16,
    background: 'linear-gradient(135deg, #ffffff, #F1F5F9)',
    padding: 18, textAlign: 'left',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.05)',
    transition: 'transform 0.1s, box-shadow 0.1s',
    fontFamily: 'inherit',
  },
  lessonEmoji: { fontSize: 36 },
  lessonNum: { fontSize: 12, fontWeight: 800, color: '#6C63FF', marginTop: 4 },
  lessonTitle: { fontSize: 18, fontWeight: 800, marginTop: 2, color: '#1F2937' },
  lessonDesc: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 1.5 },

  play: { padding: 0 },
  playHud: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, flexWrap: 'wrap', marginBottom: 10,
  },
  smallBtn: {
    background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
    padding: '6px 12px', fontWeight: 700, color: '#1F2937', cursor: 'pointer',
    fontFamily: 'inherit',
  },
  pillBlue: {
    background: 'linear-gradient(135deg, #6C63FF, #4CC9F0)',
    color: 'white', padding: '6px 14px', borderRadius: 12, fontWeight: 800, fontSize: 14,
  },
  pillScore: {
    background: 'white', padding: '6px 14px', borderRadius: 12, fontWeight: 800, color: '#1F2937',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  progressBar: {
    height: 8, background: '#E2E8F0', borderRadius: 8, overflow: 'hidden', marginBottom: 16,
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #06D6A0, #4CC9F0)',
    transition: 'width 0.25s ease',
  },
  targetArea: {
    background: 'white', borderRadius: 18, padding: 18,
    boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
  },
  handsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    gap: 16,
    alignItems: 'center',
  },
  handCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  handLabel: { fontSize: 13, color: '#475569', fontWeight: 700 },
  bigLetterWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  bigLetter: {
    width: 140, height: 140, borderRadius: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 900, fontSize: 90,
    boxShadow: '0 12px 0 rgba(0,0,0,0.15), 0 18px 36px rgba(0,0,0,0.18)',
    transition: 'background 0.2s, transform 0.1s',
  },
  fingerLabel: { fontSize: 14, color: '#475569', textAlign: 'center' },
  wordTrack: { fontSize: 28, fontWeight: 800, letterSpacing: 4 },
  wordCh: { transition: 'color 0.2s' },
  statsRow: {
    display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 10,
    marginTop: 12, fontSize: 13, color: '#475569',
  },

  done: {
    textAlign: 'center', padding: 40,
    display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
  },
  actionBtn: {
    border: 'none', cursor: 'pointer', borderRadius: 14,
    padding: '12px 22px', fontWeight: 800, color: 'white',
    background: 'linear-gradient(135deg,#9B5DE5,#6C63FF)',
    boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
    fontFamily: 'inherit',
  },
}
