// Azure Text-to-Speech proxy with on-disk MP3 caching.
// Endpoint: GET /api/tts?text=...&voice=ona|leonas
//
// Cache: server/cache/tts/<sha256(text+voice)>.mp3
// Rate: 60 req/min/IP via express-rate-limit
// Falls back gracefully: if AZURE_SPEECH_KEY is missing, returns 503
// so the frontend can fall back to Web Speech API.

import express from 'express'
import { createHash } from 'crypto'
import { promises as fs, createReadStream, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

const CACHE_DIR = path.join(__dirname, 'cache', 'tts')
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

const MAX_TEXT_LEN = 200

const VOICES = {
  ona:    'lt-LT-OnaNeural',
  leonas: 'lt-LT-LeonasNeural',
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Per daug užklausų. Pabandykite po minutės.' },
})

function escapeSsml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

router.get('/tts', limiter, async (req, res) => {
  const text = (req.query.text || '').toString().trim()
  const voiceKey = (req.query.voice || 'ona').toString().toLowerCase()
  const azureVoice = VOICES[voiceKey] || VOICES.ona

  if (!text) return res.status(400).json({ error: 'Trūksta `text` parametro' })
  if (text.length > MAX_TEXT_LEN) {
    return res.status(400).json({ error: `Tekstas per ilgas (max ${MAX_TEXT_LEN} simb.)` })
  }

  const hash = createHash('sha256').update(text + '|' + azureVoice).digest('hex')
  const filePath = path.join(CACHE_DIR, `${hash}.mp3`)

  // 1. Cache hit — stream from disk
  if (existsSync(filePath)) {
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Cache', 'HIT')
    return createReadStream(filePath).pipe(res)
  }

  // 2. Azure config check — graceful 503 so client can fall back
  const region = process.env.AZURE_SPEECH_REGION || 'westeurope'
  const key = process.env.AZURE_SPEECH_KEY
  if (!key) {
    return res.status(503).json({
      error: 'TTS dar nesukonfigūruotas (trūksta AZURE_SPEECH_KEY)',
    })
  }

  // 3. Azure call
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="lt-LT">` +
    `<voice name="${azureVoice}">${escapeSsml(text)}</voice>` +
    `</speak>`

  try {
    const azureRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'MazujuPasaulisTTS',
      },
      body: ssml,
    })

    if (!azureRes.ok) {
      const errText = await azureRes.text().catch(() => '')
      console.error('[tts] Azure error', azureRes.status, errText.slice(0, 200))
      return res.status(502).json({ error: 'Azure TTS klaida', status: azureRes.status })
    }

    const buffer = Buffer.from(await azureRes.arrayBuffer())

    // Persist async (don't block response)
    fs.writeFile(filePath, buffer).catch(e => console.error('[tts] cache write failed', e))

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Cache', 'MISS')
    res.send(buffer)
  } catch (err) {
    console.error('[tts] request error', err)
    res.status(502).json({ error: 'Nepavyko susisiekti su Azure' })
  }
})

router.get('/tts/health', (_req, res) => {
  res.json({
    configured: Boolean(process.env.AZURE_SPEECH_KEY),
    region: process.env.AZURE_SPEECH_REGION || 'westeurope',
    voices: Object.keys(VOICES),
    cacheDir: CACHE_DIR,
  })
})

export default router
