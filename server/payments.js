// =======================================================
// Stripe payments (optional)
// Configure via environment variables:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BASE_URL
// If STRIPE_SECRET_KEY is missing, payments are disabled.
// =======================================================
import Stripe from 'stripe'
import db from './db.js'
import { onPaymentReceived } from './email.js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const BASE_URL = process.env.BASE_URL || 'https://mazujupasaulis.lt'

let stripe = null
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY)
  console.log('💳 Stripe: configured')
} else {
  console.log('💳 Stripe: not configured (set STRIPE_SECRET_KEY to enable)')
}

export function stripeEnabled() {
  return !!stripe
}

export async function createCheckoutSession({ order, items, user }) {
  if (!stripe) throw new Error('Mokėjimai šiuo metu nepasiekiami. Susisiekite su administracija.')

  const line_items = items.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.title,
        images: item.image_url ? [`${BASE_URL}${item.image_url}`] : [],
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity || 1,
  }))

  // Apply coupon as Stripe discount if present
  const sessionParams = {
    mode: 'payment',
    line_items,
    customer_email: user.email,
    client_reference_id: String(order.id),
    success_url: `${BASE_URL}/?payment=success&order=${order.id}`,
    cancel_url: `${BASE_URL}/?payment=cancelled&order=${order.id}`,
    metadata: { order_id: String(order.id), user_id: String(user.id) },
  }

  if (order.discount && order.discount > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(order.discount * 100),
      currency: 'eur',
      duration: 'once',
      name: order.coupon_code ? `Kuponas: ${order.coupon_code}` : 'Nuolaida',
    })
    sessionParams.discounts = [{ coupon: coupon.id }]
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  // Log the payment attempt
  db.prepare('INSERT INTO payments (order_id, provider, provider_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    order.id, 'stripe', session.id, order.total, 'EUR', 'pending'
  )

  return session
}

export async function handleStripeWebhook(req, res) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook not configured' })
  }

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orderId = parseInt(session.client_reference_id || session.metadata?.order_id)
    if (orderId) {
      // Update payment status
      db.prepare("UPDATE payments SET status = 'completed' WHERE provider_id = ?").run(session.id)

      // Update order status
      db.prepare("UPDATE orders SET status = 'processing' WHERE id = ?").run(orderId)

      // Send confirmation email
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
      const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(order.user_id)
      if (user) {
        onPaymentReceived({ order, user }).catch(err => console.warn('Email failed:', err.message))
      }

      console.log(`💳 Payment completed for order #${orderId}`)
    }
  } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object
    db.prepare("UPDATE payments SET status = 'failed' WHERE provider_id = ?").run(session.id)
  }

  res.json({ received: true })
}
