import { useCallback, useRef, useState } from 'react'

// 🗺️ Pikselių kelionė — inspiruota mhgarry/PixelPath (gamified ADHD
// productivity app). Originalas yra pilnas Next.js + Postgres stack'as,
// čia padaryta lengva React versija: žemėlapis su 5 vietovėmis, kiekvienoje
// po 3 mini-užduotis. Pildant ankstesnes — atrakini sekančias. Personažas
// evolucionuoja, taškai saugomi localStorage.

const AVATAR_STAGES = ['🐣', '🐥', '🐤', '🦅', '🐉'] // evolves every 3 missions

const REGIONS = [
  {
    id: 'home', emoji: '🏠', name: 'Namai', x: 8, y: 65,
    bg: 'linear-gradient(135deg,#FFD166,#FFC845)',
    missions: [
      { type: 'click', text: 'Pasveikink šeimą — paspausk 3 širdeles', target: 3, emoji: '❤️' },
      { type: 'pick', text: 'Pasirink, ką sako mama:', options: ['Labas rytas! 🌞', 'Hello kid!', 'Bonjour'], correct: 0 },
      { type: 'count', text: 'Suskaičiuok obuolius vaisinėje:', items: ['🍎','🍎','🍎','🍎'], correct: 4 },
    ],
  },
  {
    id: 'school', emoji: '🏫', name: 'Mokykla', x: 28, y: 35,
    bg: 'linear-gradient(135deg,#9B5DE5,#6C63FF)',
    missions: [
      { type: 'pick', text: 'Kuri raidė yra pirmoji žodyje „MOKYTOJA"?', options: ['O', 'M', 'A'], correct: 1 },
      { type: 'math', text: 'Apskaičiuok: 5 + 3 = ?', answer: 8 },
      { type: 'pick', text: 'Kas yra vaivorykštė?', options: ['Spalvota juosta danguje', 'Vaisius', 'Daržovė'], correct: 0 },
    ],
  },
  {
    id: 'library', emoji: '📚', name: 'Biblioteka', x: 50, y: 60,
    bg: 'linear-gradient(135deg,#4CC9F0,#6C63FF)',
    missions: [
      { type: 'pick', text: 'Kuriame žodyje yra raidė „Ė"?', options: ['Katė', 'Šuo', 'Lapė'], correct: 0 },
      { type: 'order', text: 'Sudėk raides ABC:', letters: ['B','A','C'], correct: ['A','B','C'] },
      { type: 'pick', text: 'Kuri raidė lietuviška: Ą, ą, ş?', options: ['Ą', 'ş', 'š'], correct: 0 },
    ],
  },
  {
    id: 'park', emoji: '🎢', name: 'Žaidimų aikštelė', x: 72, y: 30,
    bg: 'linear-gradient(135deg,#4FD1A5,#06D6A0)',
    missions: [
      { type: 'click', text: 'Pasiekti maksimalų greitį — spausk 10 kartų!', target: 10, emoji: '⚡' },
      { type: 'math', text: '12 − 4 = ?', answer: 8 },
      { type: 'pick', text: 'Kuris draugiškas elgesys?', options: ['Pasidalink žaislu', 'Stumti draugą', 'Verkti'], correct: 0 },
    ],
  },
  {
    id: 'castle', emoji: '🏰', name: 'Drąsiukų pilis', x: 92, y: 60,
    bg: 'linear-gradient(135deg,#FF7A6B,#FFC845)',
    missions: [
      { type: 'pick', text: 'Tu esi drąsus, kai...', options: ['Pabėgi nuo problemos', 'Bandai dar kartą nors ir sunku', 'Pyksi'], correct: 1 },
      { type: 'math', text: '6 × 2 = ?', answer: 12 },
      { type: 'pick', text: 'Kokia geriausia emocija po pergalės?', options: ['Pyktis', 'Džiaugsmas 😊', 'Liūdesys'], correct: 1 },
    ],
  },
]

const STORAGE_KEY = 'pixelPathProgress'

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: {}, totalMissions: 0 }
    return JSON.parse(raw)
  } catch { return { completed: {}, totalMissions: 0 } }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

export default function PixelPathGame({ onScore }) {
  const [progress, setProgress] = useState(loadProgress)
  const [active, setActive] = useState(null) // {regionIdx, missionIdx}
  const [clickCount, setClickCount] = useState(0)
  const [input, setInput] = useState('')
  const [orderPick, setOrderPick] = useState([])
  const [feedback, setFeedback] = useState(null)
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

  // Total completed = sum of region missions completed
  const totalDone = Object.values(progress.completed).reduce((a, b) => a + b.length, 0)
  const totalMissions = REGIONS.reduce((acc, r) => acc + r.missions.length, 0)
  const stage = Math.min(AVATAR_STAGES.length - 1, Math.floor(totalDone / 3))
  const avatar = AVATAR_STAGES[stage]

  const regionUnlocked = (idx) => {
    if (idx === 0) return true
    const prev = REGIONS[idx - 1]
    const prevDone = (progress.completed[prev.id] || []).length
    return prevDone === prev.missions.length
  }

  const openMission = (regionIdx, missionIdx) => {
    ensureAudio()
    setActive({ regionIdx, missionIdx })
    setClickCount(0)
    setInput('')
    setOrderPick([])
    setFeedback(null)
  }

  const completeMission = useCallback(() => {
    if (!active) return
    const region = REGIONS[active.regionIdx]
    const next = {
      ...progress,
      completed: {
        ...progress.completed,
        [region.id]: [...new Set([...(progress.completed[region.id] || []), active.missionIdx])],
      },
    }
    setProgress(next)
    saveProgress(next)
    beep(660, 0.1, 'triangle', 0.2)
    setTimeout(() => beep(990, 0.14, 'triangle', 0.2), 90)
    onScore?.(Object.values(next.completed).reduce((a, b) => a + b.length, 0) * 20)
    setFeedback('ok')
    setTimeout(() => setActive(null), 1100)
  }, [active, progress, onScore, beep])

  const submitMission = () => {
    if (!active) return
    const m = REGIONS[active.regionIdx].missions[active.missionIdx]
    let ok = false
    if (m.type === 'click') {
      ok = clickCount >= m.target
    } else if (m.type === 'pick') {
      ok = false // pick uses direct button onClick → completeMission
    } else if (m.type === 'math' || m.type === 'count') {
      const guess = parseInt(input, 10)
      ok = !Number.isNaN(guess) && guess === (m.answer ?? m.correct)
    } else if (m.type === 'order') {
      ok = orderPick.length === m.correct.length && orderPick.every((v, i) => v === m.correct[i])
    }
    if (ok) completeMission()
    else {
      beep(180, 0.14, 'square', 0.1)
      setFeedback('nope')
      setTimeout(() => setFeedback(null), 600)
    }
  }

  const resetProgress = () => {
    const fresh = { completed: {}, totalMissions: 0 }
    setProgress(fresh)
    saveProgress(fresh)
  }

  // active region viewport
  const activeRegion = active ? REGIONS[active.regionIdx] : null
  const activeMission = active ? REGIONS[active.regionIdx].missions[active.missionIdx] : null

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.title}>🗺️ Pikselių kelionė</div>
        <div style={s.stats}>
          <div style={s.pill}>{avatar} {totalDone} / {totalMissions}</div>
          {totalDone === totalMissions && <div style={{ ...s.pill, background: '#BBF7D0', color: '#065F46' }}>🏆 BAIGTA</div>}
          {totalDone > 0 && <button onClick={resetProgress} style={s.resetBtn}>↺ Iš naujo</button>}
        </div>
      </div>

      {/* World map */}
      <div style={s.map}>
        {/* path connecting regions */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={s.pathSvg}>
          <path d={REGIONS.map((r, i) => `${i === 0 ? 'M' : 'L'} ${r.x} ${r.y}`).join(' ')}
                stroke="rgba(45,42,69,0.3)" strokeWidth="0.6" fill="none" strokeDasharray="2 2" />
        </svg>

        {REGIONS.map((r, idx) => {
          const unlocked = regionUnlocked(idx)
          const done = (progress.completed[r.id] || []).length
          const isComplete = done === r.missions.length
          return (
            <button
              key={r.id}
              onClick={() => unlocked && openMission(idx, done < r.missions.length ? done : 0)}
              style={{
                ...s.regionBtn,
                left: `${r.x}%`,
                top: `${r.y}%`,
                background: unlocked ? r.bg : '#94A3B8',
                opacity: unlocked ? 1 : 0.55,
                filter: unlocked ? 'none' : 'grayscale(0.6)',
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
            >
              <span style={s.regionEmoji}>{r.emoji}</span>
              <span style={s.regionName}>{r.name}</span>
              <span style={s.regionProgress}>
                {isComplete ? '✓ Baigta' : `${done}/${r.missions.length}`}
              </span>
              {!unlocked && <span style={s.lockIcon}>🔒</span>}
            </button>
          )
        })}

        {/* avatar tooltip showing position */}
        <div style={{
          ...s.avatar,
          left: `${REGIONS[Math.min(REGIONS.length - 1, Math.max(0, Math.floor(totalDone / 3)))].x}%`,
          top: `${REGIONS[Math.min(REGIONS.length - 1, Math.max(0, Math.floor(totalDone / 3)))].y - 10}%`,
        }}>{avatar}</div>
      </div>

      {/* Mission modal */}
      {active && (
        <div style={s.modalBack} onClick={(e) => e.target === e.currentTarget && setActive(null)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={{ fontSize: 24, marginRight: 8 }}>{activeRegion.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{activeRegion.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Užduotis {active.missionIdx + 1} / {activeRegion.missions.length}</div>
              </div>
              <button onClick={() => setActive(null)} style={s.closeBtn}>×</button>
            </div>

            <div style={s.missionText}>{activeMission.text}</div>

            {/* mission body by type */}
            {activeMission.type === 'click' && (
              <div style={s.clickArea}>
                <button onClick={() => { setClickCount(c => c + 1); beep(440 + Math.random() * 200, 0.04, 'triangle', 0.1) }} style={s.giantBtn}>
                  {activeMission.emoji}
                </button>
                <div style={{ marginTop: 12 }}>
                  Paspaudimai: <b>{clickCount}</b> / {activeMission.target}
                </div>
                <button onClick={submitMission} disabled={clickCount < activeMission.target} style={{
                  ...s.submitBtn,
                  opacity: clickCount >= activeMission.target ? 1 : 0.4,
                  cursor: clickCount >= activeMission.target ? 'pointer' : 'not-allowed',
                  marginTop: 14,
                }}>✓ Užbaigti</button>
              </div>
            )}

            {activeMission.type === 'pick' && (
              <div style={s.options}>
                {activeMission.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => i === activeMission.correct ? completeMission() : (beep(180, 0.12, 'square', 0.1), setFeedback('nope'), setTimeout(() => setFeedback(null), 500))}
                    style={s.optionBtn}
                  >{opt}</button>
                ))}
              </div>
            )}

            {(activeMission.type === 'math' || activeMission.type === 'count') && (
              <div>
                {activeMission.items && (
                  <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 14 }}>
                    {activeMission.items.join(' ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <div style={s.answerBox}>{input || '?'}</div>
                  <div style={s.pad}>
                    {[1,2,3,4,5,6,7,8,9,0].map(n => (
                      <button key={n} onClick={() => setInput(p => p.length < 2 ? p + n : p)} style={s.padBtn}>{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setInput(p => p.slice(0, -1))} style={{ ...s.submitBtn, background: '#FEE2E2', color: '#991B1B' }}>⌫</button>
                  <button onClick={submitMission} style={s.submitBtn}>✓ Tikrinti</button>
                </div>
              </div>
            )}

            {activeMission.type === 'order' && (
              <div>
                <div style={{ ...s.options, marginBottom: 14 }}>
                  {orderPick.map((l, i) => (
                    <span key={i} style={s.orderChip}>{l}</span>
                  ))}
                </div>
                <div style={s.options}>
                  {activeMission.letters.map((l, i) => {
                    const used = orderPick.includes(l)
                    return (
                      <button key={i} onClick={() => !used && setOrderPick([...orderPick, l])} disabled={used} style={{
                        ...s.optionBtn,
                        opacity: used ? 0.3 : 1,
                      }}>{l}</button>
                    )
                  })}
                </div>
                <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setOrderPick([])} style={{ ...s.submitBtn, background: '#FEE2E2', color: '#991B1B' }}>↺ Iš naujo</button>
                  <button onClick={submitMission} style={s.submitBtn}>✓ Tikrinti</button>
                </div>
              </div>
            )}

            {feedback && (
              <div style={{
                marginTop: 14, textAlign: 'center', fontWeight: 800,
                color: feedback === 'ok' ? 'var(--green-dark)' : 'var(--coral)',
              }}>
                {feedback === 'ok' ? '✓ Šaunuolis!' : '✗ Pabandyk dar kartą'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  pill: { background: 'white', padding: '6px 14px', borderRadius: 999, fontWeight: 800, color: 'var(--ink)', fontSize: 13, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  resetBtn: { background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 999, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  map: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2 / 1',
    background: 'linear-gradient(180deg,#C7E8FF 0%,#A6F0D8 60%,#FFF3DA 100%)',
    borderRadius: 18,
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 10px 24px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  pathSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  regionBtn: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: 'min(18vw, 110px)',
    aspectRatio: '1',
    border: 'none',
    borderRadius: 18,
    color: 'white',
    fontFamily: 'var(--font-heading)', fontWeight: 700,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(0,0,0,0.2)',
    padding: 6,
  },
  regionEmoji: { fontSize: 'min(7vw, 36px)' },
  regionName: { fontSize: 'min(2.5vw, 13px)', textShadow: '0 2px 4px rgba(0,0,0,0.4)', marginTop: 4 },
  regionProgress: { fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 999, marginTop: 4 },
  lockIcon: { position: 'absolute', top: 6, right: 6, fontSize: 14 },
  avatar: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    fontSize: 'min(6vw, 36px)',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
    pointerEvents: 'none',
    transition: 'left 0.5s, top 0.5s',
  },
  modalBack: {
    position: 'fixed', inset: 0, background: 'rgba(45,42,69,0.55)',
    backdropFilter: 'blur(6px)', zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: 'white', borderRadius: 24, padding: 22,
    width: '100%', maxWidth: 500,
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: { display: 'flex', alignItems: 'center', marginBottom: 16 },
  closeBtn: { background: 'transparent', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 },
  missionText: { fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 16, textAlign: 'center', lineHeight: 1.5 },
  clickArea: { textAlign: 'center' },
  giantBtn: {
    background: 'linear-gradient(135deg,#FFC845,#FF7A6B)', color: 'white',
    border: 'none', width: 140, height: 140, borderRadius: '50%',
    fontSize: 80, cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(255,200,69,0.5)',
  },
  submitBtn: {
    background: 'linear-gradient(135deg,#4FD1A5,#06D6A0)', color: 'white',
    border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 15,
  },
  options: { display: 'flex', flexDirection: 'column', gap: 8 },
  optionBtn: {
    background: 'linear-gradient(135deg,#6C63FF,#9B7BFF)', color: 'white',
    border: 'none', borderRadius: 12, padding: '14px 18px',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', textAlign: 'left',
  },
  answerBox: {
    width: 90, height: 80, borderRadius: 16,
    border: '4px solid var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, color: 'var(--ink)',
  },
  pad: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 },
  padBtn: { height: 38, borderRadius: 10, border: 'none', background: '#F1F5F9', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 0 rgba(0,0,0,0.08)' },
  orderChip: {
    background: 'linear-gradient(135deg,#FFC845,#FF7A6B)', color: 'white',
    padding: '8px 18px', borderRadius: 12,
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22,
    marginRight: 6,
  },
}
