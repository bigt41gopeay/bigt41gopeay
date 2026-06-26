import { useEffect, useRef, useState } from 'react'
import { speak as libSpeak, stop as libStop } from '../lib/speak'

// NeuroPlanet — lietuviška versija (inspiracija: Armin-000/ADHD_game)
// Trys lygiai: 1) Raidės ir garsai  2) Skiemenys  3) Atminties planeta

const LEVEL1_ROUNDS = [
  { letter: 'A', sound: 'a', correct: 'Antis',    answers: [{ w: 'Antis',    e: '🦆' }, { w: 'Šuo',    e: '🐶' }, { w: 'Saulė', e: '☀️' }] },
  { letter: 'B', sound: 'b', correct: 'Bitė',     answers: [{ w: 'Lapė',     e: '🦊' }, { w: 'Bitė',   e: '🐝' }, { w: 'Namas', e: '🏠' }] },
  { letter: 'D', sound: 'd', correct: 'Dramblys', answers: [{ w: 'Katė',     e: '🐱' }, { w: 'Žuvis',  e: '🐟' }, { w: 'Dramblys', e: '🐘' }] },
  { letter: 'K', sound: 'k', correct: 'Katė',     answers: [{ w: 'Katė',     e: '🐱' }, { w: 'Obuolys',e: '🍎' }, { w: 'Bitė',  e: '🐝' }] },
  { letter: 'L', sound: 'l', correct: 'Lapė',     answers: [{ w: 'Antis',    e: '🦆' }, { w: 'Lapė',   e: '🦊' }, { w: 'Saulė', e: '☀️' }] },
  { letter: 'M', sound: 'm', correct: 'Meška',    answers: [{ w: 'Meška',    e: '🐻' }, { w: 'Žirafa', e: '🦒' }, { w: 'Šuo',   e: '🐶' }] },
  { letter: 'O', sound: 'o', correct: 'Obuolys',  answers: [{ w: 'Bitė',     e: '🐝' }, { w: 'Obuolys',e: '🍎' }, { w: 'Lapė',  e: '🦊' }] },
  { letter: 'P', sound: 'p', correct: 'Paukštis', answers: [{ w: 'Saulė',    e: '☀️' }, { w: 'Katė',   e: '🐱' }, { w: 'Paukštis', e: '🐦' }] },
  { letter: 'S', sound: 's', correct: 'Saulė',    answers: [{ w: 'Saulė',    e: '☀️' }, { w: 'Žirafa', e: '🦒' }, { w: 'Antis', e: '🦆' }] },
  { letter: 'Š', sound: 'š', correct: 'Šuo',      answers: [{ w: 'Žuvis',    e: '🐟' }, { w: 'Šuo',    e: '🐶' }, { w: 'Meška', e: '🐻' }] },
  { letter: 'Ž', sound: 'ž', correct: 'Žirafa',   answers: [{ w: 'Žirafa',   e: '🦒' }, { w: 'Paukštis', e: '🐦' }, { w: 'Obuolys', e: '🍎' }] },
]

const LEVEL2_WORDS = [
  { word: 'MAMA',   emoji: '👩',  syllables: ['MA','MA'],    distractors: ['TĖ','PA','KA'] },
  { word: 'TĖTĖ',   emoji: '👨',  syllables: ['TĖ','TĖ'],    distractors: ['MA','SA','LA'] },
  { word: 'KATĖ',   emoji: '🐱',  syllables: ['KA','TĖ'],    distractors: ['MA','PA','BI'] },
  { word: 'LAPĖ',   emoji: '🦊',  syllables: ['LA','PĖ'],    distractors: ['ŠU','MA','KA'] },
  { word: 'NAMAS',  emoji: '🏠',  syllables: ['NA','MAS'],   distractors: ['KAS','MA','LAS'] },
  { word: 'GĖLĖ',   emoji: '🌸',  syllables: ['GĖ','LĖ'],    distractors: ['MA','SAU','TĖ'] },
  { word: 'SAULĖ',  emoji: '☀️', syllables: ['SAU','LĖ'],   distractors: ['MA','TĖ','LA'] },
  { word: 'BITĖ',   emoji: '🐝',  syllables: ['BI','TĖ'],    distractors: ['KA','MA','LA'] },
  { word: 'ŽIRAFA', emoji: '🦒',  syllables: ['ŽI','RA','FA'], distractors: ['MA','KA','SA'] },
  { word: 'DRAMBLYS', emoji: '🐘', syllables: ['DRAM','BLYS'], distractors: ['MA','KA','PA'] },
]

const LEVEL3_PRESETS = {
  easy:   { pairs: ['🚀','⭐','🌙'],            intro: 5000, preview: 5000, label: 'Lengvas' },
  normal: { pairs: ['🚀','⭐','🌙','🪐'],       intro: 3500, preview: 3500, label: 'Vidutinis' },
  hard:   { pairs: ['🚀','⭐','🌙','🪐','☄️','🛸'], intro: 1800, preview: 2200, label: 'Sunkus' },
}

function useAudioCtx() {
  const ref = useRef(null)
  return () => {
    if (!ref.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) ref.current = new Ctx()
    }
    return ref.current
  }
}

function beep(ctx, freq, dur, type = 'sine', g = 0.18) {
  if (!ctx) return
  const o = ctx.createOscillator(); const gn = ctx.createGain()
  o.type = type; o.frequency.value = freq; gn.gain.value = g
  o.connect(gn); gn.connect(ctx.destination); o.start()
  gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  o.stop(ctx.currentTime + dur)
}

function confetti(host, count = 36) {
  if (!host) return
  const colors = ['#FFFFFF','#FFC845','#FF7A6B','#4FD1A5','#6C63FF','#9B7BFF','#4CC9F0']
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span')
    piece.style.position = 'absolute'
    piece.style.left = `${Math.random() * 100}%`
    piece.style.top = '-20px'
    piece.style.width = '10px'
    piece.style.height = '14px'
    piece.style.borderRadius = '3px'
    piece.style.background = colors[Math.floor(Math.random() * colors.length)]
    piece.style.zIndex = '50'
    piece.style.pointerEvents = 'none'
    piece.style.opacity = '0.92'
    const dur = 1800 + Math.random() * 900
    piece.animate(
      [
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
        { transform: `translateY(${host.clientHeight + 80}px) rotate(${360 + Math.random()*360}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }
    )
    host.appendChild(piece)
    setTimeout(() => piece.remove(), dur)
  }
}

// ============ MAIN ============
export default function NeuroPlanetGame({ onScore }) {
  const [screen, setScreen] = useState('hub') // hub | l1 | l2 | l3 | done
  const [unlocked, setUnlocked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('neuroPlanetUnlocked') || '[1]') }
    catch { return [1] }
  })
  const [totalScore, setTotalScore] = useState(0)

  const unlock = (lvl) => {
    setUnlocked(prev => {
      const next = [...new Set([...prev, lvl])].sort((a,b) => a - b)
      try { localStorage.setItem('neuroPlanetUnlocked', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const onLevelDone = (lvl, score) => {
    setTotalScore(s => {
      const t = s + score
      onScore?.(t)
      return t
    })
    if (lvl < 3) unlock(lvl + 1)
    setScreen('hub')
  }

  if (screen === 'l1') return <Level1 onBack={() => setScreen('hub')} onDone={(s) => onLevelDone(1, s)} />
  if (screen === 'l2') return <Level2 onBack={() => setScreen('hub')} onDone={(s) => onLevelDone(2, s)} />
  if (screen === 'l3') return <Level3 onBack={() => setScreen('hub')} onDone={(s) => onLevelDone(3, s)} />

  // HUB
  return (
    <div style={hubStyles.wrap}>
      <div style={hubStyles.cosmos}>
        <div style={hubStyles.planet}>🌍</div>
        <div className="np-spin-slow" style={hubStyles.orbit} />
        <div className="np-orbit-dot" style={hubStyles.orbitDot}>⭐</div>
      </div>

      <div style={hubStyles.headerRow}>
        <h3 style={hubStyles.title}>🪐 NeuroPlaneta</h3>
        <div style={hubStyles.scorePill}>⭐ {totalScore}</div>
      </div>
      <p style={hubStyles.subtitle}>
        Trijų lygių kelionė ADHD draugiškame kosmose. Mokomės žaisdami — raidės, skiemenys, atmintis.
      </p>

      <div style={hubStyles.levels}>
        <LevelCard
          n={1} title="Raidės ir garsai" emoji="🔤"
          desc="Klausyk garso ir surask žodį, prasidedantį ta raide."
          bg="linear-gradient(135deg,#6C63FF,#9B7BFF)"
          locked={!unlocked.includes(1)}
          onPlay={() => setScreen('l1')}
        />
        <LevelCard
          n={2} title="Skiemenų dėlionė" emoji="🧩"
          desc="Surink žodį iš skiemenų. MA + MA = MAMA."
          bg="linear-gradient(135deg,#4FD1A5,#06D6A0)"
          locked={!unlocked.includes(2)}
          onPlay={() => setScreen('l2')}
        />
        <LevelCard
          n={3} title="Atminties planeta" emoji="🪐"
          desc="Surask poras kortelių su raketomis, žvaigždėmis ir planetomis."
          bg="linear-gradient(135deg,#FF7A6B,#FFC845)"
          locked={!unlocked.includes(3)}
          onPlay={() => setScreen('l3')}
        />
      </div>

      <style>{`
        @keyframes np-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes np-orbit { from { transform: rotate(0deg) translateX(110px) rotate(0deg); } to { transform: rotate(360deg) translateX(110px) rotate(-360deg); } }
        .np-spin-slow { animation: np-spin-slow 18s linear infinite; }
        .np-orbit-dot { animation: np-orbit 8s linear infinite; }
      `}</style>
    </div>
  )
}

function LevelCard({ n, title, emoji, desc, bg, locked, onPlay }) {
  return (
    <div style={{ ...hubStyles.card, opacity: locked ? 0.55 : 1, filter: locked ? 'grayscale(0.6)' : 'none' }}>
      <div style={{ ...hubStyles.cardHead, background: bg }}>
        <span style={{ fontSize: 48 }}>{emoji}</span>
        <span style={hubStyles.lvlBadge}>Lygis {n}</span>
      </div>
      <div style={hubStyles.cardBody}>
        <h4 style={{ fontFamily: 'var(--font-heading, sans-serif)', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{title}</h4>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.45 }}>{desc}</p>
        <button
          onClick={onPlay}
          disabled={locked}
          style={{
            marginTop: 12, padding: '10px 20px', borderRadius: 12,
            border: 'none', cursor: locked ? 'not-allowed' : 'pointer',
            background: locked ? '#CBD5E1' : bg,
            color: 'white', fontWeight: 800, fontSize: 14,
            fontFamily: 'inherit', boxShadow: locked ? 'none' : '0 6px 14px rgba(0,0,0,0.15)',
          }}
        >
          {locked ? '🔒 Užrakinta' : '▶ Pradėti'}
        </button>
      </div>
    </div>
  )
}

// ============ LEVEL 1 ============
function Level1({ onBack, onDone }) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [mistakeThisRound, setMistakeThisRound] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [message, setMessage] = useState(null)
  const voicesRef = useRef([])
  const ensureAudio = useAudioCtx()
  const boardRef = useRef(null)

  const r = LEVEL1_ROUNDS[roundIdx]

  useEffect(() => {
    const load = () => { if (window.speechSynthesis) voicesRef.current = window.speechSynthesis.getVoices() }
    load(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load
  }, [])

  const speak = (text) => libSpeak(text)

  // announce on round change
  useEffect(() => {
    setAnswered(false); setMistakeThisRound(false); setMessage(null)
    const t = setTimeout(() => speak(`Klausyk garso: ${r.letter}. Surask žodį, prasidedantį šia raide.`), 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  const choose = (word) => {
    if (answered) return
    const ctx = ensureAudio()
    if (word === r.correct) {
      setAnswered(true)
      beep(ctx, 660, 0.12, 'triangle', 0.2)
      setTimeout(() => beep(ctx, 990, 0.16, 'triangle', 0.2), 110)
      setMessage({ kind: 'ok', text: `Šaunu! Raidė ${r.letter} kaip ${r.correct}.` })
      speak(`Šaunu. ${r.letter} kaip ${r.correct}`)
      if (roundIdx === LEVEL1_ROUNDS.length - 1) {
        confetti(boardRef.current, 40)
        setTimeout(() => {
          const score = Math.max(0, LEVEL1_ROUNDS.length - wrong)
          onDone(score)
        }, 1600)
      }
    } else {
      if (!mistakeThisRound) { setWrong(w => w + 1); setMistakeThisRound(true) }
      beep(ctx, 220, 0.14, 'square', 0.08)
      setMessage({ kind: 'try', text: `Beveik. Pabandyk dar — klausykim ${r.letter}.` })
      speak(`Beveik. Klausyk: ${r.letter}`)
    }
  }

  const next = () => { if (roundIdx + 1 < LEVEL1_ROUNDS.length) setRoundIdx(i => i + 1) }

  return (
    <div ref={boardRef} style={levelStyles.wrap}>
      <div style={levelStyles.topRow}>
        <button onClick={onBack} style={levelStyles.backBtn}>← Į planetos hub</button>
        <div style={levelStyles.progress}>Runda {roundIdx + 1} / {LEVEL1_ROUNDS.length}</div>
        <div style={levelStyles.scorePill}>❌ {wrong}</div>
      </div>

      <div style={levelStyles.bigLetterWrap}>
        <div style={levelStyles.bigLetter}>{r.letter}</div>
        <button onClick={() => speak(`Raidė ${r.letter}`)} style={levelStyles.speakBtn}>🔊 Pakartoti</button>
      </div>

      <div style={levelStyles.answersGrid}>
        {r.answers.map((a, i) => (
          <button
            key={i}
            onClick={() => choose(a.w)}
            disabled={answered}
            style={{
              ...levelStyles.answerCard,
              background: answered && a.w === r.correct ? 'linear-gradient(135deg,#4FD1A5,#06D6A0)' : 'rgba(255,255,255,0.95)',
              color: answered && a.w === r.correct ? 'white' : '#1F2937',
            }}
          >
            <span style={{ fontSize: 52 }}>{a.e}</span>
            <span style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>{a.w}</span>
          </button>
        ))}
      </div>

      {message && (
        <div style={{ ...levelStyles.message, background: message.kind === 'ok' ? '#BBF7D0' : '#FEF3C7', color: message.kind === 'ok' ? '#166534' : '#92400E' }}>
          {message.text}
        </div>
      )}

      {answered && roundIdx + 1 < LEVEL1_ROUNDS.length && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button onClick={next} style={levelStyles.nextBtn}>➡ Kita raidė</button>
        </div>
      )}
    </div>
  )
}

// ============ LEVEL 2 ============
function Level2({ onBack, onDone }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState([])
  const [wrong, setWrong] = useState(0)
  const [mistake, setMistake] = useState(false)
  const voicesRef = useRef([])
  const ensureAudio = useAudioCtx()
  const boardRef = useRef(null)

  useEffect(() => {
    const load = () => { if (window.speechSynthesis) voicesRef.current = window.speechSynthesis.getVoices() }
    load(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load
  }, [])

  const speak = (text) => libSpeak(text)

  const item = LEVEL2_WORDS[idx]
  const needed = item.syllables
  const bank = [...needed, ...item.distractors].sort(() => Math.random() - 0.5)

  useEffect(() => {
    setPicked([]); setMistake(false)
    const t = setTimeout(() => speak(`Sudėk žodį: ${item.word}`), 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const pick = (syl) => {
    const ctx = ensureAudio()
    const nextIdx = picked.length
    if (nextIdx >= needed.length) return
    if (needed[nextIdx] === syl) {
      beep(ctx, 660, 0.1, 'triangle', 0.18)
      const next = [...picked, syl]
      setPicked(next)
      if (next.length === needed.length) {
        setTimeout(() => beep(ctx, 990, 0.18, 'triangle', 0.2), 120)
        speak(`Teisingai! ${item.word}`)
        if (idx === LEVEL2_WORDS.length - 1) {
          confetti(boardRef.current, 36)
          setTimeout(() => {
            const score = Math.max(0, LEVEL2_WORDS.length - wrong)
            onDone(score)
          }, 1600)
        } else {
          setTimeout(() => setIdx(i => i + 1), 1100)
        }
      }
    } else {
      if (!mistake) { setWrong(w => w + 1); setMistake(true) }
      beep(ctx, 220, 0.12, 'square', 0.08)
      speak('Beveik. Klausyk dar kartą')
    }
  }

  return (
    <div ref={boardRef} style={levelStyles.wrap}>
      <div style={levelStyles.topRow}>
        <button onClick={onBack} style={levelStyles.backBtn}>← Į planetos hub</button>
        <div style={levelStyles.progress}>{idx + 1} / {LEVEL2_WORDS.length}</div>
        <div style={levelStyles.scorePill}>❌ {wrong}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 110 }}>{item.emoji}</div>
        <button onClick={() => speak(item.word)} style={levelStyles.speakBtn}>🔊 {item.word}</button>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {needed.map((s, i) => (
          <div key={i} style={{
            minWidth: 80, height: 70, borderRadius: 16,
            border: '3px dashed rgba(255,255,255,0.45)',
            background: picked[i] ? 'linear-gradient(135deg,#4FD1A5,#06D6A0)' : 'rgba(255,255,255,0.1)',
            color: 'white', fontWeight: 900, fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 14px',
          }}>
            {picked[i] || '?'}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {bank.map((s, i) => {
          const usedCount = picked.filter(p => p === s).length
          const totalCount = bank.filter(b => b === s).length
          const used = usedCount >= totalCount
          return (
            <button
              key={i}
              onClick={() => !used && pick(s)}
              disabled={used}
              style={{
                ...levelStyles.syllableBtn,
                opacity: used ? 0.3 : 1,
                pointerEvents: used ? 'none' : 'auto',
              }}
            >{s}</button>
          )
        })}
      </div>
    </div>
  )
}

// ============ LEVEL 3 ============
function Level3({ onBack, onDone }) {
  const [diff, setDiff] = useState('normal')
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [wrong, setWrong] = useState(0)
  const [previewing, setPreviewing] = useState(true)
  const [done, setDone] = useState(false)
  const ensureAudio = useAudioCtx()
  const boardRef = useRef(null)

  const preset = LEVEL3_PRESETS[diff]

  useEffect(() => {
    // build cards
    const pool = []
    preset.pairs.forEach((e, i) => { pool.push({ id: i + '-a', emoji: e }); pool.push({ id: i + '-b', emoji: e }) })
    pool.sort(() => Math.random() - 0.5)
    setCards(pool); setFlipped([]); setMatched([]); setWrong(0); setDone(false)
    setPreviewing(true)
    const t = setTimeout(() => setPreviewing(false), preset.preview)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff])

  const onFlip = (idx) => {
    if (previewing || done) return
    if (flipped.includes(idx) || matched.includes(idx)) return
    if (flipped.length >= 2) return
    const ctx = ensureAudio()
    beep(ctx, 540 + Math.random() * 80, 0.06, 'triangle', 0.12)
    const next = [...flipped, idx]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          setMatched(m => [...m, a, b])
          setFlipped([])
          beep(ctx, 880, 0.12, 'triangle', 0.18)
          setTimeout(() => beep(ctx, 1320, 0.16, 'triangle', 0.18), 110)
          if (matched.length + 2 >= cards.length) {
            confetti(boardRef.current, 42)
            setDone(true)
            setTimeout(() => {
              const score = Math.max(0, preset.pairs.length - wrong)
              onDone(score)
            }, 1800)
          }
        }, 420)
      } else {
        setWrong(w => w + 1)
        setTimeout(() => {
          setFlipped([])
          beep(ctx, 220, 0.1, 'square', 0.08)
        }, 800)
      }
    }
  }

  return (
    <div ref={boardRef} style={levelStyles.wrap}>
      <div style={levelStyles.topRow}>
        <button onClick={onBack} style={levelStyles.backBtn}>← Į planetos hub</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(LEVEL3_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setDiff(k)}
              style={{
                ...levelStyles.diffBtn,
                background: diff === k ? 'white' : 'rgba(255,255,255,0.15)',
                color: diff === k ? '#1F2937' : 'white',
              }}
            >{v.label}</button>
          ))}
        </div>
        <div style={levelStyles.scorePill}>❌ {wrong}</div>
      </div>

      {previewing && (
        <div style={{ textAlign: 'center', color: 'white', fontWeight: 700, marginBottom: 12 }}>
          🔍 Įsidėmėk kortas… ({Math.round(preset.preview / 1000)} s)
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(4, Math.ceil(cards.length / 2))}, 1fr)`,
        gap: 10,
        maxWidth: 480,
        margin: '0 auto',
      }}>
        {cards.map((c, i) => {
          const isShown = previewing || flipped.includes(i) || matched.includes(i)
          return (
            <button
              key={c.id}
              onClick={() => onFlip(i)}
              style={{
                ...levelStyles.memCard,
                background: isShown ? 'white' : 'linear-gradient(135deg,#6C63FF,#9B7BFF)',
                color: isShown ? '#1F2937' : 'white',
                cursor: matched.includes(i) ? 'default' : 'pointer',
                transform: matched.includes(i) ? 'scale(0.94)' : 'scale(1)',
                opacity: matched.includes(i) ? 0.55 : 1,
              }}
            >
              {isShown ? c.emoji : '?'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============ STYLES ============
const hubStyles = {
  wrap: {
    position: 'relative',
    minHeight: 540,
    padding: 24,
    background: 'radial-gradient(circle at top, #1e1b4b, #0f172a 70%)',
    borderRadius: 24,
    color: 'white',
    overflow: 'hidden',
  },
  cosmos: {
    position: 'absolute', top: 0, right: 0, width: 280, height: 280,
    pointerEvents: 'none', opacity: 0.5,
  },
  planet: {
    position: 'absolute', top: 80, right: 80, fontSize: 80,
    filter: 'drop-shadow(0 0 20px rgba(108,99,255,0.8))',
  },
  orbit: {
    position: 'absolute', top: 100, right: 60, width: 140, height: 140,
    borderRadius: '50%', border: '2px solid rgba(255,255,255,0.18)',
  },
  orbitDot: {
    position: 'absolute', top: 165, right: 130, fontSize: 18,
    filter: 'drop-shadow(0 0 6px #FFC845)',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, position: 'relative', zIndex: 2 },
  title: {
    fontFamily: 'var(--font-heading, sans-serif)', fontWeight: 700,
    fontSize: 30, color: 'white', letterSpacing: '-0.5px',
  },
  scorePill: {
    background: 'rgba(255,200,69,0.18)', color: '#FFC845',
    padding: '6px 14px', borderRadius: 999, fontWeight: 800, fontSize: 14,
    border: '1px solid rgba(255,200,69,0.3)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.55,
    maxWidth: 560, marginBottom: 24, position: 'relative', zIndex: 2,
  },
  levels: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14, position: 'relative', zIndex: 2,
  },
  card: {
    background: 'white', color: '#1F2937', borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
    transition: 'transform 0.15s, opacity 0.2s',
  },
  cardHead: {
    height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', position: 'relative',
  },
  lvlBadge: {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(255,255,255,0.25)', padding: '4px 10px', borderRadius: 999,
    fontWeight: 800, fontSize: 11, color: 'white',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  },
  cardBody: { padding: 14 },
}

const levelStyles = {
  wrap: {
    position: 'relative',
    minHeight: 540,
    padding: 22,
    background: 'radial-gradient(circle at top, #312e81, #0f172a 75%)',
    borderRadius: 24,
    color: 'white',
    overflow: 'hidden',
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10, flexWrap: 'wrap' },
  backBtn: {
    background: 'rgba(255,255,255,0.12)', color: 'white',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
    padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
  },
  progress: { fontWeight: 800, color: 'white' },
  scorePill: {
    background: 'rgba(239,68,68,0.18)', color: '#FCA5A5',
    padding: '6px 14px', borderRadius: 999, fontWeight: 800, fontSize: 14,
    border: '1px solid rgba(239,68,68,0.3)',
  },
  bigLetterWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 22,
  },
  bigLetter: {
    width: 130, height: 130, borderRadius: 28,
    background: 'linear-gradient(135deg,#FFD166,#FF7A6B)',
    color: 'white', fontWeight: 900, fontSize: 90,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 16px 36px rgba(255,122,107,0.45)',
  },
  speakBtn: {
    background: 'rgba(255,255,255,0.18)', color: 'white',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12,
    padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  answerCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 16, border: 'none',
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s',
    minHeight: 130,
  },
  message: {
    marginTop: 18, padding: 14, borderRadius: 14,
    fontWeight: 800, textAlign: 'center', fontSize: 15,
  },
  nextBtn: {
    background: 'linear-gradient(135deg,#4FD1A5,#06D6A0)', color: 'white',
    border: 'none', borderRadius: 14, padding: '12px 22px',
    fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 8px 18px rgba(79,209,165,0.4)',
  },
  syllableBtn: {
    background: 'linear-gradient(135deg,#FFD166,#FF7A6B)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 22px', fontWeight: 900, fontSize: 24,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
  },
  diffBtn: {
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
    padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
    fontSize: 13,
  },
  memCard: {
    aspectRatio: '1',
    border: 'none', borderRadius: 16,
    fontSize: 42, fontFamily: 'inherit', fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
    transition: 'transform 0.18s, background 0.18s, opacity 0.18s',
  },
}
