import { useState, useEffect, useRef } from 'react'

const ALPHABET = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

const WORDS_2 = ['AŠ','JI','TU','AR','IR','NE','BE','UŽ','JO','KO','TO','JA']
const WORDS_3 = ['KAS','KAD','TAM','TAU','JAM','JAI','NUO','ANT','PAS','GAL','BET','VOS','JEI','DAR']
const WORDS_4 = ['MAMA','KATĖ','NAMAS','GĖLĖ','DUONA','PIENAS','VANDUO','MEDIS','SAULĖ']
const WORDS_LONG = ['DRAUGAS','MOKYKLA','ŽAIDIMAS','VAIKYSTĖ','VASARA','PAVASARIS','RUDUO','ŽIEMA','MUZIKA','LAIMĖ','ŠYPSENA']
const PHRASES = ['LABAS RYTAS','LABA DIENA','MAN LINKSMA','SAULĖ ŠVIEČIA','KATĖ MIEGA','GRAŽI DIENA','MYLIU TAVE']
const SENTENCES = ['AŠ MYLIU TĖVUS','VAIKAI ŽAIDŽIA','ŠIANDIEN GRAŽI DIENA','KNYGOS YRA ĮDOMIOS','MAMA GAMINA PIETUS']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const LEVELS = [
  { id: 1, name: 'Raidės', emoji: '🅰️', desc: 'Vienos raidės', color: '#6C63FF', gen: () => pick(ALPHABET), speed: 0.6, rate: 2000, goal: 15, max: 3 },
  { id: 2, name: '2 raidžių žodžiai', emoji: '📝', desc: 'Trumpiausi žodžiai', color: '#06D6A0', gen: () => pick(WORDS_2), speed: 0.7, rate: 2500, goal: 12, max: 3 },
  { id: 3, name: '3 raidžių žodžiai', emoji: '📄', desc: 'Trumpi žodžiai', color: '#FFD166', gen: () => pick(WORDS_3), speed: 0.8, rate: 3000, goal: 10, max: 3 },
  { id: 4, name: 'Vidutiniai žodžiai', emoji: '📚', desc: '4-6 raidžių žodžiai', color: '#FF6B8A', gen: () => pick(WORDS_4), speed: 0.9, rate: 3500, goal: 10, max: 2 },
  { id: 5, name: 'Ilgi žodžiai', emoji: '📖', desc: 'Sudėtingi žodžiai', color: '#9B5DE5', gen: () => pick(WORDS_LONG), speed: 1.0, rate: 4500, goal: 8, max: 2 },
  { id: 6, name: 'Žodžių junginiai', emoji: '📜', desc: 'Du žodžiai', color: '#4CC9F0', gen: () => pick(PHRASES), speed: 0.7, rate: 6000, goal: 6, max: 1 },
  { id: 7, name: 'Sakiniai', emoji: '📰', desc: 'Pilni sakiniai', color: '#FF6B35', gen: () => pick(SENTENCES), speed: 0.6, rate: 8000, goal: 5, max: 1 },
]

const AREA_H = 320
const MAX_LIVES = 5
const DIACRITICS = { 'Ą':'A','Č':'C','Ę':'E','Ė':'E','Į':'I','Š':'S','Ų':'U','Ū':'U','Ž':'Z' }

// Lithuanian keyboard rows for on-screen keyboard
const KB_ROWS = [
  ['Ą','Č','Ę','Ė','Į','Š','Ų','Ū','Ž'],
  ['A','B','C','D','E','F','G','H','I','J'],
  ['K','L','M','N','O','P','R','S','T','U'],
  ['V','Y','Z',' '],
]

export default function TypingGame({ onScore }) {
  const [screen, setScreen] = useState('menu')
  const [lvl, setLvl] = useState(1)
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [typed, setTyped] = useState(0)
  const [missed, setMissed] = useState(0)
  const [done, setDone] = useState(0)
  const [t0, setT0] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [noDia, setNoDia] = useState(false)
  const [lvlUp, setLvlUp] = useState(false)
  const [flash, setFlash] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [nextExpected, setNextExpected] = useState('')

  const idRef = useRef(0)
  const spawnRef = useRef(0)
  const itemsRef = useRef([])
  const lvlUpRef = useRef(false)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { lvlUpRef.current = lvlUp }, [lvlUp])

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const cur = LEVELS[lvl - 1]

  const norm = (ch) => {
    const u = ch.toUpperCase()
    return noDia ? (DIACRITICS[u] || u) : u
  }

  // Core function to handle a key press (used by both physical keyboard and on-screen)
  const handleKeyPress = (key) => {
    const k = norm(key)
    if (!/^[A-ZĄČĘĖĮŠŲŪŽ ]$/.test(k)) return

    setTyped(t => t + 1)
    const ci = itemsRef.current
    const matches = ci.filter(i => {
      const next = i.text[i.at]
      return next && norm(next) === k
    })

    if (matches.length === 0) {
      setFlash({ t: 'miss', ts: Date.now() })
      return
    }

    matches.sort((a, b) => (b.at !== a.at) ? b.at - a.at : b.y - a.y)
    const tgt = matches[0]
    setCorrect(c => c + 1)
    setFlash({ t: 'hit', ts: Date.now() })

    if (tgt.at + 1 >= tgt.text.length) {
      const pts = tgt.text.replace(/ /g, '').length * 10 + lvl * 5
      setScore(s => s + pts)
      setDone(d => d + 1)
      setItems(prev => prev.filter(i => i.id !== tgt.id))
    } else {
      setItems(prev => prev.map(i => i.id === tgt.id ? { ...i, at: i.at + 1 } : i))
    }
  }

  // Game loop
  useEffect(() => {
    if (screen !== 'play') return
    const iv = setInterval(() => {
      const now = Date.now()
      setElapsed(Math.floor((now - (t0 || now)) / 1000))

      setItems(prev => {
        const moved = prev.map(i => ({ ...i, y: i.y + i.speed }))
        const alive = []
        let drop = 0
        for (const i of moved) {
          if (i.y >= AREA_H) drop++
          else alive.push(i)
        }
        if (drop > 0) setMissed(m => m + drop)

        if (!lvlUpRef.current && alive.length < cur.max && now - spawnRef.current > cur.rate) {
          idRef.current++
          alive.push({
            id: idRef.current,
            text: cur.gen(),
            at: 0,
            x: 8 + Math.random() * 75,
            y: -10,
            speed: cur.speed,
          })
          spawnRef.current = now
        }

        // Update next expected character
        if (alive.length > 0) {
          const sorted = [...alive].sort((a, b) => b.y - a.y)
          const n = sorted[0]?.text[sorted[0]?.at] || ''
          setNextExpected(n)
        } else {
          setNextExpected('')
        }

        return alive
      })
    }, 33)
    return () => clearInterval(iv)
  }, [screen, cur, t0])

  // Physical keyboard handler (desktop)
  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      e.preventDefault()
      handleKeyPress(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, noDia, lvl])

  // Level up
  useEffect(() => {
    if (screen !== 'play' || lvlUp) return
    if (done > 0 && done >= cur.goal && lvl < LEVELS.length) {
      setLvlUp(true)
      setTimeout(() => {
        setLvl(l => l + 1)
        setDone(0)
        setItems([])
        setLvlUp(false)
      }, 2000)
    }
  }, [done, screen, cur.goal, lvl, lvlUp])

  // Game over
  useEffect(() => {
    if (screen === 'play' && missed >= MAX_LIVES) {
      setScreen('over')
      onScore?.(score)
    }
  }, [missed, screen, score, onScore])

  const wpm = elapsed > 0 ? Math.round(((correct / 5) / elapsed) * 60) : 0
  const acc = typed > 0 ? Math.round((correct / typed) * 100) : 100

  const start = (l = 1) => {
    setLvl(l); setItems([]); setScore(0); setCorrect(0); setTyped(0)
    setMissed(0); setDone(0); setT0(Date.now()); setElapsed(0)
    idRef.current = 0; spawnRef.current = Date.now() - 500
    setLvlUp(false); setScreen('play')
  }

  // ====== MENU ======
  if (screen === 'menu') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '3.5rem' }}>⌨️</div>
          <h2 style={{ marginTop: '8px', fontSize: '1.5rem' }}>Spartaus rašymo iššūkis</h2>
          <p style={{ color: '#636E72', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0', fontSize: '0.9rem' }}>
            Krentančios raidės ir žodžiai – {isMobile ? 'spauskite ant ekrano klaviatūros' : 'spauskite ant klaviatūros'}!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
          {LEVELS.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderRadius: '10px', background: `${l.color}15` }}>
              <span style={{ fontSize: '1.1rem' }}>{l.emoji}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.85rem' }}>{l.id}. {l.name}</strong>
                <span style={{ color: '#636E72', fontSize: '0.75rem', marginLeft: '8px' }}>{l.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {!isMobile && (
          <div style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={noDia} onChange={e => setNoDia(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              Ignoruoti lietuviškas raides (Ą→A, Č→C...)
            </label>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => start(1)} style={S.playBtn}>▶️ Pradėti žaidimą</button>
        </div>

        <div style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: '10px', marginTop: '16px' }}>
          <h4 style={{ marginBottom: '6px', fontSize: '0.95rem' }}>📖 Kaip žaisti?</h4>
          <ul style={{ paddingLeft: '18px', color: '#636E72', lineHeight: 1.7, fontSize: '0.85rem' }}>
            <li>Raidės ir žodžiai krenta iš viršaus</li>
            {isMobile
              ? <li><strong>Spauskite raides ant ekrano klaviatūros apačioje</strong></li>
              : <li>Spauskite atitinkamus klavišus ant klaviatūros</li>
            }
            <li>Jei raidė pasiekia apačią – prarandate gyvybę (❤️)</li>
            <li>5 prarastos gyvybės – žaidimas baigtas</li>
          </ul>
        </div>
      </div>
    )
  }

  // ====== GAME OVER ======
  if (screen === 'over') {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: '3.5rem' }}>{lvl >= 7 ? '🏆' : '🎮'}</div>
        <h2 style={{ marginTop: '8px', fontSize: '1.4rem' }}>{lvl >= 7 ? 'Rašymo meistras!' : 'Žaidimas baigtas!'}</h2>
        <p style={{ color: '#636E72', marginTop: '4px', fontSize: '0.9rem' }}>Lygis: <strong>{lvl} – {cur.name}</strong></p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '360px', margin: '20px auto' }}>
          {[
            { icon: '🏆', val: score, lab: 'Taškai', bg: '#6C63FF' },
            { icon: '⚡', val: wpm, lab: 'WPM', bg: '#06D6A0' },
            { icon: '🎯', val: `${acc}%`, lab: 'Tikslumas', bg: '#FF6B35' },
            { icon: '⌨️', val: correct, lab: 'Teisingos', bg: '#FF6B8A' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '16px', borderRadius: '12px', background: `linear-gradient(135deg, ${s.bg}, ${s.bg}CC)`, color: 'white' }}>
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{s.lab}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => start(1)} style={S.playBtn}>🔄 Dar kartą</button>
          <button onClick={() => setScreen('menu')} style={S.secBtn}>📋 Meniu</button>
        </div>
      </div>
    )
  }

  // ====== PLAYING ======
  const shake = flash?.t === 'miss' && Date.now() - flash.ts < 200
  const glow = flash?.t === 'hit' && Date.now() - flash.ts < 150
  const prog = Math.min(100, (done / cur.goal) * 100)

  return (
    <div>
      {/* Compact stats */}
      <div style={S.bar}>
        <span style={S.tag}>Lv.{lvl}</span>
        <span style={S.tag}>🏆{score}</span>
        <span style={S.tag}>⚡{wpm}</span>
        <span style={S.tag}>🎯{acc}%</span>
        <span style={S.tag}>
          {'❤️'.repeat(Math.max(0, MAX_LIVES - missed))}
          {'🖤'.repeat(Math.min(MAX_LIVES, missed))}
        </span>
      </div>

      {/* Level progress */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ height: '6px', background: '#E8ECF1', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog}%`, background: cur.color, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Play area */}
      <div style={{
        position: 'relative',
        height: `${AREA_H}px`,
        borderRadius: '14px',
        background: `linear-gradient(180deg, ${cur.color}22 0%, ${cur.color}44 100%)`,
        border: `2px solid ${cur.color}55`,
        overflow: 'hidden',
        transition: 'transform 0.1s, box-shadow 0.15s',
        transform: shake ? 'translateX(-4px)' : 'none',
        boxShadow: glow ? `0 0 20px ${cur.color}88` : 'none',
        touchAction: 'none',
      }}>
        {/* Danger zone */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: 'rgba(255,107,138,0.25)', borderTop: '2px dashed rgba(255,107,138,0.5)' }} />

        {/* Falling items */}
        {items.map(item => (
          <div key={item.id} style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}px`,
            transform: 'translateX(-50%)',
            padding: item.text.length > 5 ? '6px 12px' : '8px 16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            border: '2px solid rgba(255,255,255,0.4)',
            fontSize: item.text.length > 8 ? '0.9rem' : item.text.length > 4 ? '1.1rem' : '1.4rem',
            fontWeight: 900,
            fontFamily: 'var(--font)',
            whiteSpace: 'nowrap',
            letterSpacing: '2px',
          }}>
            <span style={{ color: '#06D6A0', textShadow: '0 0 6px rgba(6,214,160,0.6)' }}>
              {item.text.slice(0, item.at)}
            </span>
            <span style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {item.text.slice(item.at)}
            </span>
          </div>
        ))}

        {/* Level up overlay */}
        {lvlUp && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: 900, marginTop: '8px' }}>
              Lygis {lvl + 1}!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
              {LEVELS[lvl]?.emoji} {LEVELS[lvl]?.name}
            </div>
          </div>
        )}
      </div>

      {/* On-screen keyboard (always visible, works on both mobile and desktop) */}
      <div style={S.keyboard}>
        {/* Show next expected character prominently */}
        {nextExpected && (
          <div style={S.nextChar}>
            Spauskite: <span style={{ fontSize: '1.3rem', color: cur.color }}>{nextExpected === ' ' ? '␣' : nextExpected}</span>
          </div>
        )}

        {KB_ROWS.map((row, ri) => (
          <div key={ri} style={S.kbRow}>
            {row.map((key) => {
              const isNext = nextExpected && norm(nextExpected) === norm(key)
              const isSpace = key === ' '
              return (
                <button
                  key={key}
                  onTouchStart={(e) => { e.preventDefault(); handleKeyPress(key) }}
                  onMouseDown={(e) => { e.preventDefault(); handleKeyPress(key) }}
                  style={{
                    ...S.kbKey,
                    ...(isSpace ? S.kbSpace : {}),
                    ...(isNext ? S.kbKeyActive : {}),
                    ...(DIACRITICS[key] ? S.kbKeyDia : {}),
                  }}
                >
                  {isSpace ? 'TARPAS' : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Quit */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <button onClick={() => { setScreen('over'); onScore?.(score) }} style={S.secBtn}>⏹ Baigti</button>
      </div>
    </div>
  )
}

const S = {
  playBtn: {
    padding: '14px 28px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
  },
  secBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    background: '#F5F5F5',
    border: '2px solid #E8ECF1',
    color: '#636E72',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '10px',
    background: '#F9FAFB',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '0.8rem',
    fontWeight: 800,
    color: '#2D3436',
  },
  keyboard: {
    marginTop: '10px',
    padding: '10px',
    background: '#2D3436',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  nextChar: {
    textAlign: 'center',
    padding: '6px',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#B2BEC3',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '4px',
  },
  kbRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
  },
  kbKey: {
    minWidth: '30px',
    height: '42px',
    borderRadius: '8px',
    border: 'none',
    background: '#4A4D52',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 800,
    fontFamily: 'var(--font)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    transition: 'background 0.1s, transform 0.1s',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  kbKeyActive: {
    background: '#6C63FF',
    transform: 'scale(1.15)',
    boxShadow: '0 0 12px rgba(108,99,255,0.6)',
  },
  kbKeyDia: {
    background: '#5A4E8A',
    fontSize: '0.8rem',
  },
  kbSpace: {
    minWidth: '120px',
    flex: 1,
    fontSize: '0.7rem',
    letterSpacing: '2px',
    background: '#3A3D42',
  },
}
