import { useEffect, useRef, useState, useCallback } from 'react'

// Dėmesio testas — Go/No-Go užduotis.
// Inspiracija: ambarmishraa/ADHD-Detection-Game (originalas buvo paprastas
// šokinėjimo žaidimas, čia padarytas tikras Go/No-Go reakcijos testas,
// kuris yra realiai naudojamas mokslinėse ADHD studijose).
//
// VARTOTOJUI TURI BŪTI AIŠKIAI MATOMA: TAI NĖRA MEDICININIS ĮRANKIS.

const STIM_DURATION = 700        // ms how long stimulus shown
const ISI_MIN = 600              // inter-stimulus interval
const ISI_MAX = 1200
const GO_PROBABILITY = 0.75
const TOTAL_TRIALS = 30

const COLORS = {
  go:    '#4FD1A5',
  nogo:  '#FF7A6B',
  blank: '#FFF9F0',
  ring:  '#6C63FF',
  ink:   '#2D2A45',
  muted: '#5C5872',
}

function randInt(min, max) { return Math.floor(min + Math.random() * (max - min)) }

export default function AttentionTestGame({ onScore }) {
  const [phase, setPhase] = useState('intro') // intro | running | results
  const [trialIdx, setTrialIdx] = useState(0)
  const [stimulus, setStimulus] = useState(null) // 'go' | 'nogo' | null
  const [results, setResults] = useState({
    hits: 0,            // pressed on Go (correct)
    misses: 0,          // didn't press on Go (inattention)
    falseAlarms: 0,     // pressed on NoGo (impulsivity)
    correctRejects: 0,  // didn't press on NoGo (correct)
    rts: [],            // reaction times of hits (ms)
  })
  const trialDataRef = useRef({ kind: null, shownAt: 0, responded: false })
  const stimTimerRef = useRef(null)
  const isiTimerRef = useRef(null)

  const reset = useCallback(() => {
    setTrialIdx(0)
    setStimulus(null)
    setResults({ hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, rts: [] })
    trialDataRef.current = { kind: null, shownAt: 0, responded: false }
  }, [])

  const finishTrial = useCallback(() => {
    // If user didn't respond by stimulus end, score it now
    const t = trialDataRef.current
    if (t.kind && !t.responded) {
      if (t.kind === 'go') {
        setResults(r => ({ ...r, misses: r.misses + 1 }))
      } else {
        setResults(r => ({ ...r, correctRejects: r.correctRejects + 1 }))
      }
    }
    setStimulus(null)
    trialDataRef.current.kind = null

    // Next ISI then next trial
    isiTimerRef.current = setTimeout(() => {
      setTrialIdx(i => i + 1)
    }, randInt(ISI_MIN, ISI_MAX))
  }, [])

  // Drive trial sequence
  useEffect(() => {
    if (phase !== 'running') return
    if (trialIdx >= TOTAL_TRIALS) {
      setPhase('results')
      return
    }
    const kind = Math.random() < GO_PROBABILITY ? 'go' : 'nogo'
    trialDataRef.current = { kind, shownAt: performance.now(), responded: false }
    setStimulus(kind)
    stimTimerRef.current = setTimeout(finishTrial, STIM_DURATION)
    return () => clearTimeout(stimTimerRef.current)
  }, [phase, trialIdx, finishTrial])

  // Handle key + click
  const respond = useCallback(() => {
    if (phase !== 'running') return
    const t = trialDataRef.current
    if (!t.kind || t.responded) return
    t.responded = true
    const rt = performance.now() - t.shownAt
    setResults(r => {
      if (t.kind === 'go') {
        return { ...r, hits: r.hits + 1, rts: [...r.rts, rt] }
      } else {
        return { ...r, falseAlarms: r.falseAlarms + 1 }
      }
    })
  }, [phase])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        respond()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [respond])

  useEffect(() => () => {
    clearTimeout(stimTimerRef.current)
    clearTimeout(isiTimerRef.current)
  }, [])

  // Final score bubble up
  useEffect(() => {
    if (phase === 'results') {
      const meanRT = results.rts.length ? Math.round(results.rts.reduce((a, b) => a + b, 0) / results.rts.length) : 0
      const totalGo = results.hits + results.misses
      const accuracy = totalGo > 0 ? Math.round((results.hits / totalGo) * 100) : 0
      const score = Math.max(0, results.hits * 10 - results.falseAlarms * 5 - results.misses * 3)
      onScore?.(score)
      console.log('[Dėmesio testas]', { meanRT, accuracy, score })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ---- screens ----
  if (phase === 'intro') {
    return (
      <div style={s.wrap}>
        <h3 style={s.title}>🧠 Dėmesio testas</h3>

        <div style={s.disclaimer}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800, color: '#92400E', marginBottom: 4 }}>
              Tai NĖRA medicininis įrankis
            </div>
            <div style={{ fontSize: 14, color: '#7C5A18', lineHeight: 1.5 }}>
              Šis žaidimas yra paremtas „Go/No-Go" užduotimi, kuri naudojama tyrimuose. Jis tinka tik
              SAVIŠVIETAI, ne diagnozei. ADHD įvertinti gali tik psichologas ar gydytojas.
            </div>
          </div>
        </div>

        <div style={s.intro}>
          <h4 style={{ marginBottom: 8, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20 }}>Kaip žaisti?</h4>
          <ul style={s.list}>
            <li>Ekrane pasirodys spalvotas apskritimas:</li>
            <li style={{ paddingLeft: 16, listStyle: 'none' }}>
              <span style={s.dotGo} /> <b>Žalias</b> – greitai spausk <b>TARPĄ</b> (arba bakstelėk)
            </li>
            <li style={{ paddingLeft: 16, listStyle: 'none' }}>
              <span style={s.dotNoGo} /> <b>Raudonas</b> – <b>NESPAUSK</b> nieko
            </li>
            <li>Iš viso {TOTAL_TRIALS} bandymų (~45 sek.)</li>
            <li>Po testo pamatysi:
              <ul style={{ paddingLeft: 20, marginTop: 4, color: 'var(--text-secondary)', fontSize: 14 }}>
                <li>kiek kartų teisingai sureagavai (dėmesys)</li>
                <li>kiek kartų klaidingai paspaudei (impulsyvumas)</li>
                <li>vidutinį reakcijos laiką</li>
              </ul>
            </li>
          </ul>
        </div>

        <button
          onClick={() => { reset(); setPhase('running') }}
          style={s.startBtn}
        >
          ▶ Pradėti testą
        </button>
      </div>
    )
  }

  if (phase === 'results') {
    const totalGo = results.hits + results.misses
    const totalNoGo = results.falseAlarms + results.correctRejects
    const meanRT = results.rts.length ? Math.round(results.rts.reduce((a, b) => a + b, 0) / results.rts.length) : 0
    const sdRT = (() => {
      if (results.rts.length < 2) return 0
      const m = meanRT
      const sq = results.rts.reduce((a, b) => a + (b - m) ** 2, 0)
      return Math.round(Math.sqrt(sq / results.rts.length))
    })()
    const accuracy = totalGo > 0 ? Math.round((results.hits / totalGo) * 100) : 0
    const inhibition = totalNoGo > 0 ? Math.round((results.correctRejects / totalNoGo) * 100) : 0

    return (
      <div style={s.wrap}>
        <h3 style={s.title}>📊 Tavo rezultatai</h3>

        <div style={s.statsGrid}>
          <StatCard label="Dėmesys (Go tikslumas)" value={`${accuracy}%`} hint={`${results.hits}/${totalGo} žalių`} color="#4FD1A5" />
          <StatCard label="Sustabdymas (NoGo tikslumas)" value={`${inhibition}%`} hint={`${results.correctRejects}/${totalNoGo} raudonų`} color="#6C63FF" />
          <StatCard label="Vidutinis reakcijos laikas" value={`${meanRT} ms`} hint={`tipinis vaikas: 400-700 ms`} color="#FFC845" />
          <StatCard label="Reakcijos pastovumas" value={`±${sdRT} ms`} hint={`mažesnis = pastovesnis`} color="#FF7A6B" />
        </div>

        <div style={s.disclaimer}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ fontSize: 14, color: '#7C5A18', lineHeight: 1.5 }}>
            <b>Šie rezultatai nieko nesako apie ADHD.</b> Vaikų reakcijos labai svyruoja
            priklausomai nuo nuotaikos, miego, aplinkos triukšmo. Tikslesnė informacija — ilgalaikiu
            stebėjimu su specialistu.
          </div>
        </div>

        <div style={s.actions}>
          <button onClick={() => { reset(); setPhase('running') }} style={s.startBtn}>🔄 Bandyti dar</button>
          <button onClick={() => { reset(); setPhase('intro') }} style={s.secondaryBtn}>← Pradžia</button>
        </div>
      </div>
    )
  }

  // running
  return (
    <div style={s.wrap}>
      <div style={s.runHeader}>
        <span style={s.trialCount}>{trialIdx + 1} / {TOTAL_TRIALS}</span>
        <span style={s.legend}>
          <span style={s.dotGo} /> spausk <span style={{ width: 16 }} /> <span style={s.dotNoGo} /> nespausk
        </span>
      </div>

      <button
        onClick={respond}
        onTouchStart={(e) => { e.preventDefault(); respond() }}
        style={{
          ...s.stage,
          background: stimulus === 'go' ? COLORS.go : stimulus === 'nogo' ? COLORS.nogo : COLORS.blank,
        }}
        aria-label="Žaidimo ekranas"
      >
        {stimulus ? (
          <div style={{ fontSize: 100, opacity: 0.9 }}>
            {stimulus === 'go' ? '⬤' : '⬛'}
          </div>
        ) : (
          <div style={{ color: COLORS.muted, fontSize: 18, fontWeight: 700 }}>+</div>
        )}
      </button>

      <div style={s.runStats}>
        <span>✓ {results.hits}</span>
        <span style={{ color: '#FF7A6B' }}>✗ {results.misses + results.falseAlarms}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 18, padding: 18,
      boxShadow: '0 8px 20px rgba(45,42,69,0.08)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 32, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{hint}</div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  title: {
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26,
    color: 'var(--ink)', marginBottom: 16, textAlign: 'center',
  },
  disclaimer: {
    display: 'flex', gap: 12,
    background: 'linear-gradient(135deg,#FFF3DA,#FFE3A3)',
    border: '1px solid rgba(255,200,69,0.4)',
    borderRadius: 16, padding: '14px 18px',
    marginBottom: 20,
  },
  intro: {
    background: 'white', borderRadius: 18, padding: 22,
    boxShadow: '0 8px 20px rgba(45,42,69,0.06)',
    marginBottom: 18,
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 10,
    fontSize: 15, color: '#3D3958', lineHeight: 1.5,
    paddingLeft: 18,
  },
  dotGo: {
    display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
    background: COLORS.go, verticalAlign: 'middle', marginRight: 6,
  },
  dotNoGo: {
    display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
    background: COLORS.nogo, verticalAlign: 'middle', marginRight: 6,
  },
  startBtn: {
    background: 'linear-gradient(135deg,#6C63FF,#9B7BFF)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 28px', fontSize: 17, fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    cursor: 'pointer', display: 'block', margin: '0 auto',
    boxShadow: '0 10px 24px rgba(108,99,255,0.4)',
  },
  secondaryBtn: {
    background: 'white', color: 'var(--ink)',
    border: '2px solid var(--border-strong)', borderRadius: 14,
    padding: '14px 22px', fontSize: 15, fontWeight: 700,
    fontFamily: 'var(--font-heading)', cursor: 'pointer',
  },
  actions: {
    display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6,
  },

  runHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, flexWrap: 'wrap', gap: 10,
  },
  trialCount: {
    background: 'white', padding: '6px 14px', borderRadius: 999,
    fontWeight: 800, color: 'var(--ink)', fontSize: 14,
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  legend: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'white', padding: '6px 14px', borderRadius: 999,
    fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
  },
  stage: {
    width: '100%', maxWidth: 420, aspectRatio: '1',
    margin: '0 auto', borderRadius: 28, border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none',
    transition: 'background 0.05s linear',
    boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.08)',
    fontFamily: 'inherit',
  },
  runStats: {
    display: 'flex', justifyContent: 'center', gap: 28,
    marginTop: 14, fontWeight: 800, color: '#22C55E', fontSize: 18,
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14, marginBottom: 18,
  },
}
