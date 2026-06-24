import { useEffect, useRef, useState } from 'react'

// NLP principles:
//  - categorization helps build mental "frames" / chunks
//  - VAK: emoji (V) + voice (A) + drag/tap (K)
//  - associative learning: animal sounds, habitat colors
//  - small wins: 4-6 items per round (short attention span)
//  - positive reframing

const CATEGORIES = [
  {
    id: 'kaimo', emoji: '🐮', name: 'Kaimo gyvūnai', bg: '#FEF3C7',
    items: [
      { e: '🐮', n: 'Karvė', sound: 'mū' },
      { e: '🐷', n: 'Kiaulė', sound: 'kriuks' },
      { e: '🐔', n: 'Višta', sound: 'kakariekū' },
      { e: '🐑', n: 'Avis', sound: 'beee' },
      { e: '🐴', n: 'Arklys', sound: 'cak-cak' },
      { e: '🐰', n: 'Triušis' },
      { e: '🐶', n: 'Šuo', sound: 'au-au' },
      { e: '🐱', n: 'Katė', sound: 'miau' },
    ],
  },
  {
    id: 'misko', emoji: '🦊', name: 'Miško gyvūnai', bg: '#DCFCE7',
    items: [
      { e: '🦊', n: 'Lapė' },
      { e: '🦌', n: 'Elnias' },
      { e: '🐻', n: 'Meška' },
      { e: '🐗', n: 'Šernas' },
      { e: '🦔', n: 'Ežiukas' },
      { e: '🐺', n: 'Vilkas' },
      { e: '🐿️', n: 'Voverytė' },
      { e: '🦉', n: 'Pelėda' },
    ],
  },
  {
    id: 'juros', emoji: '🐠', name: 'Jūros gyventojai', bg: '#DBEAFE',
    items: [
      { e: '🐟', n: 'Žuvis' },
      { e: '🐠', n: 'Žuvytė' },
      { e: '🐬', n: 'Delfinas' },
      { e: '🐳', n: 'Banginis' },
      { e: '🦀', n: 'Krabas' },
      { e: '🐙', n: 'Aštuonkojis' },
      { e: '⭐', n: 'Jūros žvaigždė' },
      { e: '🦑', n: 'Kalmaras' },
    ],
  },
  {
    id: 'transp', emoji: '🚗', name: 'Transporto priemonės', bg: '#FCE7F3',
    items: [
      { e: '🚗', n: 'Mašina' },
      { e: '🚌', n: 'Autobusas' },
      { e: '🚒', n: 'Ugniagesių mašina' },
      { e: '🚓', n: 'Policijos mašina' },
      { e: '🚲', n: 'Dviratis' },
      { e: '✈️', n: 'Lėktuvas' },
      { e: '🚂', n: 'Traukinys' },
      { e: '🚢', n: 'Laivas' },
    ],
  },
  {
    id: 'metu', emoji: '🍂', name: 'Metų laikai', bg: '#FED7AA',
    items: [
      { e: '🌷', n: 'Pavasaris', hint: 'kai pražysta gėlės' },
      { e: '☀️', n: 'Vasara', hint: 'kai šilta ir saulė' },
      { e: '🍂', n: 'Ruduo', hint: 'kai krenta lapai' },
      { e: '❄️', n: 'Žiema', hint: 'kai sniegas' },
    ],
  },
  {
    id: 'gamta', emoji: '🌦️', name: 'Oro reiškiniai', bg: '#E0E7FF',
    items: [
      { e: '☀️', n: 'Saulė' },
      { e: '☁️', n: 'Debesis' },
      { e: '🌧️', n: 'Lietus' },
      { e: '⛈️', n: 'Perkūnas' },
      { e: '🌈', n: 'Vaivorykštė' },
      { e: '❄️', n: 'Snaigė' },
      { e: '💨', n: 'Vėjas' },
      { e: '🌫️', n: 'Rūkas' },
    ],
  },
]

function pickVoice(voices) {
  if (!voices || !voices.length) return null
  return voices.find(v => /^lt(-LT)?$/i.test(v.lang)) ||
         voices.find(v => /^lt/i.test(v.lang)) ||
         voices[0]
}
function speak(text, voices) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(voices); if (v) u.voice = v
    u.lang = v ? v.lang : 'lt-LT'
    u.rate = 0.88; u.pitch = 1.12
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WorldGame({ onScore }) {
  const [catIdx, setCatIdx] = useState(0)
  const [mode, setMode] = useState('learn') // learn | identify | sort
  const [questionIdx, setQuestionIdx] = useState(0)
  const [questions, setQuestions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const voicesRef = useRef([])
  const audioRef = useRef(null)

  const cat = CATEGORIES[catIdx]

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
  const okSound = () => { beep(660, 0.1, 'triangle', 0.18); setTimeout(() => beep(990, 0.14, 'triangle', 0.18), 90) }
  const nopeSound = () => beep(180, 0.16, 'square', 0.08)

  // build questions when entering identify mode
  useEffect(() => {
    ensureAudio()
    if (mode === 'identify') {
      const items = cat.items
      const qs = shuffle(items).slice(0, Math.min(6, items.length)).map(item => {
        const wrongs = shuffle(items.filter(x => x.n !== item.n)).slice(0, 3)
        return { item, options: shuffle([item, ...wrongs]) }
      })
      setQuestions(qs)
      setQuestionIdx(0)
    } else if (mode === 'sort') {
      // pick 2 random categories + 8 items total
      const otherIdx = (catIdx + 1 + Math.floor(Math.random() * (CATEGORIES.length - 1))) % CATEGORIES.length
      const other = CATEGORIES[otherIdx]
      const pool = shuffle([
        ...shuffle(cat.items).slice(0, 4).map(it => ({ ...it, group: cat.id })),
        ...shuffle(other.items).slice(0, 4).map(it => ({ ...it, group: other.id })),
      ])
      setQuestions([{ catA: cat, catB: other, items: pool, placed: {} }])
      setQuestionIdx(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, catIdx])

  // identify: announce current
  useEffect(() => {
    if (mode !== 'identify' || !questions[questionIdx]) return
    const it = questions[questionIdx].item
    setTimeout(() => speak('Kas tai? ' + (it.n || ''), voicesRef.current), 200)
  }, [mode, questionIdx, questions])

  const onIdentifyPick = (name) => {
    const q = questions[questionIdx]
    if (!q) return
    if (name === q.item.n) {
      okSound()
      setStreak(s => s + 1)
      setFeedback('ok')
      const gained = 10 + Math.min(streak * 2, 20)
      setScore(s => {
        const next = s + gained
        onScore?.(next)
        return next
      })
      speak(`Taip! ${q.item.n}` + (q.item.sound ? `. Ji sako ${q.item.sound}` : ''), voicesRef.current)
      setTimeout(() => {
        setFeedback(null)
        if (questionIdx + 1 < questions.length) {
          setQuestionIdx(questionIdx + 1)
        } else {
          speak('Šaunuolis! Visus pažinai!', voicesRef.current)
          setMode('learn')
        }
      }, 1400)
    } else {
      nopeSound()
      setStreak(0)
      setFeedback('nope')
      speak('Beveik. Tai ' + q.item.n, voicesRef.current)
      setTimeout(() => setFeedback(null), 800)
    }
  }

  const onSortDrop = (item, targetCat) => {
    const q = questions[0]
    if (!q) return
    const correct = item.group === targetCat.id
    if (correct) {
      okSound()
      setStreak(s => s + 1)
      setScore(s => {
        const next = s + 8
        onScore?.(next)
        return next
      })
      speak('Taip! ' + item.n + ' — ' + targetCat.name, voicesRef.current)
    } else {
      nopeSound()
      setStreak(0)
      speak('Beveik. ' + item.n + ' priklauso kitur', voicesRef.current)
    }
    const newPlaced = { ...q.placed, [item.n + '|' + item.group]: correct ? targetCat.id : 'wrong' }
    setQuestions([{ ...q, placed: newPlaced }])
  }

  // ---- screens ----
  if (mode === 'learn') {
    return (
      <div style={styles.wrap}>
        <div style={styles.topRow}>
          <div style={styles.catPicker}>
            {CATEGORIES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setCatIdx(i)}
                style={{
                  ...styles.catBtn,
                  background: i === catIdx ? 'linear-gradient(135deg,#9B5DE5,#6C63FF)' : 'white',
                  color: i === catIdx ? 'white' : '#1F2937',
                }}
              >{c.emoji} {c.name}</button>
            ))}
          </div>
          <div style={styles.score}>⭐ {score}</div>
        </div>

        <div style={{ ...styles.learnGrid, background: cat.bg }}>
          {cat.items.map((it, i) => (
            <button
              key={i}
              onClick={() => speak(it.n + (it.sound ? '. Sako ' + it.sound : ''), voicesRef.current)}
              style={styles.learnCard}
            >
              <div style={{ fontSize: 56 }}>{it.e}</div>
              <div style={styles.learnName}>{it.n}</div>
              {it.sound && <div style={styles.learnSound}>🔊 „{it.sound}"</div>}
            </button>
          ))}
        </div>

        <div style={styles.modeRow}>
          <button onClick={() => setMode('identify')} style={{ ...styles.modeBtn, background: 'linear-gradient(135deg,#06D6A0,#4CC9F0)' }}>
            🎯 „Kas tai?" žaisti
          </button>
          <button onClick={() => setMode('sort')} style={{ ...styles.modeBtn, background: 'linear-gradient(135deg,#FFD166,#FF6B8A)' }}>
            🧺 „Sugrupuok" žaisti
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'identify') {
    const q = questions[questionIdx]
    if (!q) return null
    return (
      <div style={styles.wrap}>
        <div style={styles.topRow}>
          <button onClick={() => setMode('learn')} style={styles.backBtn}>← Mokytis</button>
          <div style={styles.progressText}>{questionIdx + 1} / {questions.length}</div>
          <div style={styles.score}>⭐ {score}</div>
        </div>

        <div style={{
          ...styles.bigEmoji,
          background: feedback === 'ok' ? '#BBF7D0' : feedback === 'nope' ? '#FEE2E2' : cat.bg,
        }}>
          <div style={{ fontSize: 140 }}>{q.item.e}</div>
        </div>
        <div style={styles.questionText}>Kas tai?</div>

        <div style={styles.optionsGrid}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onIdentifyPick(opt.n)}
              style={styles.optionBtn}
            >{opt.n}</button>
          ))}
        </div>
      </div>
    )
  }

  if (mode === 'sort') {
    const q = questions[0]
    if (!q) return null
    const placedAll = Object.keys(q.placed).length === q.items.length

    return (
      <div style={styles.wrap}>
        <div style={styles.topRow}>
          <button onClick={() => setMode('learn')} style={styles.backBtn}>← Mokytis</button>
          <div style={styles.progressText}>Sugrupuok į teisingą krepšį 🧺</div>
          <div style={styles.score}>⭐ {score}</div>
        </div>

        <div style={styles.basketRow}>
          {[q.catA, q.catB].map(c => (
            <div key={c.id} style={{ ...styles.basket, background: c.bg }}>
              <div style={styles.basketLabel}>{c.emoji} {c.name}</div>
              <div style={styles.basketItems}>
                {q.items
                  .filter(it => q.placed[it.n + '|' + it.group] === c.id)
                  .map((it, i) => (
                    <span key={i} style={{ fontSize: 36 }}>{it.e}</span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.poolTitle}>Daiktai:</div>
        <div style={styles.itemPool}>
          {q.items.map((it, i) => {
            const placedKey = q.placed[it.n + '|' + it.group]
            if (placedKey && placedKey !== 'wrong') return null
            return (
              <div key={i} style={styles.poolItem}>
                <div style={{ fontSize: 48 }}>{it.e}</div>
                <div style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>{it.n}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button
                    onClick={() => onSortDrop(it, q.catA)}
                    style={{ ...styles.sortChoose, background: q.catA.bg }}
                  >{q.catA.emoji}</button>
                  <button
                    onClick={() => onSortDrop(it, q.catB)}
                    style={{ ...styles.sortChoose, background: q.catB.bg }}
                  >{q.catB.emoji}</button>
                </div>
              </div>
            )
          })}
        </div>

        {placedAll && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => setMode('learn')} style={styles.modeBtn}>🏁 Baigta!</button>
          </div>
        )}
      </div>
    )
  }

  return null
}

const styles = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  catPicker: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  catBtn: {
    border: '1px solid #E2E8F0', borderRadius: 12, padding: '6px 12px',
    fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  score: { background: 'white', padding: '8px 14px', borderRadius: 12, fontWeight: 800, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  learnGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
    borderRadius: 18, padding: 14,
  },
  learnCard: {
    background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14,
    padding: 12, textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  learnName: { fontWeight: 800, fontSize: 15, color: '#1F2937' },
  learnSound: { fontSize: 12, color: '#6C63FF', fontWeight: 700 },
  modeRow: {
    display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap',
  },
  modeBtn: {
    border: 'none', cursor: 'pointer', borderRadius: 14, color: 'white',
    padding: '12px 22px', fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
    boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
  },
  backBtn: {
    background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
    padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  progressText: { fontWeight: 700, color: '#475569' },
  bigEmoji: {
    borderRadius: 24, padding: 30, textAlign: 'center',
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.05)',
    transition: 'background 0.2s',
  },
  questionText: { textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#1F2937', margin: '14px 0' },
  optionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
  },
  optionBtn: {
    background: 'white', border: '1px solid #E2E8F0', borderRadius: 14,
    padding: '14px 12px', fontWeight: 800, fontSize: 16, color: '#1F2937',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
  },
  basketRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
  basket: {
    borderRadius: 18, padding: 14, minHeight: 130,
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.06)',
  },
  basketLabel: { fontWeight: 800, marginBottom: 8 },
  basketItems: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  poolTitle: { fontWeight: 800, color: '#475569', marginTop: 16, marginBottom: 8 },
  itemPool: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8,
  },
  poolItem: {
    background: 'white', borderRadius: 12, padding: 8,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 3px 0 rgba(0,0,0,0.06)',
  },
  sortChoose: {
    width: 36, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
    cursor: 'pointer', fontSize: 18, fontFamily: 'inherit',
  },
}
