import { useCallback, useEffect, useRef, useState } from 'react'

// 🔠 Šifras — paprastas kriptogrammas. Trumpas lietuviškas posakis užšifruotas
// pakeitimo šifru (kiekviena raidė atstoja kitą). Vaikas atspėja raidžių
// poras, kol perskaito visą posakį. Lavina logiką ir paciento dėmesį.

const PHRASES = [
  'MAMA MYLI MANE',
  'SAULĖ ŠVIEČIA',
  'KATĖ MIEGA',
  'AŠ MYLIU KNYGAS',
  'DRAUGAI YRA GERAI',
  'AUGINK SAVO DRĄSĄ',
  'PAVASARIS YRA GRAŽUS',
  'MOKAUSI KASDIEN',
  'LIETUVA YRA GRAŽI',
]

const ALPHABET = 'AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ'.split('')

function makeCipher() {
  // simple substitution: shuffle alphabet
  const shuffled = [...ALPHABET]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // make sure none maps to itself (force at least one swap)
  for (let i = 0; i < ALPHABET.length; i++) {
    if (shuffled[i] === ALPHABET[i]) {
      const swapWith = (i + 1) % ALPHABET.length
      ;[shuffled[i], shuffled[swapWith]] = [shuffled[swapWith], shuffled[i]]
    }
  }
  const map = {}
  for (let i = 0; i < ALPHABET.length; i++) map[ALPHABET[i]] = shuffled[i]
  return map
}

export default function CryptogramGame({ onScore }) {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [cipher, setCipher] = useState(() => makeCipher())
  const [guesses, setGuesses] = useState({}) // encrypted letter -> guessed plain
  const [selectedCipher, setSelectedCipher] = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [errors, setErrors] = useState(0)
  const [won, setWon] = useState(false)
  const audioRef = useRef(null)

  const phrase = PHRASES[phraseIdx]
  // encrypted text
  const encrypted = phrase.split('').map(ch => ch === ' ' ? ' ' : cipher[ch] || ch).join('')

  // unique encrypted letters in this phrase (excluding spaces)
  const uniqueLetters = [...new Set(encrypted.replace(/ /g, '').split(''))]

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

  const newPuzzle = () => {
    setPhraseIdx(p => (p + 1) % PHRASES.length)
    setCipher(makeCipher())
    setGuesses({})
    setSelectedCipher(null)
    setHintsUsed(0)
    setErrors(0)
    setWon(false)
  }

  // check victory
  useEffect(() => {
    if (uniqueLetters.length === 0) return
    const allFilled = uniqueLetters.every(l => guesses[l] !== undefined)
    if (!allFilled || won) return
    // verify all correct
    const correct = uniqueLetters.every(enc => {
      const plain = Object.entries(cipher).find(([, v]) => v === enc)?.[0]
      return guesses[enc] === plain
    })
    if (correct) {
      setWon(true)
      const score = Math.max(0, 100 - hintsUsed * 10 - errors * 3)
      onScore?.(score)
      beep(660, 0.12, 'triangle', 0.2)
      setTimeout(() => beep(990, 0.14, 'triangle', 0.2), 100)
      setTimeout(() => beep(1320, 0.18, 'triangle', 0.2), 220)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses])

  const guessLetter = (plainLetter) => {
    if (!selectedCipher || won) return
    const correctPlain = Object.entries(cipher).find(([, v]) => v === selectedCipher)?.[0]
    if (plainLetter === correctPlain) {
      setGuesses(prev => ({ ...prev, [selectedCipher]: plainLetter }))
      beep(660, 0.08, 'triangle', 0.16)
    } else {
      setErrors(e => e + 1)
      beep(180, 0.12, 'square', 0.1)
    }
    setSelectedCipher(null)
  }

  const useHint = () => {
    if (won) return
    const unguessed = uniqueLetters.filter(l => guesses[l] === undefined)
    if (unguessed.length === 0) return
    const enc = unguessed[Math.floor(Math.random() * unguessed.length)]
    const plain = Object.entries(cipher).find(([, v]) => v === enc)?.[0]
    setGuesses(prev => ({ ...prev, [enc]: plain }))
    setHintsUsed(h => h + 1)
    beep(540, 0.1, 'triangle', 0.14)
  }

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.title}>🔠 Šifras</div>
        <div style={s.stats}>
          <div style={s.pill}>💡 Užuominos: {hintsUsed}</div>
          <div style={s.pill}>❌ {errors}</div>
        </div>
      </div>

      <div style={s.intro}>
        Atspėk slaptą posakį! Kiekviena raidė pakeista kita. Spustelėk slaptą raidę, tada pasirink, kuri tikra raidė atitinka.
      </div>

      <div style={s.puzzle}>
        {phrase.split('').map((origCh, i) => {
          if (origCh === ' ') return <div key={i} style={s.space} />
          const enc = cipher[origCh]
          const guessed = guesses[enc]
          const isSelected = selectedCipher === enc
          return (
            <button
              key={i}
              onClick={() => !guessed && setSelectedCipher(enc)}
              disabled={!!guessed}
              style={{
                ...s.letterBox,
                background: guessed ? '#BBF7D0' : isSelected ? '#FEF3C7' : 'white',
                borderColor: isSelected ? 'var(--primary)' : '#E2E8F0',
                outline: isSelected ? '3px solid var(--primary)' : 'none',
              }}
            >
              <span style={s.guessedLetter}>{guessed || '?'}</span>
              <span style={s.cipherLetter}>{enc}</span>
            </button>
          )
        })}
      </div>

      {selectedCipher && !won && (
        <div style={s.alphabetBox}>
          <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>
            Slaptoji raidė <b style={{ color: 'var(--primary)', fontSize: 18 }}>{selectedCipher}</b> — kuri tikra raidė tai yra?
          </div>
          <div style={s.alphabetGrid}>
            {ALPHABET.map(l => {
              const usedAs = Object.values(guesses).includes(l)
              return (
                <button
                  key={l}
                  onClick={() => guessLetter(l)}
                  disabled={usedAs}
                  style={{
                    ...s.alphabetBtn,
                    opacity: usedAs ? 0.3 : 1,
                  }}
                >{l}</button>
              )
            })}
          </div>
        </div>
      )}

      {won && (
        <div style={s.winBox}>
          🎉 Atspėjai! „{phrase}"
          <div style={{ fontSize: 14, marginTop: 6, color: 'var(--text-muted)' }}>
            Klaidos: {errors} · Užuominos: {hintsUsed}
          </div>
          <button onClick={newPuzzle} style={s.actionBtn}>➡ Kitas šifras</button>
        </div>
      )}

      {!won && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
          <button onClick={useHint} style={s.hintBtn}>💡 Užuomina (-10 tšk.)</button>
          <button onClick={newPuzzle} style={s.skipBtn}>⏭ Praleisti</button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: { background: 'white', padding: '6px 14px', borderRadius: 999, fontWeight: 700, color: 'var(--ink)', fontSize: 13, boxShadow: '0 3px 0 rgba(0,0,0,0.08)' },
  intro: {
    background: 'white', borderRadius: 16, padding: 14,
    boxShadow: 'var(--shadow-card)', marginBottom: 16,
    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center',
  },
  puzzle: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', padding: 16,
    background: 'linear-gradient(180deg,#EFEBFF,#FFF3DA)',
    borderRadius: 16, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  space: { width: 18, height: 60 },
  letterBox: {
    width: 42, height: 60,
    background: 'white',
    border: '2px solid #E2E8F0',
    borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, border-color 0.15s',
  },
  guessedLetter: {
    fontFamily: 'var(--font-heading)', fontWeight: 700,
    fontSize: 20, color: 'var(--ink)',
  },
  cipherLetter: {
    fontSize: 11, fontWeight: 800, color: 'var(--primary)',
    borderTop: '1px dashed rgba(108,99,255,0.3)',
    width: '60%', textAlign: 'center', paddingTop: 2,
  },
  alphabetBox: {
    background: 'white', borderRadius: 16, padding: 14,
    boxShadow: 'var(--shadow-card)', marginBottom: 14,
  },
  alphabetGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 6,
  },
  alphabetBtn: {
    aspectRatio: '1',
    border: 'none', borderRadius: 8,
    background: 'linear-gradient(135deg,#6C63FF,#9B7BFF)',
    color: 'white', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16,
    cursor: 'pointer',
    boxShadow: '0 3px 0 rgba(0,0,0,0.1)',
  },
  hintBtn: {
    background: 'linear-gradient(135deg,#FFC845,#FF7A6B)', color: 'white',
    border: 'none', borderRadius: 12, padding: '10px 18px',
    fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
  skipBtn: {
    background: 'white', color: 'var(--ink)',
    border: '2px solid var(--border-strong)', borderRadius: 12,
    padding: '10px 18px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
  winBox: {
    background: 'linear-gradient(135deg,#BBF7D0,#4FD1A5)',
    color: 'white', borderRadius: 16, padding: 18,
    fontWeight: 800, textAlign: 'center', marginTop: 10,
    fontFamily: 'var(--font-heading)', fontSize: 18,
  },
  actionBtn: {
    display: 'block', margin: '12px auto 0',
    background: 'white', color: 'var(--ink)',
    border: 'none', borderRadius: 12, padding: '10px 22px',
    fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  },
}
