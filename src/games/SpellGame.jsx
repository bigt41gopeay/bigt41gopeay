import { useEffect, useRef, useState } from 'react'
import { speak as libSpeak } from '../lib/speak'

// NLP principles applied:
//  - multi-sensory (VAK): voice (auditory) + emoji (visual) + drag/type (kinesthetic)
//  - chunking: 5-letter limit per word, words in themed sets of 5
//  - anchoring: each correct letter = green flash + chime + small "hooray"
//  - positive reframing: no "wrong", only "Beveik! Bandom dar"
//  - pattern interrupt: occasional surprise praise variations
//  - pacing: per-letter reveal, no global timer

const WORD_SETS = [
  {
    id: 'seima', title: 'Šeima ir aš', emoji: '👨‍👩‍👧',
    words: [
      { w: 'MAMA',   e: '👩' },
      { w: 'TĖTĖ',   e: '👨' },
      { w: 'SESĖ',   e: '👧' },
      { w: 'BROLIS', e: '👦' },
      { w: 'ŠEIMA',  e: '👨‍👩‍👧' },
    ],
  },
  {
    id: 'gyvunai', title: 'Gyvūnai', emoji: '🐱',
    words: [
      { w: 'KATĖ',  e: '🐱' },
      { w: 'ŠUO',   e: '🐶' },
      { w: 'ZUIKIS',e: '🐰' },
      { w: 'PELĖ',  e: '🐭' },
      { w: 'LAPĖ',  e: '🦊' },
    ],
  },
  {
    id: 'gamta', title: 'Gamta', emoji: '🌳',
    words: [
      { w: 'SAULĖ',  e: '☀️' },
      { w: 'GĖLĖ',   e: '🌸' },
      { w: 'MEDIS',  e: '🌳' },
      { w: 'DEBESIS',e: '☁️' },
      { w: 'LIETUS', e: '🌧️' },
    ],
  },
  {
    id: 'maistas', title: 'Maistas', emoji: '🍎',
    words: [
      { w: 'OBUOLYS',e: '🍎' },
      { w: 'DUONA',  e: '🍞' },
      { w: 'PIENAS', e: '🥛' },
      { w: 'SŪRIS',  e: '🧀' },
      { w: 'MORKA',  e: '🥕' },
    ],
  },
  {
    id: 'namai', title: 'Namai', emoji: '🏠',
    words: [
      { w: 'NAMAS', e: '🏠' },
      { w: 'KĖDĖ',  e: '🪑' },
      { w: 'LOVA',  e: '🛏️' },
      { w: 'DURYS', e: '🚪' },
      { w: 'KNYGA', e: '📚' },
    ],
  },
]

const PRAISES = ['Šaunu! ✨', 'Puiku! 🌟', 'Tu gali! 💪', 'Taip! 🎉', 'Genialiai! 🧠', 'Bravo! 👏']
const ALMOST = ['Beveik! Bandom dar 💡', 'Šalia! Klausyk dar kartą 👂', 'Pabandykim 🌈', 'Sėkmės kitam kartui 🔄']


function speak(text /* voices arg kept for back-compat */) {
  libSpeak(text)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const EXTRA_POOL = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

export default function SpellGame({ onScore }) {
  const [setIdx, setSetIdx] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)
  const [filled, setFilled] = useState([]) // letters placed so far (indices match)
  const [bank, setBank] = useState([]) // {ch, key, used}
  const [flash, setFlash] = useState(null) // 'ok' | 'nope'
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)
  const voicesRef = useRef([])
  const audioRef = useRef(null)

  const set = WORD_SETS[setIdx]
  const wordItem = set.words[wordIdx]
  const word = wordItem.w
  const letters = word.split('')

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
  const beep = (freq, dur, type = 'sine', g = 0.15) => {
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const gn = ctx.createGain()
    o.type = type; o.frequency.value = freq; gn.gain.value = g
    o.connect(gn); gn.connect(ctx.destination); o.start()
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.stop(ctx.currentTime + dur)
  }
  const chime = () => { beep(880, 0.08, 'triangle', 0.18); setTimeout(() => beep(1320, 0.1, 'triangle', 0.18), 70) }
  const fanfare = () => {
    beep(523, 0.12, 'triangle', 0.2)
    setTimeout(() => beep(659, 0.12, 'triangle', 0.2), 120)
    setTimeout(() => beep(784, 0.14, 'triangle', 0.2), 240)
    setTimeout(() => beep(1047, 0.22, 'triangle', 0.2), 380)
  }
  const tap = () => beep(220, 0.08, 'square', 0.06)

  // build bank on new word
  useEffect(() => {
    ensureAudio()
    const needed = [...letters]
    // add 2-3 extras
    const used = new Set(needed)
    const extras = []
    while (extras.length < Math.min(3, EXTRA_POOL.length)) {
      const c = EXTRA_POOL[Math.floor(Math.random() * EXTRA_POOL.length)]
      if (!used.has(c) || Math.random() < 0.3) extras.push(c)
      used.add(c)
    }
    const allChars = shuffle([...needed, ...extras])
    setBank(allChars.map((c, i) => ({ ch: c, key: i + '-' + c, used: false })))
    setFilled([])
    // announce
    setTimeout(() => speak('Užrašom žodį ' + word + '. ' + (wordItem.hint || ''), voicesRef.current), 150)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIdx, wordIdx])

  const placeLetter = (bankIdx) => {
    const item = bank[bankIdx]
    if (!item || item.used) return
    const nextIdx = filled.length
    if (nextIdx >= letters.length) return

    if (item.ch === letters[nextIdx]) {
      // correct
      chime()
      setFilled([...filled, item.ch])
      setBank(b => b.map((x, i) => i === bankIdx ? { ...x, used: true } : x))
      setScore(s => s + 10)
      setStreak(s => s + 1)
      setFlash('ok')
      setTimeout(() => setFlash(null), 250)

      // word complete?
      if (nextIdx + 1 === letters.length) {
        setTimeout(() => {
          fanfare()
          const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)]
          speak(word + '. ' + praise.replace(/[^A-Za-zĄ-ž ]/g, ''), voicesRef.current)
          setScore(s => {
            const next = s + 30 + Math.min(streak * 2, 30)
            onScore?.(next)
            return next
          })
        }, 250)
        setTimeout(() => nextWord(), 1600)
      }
    } else {
      tap()
      setStreak(0)
      setFlash('nope')
      setTimeout(() => setFlash(null), 320)
      const hint = ALMOST[Math.floor(Math.random() * ALMOST.length)]
      speak(hint.replace(/[^A-Za-zĄ-ž ]/g, ''), voicesRef.current)
    }
  }

  const nextWord = () => {
    if (wordIdx + 1 < set.words.length) {
      setWordIdx(wordIdx + 1)
    } else {
      // set finished
      setDone(true)
    }
  }

  const nextSet = () => {
    setDone(false)
    if (setIdx + 1 < WORD_SETS.length) {
      setSetIdx(setIdx + 1)
      setWordIdx(0)
    } else {
      setSetIdx(0); setWordIdx(0)
    }
  }

  // keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (done) return
      const k = (e.key || '').toUpperCase()
      if (!k || k.length !== 1) return
      const nextIdx = filled.length
      if (nextIdx >= letters.length) return
      // find first unused matching letter
      const idx = bank.findIndex(b => !b.used && b.ch === k)
      if (idx >= 0) {
        placeLetter(idx)
      } else if (letters[nextIdx] === k) {
        // letter is correct but somehow not in bank — still accept
        chime()
        setFilled([...filled, k])
        setScore(s => s + 10)
      } else {
        tap()
        setFlash('nope')
        setTimeout(() => setFlash(null), 200)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, filled, letters, done])

  if (done) {
    return (
      <div style={styles.done}>
        <div style={{ fontSize: 72 }}>🏆</div>
        <h3>Visi „{set.title}" žodžiai įrašyti!</h3>
        <p style={{ color: '#636E72' }}>Taškai: {score}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={styles.actionBtn} onClick={() => { setDone(false); setWordIdx(0) }}>🔁 Dar kartą</button>
          <button style={{ ...styles.actionBtn, background: 'linear-gradient(135deg,#06D6A0,#4CC9F0)' }} onClick={nextSet}>
            ➡️ Kita tema
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.setPicker}>
          {WORD_SETS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSetIdx(i); setWordIdx(0) }}
              style={{
                ...styles.setBtn,
                background: i === setIdx ? 'linear-gradient(135deg,#9B5DE5,#6C63FF)' : 'white',
                color: i === setIdx ? 'white' : '#1F2937',
              }}
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
        <div style={styles.score}>⭐ {score}</div>
      </div>

      <div style={styles.stage}>
        <div style={{ fontSize: 110, textAlign: 'center', filter: flash === 'ok' ? 'drop-shadow(0 0 20px #22C55E)' : 'none' }}>
          {wordItem.e}
        </div>
        <button onClick={() => speak(word, voicesRef.current)} style={styles.speakBtn}>🔊 Klausyti</button>

        <div style={styles.slots}>
          {letters.map((ch, i) => {
            const got = filled[i]
            const isCurrent = i === filled.length
            return (
              <div
                key={i}
                style={{
                  ...styles.slot,
                  background: got ? '#BBF7D0' : (isCurrent ? '#FEF3C7' : '#F1F5F9'),
                  borderColor: got ? '#22C55E' : (isCurrent ? '#F59E0B' : '#CBD5E1'),
                  transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                  animation: flash === 'nope' && isCurrent ? 'spellShake 0.3s' : 'none',
                }}
              >
                {got || (isCurrent ? '?' : '')}
              </div>
            )
          })}
        </div>

        <div style={styles.bank}>
          {bank.map((b, i) => (
            <button
              key={b.key}
              onClick={() => placeLetter(i)}
              disabled={b.used}
              style={{
                ...styles.bankBtn,
                opacity: b.used ? 0.25 : 1,
                pointerEvents: b.used ? 'none' : 'auto',
              }}
            >{b.ch}</button>
          ))}
        </div>
      </div>

      <div style={styles.progress}>
        {set.words.map((_, i) => (
          <span key={i} style={{
            ...styles.dot,
            background: i < wordIdx ? '#22C55E' : (i === wordIdx ? '#F59E0B' : '#CBD5E1'),
          }} />
        ))}
      </div>

      <style>{`
        @keyframes spellShake {
          0%,100% { transform: translateX(0) scale(1.08); }
          25% { transform: translateX(-6px) scale(1.08); }
          75% { transform: translateX(6px) scale(1.08); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  setPicker: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  setBtn: {
    border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  score: { background: 'white', padding: '8px 14px', borderRadius: 12, fontWeight: 800, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  stage: {
    background: 'linear-gradient(180deg, #FEF3C7 0%, #FEE2E2 100%)',
    borderRadius: 20, padding: 24, textAlign: 'center',
  },
  speakBtn: {
    margin: '10px auto', display: 'inline-block', cursor: 'pointer',
    background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
    padding: '6px 14px', fontWeight: 700, fontFamily: 'inherit',
  },
  slots: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', margin: '14px 0 18px' },
  slot: {
    width: 56, height: 64, borderRadius: 12,
    border: '3px solid #CBD5E1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 900, color: '#1F2937',
    transition: 'all 0.15s',
  },
  bank: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  bankBtn: {
    width: 52, height: 60, borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #FFD166, #FF6B8A)', color: 'white',
    fontSize: 26, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
    transition: 'transform 0.08s, opacity 0.2s',
  },
  progress: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 },
  dot: { width: 14, height: 14, borderRadius: '50%' },
  done: {
    textAlign: 'center', padding: 30,
    display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
  },
  actionBtn: {
    border: 'none', cursor: 'pointer', borderRadius: 14,
    padding: '12px 22px', fontWeight: 800, color: 'white',
    background: 'linear-gradient(135deg,#9B5DE5,#6C63FF)',
    boxShadow: '0 4px 0 rgba(0,0,0,0.15)', fontFamily: 'inherit',
  },
}
