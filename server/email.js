// =======================================================
// Email notifications via Nodemailer (SMTP)
// Configure via environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// If not configured, emails are logged to console only.
// =======================================================
import nodemailer from 'nodemailer'

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = 'MažųjųPasaulis <info@mazujupasaulis.lt>',
  ADMIN_EMAIL = 'admin@mazujupasaulis.lt',
} = process.env

let transporter = null
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  console.log('📧 Email: SMTP transport configured')
} else {
  console.log('📧 Email: SMTP not configured, using console logger')
}

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('\n📧 [EMAIL LOG]')
    console.log('   To:', to)
    console.log('   Subject:', subject)
    console.log('   Body:', text || html?.replace(/<[^>]*>/g, '').slice(0, 200))
    console.log('')
    return { mocked: true }
  }

  return transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, ''),
  })
}

const BRAND_HEADER = `
<div style="background: linear-gradient(135deg, #6C63FF, #9B5DE5); padding: 32px 24px; text-align: center; border-radius: 16px 16px 0 0;">
  <h1 style="color: white; margin: 0; font-size: 28px; font-family: system-ui, sans-serif;">📖✨ MažųjųPasaulis</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Mokymasis su džiaugsmu!</p>
</div>
`

const BRAND_FOOTER = `
<div style="background: #F9FAFB; padding: 24px; text-align: center; border-radius: 0 0 16px 16px; color: #636E72; font-size: 12px; font-family: system-ui, sans-serif;">
  <p style="margin: 0;">© 2026 MažųjųPasaulis. Visos teisės saugomos.</p>
  <p style="margin: 4px 0 0;">
    <a href="https://mazujupasaulis.lt" style="color: #6C63FF; text-decoration: none;">mazujupasaulis.lt</a> ·
    info@mazujupasaulis.lt · +370 600 12345
  </p>
</div>
`

function wrap(content) {
  return `
<div style="max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif;">
  ${BRAND_HEADER}
  <div style="background: white; padding: 32px 24px;">
    ${content}
  </div>
  ${BRAND_FOOTER}
</div>
  `.trim()
}

// =======================================================
// EVENT HANDLERS
// =======================================================

export async function onUserRegistered({ name, email }) {
  const html = wrap(`
    <h2 style="color: #2D3436; margin: 0 0 16px;">👋 Sveiki, ${name}!</h2>
    <p style="color: #636E72; line-height: 1.6;">
      Ačiū, kad prisijungėte prie MažųjųPasaulis bendruomenės! Dabar galite:
    </p>
    <ul style="color: #636E72; line-height: 1.8;">
      <li>📚 Naršyti autorines knygutes</li>
      <li>🎮 Žaisti lavinančius žaidimus</li>
      <li>🎓 Mokytis su mūsų kursais</li>
      <li>🛒 Pirkti unikalius edukacinius produktus</li>
    </ul>
    <div style="text-align: center; margin: 32px 0 0;">
      <a href="https://mazujupasaulis.lt" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6C63FF, #9B5DE5); color: white; text-decoration: none; border-radius: 14px; font-weight: 800;">
        🚀 Apsilankyti svetainėje
      </a>
    </div>
  `)

  return sendEmail({
    to: email,
    subject: '👋 Sveiki atvykę į MažųjųPasaulis!',
    html,
  })
}

export async function onOrderCreated({ order, items, user }) {
  const itemsHtml = items.map(i =>
    `<tr><td style="padding: 10px; border-bottom: 1px solid #E8ECF1;">${i.emoji} ${i.title}</td><td style="padding: 10px; text-align: center; border-bottom: 1px solid #E8ECF1;">${i.quantity}</td><td style="padding: 10px; text-align: right; border-bottom: 1px solid #E8ECF1;"><strong>€${(i.price * i.quantity).toFixed(2)}</strong></td></tr>`
  ).join('')

  const html = wrap(`
    <h2 style="color: #2D3436; margin: 0 0 16px;">📦 Užsakymas #${order.id} gautas!</h2>
    <p style="color: #636E72; line-height: 1.6;">
      Ačiū, ${user.name}! Jūsų užsakymas gautas ir netrukus bus apdorotas.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <thead>
        <tr style="background: #F9FAFB;">
          <th style="padding: 12px; text-align: left;">Produktas</th>
          <th style="padding: 12px; text-align: center;">Kiekis</th>
          <th style="padding: 12px; text-align: right;">Kaina</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 16px 12px; text-align: right;"><strong>Iš viso:</strong></td>
          <td style="padding: 16px 12px; text-align: right; font-size: 20px; color: #6C63FF;"><strong>€${order.total.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <p style="color: #636E72; line-height: 1.6; font-size: 14px;">
      Statusą galite stebėti savo paskyroje. Jei turite klausimų – parašykite mums info@mazujupasaulis.lt.
    </p>
  `)

  // Notify customer
  await sendEmail({
    to: user.email,
    subject: `📦 Užsakymas #${order.id} patvirtintas - MažųjųPasaulis`,
    html,
  })

  // Notify admin
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔔 Naujas užsakymas #${order.id} (€${order.total.toFixed(2)})`,
    html: wrap(`
      <h2>🔔 Naujas užsakymas #${order.id}</h2>
      <p><strong>Klientas:</strong> ${user.name} (${user.email})</p>
      <p><strong>Suma:</strong> €${order.total.toFixed(2)}</p>
      <p><strong>Prekės:</strong> ${items.length} vnt.</p>
      <p>Prisijunkite prie admin skydelio norėdami apdoroti užsakymą.</p>
    `),
  })
}

export async function onMembershipChanged({ user, plan }) {
  const planNames = { free: '🌱 Nemokamas', basic: '⭐ Šeimos', premium: '👑 Premium' }
  const html = wrap(`
    <h2 style="color: #2D3436;">Narystė atnaujinta!</h2>
    <p style="color: #636E72; line-height: 1.6;">
      Sveikiname, ${user.name}! Jūsų narystė pakeista į: <strong>${planNames[plan] || plan}</strong>
    </p>
    <p style="color: #636E72; line-height: 1.6;">
      Dabar turite prieigą prie visų šio plano funkcijų. Mėgaukitės mokymusi su MažųjųPasaulis!
    </p>
  `)

  return sendEmail({
    to: user.email,
    subject: `⭐ Narystė atnaujinta: ${planNames[plan] || plan}`,
    html,
  })
}

export async function onPaymentReceived({ order, user }) {
  const html = wrap(`
    <h2 style="color: #06D6A0;">✅ Apmokėjimas gautas!</h2>
    <p style="color: #636E72; line-height: 1.6;">
      Užsakymas #${order.id} sėkmingai apmokėtas. Suma: <strong>€${order.total.toFixed(2)}</strong>
    </p>
    <p style="color: #636E72; line-height: 1.6;">
      Netrukus paruošime ir išsiųsime jūsų prekes. Sekite savo el. paštą dėl atnaujinimų!
    </p>
  `)

  return sendEmail({
    to: user.email,
    subject: `✅ Apmokėjimas gautas - Užsakymas #${order.id}`,
    html,
  })
}
