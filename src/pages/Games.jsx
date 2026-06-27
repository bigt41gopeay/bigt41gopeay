import { useState, useRef, useEffect } from 'react'
import { recordProgress } from '../lib/childSession'
import MemoryGame from '../games/MemoryGame'
import MathGame from '../games/MathGame'
import WordGame from '../games/WordGame'
import ColorGame from '../games/ColorGame'
import TypingGame from '../games/TypingGame'
import DriveGame from '../games/DriveGame'
import FingerGame from '../games/FingerGame'
import SpellGame from '../games/SpellGame'
import MathStoryGame from '../games/MathStoryGame'
import WorldGame from '../games/WorldGame'
import NeuroPlanetGame from '../games/NeuroPlanetGame'
import FlapBirdGame from '../games/FlapBirdGame'
import AttentionTestGame from '../games/AttentionTestGame'
import WordSearchGame from '../games/WordSearchGame'
import ColorMemoryGame from '../games/ColorMemoryGame'
import NumberRushGame from '../games/NumberRushGame'
import CastleDefenseGame from '../games/CastleDefenseGame'
import SnakesLaddersGame from '../games/SnakesLaddersGame'
import MusicRoomGame from '../games/MusicRoomGame'
import MazeGame from '../games/MazeGame'
import StroopTestGame from '../games/StroopTestGame'
import SchulteTableGame from '../games/SchulteTableGame'
import CryptogramGame from '../games/CryptogramGame'
import KidsSudokuGame from '../games/KidsSudokuGame'
import PixelPathGame from '../games/PixelPathGame'
import TrafficSafetyGame from '../games/TrafficSafetyGame'
import ArchaeologyGame from '../games/ArchaeologyGame'

const GAME_LIST = [
  { id: 'neuroplanet', emoji: '🪐', title: 'NeuroPlaneta', desc: 'Trijų lygių ADHD draugiškas kelionė kosmose: raidės ir garsai, skiemenų dėlionė, atminties planeta. Lygiai atrakinami iš eilės.', type: 'Visapusiškas', age: '5-10 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #1e1b4b, #6C63FF)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'flapbird', emoji: '🐦', title: 'Paukštelio nuotykiai', desc: 'Pavedk paukštelį tarp vamzdžių spausdamas Tarpą arba bakstelėjęs ekraną. Trumpos ADHD draugiškos sesijos, lavina reakciją ir susikaupimą.', type: 'Reakcija', age: '5-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FFC845, #FF7A6B)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'attentionTest', emoji: '🧠', title: 'Dėmesio testas (Go/No-Go)', desc: 'Žalias = spausk, raudonas = nespausk. Mokslinė „Go/No-Go" užduotis lavina dėmesį ir impulsų sustabdymą. NĖRA medicininis įrankis — tik savišvietai.', type: 'Dėmesys', age: '7-12 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #4FD1A5, #6C63FF)', badge: 'Mokslinis', players: 'Nauja!' },
  { id: 'wordSearch', emoji: '🔍', title: 'Žodžių paieška', desc: 'Tempk per raides ir surask paslėptus lietuviškus žodžius. 4 temos (gyvūnai, gamta, šeima, maistas), 8 paieškos kryptys. Lavina vokabulą ir dėmesį.', type: 'Kalbos', age: '6-12 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'colorMemory', emoji: '🎨', title: 'Spalvų atmintis', desc: 'Klasikinis „Simon Says" stiliaus atminties žaidimas. Pakartok spalvų seką, kuri ilgėja kiekvieną raundą. Lavina sekvencinę atmintį.', type: 'Atmintis', age: '5-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FFC845, #FF7A6B)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'numberRush', emoji: '⚡', title: 'Skaičių sprintas', desc: 'Per 60 sek. atsakyk į kuo daugiau matematikos uždavinių. Sunkumas didėja, eilėje teisingi atsakymai duoda bonus.', type: 'Matematika', age: '6-12 m.', difficulty: 'Greitas', bg: 'linear-gradient(135deg, #FF7A6B, #FFC845)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'castle', emoji: '🏰', title: 'Pilies gynyba', desc: 'Pabaisos artėja iš dešinės! Paspausk jas ir teisingai išspręsk matematikos uždavinį, kad sustabdytum. Bangos vis greitėja.', type: 'Matematika + reakcija', age: '6-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FF7A6B, #9B5DE5)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'snakes', emoji: '🪜', title: 'Gyvatukai ir kopėtėlės', desc: 'Klasikinė žaidimo lenta su matematikos klausimais. Rita kauliuką, spręsk uždavinį ir lipk aukštyn iki 30 langelio.', type: 'Stalo žaidimas + matematika', age: '6-10 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #4FD1A5, #6C63FF)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'music', emoji: '🎵', title: 'Muzikos kambariukas', desc: '8 natų pianinas (Do-Si-Do²) su klaviatūros palaikymu. Du režimai: laisvai kurk melodiją arba pakartok pateiktą.', type: 'Muzika', age: '4-12 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #6C63FF, #FF7A6B)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'maze', emoji: '🗺️', title: 'Labirintai', desc: 'Automatiškai sugeneruoti labirintai, 10 lygių (5×5 iki 23×23). Pasiek 🏁 finišą rodyklėmis arba braukimu. Lavina erdvinę orientaciją.', type: 'Loginis', age: '5-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #EFEBFF, #FFC845)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'stroop', emoji: '🎨', title: 'Stroop testas', desc: 'Klasikinis vykdomųjų funkcijų testas. Žodis sako vieną spalvą, bet parašyta kita — paspausk parašymo spalvą, ne pavadinimą.', type: 'Smegenų lavinimas', age: '7-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #9B5DE5, #FF7A6B)', badge: 'Mokslinis', players: 'Nauja!' },
  { id: 'schulte', emoji: '🔢', title: 'Schulte lentelė', desc: 'Klasikinis dėmesio treniruoklis. Surask skaičius 1, 2, 3… iš eilės atsitiktinai išmėtytame tinklelyje. 3 dydžiai: 3×3, 4×4, 5×5.', type: 'Smegenų lavinimas', age: '6-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #6C63FF, #4FD1A5)', badge: 'Mokslinis', players: 'Nauja!' },
  { id: 'cryptogram', emoji: '🔠', title: 'Šifras', desc: 'Atspėk lietuvišką posakį, kuris paslėptas pakeitimo šifru. Spustelėk slaptą raidę, pasirink tikrąją. Lavina logiką ir pacientiškumą.', type: 'Loginis', age: '8-12 m.', difficulty: 'Sudėtingas', bg: 'linear-gradient(135deg, #4CC9F0, #9B5DE5)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'sudoku', emoji: '🔢', title: 'Sudoku vaikams', desc: 'Trys lygiai: 4×4 (lengva), 6×6 (vidutinis), 9×9 (klasika). Užpildyk tinklelį skaičiais — kiekvienas neturi kartotis eilutėje, stulpelyje ir bloke.', type: 'Loginis', age: '7-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FFC845, #4FD1A5)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'pixelPath', emoji: '🗺️', title: 'Pikselių kelionė', desc: 'ADHD draugiškas nuotykių žemėlapis: 5 vietovės (namai, mokykla, biblioteka, aikštelė, pilis), 15 mini-užduočių. Personažas evoliucionuoja, progresas saugomas.', type: 'Nuotykis + edukacija', age: '5-10 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FFC845, #4CC9F0)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'traffic', emoji: '🚦', title: 'Saugus eismas', desc: 'Stebėk šviesoforą ir nuspręsk: eiti ar stovėti. Mokomės gatvės taisyklių žaisdami — žalia, raudona, geltona.', type: 'Saugumas', age: '4-9 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FF7A6B, #4FD1A5)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'archaeology', emoji: '🏺', title: 'Archeologo iššūkis', desc: 'Iškask senovinius radinius (puodus, monetas, brangakmenius) nesulaužant. Trys įrankiai — kuo saugesnis, tuo lėtesnis.', type: 'Atradimai', age: '6-12 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #8B5A2B, #FFC845)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'spell', emoji: '🔤', title: 'Rašyba su paveikslėliais', desc: 'Pamatyk paveikslėlį, išgirsk žodį ir sudėk raides į langelius. Šeima, gyvūnai, gamta, maistas, namai – 5 temos.', type: 'Rašyba', age: '5-9 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FFD166, #FF6B8A)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'mathStory', emoji: '🐰', title: 'Matematikos pasakos', desc: 'Zuikis, voverytė ir bitutė pasakoja istorijas. Suskaičiuok daikčius pirštu spaudžiant ir gauk taškus.', type: 'Matematika', age: '5-9 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #A7F3D0, #4CC9F0)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'world', emoji: '🌍', title: 'Pasaulio pažinimas', desc: 'Kaimo, miško, jūros gyvūnai, transportas, metų laikai. „Kas tai?" ir „Sugrupuok" režimai – kategorizavimas su garsais.', type: 'Pasaulio pažinimas', age: '4-9 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #9B5DE5, #6C63FF)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'fingers', emoji: '🖐️', title: 'Pirštukų pamokos', desc: 'Animuotos rankos rodo, kuriuo pirštuku spausti raidę. 6 pamokos nuo F/J iki lietuviškų raidžių ir žodžių.', type: 'Klaviatūra', age: '5-10 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #FFD166, #FF6B8A)', badge: 'Naujas!', players: 'Nauja!' },
  { id: 'typing', emoji: '⌨️', title: 'Spartaus rašymo iššūkis', desc: 'Krentančios raidės ir žodžiai – spauskite juos ant klaviatūros! 7 lygiai nuo raidžių iki sakinių.', type: 'Klaviatūra', age: '6-12 m.', difficulty: 'Progresuojantis', bg: 'linear-gradient(135deg, #9B5DE5, #6C63FF)', badge: 'Naujas!', players: '800+ žaidžia' },
  { id: 'driveLetters', emoji: '🚗', title: 'Raidžių medžioklė', desc: 'Išgirsk raidę ir rodyklėmis ⬅ ⬆ ⬇ ➡ nuvažiuok iki jos! Mokomės abėcėlės žaidžiant. Su combo ir pirštukų patarimu.', type: 'Abėcėlė', age: '4-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FFB86B, #FF6B8A)', badge: 'Atnaujintas!', players: 'Nauja!' },
  { id: 'driveNumbers', emoji: '🔢', title: 'Skaičių medžioklė', desc: 'Išgirsk skaičių ir rodyklėmis ⬅ ⬆ ⬇ ➡ pervažiuok per jį! Mokomės skaitmenų. Su combo ir pirštukų patarimu.', type: 'Skaičiai', age: '4-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)', badge: 'Atnaujintas!', players: 'Nauja!' },
  { id: 'memory', emoji: '🧩', title: 'Atminties iššūkis', desc: 'Atversk korteles ir surask poras! Lavina atmintį ir dėmesingumą.', type: 'Atmintis', age: '4-8 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)', badge: 'Nemokamas', players: '2.5k žaidžia' },
  { id: 'math', emoji: '🔢', title: 'Matematikos burtininkas', desc: 'Spręsk matematinius uždavinius ir tapk tikru skaičių meistru!', type: 'Matematika', age: '6-10 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)', badge: 'Populiarus', players: '1.8k žaidžia' },
  { id: 'word', emoji: '📝', title: 'Žodžių dėlionė', desc: 'Sudėliok raides ir surask paslėptą žodį! Mokykis naujų žodžių.', type: 'Kalbos', age: '7-12 m.', difficulty: 'Vidutinis', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', badge: 'Naujas', players: '1.2k žaidžia' },
  { id: 'color', emoji: '🎨', title: 'Spalvų maišytuvas', desc: 'Atspėk spalvas ir mokykis jas maišyti! Kūrybinis ir linksmas žaidimas.', type: 'Kūrybiškumas', age: '3-7 m.', difficulty: 'Lengvas', bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)', badge: 'Mažyliams', players: '3.1k žaidžia' },
]

const DriveLettersGame = (props) => <DriveGame mode="letters" {...props} />
const DriveNumbersGame = (props) => <DriveGame mode="numbers" {...props} />

const GAME_COMPONENTS = {
  neuroplanet: NeuroPlanetGame,
  flapbird: FlapBirdGame,
  attentionTest: AttentionTestGame,
  wordSearch: WordSearchGame,
  colorMemory: ColorMemoryGame,
  numberRush: NumberRushGame,
  castle: CastleDefenseGame,
  snakes: SnakesLaddersGame,
  music: MusicRoomGame,
  maze: MazeGame,
  stroop: StroopTestGame,
  schulte: SchulteTableGame,
  cryptogram: CryptogramGame,
  sudoku: KidsSudokuGame,
  pixelPath: PixelPathGame,
  traffic: TrafficSafetyGame,
  archaeology: ArchaeologyGame,
  spell: SpellGame,
  mathStory: MathStoryGame,
  world: WorldGame,
  fingers: FingerGame,
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
  const sessionRef = useRef({ start: 0, gameId: null, score: 0 })

  // Begin a new session whenever the active game changes
  useEffect(() => {
    // Flush previous session (if any) when game closes or switches
    const prev = sessionRef.current
    if (prev.gameId && prev.score > 0) {
      const durationS = Math.round((performance.now() - prev.start) / 1000)
      recordProgress({
        gameId: prev.gameId,
        score: prev.score,
        durationS,
      }).catch(() => {})
    }
    sessionRef.current = {
      start: performance.now(),
      gameId: activeGame,
      score: 0,
    }
  }, [activeGame])

  const handleScore = (gameId, score) => {
    if (sessionRef.current.gameId === gameId) {
      sessionRef.current.score = score
    }
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

        {/* Free banner */}
        <div style={styles.freeBanner}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: 'white' }}>
              Visi žaidimai 100% nemokami!
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              Be apribojimų · be reklamų · be registracijos · iškart prieinami visiems vaikams
            </div>
          </div>
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={styles.freePill}>NEMOKAMA</span>
                    {game.badge && <span className="badge badge-free">{game.badge}</span>}
                  </div>
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
  freeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 22px',
    borderRadius: 18,
    background: 'linear-gradient(135deg, #4FD1A5, #06D6A0)',
    boxShadow: '0 10px 24px rgba(79, 209, 165, 0.35)',
    marginBottom: 28,
    color: 'white',
  },
  freePill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #4FD1A5, #06D6A0)',
    color: 'white',
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.5,
    boxShadow: '0 2px 6px rgba(79, 209, 165, 0.4)',
  },
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
