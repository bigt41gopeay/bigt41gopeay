/**
 * ManoKRM Webhook Server
 *
 * Listens for GitHub push webhooks and auto-deploys.
 * Runs on port 9000 alongside nginx.
 *
 * Setup:
 *   1. On server: WEBHOOK_SECRET=your-secret node webhook.js
 *   2. On GitHub: Settings → Webhooks → Add webhook
 *      - Payload URL: http://mano.oktoja.lt:9000/deploy
 *      - Content type: application/json
 *      - Secret: your-secret
 *      - Events: Just the push event
 */

import { createServer } from 'http'
import { createHmac } from 'crypto'
import { execFile } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.WEBHOOK_PORT || 9000
const SECRET = process.env.WEBHOOK_SECRET || 'change-me-to-a-secret'
const DEPLOY_SCRIPT = join(__dirname, 'deploy.sh')

let deploying = false

function verifySignature(payload, signature) {
  if (!SECRET || SECRET === 'change-me-to-a-secret') return true // skip if no secret set
  if (!signature) return false
  const hmac = createHmac('sha256', SECRET)
  hmac.update(payload)
  const expected = 'sha256=' + hmac.digest('hex')
  return signature === expected
}

function runDeploy() {
  if (deploying) {
    console.log('⏳ Deploy already in progress, skipping')
    return
  }
  deploying = true
  console.log(`🚀 ${new Date().toISOString()} — Starting deploy...`)

  execFile('bash', [DEPLOY_SCRIPT], { timeout: 120000 }, (err, stdout, stderr) => {
    deploying = false
    if (err) {
      console.error('❌ Deploy failed:', err.message)
      if (stderr) console.error(stderr)
    } else {
      console.log(`✅ ${new Date().toISOString()} — Deploy complete!`)
    }
  })
}

const server = createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', deploying }))
    return
  }

  // Deploy endpoint
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      // Verify GitHub signature
      const sig = req.headers['x-hub-signature-256']
      if (!verifySignature(body, sig)) {
        console.log('⚠️ Invalid signature, rejecting')
        res.writeHead(401)
        res.end('Unauthorized')
        return
      }

      // Check if it's a push to our branch
      try {
        const payload = JSON.parse(body)
        const branch = payload.ref?.replace('refs/heads/', '') || ''
        console.log(`📩 Webhook received for branch: ${branch}`)

        if (branch === 'claude/examine-server-deployment-UTbjL' || branch === 'main') {
          runDeploy()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, message: 'Deploy triggered' }))
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, message: `Ignored branch: ${branch}` }))
        }
      } catch {
        // If not JSON, still deploy (manual trigger)
        runDeploy()
        res.writeHead(200)
        res.end('Deploy triggered')
      }
    })
    return
  }

  // Manual trigger (GET)
  if (req.method === 'GET' && req.url === '/deploy') {
    runDeploy()
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Deploy triggered! Check /health for status.')
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🪝 ManoKRM Webhook Server running on port ${PORT}`)
  console.log(`   Health:  http://localhost:${PORT}/health`)
  console.log(`   Deploy:  POST http://localhost:${PORT}/deploy`)
  console.log(`   Secret:  ${SECRET === 'change-me-to-a-secret' ? '⚠️ NOT SET (using default)' : '✅ Set'}`)
})
