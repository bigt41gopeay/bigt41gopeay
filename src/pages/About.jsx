const STATS = [
  { value: '42+', label: 'produktai', color: 'var(--primary)' },
  { value: '15 000+', label: 'šeimų', color: 'var(--coral)' },
  { value: '8', label: 'ekspertų', color: 'var(--green-dark)' },
  { value: '4.9★', label: 'įvertinimas', color: 'var(--yellow-dark)' },
]

const VALUES = [
  { icon: '🔬', title: 'Moksliškai pagrįsta', tint: 'var(--violet-soft)', iconBg: 'var(--gradient-primary)', desc: 'Visi produktai kurti bendradarbiaujant su vaikų psichologais ir pedagogais. Remiamės naujausiomis vystymosi neurologijos studijomis.' },
  { icon: '🌈', title: 'Įtraukianti visiems', tint: 'var(--yellow-soft)', iconBg: 'linear-gradient(135deg,#FFC845,#FFB200)', desc: 'ADHD draugiški, sensoriškai jautrūs ir nuosaikiai stimuliuojantys. Tinka įvairiems vaikams – nuo aktyvių iki susikaupusių.' },
  { icon: '🇱🇹', title: 'Lietuviška kokybė', tint: 'var(--green-soft)', iconBg: 'linear-gradient(135deg,#4FD1A5,#2A9D7C)', desc: 'Spausdiname Lietuvoje, mokame mokesčius Lietuvoje, kuriame Lietuvai. Kiekvienas pirkinys palaiko vietos kūrėjus.' },
]

const TEAM = [
  { emoji: '👩‍🏫', name: 'Rūta Petraitienė', role: 'Steigėja, vaikų psichologė', bg: 'var(--violet-soft)' },
  { emoji: '👨‍💻', name: 'Mantas Jonaitis', role: 'Produktas ir technologijos', bg: 'var(--yellow-soft)' },
  { emoji: '👩‍🎨', name: 'Eglė Kavaliauskaitė', role: 'Iliustracijos ir dizainas', bg: 'var(--green-soft)' },
  { emoji: '👨‍🏫', name: 'Tomas Žemaitis', role: 'Edukacijos vadovas', bg: 'rgba(255,122,107,0.12)' },
]

export default function About({ onNavigate }) {
  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* HERO */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '56px 32px 40px' }}>
        <div className="about-hero" style={{
          display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 48, alignItems: 'center',
        }}>
          <div>
            <span className="pill" style={{ marginBottom: 22 }}>
              💜 Mūsų istorija
            </span>
            <h1 style={{ fontSize: 'clamp(30px, 5vw, 50px)', marginTop: 22 }}>
              Tikime, kad <span style={{ color: 'var(--primary)' }}>kiekvienas vaikas</span> nusipelno augti drąsiai
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: 22, fontWeight: 500 }}>
              MažųjųPasaulis gimė 2023 m. iš vienos mamos nusivylimo – Lietuvoje trūko gerų edukacinių produktų, kurie ne tik mokytų, bet ir kalbėtų apie emocijas, pasitikėjimą, ADHD draugišką mokymąsi.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: 14, fontWeight: 500 }}>
              Per trejus metus tapome komanda, kurioje veikia psichologai, edukatoriai, iliustratoriai ir tėvai. Kuriame produktus, kuriuos patys leistume savo vaikams.
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 30, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => onNavigate('store')}>
                Susipažink su produktais
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('courses')}>
                Mokymai tėvams
              </button>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(160deg, #FFF3DA, #FFC845)',
            borderRadius: 36, padding: 36,
            aspectRatio: '4/4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 30px 60px rgba(255,200,69,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <span style={{ fontSize: 140 }}>🎨</span>
            <div className="animate-floaty" style={{
              position: 'absolute', top: 28, right: 28,
              background: 'white', borderRadius: 14, padding: '8px 14px',
              fontWeight: 800, fontSize: 13, color: 'var(--ink)',
              boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
            }}>✏️ Kuriame su meile</div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '40px 32px' }}>
        <div className="about-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 24, padding: 28,
              textAlign: 'center', boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, color: s.color }}>{s.value}</div>
              <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2>Kuo mes tikime</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 500, marginTop: 12 }}>
            Trys vertybės, lemiančios kiekvieną sprendimą
          </p>
        </div>
        <div className="about-values" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {VALUES.map((v, i) => (
            <div key={i} style={{
              background: v.tint, borderRadius: 28, padding: 32,
              boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: v.iconBg, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>{v.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22 }}>{v.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.55, fontWeight: 500 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2>Mūsų komanda</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 500, marginTop: 12 }}>
            Žmonės, kuriuos sutiksi už kiekvieno produkto
          </p>
        </div>
        <div className="about-team" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {TEAM.map((t, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 24, padding: 28,
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                background: t.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 42,
              }}>{t.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17 }}>{t.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{
          background: 'var(--gradient-primary)',
          borderRadius: 36, padding: '56px 48px',
          textAlign: 'center', color: 'white',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 24, left: 32, fontSize: 60, opacity: 0.18 }}>📚</div>
          <div style={{ position: 'absolute', bottom: 24, right: 32, fontSize: 60, opacity: 0.18 }}>🎮</div>
          <h2 style={{ color: 'white', fontSize: 'clamp(24px, 4vw, 38px)' }}>Pradėk vaiko kelionę šiandien</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 14, maxWidth: 520, margin: '14px auto 0', fontWeight: 500 }}>
            Naršyk visus produktus ir surask tai, kas labiausiai tinka tavo šeimai.
          </p>
          <button className="btn btn-yellow btn-lg" style={{ marginTop: 24 }} onClick={() => onNavigate('store')}>
            Naršyti produktus →
          </button>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .about-hero { grid-template-columns: 1fr !important; gap: 36px !important; }
          .about-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .about-values { grid-template-columns: 1fr !important; }
          .about-team { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .about-stats { grid-template-columns: 1fr !important; }
          .about-team { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
