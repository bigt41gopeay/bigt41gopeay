import { useState, useEffect, useRef } from 'react'

const ALPHABET = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

const WORDS_2 = ['AŠ','JI','TU','AR','IR','NE','BE','UŽ','JO','KO','TO','JA']
const WORDS_3 = ['KAS','KAD','TAM','TAU','JAM','JAI','NUO','ANT','PAS','GAL','BET','VOS','JEI','DAR']
const WORDS_4 = ['MAMA','KATĖ','NAMAS','GĖLĖ','DUONA','PIENAS','OBUOLYS','VANDUO','MEDIS','SAULĖ']
const WORDS_LONG = ['DRAUGAS','MOKYKLA','ŽAIDIMAS','VAIKYSTĖ','VASARA','PAVASARIS','RUDUO','ŽIEMA','MUZIKA','LAIMĖ','ŠYPSENA','DRAUGYSTĖ']
const PHRASES = ['LABAS RYTAS','LABA DIENA','MAN LINKSMA','SAULĖ ŠVIEČIA','KATĖ MIEGA','GRAŽI DIENA','MYLIU TAVE','ŽYDRAS DANGUS']
const SENTENCES = ['AŠ MYLIU TĖVUS','VAIKAI ŽAIDŽIA','ŠIANDIEN GRAŽI DIENA','KNYGOS YRA ĮDOMIOS','SAULĖ ŠVIEČIA DANGUJE','MAMA GAMINA PIETUS']

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

const AREA_H = 460
const MAX_LIVES = 5

const DIACRITICS = { 'Ą':'A','Č':'C','Ę':'E','Ė':'E','Į':'I','Š':'S','Ų':'U','Ū':'U','Ž':'Z' }

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

  const idRef = useRef(0)
  const spawnRef = useRef(0)
  const itemsRef = useRef([])
  const lvlUpRef = useRef(false)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { lvlUpRef.current = lvlUp }, [lvlUp])

  const cur = LEVELS[lvl - 1]

  const norm = (ch) => {
    const u = ch.toUpperCase()
    return noDia ? (DIACRITICS[u] || u) : u
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
        return alive
      })
    }, 33)
    return () => clearInterval(iv)
  }, [screen, cur, t0])

  // Keyboard
  useEffect(() => {
    if (screen !== 'play') return
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      const k = norm(e.key)
      if (!/^[A-ZĄČĘĖĮŠŲŪŽ ]$/.test(k)) return
      e.preventDefault()

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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '4rem' }}>⌨️</div>
          <h2 style={{ marginTop: '8px' }}>Spartaus rašymo iššūkis</h2>
          <p style={{ color: '#636E72', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0' }}>
            Krentančios raidės ir žodžiai – spauskite juos ant klaviatūros kuo greičiau!
            Kuo toliau einate, tuo žodžiai ilgesni ir greitesni.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {LEVELS.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '10px', background: `${l.color}15` }}>
              <span style={{ fontSize: '1.3rem' }}>{l.emoji}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9rem' }}>{l.id}. {l.name}</strong>
                <span style={{ color: '#636E72', fontSize: '0.8rem', marginLeft: '8px' }}>{l.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 20px', background: '#F9FAFB', borderRadius: '12px', marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
            <input type="checkbox" checked={noDia} onChange={e => setNoDia(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Ignoruoti lietuviškas raides (Ą→A, Č→C, Š→S...)
          </label>
          <p style={{ fontSize: '0.8rem', color: '#B2BEC3', marginTop: '6px' }}>
            Įjunkite, jei neturite lietuviškos klaviatūros
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => start(1)} style={S.playBtn}>▶️ Pradėti žaidimą</button>
        </div>

        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: '12px', marginTop: '20px' }}>
          <h4 style={{ marginBottom: '8px' }}>📖 Kaip žaisti?</h4>
          <ul style={{ paddingLeft: '20px', color: '#636E72', lineHeight: 1.8, fontSize: '0.9rem' }}>
            <li>Raidės ir žodžiai krenta iš viršaus</li>
            <li>Spauskite atitinkamus klavišus ant klaviatūros</li>
            <li>Ilgesniems žodžiams – rašykite po vieną raidę iš eilės</li>
            <li>Jei raidė pasiekia apačią – prarandate gyvybę (❤️)</li>
            <li>5 prarastos gyvybės – žaidimas baigtas</li>
            <li>Kiekvieno lygio pabaigoje – naujas, sunkesnis iššūkis!</li>
          </ul>
        </div>
      </div>
    )
  }

  // ====== GAME OVER ======
  if (screen === 'over') {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: '4rem' }}>{lvl >= 7 ? '🏆' : '🎮'}</div>
        <h2 style={{ marginTop: '12px' }}>{lvl >= 7 ? 'Puiku! Rašymo meistras!' : 'Žaidimas baigtas!'}</h2>
        <p style={{ color: '#636E72', marginTop: '4px' }}>Pasiektas lygis: <strong>{lvl} – {cur.name}</strong></p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '420px', margin: '24px auto' }}>
          {[
            { icon: '🏆', val: score, lab: 'Taškai', bg: '#6C63FF' },
            { icon: '⚡', val: wpm, lab: 'WPM (žodžiai/min)', bg: '#06D6A0' },
            { icon: '🎯', val: `${acc}%`, lab: 'Tikslumas', bg: '#FF6B35' },
            { icon: '⌨️', val: correct, lab: 'Teisingos raidės', bg: '#FF6B8A' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: '14px', background: `linear-gradient(135deg, ${s.bg}, ${s.bg}CC)`, color: 'white' }}>
              <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{s.lab}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px', maxWidth: '350px', margin: '0 auto', fontSize: '0.9rem', color: '#636E72', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>⌨️ Iš viso paspaudimų: <strong>{typed}</strong></div>
          <div>⏱️ Laikas: <strong>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</strong></div>
          <div>❌ Praleista elementų: <strong>{missed}</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => start(1)} style={S.playBtn}>🔄 Žaisti dar kartą</button>
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
      {/* Stats */}
      <div style={S.bar}>
        <span style={S.tag}>📊 Lygis {lvl}: {cur.name}</span>
        <span style={S.tag}>🏆 {score}</span>
        <span style={S.tag}>⚡ {wpm} WPM</span>
        <span style={S.tag}>🎯 {acc}%</span>
        <span style={S.tag}>
          {'❤️'.repeat(Math.max(0, MAX_LIVES - missed))}
          {'🖤'.repeat(Math.min(MAX_LIVES, missed))}
        </span>
      </div>

      {/* Level progress */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#636E72', fontWeight: 700, marginBottom: '4px' }}>
          <span>Iki kito lygio: {done}/{cur.goal}</span>
          <span>{Math.round(prog)}%</span>
        </div>
        <div style={{ height: '8px', background: '#E8ECF1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog}%`, background: cur.color, transition: 'width 0.3s', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Play area */}
      <div style={{
        position: 'relative',
        height: `${AREA_H}px`,
        borderRadius: '16px',
        background: `linear-gradient(180deg, ${cur.color}22 0%, ${cur.color}44 100%)`,
        border: `2px solid ${cur.color}55`,
        overflow: 'hidden',
        transition: 'transform 0.1s, box-shadow 0.15s',
        transform: shake ? 'translateX(-4px)' : 'none',
        boxShadow: glow ? `0 0 30px ${cur.color}88` : '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {/* Danger zone */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px', background: 'rgba(255,107,138,0.25)', borderTop: '2px dashed rgba(255,107,138,0.5)' }}>
          <span style={{ position: 'absolute', right: '8px', top: '4px', fontSize: '0.7rem', color: '#FF6B8A', fontWeight: 800 }}>PAVOJAUS ZONA</span>
        </div>

        {/* Falling items */}
        {items.map(item => (
          <div key={item.id} style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}px`,
            transform: 'translateX(-50%)',
            padding: item.text.length > 5 ? '10px 18px' : '12px 24px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(6px)',
            border: '2px solid rgba(255,255,255,0.4)',
            fontSize: item.text.length > 8 ? '1.2rem' : item.text.length > 4 ? '1.5rem' : '2rem',
            fontWeight: 900,
            fontFamily: 'var(--font)',
            whiteSpace: 'nowrap',
            letterSpacing: '3px',
            transition: 'none',
          }}>
            <span style={{ color: '#06D6A0', textShadow: '0 0 8px rgba(6,214,160,0.6)' }}>
              {item.text.slice(0, item.at)}
            </span>
            <span style={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {item.text.slice(item.at)}
            </span>
          </div>
        ))}

        {/* Next expected char */}
        {items.length > 0 && (() => {
          const sorted = [...items].sort((a, b) => b.y - a.y)
          const nearest = sorted[0]
          const nextCh = nearest.text[nearest.at]
          return nextCh ? (
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 20px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.9)',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: cur.color,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            }}>
              Spauskite: <span style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>{nextCh}</span>
            </div>
          ) : null
        })()}

        {/* Level up overlay */}
        {lvlUp && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInUp 0.3s',
          }}>
            <div style={{ fontSize: '4rem' }}>🎉</div>
            <div style={{ fontSize: '2rem', color: 'white', fontWeight: 900, marginTop: '8px' }}>
              Lygis {lvl + 1}!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: '8px', fontSize: '1.1rem' }}>
              {LEVELS[lvl]?.emoji} {LEVELS[lvl]?.name}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <div style={{ marginTop: '14px', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,209,102,0.1)', fontSize: '0.85rem', color: '#636E72', textAlign: 'center' }}>
        💡 {cur.desc} – spauskite raides kuo greičiau, kol jos nenukrito!
        {noDia && ' (Lietuviškos raidės ignoruojamos)'}
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button onClick={() => { setScreen('over'); onScore?.(score) }} style={S.secBtn}>⏹ Baigti žaidimą</button>
      </div>
    </div>
  )
}

const S = {
  playBtn: {
    padding: '16px 32px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.05rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
  },
  secBtn: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: '#F5F5F5',
    border: '2px solid #E8ECF1',
    color: '#636E72',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    borderRadius: '12px',
    background: '#F9FAFB',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#2D3436',
  },
}
