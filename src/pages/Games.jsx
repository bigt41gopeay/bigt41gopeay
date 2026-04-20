import { useState } from 'react'
import MemoryGame from '../games/MemoryGame'
import MathGame from '../games/MathGame'
import WordGame from '../games/WordGame'
import ColorGame from '../games/ColorGame'
import TypingGame from '../games/TypingGame'
import DriveGame from '../games/DriveGame'

const GAME_LIST = [
  { id: 'typing', emoji: '⌨️', title: 'Spartaus rašymo iššūkis', desc: 'Krentančios raidės ir žodžiai – spauskite juos ant klaviatūros! 7 lygiai nuo raidžių iki sakinių.', type: 'Klaviatūra', age: '6-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #9B5DE5, #6C63FF)', badge: 'Naujas!', players: '800+ žaidžia' },
  { id: 'driveLetters', emoji: '🚗', title: 'Raidžių medžioklė', desc: 'Išgirsk raidę ir rodyklėmis ⬅ ⬆ ⬇ ➡ nuvažiuok iki jos! Mokomės abėcėlės žaidžiant.', type: 'Abėcėlė', age: '4-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FFB86B, #FF6B8A)', badge: 'Mažyliams', players: 'Nauja!' },
  { id: 'driveNumbers', emoji: '🔢', title: 'Skaičių medžioklė', desc: 'Išgirsk skaičių ir rodyklėmis ⬅ ⬆ ⬇ ➡ pervažiuok per jį! Mokomės skaitmenų.', type: 'Skaičiai', age: '4-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)', badge: 'Mažyliams', players: 'Nauja!' },
  { id: 'memory', emoji: '🧩', title: 'Atminties iššūkis', desc: 'Atversk korteles ir surask poras! Lavina atmintį ir dėmesingumą.', type: 'Atmintis', age: '4-8 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)', badge: 'Nemokamas', players: '2.5k žaidžia' },
  { id: 'math', emoji: '🔢', title: 'Matematikos burtininkas', desc: 'Spręsk matematinius uždavinius ir tapk tikru skaičių meistru!', type: 'Matematika', age: '6-10 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)', badge: 'Populiarus', players: '1.8k žaidžia' },
  { id: 'word', emoji: '📝', title: 'Žodžių dėlionė', desc: 'Sudėliok raides ir surask paslėptą žodį! Mokykis naujų žodžių.', type: 'Kalbos', age: '7-12 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', badge: 'Naujas', players: '1.2k žaidžia' },
  { id: 'color', emoji: '🎨', title: 'Spalvų maišytuvas', desc: 'Atspėk spalvas ir mokykis jas maišyti! Kūrybinis ir linksmas žaidimas.', type: 'Kūrybiškumas', age: '3-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)', badge: 'Mažyliams', players: '3.1k žaidžia' },
]

const DriveLettersGame = (props) => <DriveGame mode="letters" {...props} />
const DriveNumbersGame = (props) => <DriveGame mode="numbers" {...props} />

const GAME_COMPONENTS = {
  typing: TypingGame,
  driveLetters: DriveLettersGame,
  driveNumbers: DriveNumbersGame,
  memory: MemoryGame,
  math: MathGame,
  word: WordGame,
  color: ColorGame,
}

export default function Games() {
  const [activeGame, setActiveGame] = useState(null)
  const [scores, setScores] = useState({})

  const handleScore = (gameId, score) => {
    setScores(prev => ({
      ...prev,
      [gameId]: Math.max(prev[gameId] || 0, score)
    }))
  }

  if (activeGame) {
    const GameComponent = GAME_COMPONENTS[activeGame]
    const gameInfo = GAME_LIST.find(g => g.id === activeGame)

    return (
      <div className="section">
        <div className="container">
          <button onClick={() => setActiveGame(null)} style={styles.backBtn}>
            ← Grįžti į žaidimus
          </button>
          <div style={styles.gameHeader}>
            <span style={{ fontSize: '2.5rem' }}>{gameInfo.emoji}</span>
            <div>
              <h2>{gameInfo.title}</h2>
              <p style={{ color: '#636E72' }}>{gameInfo.desc}</p>
            </div>
          </div>
          <div style={styles.gameContainer}>
            <GameComponent onScore={(score) => handleScore(activeGame, score)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <div style={styles.header}>
          <h1 style={{ fontSize: '2.5rem' }}>🎮 Lavinamieji žaidimai</h1>
          <p style={{ color: '#636E72', marginTop: '8px', fontSize: '1.1rem' }}>
            Mokymasis per žaidimą – geriausias būdas augti ir tobulėti!
          </p>
        </div>

        {/* Score overview */}
        {Object.keys(scores).length > 0 && (
          <div style={styles.scoreBar}>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <span style={{ fontWeight: 800 }}>Tavo rekordai:</span>
            {Object.entries(scores).map(([gameId, score]) => {
              const game = GAME_LIST.find(g => g.id === gameId)
              return (
                <span key={gameId} style={styles.scoreItem}>
                  {game.emoji} {score} tšk.
                </span>
              )
            })}
          </div>
        )}

        {/* Games Grid */}
        <div className="grid-2">
          {GAME_LIST.map(game => (
            <div key={game.id} className="card" style={styles.gameCard}>
              <div style={{ ...styles.gameCover, background: game.bg }}>
                <span style={{ fontSize: '4rem' }}>{game.emoji}</span>
                <div style={styles.gameCoverInfo}>
                  <span style={styles.gameType}>{game.type}</span>
                  <span style={styles.gamePlayers}>👥 {game.players}</span>
                </div>
              </div>
              <div style={styles.gameInfo}>
                <div style={styles.gameInfoHeader}>
                  <h3>{game.title}</h3>
                  {game.badge && <span className="badge badge-free">{game.badge}</span>}
                </div>
                <p style={styles.gameDesc}>{game.desc}</p>
                <div style={styles.gameMeta}>
                  <span style={styles.metaItem}>📅 {game.age}</span>
                  <span style={styles.metaItem}>📊 {game.difficulty}</span>
                  {scores[game.id] && (
                    <span style={styles.metaScore}>🏆 Rekordas: {scores[game.id]}</span>
                  )}
                </div>
                <button
                  onClick={() => setActiveGame(game.id)}
                  style={{ ...styles.playBtn, background: game.bg }}
                >
                  ▶️ Žaisti dabar!
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info section */}
        <div style={styles.infoSection}>
          <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>🌟 Žaidimų nauda</h3>
          <div className="grid-4">
            {[
              { icon: '🧠', title: 'Loginis mąstymas', desc: 'Stiprina problemų sprendimo įgūdžius' },
              { icon: '💡', title: 'Kūrybiškumas', desc: 'Skatina kūrybinį mąstymą' },
              { icon: '🎯', title: 'Dėmesingumas', desc: 'Lavina susikaupimą ir koncentraciją' },
              { icon: '🤝', title: 'Socialiniai įgūdžiai', desc: 'Moko bendradarbiavimo ir kantrybės' },
            ].map((item, i) => (
              <div key={i} style={styles.infoCard}>
                <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                <h4>{item.title}</h4>
                <p style={{ color: '#636E72', fontSize: '0.85rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  header: {
    marginBottom: '32px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginBottom: '24px',
  },
  gameHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  gameContainer: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    minHeight: '400px',
  },
  scoreBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(255, 107, 138, 0.05))',
    border: '2px solid rgba(108, 99, 255, 0.1)',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  scoreItem: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#6C63FF',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  },
  gameCard: {
    borderRadius: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  gameCover: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: '16px',
  },
  gameCoverInfo: {
    display: 'flex',
    gap: '12px',
  },
  gameType: {
    color: 'white',
    fontWeight: 700,
    fontSize: '0.8rem',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.2)',
  },
  gamePlayers: {
    color: 'white',
    fontWeight: 700,
    fontSize: '0.8rem',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.2)',
  },
  gameInfo: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  gameInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  gameDesc: {
    color: '#636E72',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  gameMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#636E72',
  },
  metaScore: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#6C63FF',
  },
  playBtn: {
    padding: '14px 28px',
    borderRadius: '14px',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginTop: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    transition: 'all 0.3s ease',
  },
  infoSection: {
    marginTop: '64px',
    padding: '48px',
    background: 'rgba(108, 99, 255, 0.03)',
    borderRadius: '24px',
  },
  infoCard: {
    textAlign: 'center',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
}
