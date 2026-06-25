import { useState } from 'react'

const PLANS = [
  {
    id: 'free',
    name: 'Nemokamas',
    icon: '🌱',
    price: 0,
    period: '',
    desc: 'Puikus startas mažiesiems tyrinėtojams',
    color: '#06D6A0',
    bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)',
    features: [
      { text: 'Visi žaidimai – nemokamai ir visada', included: true },
      { text: '3 nemokamos knygos per mėnesį', included: true },
      { text: 'Pagrindiniai pasiekimai', included: true },
      { text: 'Reklama rodoma', included: false },
      { text: 'Ribota prieiga prie knygų', included: false },
      { text: 'Be atsisiuntimų', included: false },
    ],
    badge: null,
  },
  {
    id: 'basic',
    name: 'Šeimos',
    icon: '⭐',
    price: 4.99,
    period: '/mėn.',
    desc: 'Populiariausias pasirinkimas šeimoms',
    color: '#6C63FF',
    bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    features: [
      { text: 'Visos knygos be apribojimų', included: true },
      { text: 'Visi žaidimai (kaip ir nemokamame plane)', included: true },
      { text: 'Visi pasiekimai ir apdovanojimai', included: true },
      { text: 'Be reklamų', included: true },
      { text: 'Tėvų kontrolė ir progresas', included: true },
      { text: 'Iki 3 vaikų profilių', included: true },
    ],
    badge: 'Populiariausias',
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: '👑',
    price: 9.99,
    period: '/mėn.',
    desc: 'Viskas, ko reikia išskirtinei patirčiai',
    color: '#FF6B35',
    bg: 'linear-gradient(135deg, #FF6B35, #FFD166)',
    features: [
      { text: 'Viskas iš Šeimos plano', included: true },
      { text: 'Ankstyva prieiga prie naujo turinio', included: true },
      { text: 'Atsisiuntimas skaitymui neprisijungus', included: true },
      { text: 'Neribotai vaikų profilių', included: true },
      { text: 'Asmeninis mokymosi planas', included: true },
      { text: 'Prioritetinė pagalba', included: true },
    ],
    badge: 'Geriausias pasiūlymas',
  },
]

const FAQ = [
  { q: 'Ar galiu išbandyti nemokamai?', a: 'Taip! VISI žaidimai yra 100% nemokami visada – be apribojimų, be registracijos, be reklamų. Nemokamas planas papildomai leidžia naudotis 3 knygomis per mėnesį. Premium planą taip pat galite išbandyti 7 dienas nemokamai.' },
  { q: 'Kaip atšaukti narystę?', a: 'Narystę galite atšaukti bet kuriuo metu per savo paskyros nustatymus. Atšaukus narystė galioja iki apmokėto laikotarpio pabaigos.' },
  { q: 'Kiek vaikų gali naudotis viena paskyra?', a: 'Nemokamas planas – 1 profilis, Šeimos planas – iki 3, Premium – neribotai.' },
  { q: 'Ar turinys saugus vaikams?', a: '100% taip! Visas turinys yra kruopščiai peržiūrimas ir pritaikytas atitinkamam amžiui. Jokių reklamų Premium planuose.' },
  { q: 'Ar galiu atsisiųsti knygas skaityti neprisijungus?', a: 'Taip, tai prieinama su Premium planu. Galite atsisiųsti iki 20 knygų vienu metu.' },
]

export default function Membership({ user, onNavigate }) {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div style={styles.header}>
          <span style={{ fontSize: '3rem' }}>⭐</span>
          <h1 style={{ fontSize: '2.5rem' }}>Narystės planai</h1>
          <p style={{ color: '#636E72', fontSize: '1.1rem', maxWidth: '600px', margin: '8px auto 0' }}>
            Pasirinkite geriausią planą savo šeimai ir atrakinkite visą mokymosi potencialą
          </p>

          {/* Toggle */}
          <div style={styles.toggle}>
            <span style={{ fontWeight: !annual ? 800 : 600, color: !annual ? '#6C63FF' : '#636E72' }}>
              Mėnesinis
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              style={{ ...styles.toggleBtn, background: annual ? '#6C63FF' : '#E8ECF1' }}
            >
              <div style={{
                ...styles.toggleDot,
                transform: annual ? 'translateX(26px)' : 'translateX(2px)',
              }} />
            </button>
            <span style={{ fontWeight: annual ? 800 : 600, color: annual ? '#6C63FF' : '#636E72' }}>
              Metinis <span style={styles.saveBadge}>-20%</span>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid-3" style={{ alignItems: 'stretch' }}>
          {PLANS.map(plan => {
            const displayPrice = annual && plan.price > 0
              ? (plan.price * 12 * 0.8 / 12).toFixed(2)
              : plan.price.toFixed(2)
            const isPopular = plan.id === 'basic'

            return (
              <div
                key={plan.id}
                style={{
                  ...styles.planCard,
                  ...(isPopular ? styles.planCardPopular : {}),
                  borderColor: isPopular ? plan.color : '#E8ECF1',
                }}
              >
                {plan.badge && (
                  <div style={{ ...styles.planBadge, background: plan.bg }}>
                    {plan.badge}
                  </div>
                )}
                <div style={styles.planHeader}>
                  <span style={{ fontSize: '2.5rem' }}>{plan.icon}</span>
                  <h3 style={{ fontSize: '1.5rem' }}>{plan.name}</h3>
                  <p style={{ color: '#636E72', fontSize: '0.9rem' }}>{plan.desc}</p>
                </div>

                <div style={styles.planPrice}>
                  {plan.price === 0 ? (
                    <span style={styles.priceAmount}>Nemokamai</span>
                  ) : (
                    <>
                      <span style={{ ...styles.priceAmount, color: plan.color }}>
                        €{displayPrice}
                      </span>
                      <span style={styles.pricePeriod}>{plan.period}</span>
                    </>
                  )}
                  {annual && plan.price > 0 && (
                    <span style={styles.annualNote}>
                      €{(plan.price * 12 * 0.8).toFixed(2)}/metams
                    </span>
                  )}
                </div>

                <div style={styles.planFeatures}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={styles.featureRow}>
                      <span style={{ color: f.included ? '#06D6A0' : '#B2BEC3' }}>
                        {f.included ? '✓' : '✕'}
                      </span>
                      <span style={{ color: f.included ? '#2D3436' : '#B2BEC3', fontWeight: f.included ? 600 : 400 }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                <button style={{
                  ...styles.planBtn,
                  background: isPopular ? plan.bg : 'white',
                  color: isPopular ? 'white' : plan.color,
                  border: isPopular ? 'none' : `2px solid ${plan.color}`,
                }}>
                  {plan.price === 0 ? 'Pradėti nemokamai' : 'Pasirinkti planą'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Comparison table small */}
        <div style={styles.comparison}>
          <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>📊 Funkcijų palyginimas</h3>
          <div style={styles.compTable}>
            <div style={styles.compRow}>
              <span style={styles.compLabel}>Funkcija</span>
              <span style={styles.compCell}>🌱 Nemokamas</span>
              <span style={styles.compCell}>⭐ Šeimos</span>
              <span style={styles.compCell}>👑 Premium</span>
            </div>
            {[
              ['Knygos', '3/mėn.', 'Neribotai', 'Neribotai'],
              ['Žaidimai', '✓ Visi nemokamai', '✓ Visi nemokamai', '✓ Visi + ankstyva prieiga'],
              ['Vaikų profiliai', '1', '3', 'Neribotai'],
              ['Reklamos', 'Taip', 'Ne', 'Ne'],
              ['Atsisiuntimai', 'Ne', 'Ne', 'Taip'],
              ['Tėvų kontrolė', 'Bazinė', 'Pilna', 'Pilna+'],
              ['Pagalba', 'Bendruomenė', 'El. paštas', 'Prioritetinė'],
            ].map(([label, ...vals], i) => (
              <div key={i} style={{ ...styles.compRow, background: i % 2 === 0 ? '#F9FAFB' : 'white' }}>
                <span style={styles.compLabel}>{label}</span>
                {vals.map((v, j) => (
                  <span key={j} style={styles.compCell}>{v}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={styles.faqSection}>
          <h3 style={{ textAlign: 'center', marginBottom: '32px' }}>❓ Dažnai užduodami klausimai</h3>
          <div style={styles.faqList}>
            {FAQ.map((item, i) => (
              <div key={i} style={styles.faqItem}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={styles.faqQuestion}
                >
                  <span>{item.q}</span>
                  <span style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </button>
                {openFaq === i && (
                  <p style={styles.faqAnswer}>{item.a}</p>
                )}
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
    textAlign: 'center',
    marginBottom: '48px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px',
    fontSize: '0.95rem',
  },
  toggleBtn: {
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.3s',
  },
  toggleDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute',
    top: '2px',
    transition: 'transform 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  saveBadge: {
    padding: '2px 8px',
    borderRadius: '8px',
    background: 'rgba(6, 214, 160, 0.1)',
    color: '#06D6A0',
    fontSize: '0.75rem',
    fontWeight: 800,
  },
  planCard: {
    background: 'white',
    borderRadius: '24px',
    padding: '32px',
    border: '2px solid #E8ECF1',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  planCardPopular: {
    transform: 'scale(1.05)',
    boxShadow: '0 8px 40px rgba(108, 99, 255, 0.2)',
  },
  planBadge: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 20px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  planHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  planPrice: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  priceAmount: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#2D3436',
  },
  pricePeriod: {
    fontSize: '1rem',
    color: '#636E72',
    fontWeight: 600,
  },
  annualNote: {
    fontSize: '0.8rem',
    color: '#06D6A0',
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: '8px',
    background: 'rgba(6, 214, 160, 0.1)',
  },
  planFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.9rem',
  },
  planBtn: {
    padding: '16px',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  comparison: {
    marginTop: '80px',
  },
  compTable: {
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #E8ECF1',
  },
  compRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '14px 20px',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  compLabel: {
    fontWeight: 700,
    color: '#2D3436',
  },
  compCell: {
    textAlign: 'center',
    fontWeight: 600,
    color: '#636E72',
  },
  faqSection: {
    marginTop: '80px',
    maxWidth: '700px',
    margin: '80px auto 0',
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  faqItem: {
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #E8ECF1',
    overflow: 'hidden',
  },
  faqQuestion: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '18px 20px',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#2D3436',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    textAlign: 'left',
  },
  faqAnswer: {
    padding: '0 20px 18px',
    color: '#636E72',
    fontSize: '0.95rem',
    lineHeight: 1.7,
  },
}
