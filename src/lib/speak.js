// Lithuanian text-to-speech with Azure Neural voices (via /api/tts proxy)
// and graceful fallback to Web Speech API.
//
// Usage:
//   import { speak, stop } from './lib/speak'
//   speak('Sveiki, vaikai!')
//   speak('Raidė A', { voice: 'ona', rate: 0.9 })
//   stop()
//
// localStorage 'tts_provider' switches between 'azure' (default) and 'browser'.

const MEM_CACHE = new Map()       // text|voice -> blob URL (per session)
const FAILED_BACKEND = { value: false } // once true, skip /api/tts until reload
let currentAudio = null
let cachedBrowserVoices = null

function loadBrowserVoices() {
  if (!('speechSynthesis' in window)) return []
  cachedBrowserVoices = window.speechSynthesis.getVoices()
  return cachedBrowserVoices
}

function pickBrowserVoice() {
  const voices = cachedBrowserVoices || loadBrowserVoices()
  if (!voices || !voices.length) return null
  // Prefer Lithuanian voices, then any "lt" prefix, then anything.
  return (
    voices.find(v => /^(lt-LT|lt)$/i.test(v.lang) && /enhanced|premium|neural/i.test(v.name)) ||
    voices.find(v => /^(lt-LT|lt)$/i.test(v.lang)) ||
    voices.find(v => /^lt/i.test(v.lang)) ||
    null
  )
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadBrowserVoices()
  window.speechSynthesis.onvoiceschanged = loadBrowserVoices
}

export function stop() {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch { /* ignore */ }
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function speakBrowser(text, opts = {}) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickBrowserVoice()
    if (v) u.voice = v
    u.lang = v ? v.lang : 'lt-LT'
    u.rate = opts.rate ?? 0.85
    u.pitch = opts.pitch ?? 1.0
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export async function speak(text, opts = {}) {
  if (!text) return
  const t = String(text).trim()
  if (!t) return

  stop()

  const provider = localStorage.getItem('tts_provider') || 'azure'
  if (provider === 'browser' || opts.provider === 'browser') {
    return speakBrowser(t, opts)
  }
  if (FAILED_BACKEND.value) {
    return speakBrowser(t, opts)
  }

  const voice = opts.voice || 'ona'
  const cacheKey = `${voice}|${t}`

  try {
    let url = MEM_CACHE.get(cacheKey)
    if (!url) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 3500)
      const res = await fetch(`/api/tts?text=${encodeURIComponent(t)}&voice=${voice}`, {
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`tts http ${res.status}`)
      const blob = await res.blob()
      if (!blob.size) throw new Error('tts empty blob')
      url = URL.createObjectURL(blob)
      MEM_CACHE.set(cacheKey, url)
    }

    const a = new Audio(url)
    a.preload = 'auto'
    currentAudio = a
    if (opts.rate) a.playbackRate = opts.rate
    await a.play()
  } catch (err) {
    // Only mark backend failed for network/timeout errors (not user-cancel)
    if (err && err.name !== 'AbortError') {
      console.warn('[speak] backend failed, falling back to browser TTS:', err.message)
    }
    if (err && err.name !== 'AbortError' && err.message && /http 5/i.test(err.message)) {
      // server error - remember so we don't hammer it
      FAILED_BACKEND.value = true
    }
    speakBrowser(t, opts)
  }
}

// Optional helper: prime cache for common phrases on idle
export function prefetch(phrases, voice = 'ona') {
  if (FAILED_BACKEND.value) return
  if (!Array.isArray(phrases)) return
  const run = () => {
    phrases.forEach(p => {
      const t = String(p).trim()
      if (!t || t.length > 200) return
      const key = `${voice}|${t}`
      if (MEM_CACHE.has(key)) return
      fetch(`/api/tts?text=${encodeURIComponent(t)}&voice=${voice}`)
        .then(r => r.ok ? r.blob() : null)
        .then(b => { if (b) MEM_CACHE.set(key, URL.createObjectURL(b)) })
        .catch(() => { /* ignore */ })
    })
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 })
  else setTimeout(run, 800)
}
