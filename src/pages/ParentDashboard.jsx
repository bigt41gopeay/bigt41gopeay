import { useEffect, useState } from 'react'
import { api } from '../api'
import { setActiveChildId, getActiveChildId } from '../lib/childSession'

// Parent dashboard — the highest-value page in the funnel. Designed to:
//  1. Show parents WHAT their kids did → emotional engagement
//  2. Show LOCKED premium insights → conversion driver
//  3. Make adding more kids easy → bigger plan upsell
//  4. Tile recommendations from weak areas → upgrade hook for "more content"

const GAME_LABELS = {
  neuroplanet: '🪐 NeuroPlaneta',
  flapbird:    '🐦 Paukštelio nuotykiai',
  attentionTest: '🧠 Dėmesio testas',
  wordSearch:  '🔍 Žodžių paieška',
  colorMemory: '🎨 Spalvų atmintis',
  numberRush:  '⚡ Skaičių sprintas',
  castle:      '🏰 Pilies gynyba',
  snakes:      '🪜 Gyvatukai ir kopėtėlės',
  music:       '🎵 Muzikos kambariukas',
  maze:        '🗺️ Labirintai',
  traffic:     '🚦 Saugus eismas',
  archaeology: '🏺 Archeologo iššūkis',
  stroop:      '🎨 Stroop testas',
  schulte:     '🔢 Schulte lentelė',
  cryptogram:  '🔠 Šifras',
  sudoku:      '🔢 Sudoku',
  pixelPath:   '🗺️ Pikselių kelionė',
  spell:       '🔤 Rašyba',
  mathStory:   '🐰 Matematikos pasakos',
  world:       '🌍 Pasaulio pažinimas',
  fingers:     '🖐️ Pirštukai',
  typing:      '⌨️ Spartaus rašymo',
  driveLetters:'🚗 Raidžių medžioklė',
  driveNumbers:'🔢 Skaičių medžioklė',
  memory:      '🧩 Atmintis',
  math:        '🔢 Matematika',
  word:        '📝 Žodžių dėlionė',
  color:       '🎨 Spalvų maišytuvas',
}

function gameLabel(id) { return GAME_LABELS[id] || `🎮 ${id}` }
function fmtTime(seconds) {
  if (!seconds) return '0 min'
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)} min`
}

export default function ParentDashboard({ user, onNavigate }) {
  const [children, setChildren] = useState([])
  const [tier, setTier] = useState(null)
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api.getChildren()
      .then(d => {
        if (!alive) return
        setChildren(d.children)
        setTier(d.tier)
        if (d.children.length > 0) {
          const activeId = getActiveChildId()
          const initial = d.children.find(c => c.id === activeId) || d.children[0]
          setSelected(initial)
        }
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!selected) return
    let alive = true
    Promise.all([
      api.getChildStats(selected.id),
      api.getChildRecommendations(selected.id),
    ]).then(([s, r]) => {
      if (!alive) return
      setStats(s)
      setRecs(r)
    }).catch(() => {})
    return () => { alive = false }
  }, [selected])

  const addChild = () => {
    // Open child selector in "add" mode via global event or redirect
    window.dispatchEvent(new CustomEvent('open-child-selector'))
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Kraunama…</div>
  }

  return (
    <div className="container" style={{ padding: '32px 32px 80px' }}>
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>👨‍👩‍👧 Tėvų skydas</h1>
          <p style={s.sub}>Stebėk savo vaikų progresą ir pasiekimus.</p>
        </div>
        <div style={s.tierBadge}>
          <span style={{ opacity: 0.7, marginRight: 6 }}>Tavo planas:</span>
          <b>{tier?.name || 'Nemokamas'}</b>
          {(user?.membership || 'free') === 'free' && (
            <button onClick={() => onNavigate?.('membership')} style={s.upgradeBtn}>
              ⭐ Pakelti
            </button>
          )}
        </div>
      </header>

      {/* Children switcher */}
      <section style={{ marginBottom: 32 }}>
        <div style={s.childRow}>
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelected(c); setActiveChildId(c.id) }}
              style={{
                ...s.childChip,
                background: selected?.id === c.id ? 'linear-gradient(135deg,#6C63FF,#9B7BFF)' : 'white',
                color: selected?.id === c.id ? 'white' : 'var(--ink)',
                transform: selected?.id === c.id ? 'translateY(-2px) scale(1.02)' : 'none',
              }}
            >
              <span style={{ fontSize: 24 }}>{c.avatar}</span>
              <span style={{ fontWeight: 800 }}>{c.name}</span>
              {c.age && <span style={{ fontSize: 12, opacity: 0.85 }}>{c.age} m.</span>}
            </button>
          ))}
          {tier && !tier.atLimit && (
            <button onClick={addChild} style={{ ...s.childChip, ...s.addChip }}>
              <span style={{ fontSize: 26 }}>+</span>
              <span style={{ fontWeight: 800 }}>Pridėti vaiką</span>
            </button>
          )}
          {tier && tier.atLimit && (user?.membership || 'free') === 'free' && (
            <button onClick={() => onNavigate?.('membership')} style={{ ...s.childChip, ...s.lockedChip }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Daugiau vaikų<br />su Šeimos planu</span>
            </button>
          )}
        </div>
      </section>

      {children.length === 0 && (
        <div style={s.emptyState}>
          <div style={{ fontSize: 80, marginBottom: 12 }}>👶</div>
          <h2 style={{ marginBottom: 10 }}>Sukurk pirmą vaiko profilį</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Pridėjus profilį, vaikas turės savo taškus, pasiekimus ir progresą — visą laiką saugomus.
          </p>
          <button onClick={addChild} style={s.primaryBtn}>+ Pridėti vaiką</button>
        </div>
      )}

      {selected && stats && (
        <>
          {/* Overall stats */}
          <section style={s.statsGrid}>
            <StatTile color="#6C63FF" emoji="🎮" label="Sesijų" value={stats.overall.sessions} />
            <StatTile color="#F4C95D" emoji="⏱️" label="Iš viso laiko" value={fmtTime(stats.overall.total_seconds)} />
            <StatTile color="#6FB99E" emoji="⭐" label="Taškų" value={stats.overall.total_score} />
            <StatTile color="#F58F7E" emoji="🎯" label="Žaidimų" value={stats.overall.games_played} />
          </section>

          {/* Per-game performance */}
          <section style={s.section}>
            <div style={s.sectionHeader}>
              <h2>Žaidimų statistika</h2>
              <span style={s.muted}>{stats.perGame.length} žaidimų suvedimas</span>
            </div>
            {stats.perGame.length === 0 ? (
              <div style={s.emptySmall}>{selected.name} dar nežaidė. Pakviesk pradėti!</div>
            ) : (
              <div style={s.gameList}>
                {stats.perGame.map(g => (
                  <div key={g.game_id} style={s.gameRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>
                        {gameLabel(g.game_id)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {g.sessions} sesijos · paskutinį kartą {new Date(g.last_played).toLocaleDateString('lt-LT')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'var(--primary)' }}>
                        {g.best_score}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>geriausias rezultatas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommendations / weakness — Premium gate */}
          <section style={s.section}>
            <div style={s.sectionHeader}>
              <h2>💡 Rekomenduojama dėmesiui</h2>
              {recs?.upgradeForFullInsights && (
                <span style={s.premiumBadge}>Premium analizė</span>
              )}
            </div>
            {recs?.weakAreas?.length > 0 ? (
              <div style={s.weakGrid}>
                {recs.weakAreas.map(w => (
                  <div key={w.game_id} style={{ ...s.weakCard, filter: recs.upgradeForFullInsights ? 'blur(0px)' : 'none' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17 }}>{gameLabel(w.game_id)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      Vidutinis rezultatas: <b>{Math.round(w.avg_score)}</b> · {w.plays} sesijos
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Pakvietus vaiką pažaisti dar — rezultatas augs.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.emptySmall}>Daugiau sesijų — rodysiu rekomendacijas.</div>
            )}
            {recs?.upgradeForFullInsights && (
              <div style={s.premiumPitch}>
                <div>
                  <b>Premium</b> atskleidžia kuriose temose vaikas stipriausias / silpniausias, AI rekomendacijas savaitei ir el. ataskaitas.
                </div>
                <button onClick={() => onNavigate?.('membership')} style={s.primaryBtn}>Atrakinti Premium</button>
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section style={s.section}>
            <h2 style={{ marginBottom: 16 }}>📜 Naujausia veikla</h2>
            {stats.recent.length === 0 ? (
              <div style={s.emptySmall}>Pradėk žaisti — čia rodysis paskutinės sesijos.</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th>Žaidimas</th>
                    <th>Taškai</th>
                    <th>Trukmė</th>
                    <th>Kada</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r, i) => (
                    <tr key={i}>
                      <td>{gameLabel(r.game_id)}</td>
                      <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--primary)' }}>{r.score}</td>
                      <td>{fmtTime(r.duration_s)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(r.played_at).toLocaleString('lt-LT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Upgrade banner if free */}
          {(user?.membership || 'free') === 'free' && (
            <div style={s.upgradeBanner}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, color: 'white' }}>
                  Iki 3 vaikų · neribota žaidimo trukmė · savaitės ataskaitos
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                  Pradėk Šeimos planą — 7 dienos nemokamai, atšauk bet kada.
                </div>
              </div>
              <button onClick={() => onNavigate?.('membership')} style={s.bannerBtn}>
                Išbandyti nemokamai →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({ color, emoji, label, value }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: 22,
      boxShadow: 'var(--shadow-card)', borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 28 }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 32, color, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  h1: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' },
  sub: { color: 'var(--text-secondary)', marginTop: 4 },
  tierBadge: {
    background: 'white', padding: '10px 18px', borderRadius: 14,
    fontSize: 14, fontWeight: 700, color: 'var(--ink)',
    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 10,
  },
  upgradeBtn: {
    background: 'linear-gradient(135deg,#F4C95D,#F58F7E)', color: 'white',
    border: 'none', borderRadius: 999, padding: '6px 14px',
    fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  childRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  childChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    minWidth: 110, padding: '14px 16px', borderRadius: 16,
    border: '2px solid var(--border-soft)', cursor: 'pointer',
    fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s var(--ease-out)',
  },
  addChip: {
    background: 'transparent', border: '2px dashed var(--border-strong)',
    color: 'var(--primary)',
  },
  lockedChip: {
    background: 'linear-gradient(135deg,#FBF1D9,#FCDDD6)',
    color: 'var(--ink)',
  },
  emptyState: { background: 'white', padding: 60, borderRadius: 24, textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  primaryBtn: {
    background: 'var(--primary)', color: 'white', border: 'none',
    borderRadius: 14, padding: '12px 24px', fontWeight: 800,
    fontFamily: 'var(--font-heading)', cursor: 'pointer', fontSize: 15,
    boxShadow: 'var(--shadow-btn)',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 },
  section: { background: 'white', borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-card)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  muted: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 },
  premiumBadge: {
    background: 'linear-gradient(135deg,#F4C95D,#F58F7E)', color: 'white',
    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  gameList: { display: 'flex', flexDirection: 'column', gap: 10 },
  gameRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 16px', borderRadius: 14,
    background: 'var(--violet-softer)', border: '1px solid var(--border-soft)',
  },
  emptySmall: { textAlign: 'center', padding: 24, color: 'var(--text-muted)' },
  weakGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  weakCard: {
    background: 'var(--calm-blue-softer)', border: '1px solid var(--border-soft)',
    borderRadius: 14, padding: 16,
  },
  premiumPitch: {
    marginTop: 18, padding: '18px 22px',
    background: 'linear-gradient(135deg,#FFF9F0,#FBF1D9)',
    borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14,
    fontSize: 14, color: 'var(--ink)', flexWrap: 'wrap',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
  },
  upgradeBanner: {
    marginTop: 24, padding: 28,
    background: 'linear-gradient(135deg,#6C63FF,#5048C7)',
    borderRadius: 24,
    display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    boxShadow: '0 16px 36px rgba(108,99,255,0.3)',
  },
  bannerBtn: {
    background: 'white', color: 'var(--primary)',
    border: 'none', borderRadius: 14, padding: '14px 24px',
    fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15,
    cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
  },
}
