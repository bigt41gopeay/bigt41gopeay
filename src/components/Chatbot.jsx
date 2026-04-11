import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

// Predefined Q&A that work without AI backend (fast, no costs)
const QUICK_REPLIES = [
  { q: 'Kaip užsisakyti knygą?', keywords: ['užsakyti', 'užsakymas', 'pirkti', 'kaip', 'knyga', 'užsisakyti'] },
  { q: 'Kiek kainuoja narystė?', keywords: ['narystė', 'kaina', 'kainuoja', 'planai', 'premium'] },
  { q: 'Kokios knygos tinka ADHD vaikams?', keywords: ['adhd', 'vaikai', 'knygos'] },
  { q: 'Nuo kokio amžiaus tinka žaidimai?', keywords: ['amžius', 'žaidimai', 'metai'] },
  { q: 'Kaip naudotis kuponais?', keywords: ['kuponas', 'nuolaida', 'kodas'] },
  { q: 'Kaip susisiekti su jumis?', keywords: ['kontaktai', 'susisiekti', 'telefonas', 'pastas'] },
]

const CANNED_RESPONSES = {
  'užsakyti': {
    text: '🛒 Kad užsisakytumėte knygą:\n\n1. Eikite į **Parduotuvę** (viršuje)\n2. Pasirinkite norimą produktą\n3. Spauskite **"Pirkti"**\n4. Krepšelyje įveskite pristatymo duomenis\n5. Apmokėkite su Stripe arba laukite mūsų susisiekimo\n\nLengva, ar ne? 😊',
    actions: [{ label: '🛒 Eiti į parduotuvę', page: 'store' }],
  },
  'narystė': {
    text: '⭐ **Mūsų narystės planai:**\n\n🌱 **Nemokamas** – 3 knygos/mėn., 2 žaidimai\n⭐ **Šeimos** – €4.99/mėn. – visos knygos ir kursai, 3 vaikų profiliai\n👑 **Premium** – €9.99/mėn. – viskas + offline atsisiuntimai, neribotai profilių\n\nGeriausias pasirinkimas – **Šeimos** planas šeimai! 💜',
    actions: [{ label: '⭐ Pasirinkti planą', page: 'membership' }],
  },
  'adhd': {
    text: '🧠 **ADHD draugiški produktai:**\n\n📚 **Knygos:**\n• Mano smegenys – superherojus!\n• Vėžliuko ramybės paslaptis\n• Ramybės minutės\n\n🧸 **Fiziniai produktai:**\n• Sensorinis fidget žaislas\n• Vizualus laikmatis\n• Dienotvarkės magnetinė lenta\n\n🎓 **Kursai:**\n• ADHD superherojus\n• Ramybės ir kvėpavimo pratimai\n\nVisi produktai specialiai pritaikyti! 💙',
    actions: [{ label: '🛒 Peržiūrėti', page: 'store' }],
  },
  'amžius': {
    text: '👶 **Mūsų žaidimai ir knygos tinka:**\n\n• **3-5 metų** – Spalvų maišytuvas, paprastos istorijos\n• **4-8 metų** – Atminties iššūkis, pasitikėjimo knygos\n• **6-10 metų** – Matematikos burtininkas, emocijos\n• **7-12 metų** – Žodžių dėlionė, ADHD kursai\n\nKiekvienam amžiui turime tinkamo turinio! 🌟',
    actions: [{ label: '🎮 Žaidimai', page: 'games' }, { label: '📚 Knygos', page: 'books' }],
  },
  'kuponas': {
    text: '🎯 **Kaip naudoti kuponą:**\n\n1. Pridėkite produktus į krepšelį\n2. Atidarykite krepšelį (🛒 viršuje)\n3. Įveskite kodą į **"Nuolaidos kodas"** laukelį\n4. Spauskite **"Taikyti"**\n5. Matysite nuolaidą ir galutinę kainą\n\n✨ **Populiarūs kodai:**\n• `STARTAS2026` – 20% nuolaida (min. €20)\n• `WELCOME10` – 10% naujiems\n• `ADHD5` – €5 nuolaida (min. €25)',
    actions: [{ label: '🛒 Parduotuvė', page: 'store' }],
  },
  'kontaktai': {
    text: '📞 **Susisiekite su mumis:**\n\n📧 El. paštas: info@mazujupasaulis.lt\n📱 Telefonas: +370 600 12345\n📍 Adresas: Vilnius, Lietuva\n\n🕘 **Darbo laikas:**\nPirmadienis - Penktadienis: 9:00 - 18:00\nŠeštadienis: 10:00 - 15:00\n\nStengiamės atsakyti per 24 val.! 💜',
  },
  default: {
    text: '🤔 Labai įdomus klausimas! Aš dar mokausi. Pabandykite:\n\n• Spustelėkite vieną iš pasiūlymų žemiau\n• Arba parašykite: "kaip užsisakyti", "narystė", "ADHD", "amžius", "kuponas", "kontaktai"\n\nArba susisiekite tiesiogiai: **info@mazujupasaulis.lt** 📧',
  },
}

function findResponse(message) {
  const lower = message.toLowerCase()
  const words = lower.split(/\s+/)

  // Score each canned response by keyword matches
  const scores = {}
  for (const [key, response] of Object.entries(CANNED_RESPONSES)) {
    if (key === 'default') continue
    const keywords = [key, ...(response.keywords || [])]
    scores[key] = 0
    for (const keyword of keywords) {
      if (lower.includes(keyword)) scores[key] += 2
      for (const word of words) {
        if (word.length > 3 && keyword.includes(word)) scores[key] += 1
      }
    }
  }

  // Find best match
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  if (best && best[1] > 0) return CANNED_RESPONSES[best[0]]
  return CANNED_RESPONSES.default
}

// Simple markdown rendering for chat
function renderMsg(text) {
  return text
    .split('\n')
    .map((line, i) => {
      // Bold
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Inline code
      const code = bold.replace(/`(.+?)`/g, '<code style="padding: 2px 6px; border-radius: 4px; background: rgba(108, 99, 255, 0.1); font-family: monospace; font-size: 0.9em;">$1</code>')
      return `<div key=${i} style="min-height: 1.2em;">${code || '&nbsp;'}</div>`
    })
    .join('')
}

export default function Chatbot({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: '👋 Labas! Aš esu **MažųjųHelp** – virtualus MažųjųPasaulis pagalbininkas!\n\nKuo galiu padėti? 😊',
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = (text) => {
    if (!text.trim()) return

    // Add user message
    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    // Simulate typing delay, then respond
    setTimeout(() => {
      const response = findResponse(text)
      setMessages(prev => [...prev, { role: 'bot', text: response.text, actions: response.actions }])
      setTyping(false)
    }, 600 + Math.random() * 400)
  }

  const handleQuick = (q) => {
    sendMessage(q)
  }

  const handleAction = (page) => {
    onNavigate?.(page)
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={styles.floatBtn}
          aria-label="Atidaryti pokalbį"
        >
          <span style={{ fontSize: '1.8rem' }}>💬</span>
          <span style={styles.floatPing}></span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div style={styles.window}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.avatar}>🤖</div>
              <div>
                <strong style={{ color: 'white' }}>MažųjųHelp</strong>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                  <span style={styles.onlineDot}></span> Online · atsako per kelias sekundes
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={styles.closeBtn}>✕</button>
          </div>

          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'bot' && <div style={styles.msgAvatar}>🤖</div>}
                <div style={{
                  ...styles.msgBubble,
                  ...(m.role === 'user' ? styles.userBubble : styles.botBubble),
                }}>
                  <div dangerouslySetInnerHTML={{ __html: renderMsg(m.text) }} />
                  {m.actions && (
                    <div style={styles.actions}>
                      {m.actions.map((a, j) => (
                        <button key={j} onClick={() => handleAction(a.page)} style={styles.actionBtn}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
                <div style={styles.msgAvatar}>🤖</div>
                <div style={{ ...styles.msgBubble, ...styles.botBubble }}>
                  <div style={styles.typing}>
                    <span style={styles.dot}></span>
                    <span style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
                    <span style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div style={styles.quickReplies}>
              {QUICK_REPLIES.slice(0, 4).map((qr, i) => (
                <button key={i} onClick={() => handleQuick(qr.q)} style={styles.quickBtn}>
                  {qr.q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
            style={styles.inputRow}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Parašykite žinutę..."
              style={styles.input}
              autoFocus
            />
            <button type="submit" disabled={!input.trim()} style={styles.sendBtn}>
              ➤
            </button>
          </form>

          <div style={styles.footer}>
            💡 Aš esu virtualus asistentas. Sudėtingiems klausimams rašykite: info@mazujupasaulis.lt
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  floatBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #FF6B8A)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(108, 99, 255, 0.4)',
    zIndex: 998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font)',
    position: 'fixed',
  },
  floatPing: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#06D6A0',
    border: '2px solid white',
    animation: 'pulse 2s infinite',
  },
  window: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '380px',
    maxWidth: 'calc(100vw - 32px)',
    height: '580px',
    maxHeight: 'calc(100vh - 48px)',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 999,
    fontFamily: 'var(--font)',
    border: '2px solid #E8ECF1',
  },
  header: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  },
  onlineDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#06D6A0',
    marginRight: '4px',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 800,
    fontFamily: 'var(--font)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#FAFBFF',
  },
  msgRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  msgAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  userBubble: {
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  botBubble: {
    background: 'white',
    color: '#2D3436',
    border: '1px solid #E8ECF1',
    borderBottomLeftRadius: '4px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '12px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(108, 99, 255, 0.1)',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    color: '#6C63FF',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#6C63FF',
    animation: 'typing 1.4s infinite',
  },
  quickReplies: {
    padding: '12px 16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    borderTop: '1px solid #E8ECF1',
    background: 'white',
    flexShrink: 0,
  },
  quickBtn: {
    padding: '6px 12px',
    borderRadius: '16px',
    background: 'rgba(108, 99, 255, 0.08)',
    border: '1px solid rgba(108, 99, 255, 0.2)',
    color: '#6C63FF',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #E8ECF1',
    background: 'white',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '20px',
    border: '2px solid #E8ECF1',
    fontSize: '0.9rem',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  footer: {
    padding: '8px 16px',
    fontSize: '0.7rem',
    color: '#B2BEC3',
    textAlign: 'center',
    borderTop: '1px solid #F5F5F5',
    background: 'white',
    flexShrink: 0,
  },
}

// Add animations to index.css via style tag
if (typeof document !== 'undefined' && !document.getElementById('chatbot-styles')) {
  const s = document.createElement('style')
  s.id = 'chatbot-styles'
  s.textContent = `
    @keyframes typing {
      0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `
  document.head.appendChild(s)
}
