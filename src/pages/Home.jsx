import { useState } from 'react'

const CATEGORIES = [
  {
    icon: '📖', tint: 'var(--yellow-soft)', iconColor: 'var(--yellow-dark)',
    title: 'Autorinės knygos',
    desc: 'Originalios istorijos su psichologijos elementais. Stiprina pasitikėjimą ir emocinį suvokimą.',
    target: 'books', count: '12 knygų',
  },
  {
    icon: '🎲', tint: 'var(--green-soft)', iconColor: 'var(--green-dark)',
    title: 'Edukaciniai žaidimai',
    desc: 'ADHD draugiški interaktyvūs žaidimai – raidės, skaičiai, emocijos. Multi-sensorinis mokymasis.',
    target: 'games', count: '20+ žaidimų',
  },
  {
    icon: '🎓', tint: 'var(--violet-soft)', iconColor: 'var(--primary)',
    title: 'Mokymai tėvams',
    desc: 'Praktiniai kursai apie vaikų emocijas, ADHD ir bendravimą. Vedami psichologų.',
    target: 'courses', count: '8 kursų',
  },
]

const FEATURED = [
  { icon: '📕', tint: 'var(--yellow-soft)', iconColor: 'var(--yellow-dark)', cat: 'KNYGA', catColor: 'var(--yellow-dark)', title: 'Drąsiukų knyga', rating: '4.9', reviews: '214', price: '19,90 €', oldPrice: '23,90 €', badge: '-20%', badgeBg: 'var(--coral)' },
  { icon: '🎲', tint: 'var(--green-soft)', iconColor: 'var(--green-dark)', cat: 'ŽAIDIMAS', catColor: 'var(--green-dark)', title: 'Emocijų žaidimas', rating: '4.8', reviews: '156', price: '24,90 €', badge: 'Naujiena', badgeBg: 'var(--emerald)' },
  { icon: '🃏', tint: 'var(--violet-soft)', iconColor: 'var(--primary)', cat: 'ŽAIDIMAS', catColor: 'var(--green-dark)', title: 'ADHD kortelės', rating: '4.9', reviews: '189', price: '14,90 €', badge: 'ADHD', badgeBg: 'var(--primary)' },
  { icon: '📗', tint: 'var(--yellow-soft)', iconColor: 'var(--yellow-dark)', cat: 'KNYGA', catColor: 'var(--yellow-dark)', title: 'Smalsumo nuotykiai', rating: '4.9', reviews: '167', price: '21,90 €' },
]

const VALUES = [
  { icon: '🎯', title: 'Pasitikėjimo ugdymas', desc: 'Kiekvienas produktas suskirstytas pagal vaiko vystymosi etapus ir stiprina pasitikėjimą savimi.' },
  { icon: '🧠', title: 'ADHD draugiška', desc: 'Trumpos sesijos, vizualus dėmesys, pozityvus pastiprinimas. Sukurta atsižvelgiant į neurologiją.' },
  { icon: '💛', title: 'Emocijų valdymas', desc: 'Padedame vaikams atpažinti, pavadinti ir valdyti emocijas. Psichologų patvirtinta metodika.' },
]

const REVIEWS = [
  { stars: 5, text: 'Drąsiukų knyga padėjo mano dukrai jau po dviejų savaičių. Ji pati pradėjo kalbėti apie savo jausmus.', name: 'Asta', city: 'Vilnius', emoji: '👩' },
  { stars: 5, text: 'ADHD kortelės yra geriausia mūsų investicija. Sūnui patinka rytinis ritualas su jomis.', name: 'Tomas', city: 'Kaunas', emoji: '👨' },
  { stars: 5, text: 'Žaidimai veikia! Vaikai mokosi neapsimetinėdami, kad mokosi. Rekomenduoju visiems.', name: 'Rasa', city: 'Klaipėda', emoji: '👩‍🦰' },
]

function ProductCard({ p, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white',
        borderRadius: 24,
        padding: 14,
        boxShadow: hover ? 'var(--shadow-hover)' : 'var(--shadow-card)',
        transform: hover ? 'translateY(-6px)' : 'none',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{
        position: 'relative',
        background: p.tint,
        aspectRatio: '1',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 80,
        color: p.iconColor,
      }}>
        {p.badge && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            padding: '4px 10px', borderRadius: 999,
            background: p.badgeBg, color: 'white',
            fontWeight: 800, fontSize: 11,
          }}>{p.badge}</span>
        )}
        {p.icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: p.catColor, textTransform: 'uppercase', letterSpacing: 0.4 }}>{p.cat}</span>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>{p.title}</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ color: 'var(--yellow)' }}>★</span> {p.rating} ({p.reviews})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 19, color: 'var(--primary)' }}>{p.price}</span>
            {p.oldPrice && <span style={{ fontSize: 14, color: '#B6B2CC', textDecoration: 'line-through', fontWeight: 700 }}>{p.oldPrice}</span>}
          </div>
          <button style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--primary)', color: 'white',
            border: 'none', fontSize: 22, fontWeight: 700,
            cursor: 'pointer', boxShadow: 'var(--shadow-btn)',
            lineHeight: 1,
          }}>+</button>
        </div>
      </div>
    </div>
  )
}

export default function Home({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = (e) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setTimeout(() => { setSubscribed(false); setEmail('') }, 3000)
  }

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* HERO */}
      <section style={{ position: 'relative', maxWidth: 'var(--max-width)', margin: '0 auto', padding: '64px 32px 80px' }}>
        <div style={{
          position: 'absolute', top: 40, right: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #FFE3A3, #FFC845)',
          opacity: 0.5, filter: 'blur(2px)', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', bottom: 20, left: -40,
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #A6F0D8, #4FD1A5)',
          opacity: 0.45, zIndex: 0,
        }} />

        <div className="home-hero-grid" style={{
          position: 'relative', zIndex: 2,
          display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 48, alignItems: 'center',
        }}>
          <div>
            <span className="pill" style={{ marginBottom: 22 }}>
              ✨ Lietuviška kokybė vaikams 3–12 m.
            </span>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700,
              fontSize: 'clamp(34px, 5.5vw, 60px)', lineHeight: 1.05, letterSpacing: '-1.5px',
              color: 'var(--ink)', margin: '22px 0 0',
            }}>
              Augink <span style={{ color: 'var(--primary)' }}>drąsą</span>, emocijas ir <span style={{ color: 'var(--coral)' }}>smalsumą</span> žaisdamas
            </h1>
            <p style={{
              fontSize: 19, lineHeight: 1.6,
              color: 'var(--text-secondary)', margin: '22px 0 0',
              maxWidth: 480, fontWeight: 500,
            }}>
              Autorinės knygos, interaktyvūs edukaciniai žaidimai ir mokymai. Pasitikėjimo ugdymas, emocijų valdymas ir ADHD draugiški produktai – vienoje vietoje.
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => onNavigate('store')}>
                Naršyti produktus
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('about')}>
                Kaip tai veikia →
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 38, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}>
                <span style={avatarStyle('var(--yellow)')}>👧</span>
                <span style={{ ...avatarStyle('var(--emerald)'), marginLeft: -12 }}>👦</span>
                <span style={{ ...avatarStyle('var(--coral)'), marginLeft: -12 }}>🧒</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--yellow)' }}>★</span> 4.9 / 5 · 1 200+ šeimų
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>pasitiki mūsų produktais</div>
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'linear-gradient(160deg, #EFE9FF, #FFFFFF)',
              borderRadius: 36, padding: 28,
              boxShadow: 'var(--shadow-hero)',
              border: '1px solid rgba(108,99,255,0.08)',
            }}>
              <div style={{
                background: 'white', borderRadius: 24, overflow: 'hidden',
                aspectRatio: '4/3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed rgba(108,99,255,0.2)',
                flexDirection: 'column', gap: 10, color: 'var(--text-muted)',
              }}>
                <span style={{ fontSize: 64, color: 'var(--primary)' }}>📚</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Vaikų pasaulio knygelės</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <div style={miniCardStyle}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Drąsiukų knyga</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, color: 'var(--primary)', marginTop: 4 }}>19,90 €</div>
                </div>
                <div style={miniCardStyle}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Emocijų žaidimas</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, color: 'var(--primary)', marginTop: 4 }}>24,90 €</div>
                </div>
              </div>
            </div>
            {/* Floating stickers */}
            <div className="animate-floaty" style={{
              position: 'absolute', top: -22, left: -26,
              background: 'var(--yellow)', color: 'var(--ink)',
              fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14,
              padding: '10px 16px', borderRadius: 16,
              boxShadow: '0 10px 22px rgba(255,200,69,0.5)',
            }}>🎯 ADHD draugiška</div>
            <div className="animate-floaty2" style={{
              position: 'absolute', bottom: -20, right: -24,
              background: 'var(--emerald)', color: 'white',
              fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14,
              padding: '10px 16px', borderRadius: 16,
              boxShadow: '0 10px 22px rgba(79,209,165,0.5)',
            }}>💚 Psichologų patvirtinta</div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '40px 32px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2>Trys keliai į augimą</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 500, maxWidth: 600, margin: '12px auto 0' }}>
            Knygos, žaidimai ir mokymai – kiekvienam vaikui pagal jo poreikius.
          </p>
        </div>
        <div className="home-cats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {CATEGORIES.map((c, i) => (
            <div
              key={i}
              onClick={() => onNavigate(c.target)}
              style={{
                background: 'white', borderRadius: 28, padding: 28,
                cursor: 'pointer', transition: 'all 0.25s ease',
                boxShadow: 'var(--shadow-card)',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: c.tint, color: c.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36,
              }}>{c.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22 }}>{c.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, lineHeight: 1.55 }}>{c.desc}</p>
              <span style={{ marginTop: 'auto', color: 'var(--primary)', fontWeight: 800, fontSize: 14 }}>{c.count} →</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '60px 32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>Šeimų favoritai</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500, marginTop: 8 }}>
              Geriausiai vertinami produktai šį mėnesį
            </p>
          </div>
          <a onClick={() => onNavigate('store')} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 800, fontSize: 15 }}>
            Visi produktai →
          </a>
        </div>
        <div className="home-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {FEATURED.map((p, i) => (
            <ProductCard key={i} p={p} onClick={() => onNavigate('store')} />
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '64px 32px' }}>
        <div style={{
          background: 'var(--gradient-primary)',
          borderRadius: 36, padding: '56px 48px',
          color: 'white',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ color: 'white', fontSize: 'clamp(28px, 4vw, 38px)' }}>Kuo mes skiriamės</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 12, fontWeight: 500 }}>
              Trys principai, kuriais grindžiame kiekvieną produktą.
            </p>
          </div>
          <div className="home-values-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {VALUES.map((v, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 24, padding: 28,
                border: '1px solid rgba(255,255,255,0.18)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{v.icon}</div>
                <h3 style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>{v.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.55, fontWeight: 500 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '40px 32px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2>Ką sako tėvai</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 500, marginTop: 12 }}>
            1 200+ šeimų jau naudoja mūsų produktus
          </p>
        </div>
        <div className="home-reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {REVIEWS.map((r, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 24, padding: 28,
              boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ color: 'var(--yellow)', fontSize: 18, letterSpacing: 2 }}>
                {'★'.repeat(r.stars)}
              </div>
              <p style={{ color: 'var(--ink)', fontSize: 16, lineHeight: 1.55, fontWeight: 500 }}>„{r.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--violet-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{r.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '20px 32px 80px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #FFE3A3, #FFC845)',
          borderRadius: 36, padding: '48px 48px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="animate-floaty" style={{
            position: 'absolute', top: 24, right: 40, fontSize: 48,
          }}>📬</div>
          <div style={{ maxWidth: 580, position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 34px)', color: 'var(--ink)' }}>
              Gauk <span style={{ color: 'var(--coral)' }}>–10 %</span> pirmam pirkiniui
            </h2>
            <p style={{ color: 'var(--ink)', opacity: 0.78, fontSize: 16, fontWeight: 600, marginTop: 12 }}>
              Prenumeruok – siųsime tik svarbiausias naujienas ir nuolaidas.
            </p>
            <form onSubmit={subscribe} style={{ display: 'flex', gap: 10, marginTop: 22, maxWidth: 480, flexWrap: 'wrap' }}>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tavo@pastas.lt"
                style={{
                  flex: '1 1 220px', padding: '14px 18px', borderRadius: 14,
                  border: '2px solid rgba(45,42,69,0.1)', background: 'white',
                  fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                {subscribed ? '✓ Ačiū!' : 'Prenumeruoti'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .home-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .home-cats-grid { grid-template-columns: 1fr !important; }
          .home-products-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .home-values-grid { grid-template-columns: 1fr !important; }
          .home-reviews-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .home-products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

const avatarStyle = (bg) => ({
  width: 42, height: 42, borderRadius: '50%',
  background: bg, border: '3px solid var(--cream)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 20,
})
const miniCardStyle = {
  flex: 1, background: 'white', borderRadius: 16, padding: 14,
  boxShadow: '0 6px 16px rgba(45,42,69,0.06)',
}
