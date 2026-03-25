/**
 * ManoKRM Sync Server
 *
 * Simple JSON file-based sync server for multi-device access.
 * Runs alongside the Vite dev server on the same Contabo VPS.
 *
 * Setup on server:
 *   cd /var/www/mano-crm/server
 *   npm install express cors
 *   node sync-server.js
 *
 * Or with PM2 for auto-restart:
 *   pm2 start sync-server.js --name manocrm-sync
 *
 * API:
 *   GET  /api/sync       → get all data
 *   POST /api/sync       → save all data
 *   GET  /api/sync/key   → get specific key
 *   POST /api/sync/key   → save specific key
 *   GET  /api/health     → health check
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const PORT = process.env.SYNC_PORT || 3001
const SYNC_KEY = process.env.SYNC_KEY || 'manocrm-default-key-change-me'

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function getDataPath(key) {
  // Sanitize key to prevent directory traversal
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '')
  return join(DATA_DIR, `${safe}.json`)
}

function readData(key) {
  const path = getDataPath(key)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function writeData(key, data) {
  writeFileSync(getDataPath(key), JSON.stringify(data, null, 2), 'utf-8')
}

function readAllData() {
  const keys = ['contacts', 'projects', 'tasks', 'communications', 'credentials', 'invoices', 'settings', 'leads', 'notes']
  const result = {}
  for (const key of keys) {
    result[key] = readData(key)
  }
  result._syncDate = new Date().toISOString()
  return result
}

function writeAllData(data) {
  const keys = ['contacts', 'projects', 'tasks', 'communications', 'credentials', 'invoices', 'settings', 'leads', 'notes']
  for (const key of keys) {
    if (data[key] != null) {
      writeData(key, data[key])
    }
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 10_000_000) { reject(new Error('Body too large')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function json(res, data, status = 200) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function auth(req) {
  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '')
  return token === SYNC_KEY
}

const server = createServer(async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  // Health check (no auth)
  if (path === '/api/health') {
    return json(res, { status: 'ok', time: new Date().toISOString() })
  }

  // Auth check
  if (!auth(req)) {
    return json(res, { error: 'Unauthorized' }, 401)
  }

  try {
    // GET /api/sync — get all data
    if (req.method === 'GET' && path === '/api/sync') {
      return json(res, readAllData())
    }

    // POST /api/sync — save all data
    if (req.method === 'POST' && path === '/api/sync') {
      const data = await parseBody(req)
      writeAllData(data)
      return json(res, { ok: true, time: new Date().toISOString() })
    }

    // GET /api/sync/:key
    const keyMatch = path.match(/^\/api\/sync\/(\w+)$/)
    if (req.method === 'GET' && keyMatch) {
      return json(res, readData(keyMatch[1]))
    }

    // POST /api/sync/:key
    if (req.method === 'POST' && keyMatch) {
      const data = await parseBody(req)
      writeData(keyMatch[1], data)
      return json(res, { ok: true })
    }

    json(res, { error: 'Not found' }, 404)
  } catch (e) {
    json(res, { error: e.message }, 500)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 ManoKRM Sync Server running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`   Sync key: ${SYNC_KEY.slice(0, 8)}...`)
})
