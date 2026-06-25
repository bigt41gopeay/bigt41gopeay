import { LogoMark } from './Header'

const PRODUKTAI = [
  { id: 'books', label: 'Knygos' },
  { id: 'games', label: 'Žaidimai' },
  { id: 'courses', label: 'Mokymai' },
  { id: 'giftcards', label: 'Dovanų kuponai' },
]
const APIE = [
  { id: 'about', label: 'Mūsų istorija' },
  { id: 'about', label: 'Vertybės' },
  { id: 'about', label: 'Komanda' },
  { id: 'affiliate', label: 'Partnerystė' },
]
const PAGALBA = [
  { id: 'store', label: 'Pristatymas' },
  { id: 'store', label: 'Grąžinimai' },
  { id: 'profile', label: 'Mano profilis' },
  { id: 'orders', label: 'Užsakymai' },
]

const SOCIAL = [
  { label: 'Facebook', url: 'https://facebook.com', icon: 'fb' },
  { label: 'Instagram', url: 'https://instagram.com', icon: 'ig' },
  { label: 'YouTube', url: 'https://youtube.com', icon: 'yt' },
]

function SocialIcon({ kind }) {
  if (kind === 'fb') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.5C10.4 7.1 11.8 6 13.9 6c1 0 2 .2 2 .2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12H16l-.3 3h-2.6v7A10 10 0 0 0 22 12z" /></svg>
  )
  if (kind === 'ig') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
  )
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 12s0-3.4-.4-5c-.2-.9-.9-1.6-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 8.6 1 12 1 12s0 3.4.4 5c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-5 .4-5zM10 15.5v-7l6 3.5-6 3.5z" /></svg>
  )
}

function FooterColumn({ title, items, onNavigate }) {
  return (
    <div>
      <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'white', marginBottom: 14, letterSpacing: '-0.2px' }}>{title}</h4>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <li key={i}>
            <a onClick={() => onNavigate(it.id)}
               style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer({ onNavigate, compact = false }) {
  if (compact) {
    return (
      <footer style={{ background: 'var(--ink)', color: 'rgba(255,255,255,0.8)', padding: '24px 0', marginTop: 'auto' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <a onClick={() => onNavigate('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <LogoMark size={36} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'white' }}>
              Mažųjų<span style={{ color: 'var(--primary-light)' }}>Pasaulis</span>
            </span>
          </a>
          <p style={{ fontSize: 14, fontWeight: 500 }}>
            © 2026 MažųjųPasaulis · Sukurta su <span style={{ color: 'var(--coral)' }}>💜</span> Lietuvoje
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer style={{ background: 'var(--ink)', color: 'rgba(255,255,255,0.85)', marginTop: 'auto' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '56px 32px 28px' }}>
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
          gap: 48,
        }}>
          <div>
            <a onClick={() => onNavigate('home')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16, textDecoration: 'none' }}>
              <LogoMark size={42} />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 21, color: 'white' }}>
                Mažųjų<span style={{ color: 'var(--primary-light)' }}>Pasaulis</span>
              </span>
            </a>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', maxWidth: 320, marginBottom: 18, fontWeight: 500 }}>
              Lietuviška vaikų prekės ženklas: autorinės knygos, edukaciniai žaidimai ir mokymai tėvams. ADHD draugiški, psichologų patvirtinti.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {SOCIAL.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer noopener" title={s.label}
                   style={{
                     width: 36, height: 36, borderRadius: 10,
                     background: 'rgba(255,255,255,0.08)',
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                     color: 'white',
                   }}>
                  <SocialIcon kind={s.icon} />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Produktai" items={PRODUKTAI} onNavigate={onNavigate} />
          <FooterColumn title="Apie" items={APIE} onNavigate={onNavigate} />
          <FooterColumn title="Pagalba" items={PAGALBA} onNavigate={onNavigate} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 36, paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            © 2026 MažųjųPasaulis · Sukurta su <span style={{ color: 'var(--coral)' }}>💜</span> Lietuvoje
          </p>
          <div style={{ display: 'flex', gap: 18, fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            <span>Privatumas</span>
            <span>Taisyklės</span>
            <span>Kontaktai</span>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 880px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 560px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
