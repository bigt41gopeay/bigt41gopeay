import { useState, useEffect, useRef, useCallback } from 'react'

// Lithuanian number names for speech synthesis
const NUMBER_NAMES = {
  1: 'vienas', 2: 'du', 3: 'trys', 4: 'keturi', 5: 'penki',
  6: 'šeši', 7: 'septyni', 8: 'aštuoni', 9: 'devyni', 10: 'dešimt'
}

// Lithuanian letter names for speech
const LETTER_NAMES = {
  'A':'a','Ą':'a nosinė','B':'bė','C':'cė','Č':'čė','D':'dė','E':'e','Ę':'e nosinė',
  'Ė':'ė','F':'fė','G':'gė','H':'hė','I':'i','Į':'i nosinė','Y':'ilgoji i','J':'jot',
  'K':'kė','L':'el','M':'em','N':'en','O':'o','P':'pė','R':'er','S':'es','Š':'eš',
  'T':'tė','U':'u','Ų':'u nosinė','Ū':'ilgoji u','V':'vė','Z':'zė','Ž':'žė'
}

const ALL_LETTERS = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')
const SIMPLE_LETTERS = 'ABCDEFGHIJKLMNOP'.split('') // easier for beginners

const NUMBER_LEVELS = [
  { id: 1, name: 'Iki 3', values: [1,2,3], count: 3, emoji: '🌱' },
  { id: 2, name: 'Iki 5', values: [1,2,3,4,5], count: 5, emoji: '⭐' },
  { id: 3, name: 'Iki 10', values: [1,2,3,4,5,6,7,8,9,10], count: 8, emoji: '🏆' },
]

const LETTER_LEVELS = [
  { id: 1, name: '4 raidės', values: ['A','B','C','D'], count: 4, emoji: '🌱' },
  { id: 2, name: '8 raidės', values: 'ABCDEFGH'.split(''), count: 6, emoji: '⭐' },
  { id: 3, name: 'Visos raidės', values: SIMPLE_LETTERS, count: 8, emoji: '🏆' },
  { id: 4, name: 'Lietuviškos', values: ALL_LETTERS, count: 8, emoji: '🇱🇹' },
]

const AREA_W = 600
const AREA_H = 400
const CAR_SIZE = 50
const NUMBER_SIZE = 60
const CAR_SPEED = 5

function speak(text) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'lt-LT'
    utter.rate = 0.9
    utter.pitch = 1.1
    window.speechSynthesis.speak(utter)
  } catch (e) {}
}

function nameFor(value, mode) {
  if (mode === 'letters') return LETTER_NAMES[value] || value
  return NUMBER_NAMES[value] || value
}

function placePieces(values, count) {
  const pool = [...values]
  const chosen = []
  const positions = []

  const pickCount = Math.min(count, pool.length)
  while (chosen.length < pickCount) {
    const idx = Math.floor(Math.random() * pool.length)
    chosen.push(pool.splice(idx, 1)[0])
  }

  for (let i = 0; i < chosen.length; i++) {
    const v = chosen[i]
    let x, y, tries = 0
    do {
      x = 60 + Math.random() * (AREA_W - 120)
      y = 60 + Math.random() * (AREA_H - 120)
      tries++
    } while (
      tries < 30 &&
      positions.some(p => Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80)
    )
    positions.push({ id: `${v}-${i}`, value: v, x, y, collected: false })
  }

  return positions
}

export default function CarGame({ onScore }) {
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState('numbers') // 'numbers' or 'letters'
  const [lvl, setLvl] = useState(1)
  const [car, setCar] = useState({ x: AREA_W / 2 - CAR_SIZE / 2, y: AREA_H - CAR_SIZE - 10, rotation: 0 })
  const [pieces, setPieces] = useState([])
  const [target, setTarget] = useState(null)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [particles, setParticles] = useState([])
  const [areaSize, setAreaSize] = useState({ w: AREA_W, h: AREA_H })

  const keysRef = useRef({})
  const carRef = useRef(car)
  const areaRef = useRef(null)

  useEffect(() => { carRef.current = car }, [car])

  const LEVELS = mode === 'letters' ? LETTER_LEVELS : NUMBER_LEVELS
  const cur = LEVELS[lvl - 1] || LEVELS[0]

  // Responsive area sizing
  useEffect(() => {
    const resize = () => {
      const el = areaRef.current
      if (!el) return
      const w = Math.min(AREA_W, el.clientWidth)
      const h = (w / AREA_W) * AREA_H
      setAreaSize({ w, h })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [screen])

  const newRound = useCallback(() => {
    const items = placePieces(cur.values, cur.count)
    setPieces(items)
    const tgt = items[Math.floor(Math.random() * items.length)].value
    setTarget(tgt)
    setCar({ x: AREA_W / 2 - CAR_SIZE / 2, y: AREA_H - CAR_SIZE - 10, rotation: 0 })
    const promptWord = mode === 'letters' ? 'Rask raidę' : 'Rask skaičių'
    setTimeout(() => speak(`${promptWord} ${nameFor(tgt, mode)}`), 300)
  }, [cur, mode])

  // Keyboard controls
  useEffect(() => {
    if (screen !== 'play') return

    const down = (e) => {
      const k = e.key
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(k)) {
        e.preventDefault()
        keysRef.current[k] = true
      }
    }
    const up = (e) => {
      keysRef.current[e.key] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [screen])

  // Game loop for movement
  useEffect(() => {
    if (screen !== 'play') return

    const loop = setInterval(() => {
      const keys = keysRef.current
      setCar(prev => {
        let { x, y, rotation } = prev
        let dx = 0, dy = 0

        if (keys.ArrowUp || keys.w || keys.W) dy -= CAR_SPEED
        if (keys.ArrowDown || keys.s || keys.S) dy += CAR_SPEED
        if (keys.ArrowLeft || keys.a || keys.A) dx -= CAR_SPEED
        if (keys.ArrowRight || keys.d || keys.D) dx += CAR_SPEED

        if (dx !== 0 && dy !== 0) {
          dx *= 0.707
          dy *= 0.707
        }

        if (dx !== 0 || dy !== 0) {
          rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90
        }

        x = Math.max(0, Math.min(AREA_W - CAR_SIZE, x + dx))
        y = Math.max(0, Math.min(AREA_H - CAR_SIZE, y + dy))

        return { x, y, rotation }
      })
    }, 30)

    return () => clearInterval(loop)
  }, [screen])

  // Collision detection
  useEffect(() => {
    if (screen !== 'play' || target === null) return

    const checkLoop = setInterval(() => {
      const c = carRef.current
      const carCenterX = c.x + CAR_SIZE / 2
      const carCenterY = c.y + CAR_SIZE / 2

      for (const p of pieces) {
        if (p.collected) continue
        const pCenterX = p.x + NUMBER_SIZE / 2
        const pCenterY = p.y + NUMBER_SIZE / 2
        const dist = Math.sqrt((carCenterX - pCenterX) ** 2 + (carCenterY - pCenterY) ** 2)

        if (dist < (CAR_SIZE + NUMBER_SIZE) / 2 - 10) {
          handleCollision(p)
          break
        }
      }
    }, 60)

    return () => clearInterval(checkLoop)
  }, [screen, pieces, target])

  const handleCollision = (piece) => {
    if (piece.value === target) {
      speak('Šauniai! ' + nameFor(piece.value, mode))
      setCorrect(c => c + 1)
      setScore(s => s + 10 + lvl * 5)
      setFeedback({ type: 'success', text: '🎉 Šauniai!', ts: Date.now() })

      const newParticles = []
      for (let i = 0; i < 12; i++) {
        newParticles.push({
          id: Date.now() + i,
          x: piece.x + NUMBER_SIZE / 2,
          y: piece.y + NUMBER_SIZE / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          emoji: ['⭐', '✨', '🎉', '💫'][Math.floor(Math.random() * 4)],
        })
      }
      setParticles(p => [...p, ...newParticles])

      setPieces(prev => prev.map(n => n.id === piece.id ? { ...n, collected: true } : n))

      setTimeout(() => {
        const nextCorrect = correct + 1
        if (nextCorrect >= 5 && lvl < LEVELS.length) {
          setLvl(l => l + 1)
          setCorrect(0)
          setTimeout(() => newRound(), 800)
        } else if (nextCorrect >= 10) {
          setScreen('over')
          onScore?.(score + 10 + lvl * 5)
        } else {
          newRound()
        }
      }, 1200)
    } else {
      const errorWord = mode === 'letters' ? 'raidė' : 'skaičius'
      speak('Ne tas. Bandyk dar!')
      setMistakes(m => m + 1)
      setFeedback({ type: 'error', text: `Ne! Tai ${piece.value}, ieškome ${target}`, ts: Date.now() })
      setPieces(prev => prev.map(n => n.id === piece.id ? { ...n, collected: true } : n))
      setTimeout(() => {
        setPieces(prev => prev.map(n => n.id === piece.id ? { ...n, collected: false } : n))
      }, 1500)
    }
  }

  // Particles animation
  useEffect(() => {
    if (particles.length === 0) return
    const iv = setInterval(() => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: (p.life || 0) + 1,
        })).filter(p => (p.life || 0) < 40)
        return updated
      })
    }, 30)
    return () => clearInterval(iv)
  }, [particles.length])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 2000)
    return () => clearTimeout(t)
  }, [feedback])

  const start = (chosenMode, l = 1) => {
    setMode(chosenMode)
    setLvl(l)
    setScore(0)
    setCorrect(0)
    setMistakes(0)
    setFeedback(null)
    setParticles([])
    setScreen('play')
    setTimeout(() => newRound(), 500)
  }

  const repeatTarget = () => {
    if (target !== null) {
      const promptWord = mode === 'letters' ? 'Rask raidę' : 'Rask skaičių'
      speak(`${promptWord} ${nameFor(target, mode)}`)
    }
  }

  const pressKey = (key, isDown) => {
    keysRef.current[key] = isDown
  }

  // ====== MENU ======
  if (screen === 'menu') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '5rem' }}>🚗</div>
        <h2 style={{ marginTop: '8px', fontSize: '1.6rem' }}>Mašinėlės medžioklė</h2>
        <p style={{ color: '#636E72', marginTop: '8px', maxWidth: '500px', margin: '8px auto 16px', fontSize: '0.95rem' }}>
          Išgirsk skaičių ar raidę ir važiuok mašinėle ant jos! Naudok rodyklių klavišus arba mygtukus ekrane.
        </p>

        {/* Mode selection */}
        <div style={{ maxWidth: '600px', margin: '24px auto 0' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Pasirink žaidimo tipą:</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
              color: 'white',
              boxShadow: '0 8px 25px rgba(108,99,255,0.3)',
            }}>
              <div style={{ fontSize: '3rem' }}>🔢</div>
              <h3 style={{ marginTop: '8px', color: 'white' }}>Skaičiai</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                Mokykis skaičių nuo 1 iki 10
              </p>
              <button onClick={() => start('numbers', 1)} style={{
                marginTop: '12px',
                padding: '10px 24px',
                borderRadius: '10px',
                background: 'white',
                color: '#6C63FF',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}>
                ▶️ Žaisti su skaičiais
              </button>
            </div>

            <div style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF6B35, #FFD166)',
              color: 'white',
              boxShadow: '0 8px 25px rgba(255,107,53,0.3)',
            }}>
              <div style={{ fontSize: '3rem' }}>🔤</div>
              <h3 style={{ marginTop: '8px', color: 'white' }}>Raidės</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                Mokykis lietuviško abėcėlės
              </p>
              <button onClick={() => start('letters', 1)} style={{
                marginTop: '12px',
                padding: '10px 24px',
                borderRadius: '10px',
                background: 'white',
                color: '#FF6B35',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}>
                ▶️ Žaisti su raidėmis
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px', marginTop: '20px', textAlign: 'left', maxWidth: '500px', margin: '20px auto 0' }}>
          <h4 style={{ marginBottom: '8px' }}>🎮 Kaip žaisti?</h4>
          <ul style={{ paddingLeft: '20px', color: '#636E72', lineHeight: 1.7, fontSize: '0.9rem' }}>
            <li>🔊 Išklausyk, ką sako</li>
            <li>⬅️⬆️⬇️➡️ Važiuok mašinėle ant jo</li>
            <li>Arba naudok mygtukus ekrane mobiliajam</li>
            <li>Jei nepameni – spausk 🔊 pakartoti</li>
            <li>Rink taškus per visus lygius!</li>
          </ul>
        </div>
      </div>
    )
  }

  // ====== GAME OVER ======
  if (screen === 'over') {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: '5rem' }}>🏆</div>
        <h2 style={{ marginTop: '8px' }}>Puiku! Žaidimas baigtas!</h2>
        <p style={{ color: '#636E72', marginTop: '4px' }}>
          {mode === 'letters' ? 'Raidės' : 'Skaičiai'} · Pasiektas lygis {lvl}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '360px', margin: '24px auto' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', color: 'white' }}>
            <div style={{ fontSize: '1.5rem' }}>🏆</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{score}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Taškai</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', color: 'white' }}>
            <div style={{ fontSize: '1.5rem' }}>✅</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{correct}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Rasta</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => start(mode, 1)} style={S.playBtn}>🔄 Dar kartą</button>
          <button onClick={() => setScreen('menu')} style={S.secBtn}>📋 Meniu</button>
        </div>
      </div>
    )
  }

  // ====== PLAYING ======
  const scale = areaSize.w / AREA_W
  const isLetter = mode === 'letters'

  return (
    <div>
      {/* Stats */}
      <div style={S.bar}>
        <span style={S.tag}>{isLetter ? '🔤' : '🔢'} Lygis {lvl}</span>
        <span style={S.tag}>🏆 {score}</span>
        <span style={S.tag}>✅ {correct}</span>
      </div>

      {/* Target */}
      <div style={S.targetBox}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#636E72', fontWeight: 700 }}>
            {isLetter ? 'Rask šią raidę:' : 'Rask šį skaičių:'}
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: isLetter ? '#FF6B35' : '#6C63FF', lineHeight: 1, marginTop: '4px' }}>
            {target}
          </div>
        </div>
        <button onClick={repeatTarget} style={S.speakBtn} aria-label="Pakartoti">
          🔊
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 28px',
          borderRadius: '14px',
          background: feedback.type === 'success' ? '#06D6A0' : '#FF6B8A',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 900,
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          zIndex: 100,
          animation: 'fadeInUp 0.3s',
          pointerEvents: 'none',
        }}>
          {feedback.text}
        </div>
      )}

      {/* Play area */}
      <div ref={areaRef} style={S.areaWrapper}>
        <div style={{
          position: 'relative',
          width: `${areaSize.w}px`,
          height: `${areaSize.h}px`,
          borderRadius: '14px',
          background: 'linear-gradient(180deg, #B8E6FF 0%, #87CEEB 40%, #90EE90 60%, #90EE90 100%)',
          border: `3px solid ${isLetter ? '#FF6B35' : '#6C63FF'}`,
          overflow: 'hidden',
          margin: '0 auto',
          touchAction: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'top left', width: `${AREA_W}px`, height: `${AREA_H}px` }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '30%', height: '2px', background: 'rgba(255,255,255,0.4)', borderTop: '2px dashed rgba(255,255,255,0.6)' }} />

            {/* Pieces (numbers or letters) */}
            {pieces.map(p => (
              <div key={p.id} style={{
                position: 'absolute',
                left: `${p.x}px`,
                top: `${p.y}px`,
                width: `${NUMBER_SIZE}px`,
                height: `${NUMBER_SIZE}px`,
                borderRadius: '50%',
                background: p.collected ? '#E8ECF1' : 'white',
                border: `4px solid ${p.value === target ? '#FFD166' : (isLetter ? '#FF6B35' : '#6C63FF')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isLetter && p.value.length > 1 ? '1.4rem' : '2rem',
                fontWeight: 900,
                color: p.collected ? '#B2BEC3' : '#2D3436',
                boxShadow: p.value === target ? '0 0 20px rgba(255, 209, 102, 0.8)' : '0 4px 12px rgba(0,0,0,0.15)',
                opacity: p.collected ? 0.3 : 1,
                transition: 'opacity 0.3s',
                animation: p.value === target && !p.collected ? 'pulse 1.5s infinite' : 'none',
              }}>
                {p.value}
              </div>
            ))}

            {/* Car */}
            <div style={{
              position: 'absolute',
              left: `${car.x}px`,
              top: `${car.y}px`,
              width: `${CAR_SIZE}px`,
              height: `${CAR_SIZE}px`,
              fontSize: `${CAR_SIZE * 0.9}px`,
              transform: `rotate(${car.rotation}deg)`,
              transition: 'transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}>
              🚗
            </div>

            {/* Particles */}
            {particles.map(p => (
              <div key={p.id} style={{
                position: 'absolute',
                left: `${p.x}px`,
                top: `${p.y}px`,
                fontSize: '1.5rem',
                pointerEvents: 'none',
                opacity: 1 - ((p.life || 0) / 40),
              }}>
                {p.emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* D-Pad controls */}
      <div style={S.dpad}>
        <div />
        <button
          onTouchStart={(e) => { e.preventDefault(); pressKey('ArrowUp', true) }}
          onTouchEnd={(e) => { e.preventDefault(); pressKey('ArrowUp', false) }}
          onMouseDown={(e) => { e.preventDefault(); pressKey('ArrowUp', true) }}
          onMouseUp={(e) => { e.preventDefault(); pressKey('ArrowUp', false) }}
          onMouseLeave={() => pressKey('ArrowUp', false)}
          style={S.dpadBtn}
        >⬆️</button>
        <div />
        <button
          onTouchStart={(e) => { e.preventDefault(); pressKey('ArrowLeft', true) }}
          onTouchEnd={(e) => { e.preventDefault(); pressKey('ArrowLeft', false) }}
          onMouseDown={(e) => { e.preventDefault(); pressKey('ArrowLeft', true) }}
          onMouseUp={(e) => { e.preventDefault(); pressKey('ArrowLeft', false) }}
          onMouseLeave={() => pressKey('ArrowLeft', false)}
          style={S.dpadBtn}
        >⬅️</button>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#636E72', alignSelf: 'center' }}>
          Važiuok!
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); pressKey('ArrowRight', true) }}
          onTouchEnd={(e) => { e.preventDefault(); pressKey('ArrowRight', false) }}
          onMouseDown={(e) => { e.preventDefault(); pressKey('ArrowRight', true) }}
          onMouseUp={(e) => { e.preventDefault(); pressKey('ArrowRight', false) }}
          onMouseLeave={() => pressKey('ArrowRight', false)}
          style={S.dpadBtn}
        >➡️</button>
        <div />
        <button
          onTouchStart={(e) => { e.preventDefault(); pressKey('ArrowDown', true) }}
          onTouchEnd={(e) => { e.preventDefault(); pressKey('ArrowDown', false) }}
          onMouseDown={(e) => { e.preventDefault(); pressKey('ArrowDown', true) }}
          onMouseUp={(e) => { e.preventDefault(); pressKey('ArrowDown', false) }}
          onMouseLeave={() => pressKey('ArrowDown', false)}
          style={S.dpadBtn}
        >⬇️</button>
        <div />
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button onClick={() => { setScreen('over'); onScore?.(score) }} style={S.secBtn}>⏹ Baigti</button>
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
    fontSize: '1.1rem',
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
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#F9FAFB',
    marginBottom: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#2D3436',
  },
  targetBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FFD16622, #FF6B3522)',
    border: '2px solid #FFD16666',
    marginBottom: '10px',
  },
  speakBtn: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #FFD166, #FF6B35)',
    fontSize: '1.8rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 15px rgba(255,107,53,0.3)',
  },
  areaWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  dpad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    maxWidth: '280px',
    margin: '0 auto',
  },
  dpadBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    fontSize: '2rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
}
