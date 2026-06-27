import { useCallback, useEffect, useRef, useState } from 'react'

// 🎵 Muzikos kambariukas — virtualus pianinas su lietuviškomis natų pavadinimais.
// Du režimai:
//   Laisva — vaikas spaudžia natas ir kuria melodiją (irgi įrašo ką paspaudė)
//   Pakartok — kompiuteris paleidžia trumpą melodiją, vaikas pakartoja.

const NOTES = [
  { id: 'C',  name: 'Do', freq: 261.63, color: '#FF7A6B' },
  { id: 'D',  name: 'Re', freq: 293.66, color: '#FF9F43' },
  { id: 'E',  name: 'Mi', freq: 329.63, color: '#FFC845' },
  { id: 'F',  name: 'Fa', freq: 349.23, color: '#4FD1A5' },
  { id: 'G',  name: 'Sol', freq: 392.00, color: '#4CC9F0' },
  { id: 'A',  name: 'La', freq: 440.00, color: '#6C63FF' },
  { id: 'B',  name: 'Si', freq: 493.88, color: '#9B5DE5' },
  { id: 'C2', name: 'Do²', freq: 523.25, color: '#FF7A6B' },
]

const KEY_MAP = { a: 'C', s: 'D', d: 'E', f: 'F', g: 'G', h: 'A', j: 'B', k: 'C2' }

const MELODIES = [
  { name: 'Du gaideliai', notes: ['C','C','G','G','A','A','G'] },
  { name: 'Lia lia lia', notes: ['E','D','C','D','E','E','E'] },
  { name: 'Žvaigždutė', notes: ['C','C','G','G','A','A','G','F','F','E','E','D','D','C'] },
  { name: 'Pelytė', notes: ['G','E','E','F','D','D','C','D','E','F','G','G','G'] },
]

export default function MusicRoomGame({ onScore }) {
  const [mode, setMode] = useState('free') // free | repeat
  const [activeNote, setActiveNote] = useState(null)
  const [recorded, setRecorded] = useState([]) // free mode log
  const [melodyIdx, setMelodyIdx] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | playing | listening | result
  const [position, setPosition] = useState(0)
  const [matched, setMatched] = useState([])
  const audioRef = useRef(null)
  const seqTimerRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioRef.current = new Ctx()
    }
    return audioRef.current
  }, [])

  const playNote = useCallback((noteId, duration = 0.45) => {
    const ctx = ensureAudio(); if (!ctx) return
    const note = NOTES.find(n => n.id === noteId); if (!note) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = note.freq
    g.gain.value = 0.0001
    g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + duration + 0.01)
  }, [ensureAudio])

  const press = useCallback((noteId) => {
    setActiveNote(noteId)
    setTimeout(() => setActiveNote(null), 220)
    playNote(noteId)
    if (mode === 'free') {
      setRecorded(prev => [...prev, noteId].slice(-32))
    } else if (mode === 'repeat' && phase === 'listening') {
      const melody = MELODIES[melodyIdx]
      if (melody.notes[position] === noteId) {
        const newMatched = [...matched, noteId]
        setMatched(newMatched)
        if (newMatched.length === melody.notes.length) {
          setPhase('result')
          onScore?.(10 * melody.notes.length)
        } else {
          setPosition(p => p + 1)
        }
      } else {
        // wrong note: restart from beginning of this melody
        setMatched([])
        setPosition(0)
        setTimeout(() => playMelody(melody.notes), 400)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, melodyIdx, position, matched, playNote])

  const playMelody = useCallback((notes) => {
    setPhase('playing')
    let i = 0
    const step = () => {
      if (i >= notes.length) {
        setPhase('listening')
        setPosition(0)
        setMatched([])
        return
      }
      setActiveNote(notes[i])
      playNote(notes[i], 0.35)
      seqTimerRef.current = setTimeout(() => {
        setActiveNote(null)
        seqTimerRef.current = setTimeout(() => { i++; step() }, 120)
      }, 380)
    }
    step()
  }, [playNote])

  const startRepeat = (idx) => {
    setMelodyIdx(idx)
    setMatched([])
    setPosition(0)
    setTimeout(() => playMelody(MELODIES[idx].notes), 250)
  }

  useEffect(() => () => clearTimeout(seqTimerRef.current), [])

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      if (KEY_MAP[k]) {
        e.preventDefault()
        press(KEY_MAP[k])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  return (
    <div style={s.wrap}>
      <div style={s.topRow}>
        <div style={s.title}>🎵 Muzikos kambariukas</div>
        <div style={s.tabRow}>
          <button
            onClick={() => { setMode('free'); setPhase('idle'); setRecorded([]) }}
            style={{
              ...s.tab,
              background: mode === 'free' ? 'linear-gradient(135deg,#6C63FF,#9B7BFF)' : 'white',
              color: mode === 'free' ? 'white' : 'var(--ink)',
            }}
          >🎹 Laisva</button>
          <button
            onClick={() => { setMode('repeat'); setPhase('idle'); setMatched([]) }}
            style={{
              ...s.tab,
              background: mode === 'repeat' ? 'linear-gradient(135deg,#FF7A6B,#FFC845)' : 'white',
              color: mode === 'repeat' ? 'white' : 'var(--ink)',
            }}
          >🎯 Pakartok melodiją</button>
        </div>
      </div>

      {mode === 'repeat' && phase === 'idle' && (
        <div style={s.melodyList}>
          <h4 style={s.subTitle}>Pasirink melodiją:</h4>
          <div style={s.melodyGrid}>
            {MELODIES.map((m, i) => (
              <button key={i} onClick={() => startRepeat(i)} style={s.melodyBtn}>
                🎶 {m.name}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.notes.length} natų</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'repeat' && phase === 'playing' && (
        <div style={s.statusBox}>👂 Klausyk… {MELODIES[melodyIdx].name}</div>
      )}

      {mode === 'repeat' && phase === 'listening' && (
        <div style={s.statusBox}>
          🎹 Pakartok! ({matched.length} / {MELODIES[melodyIdx].notes.length})
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${(matched.length / MELODIES[melodyIdx].notes.length) * 100}%` }} />
          </div>
        </div>
      )}

      {mode === 'repeat' && phase === 'result' && (
        <div style={{ ...s.statusBox, background: 'linear-gradient(135deg,#BBF7D0,#4FD1A5)', color: 'white' }}>
          🎉 Šaunuolis! „{MELODIES[melodyIdx].name}" baigta!
          <button onClick={() => setPhase('idle')} style={s.smallBtn}>← Kita melodija</button>
        </div>
      )}

      <div style={s.piano}>
        {NOTES.map(n => (
          <button
            key={n.id}
            onClick={() => press(n.id)}
            disabled={mode === 'repeat' && phase === 'playing'}
            style={{
              ...s.key,
              background: activeNote === n.id ? n.color : `linear-gradient(180deg, white, ${n.color}22)`,
              borderColor: n.color,
              color: activeNote === n.id ? 'white' : 'var(--ink)',
              transform: activeNote === n.id ? 'translateY(4px)' : 'translateY(0)',
              boxShadow: activeNote === n.id ? `0 0 18px ${n.color}, 0 2px 4px rgba(0,0,0,0.15)` : `0 6px 0 ${n.color}, 0 8px 16px rgba(0,0,0,0.12)`,
            }}
          >
            <span style={s.noteName}>{n.name}</span>
            <span style={s.noteHint}>{Object.entries(KEY_MAP).find(([, v]) => v === n.id)?.[0].toUpperCase()}</span>
          </button>
        ))}
      </div>

      {mode === 'free' && recorded.length > 0 && (
        <div style={s.recorded}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>Tavo melodija:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {recorded.map((id, i) => {
              const n = NOTES.find(x => x.id === id)
              return (
                <span key={i} style={{
                  background: n.color, color: 'white',
                  padding: '4px 8px', borderRadius: 8,
                  fontWeight: 700, fontSize: 12,
                }}>{n.name}</span>
              )
            })}
            <button onClick={() => {
              recorded.forEach((id, i) => setTimeout(() => playNote(id), i * 350))
            }} style={s.smallBtn}>▶ Paleisti</button>
            <button onClick={() => setRecorded([])} style={{ ...s.smallBtn, background: '#FEE2E2', color: '#991B1B' }}>🗑</button>
          </div>
        </div>
      )}

      <div style={s.help}>
        Klaviatūra: <b>A S D F G H J K</b> — Do Re Mi Fa Sol La Si Do²
      </div>
    </div>
  )
}

const s = {
  wrap: { padding: 4 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  title: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' },
  tabRow: { display: 'flex', gap: 8 },
  tab: {
    border: '1px solid var(--border-strong)', borderRadius: 12,
    padding: '8px 14px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'var(--font-heading)',
    boxShadow: '0 3px 0 rgba(0,0,0,0.05)',
  },
  subTitle: { fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 14 },
  melodyList: { background: 'white', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-card)', marginBottom: 14 },
  melodyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  melodyBtn: {
    background: 'linear-gradient(135deg,#FFF3DA,#FFC845)', color: 'var(--ink)',
    border: 'none', borderRadius: 14, padding: 16, cursor: 'pointer',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 6px 14px rgba(255,200,69,0.3)',
  },
  statusBox: {
    background: 'linear-gradient(135deg,#EFEBFF,#FFF3DA)',
    borderRadius: 14, padding: 14,
    textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-heading)',
    fontSize: 16, color: 'var(--ink)', marginBottom: 14,
  },
  progressBar: {
    height: 8, background: 'rgba(255,255,255,0.5)',
    borderRadius: 4, overflow: 'hidden', marginTop: 8,
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg,#4FD1A5,#06D6A0)',
    transition: 'width 0.25s',
  },
  piano: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 6,
    maxWidth: 560,
    margin: '0 auto 16px',
  },
  key: {
    aspectRatio: '0.55',
    minHeight: 140,
    border: '3px solid',
    borderRadius: 12,
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    transition: 'transform 0.08s, box-shadow 0.08s, background 0.1s, color 0.1s',
  },
  noteName: { fontSize: 18 },
  noteHint: { fontSize: 11, opacity: 0.6, fontWeight: 800 },
  recorded: {
    background: 'white', borderRadius: 14, padding: 14,
    boxShadow: 'var(--shadow-card)', marginBottom: 14,
  },
  smallBtn: {
    background: 'var(--primary)', color: 'white', border: 'none',
    borderRadius: 10, padding: '6px 14px', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8,
  },
  help: {
    textAlign: 'center', fontSize: 13,
    color: 'var(--text-secondary)', fontWeight: 600,
  },
}
