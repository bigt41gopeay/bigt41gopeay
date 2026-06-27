// Active child session — tracks which child profile is currently "playing".
// All game score writes go through recordProgress() which silently routes:
//   - logged in + active child → POST /api/children/:id/progress
//   - anonymous (no parent or no active child) → localStorage only
//
// The frontend imports this from games to record sessions without caring
// whether the data ends up in the cloud or local cache. Same call shape.

import { api, hasToken } from '../api'

const ACTIVE_CHILD_KEY = 'mazuju_active_child_id'
const LOCAL_PROGRESS_KEY = 'mazuju_local_progress'

let listeners = new Set()
function notify() { listeners.forEach(l => { try { l() } catch { /* ignore */ } }) }

export function getActiveChildId() {
  try {
    const v = localStorage.getItem(ACTIVE_CHILD_KEY)
    return v ? Number(v) : null
  } catch { return null }
}

export function setActiveChildId(id) {
  try {
    if (id == null) localStorage.removeItem(ACTIVE_CHILD_KEY)
    else localStorage.setItem(ACTIVE_CHILD_KEY, String(id))
  } catch { /* ignore */ }
  notify()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Record a play session.
 * Resilient: never throws to callers; logs to console on failure.
 *
 * @param {object} session
 * @param {string} session.gameId      - game identifier (e.g. 'neuroplanet')
 * @param {number} session.score       - score earned
 * @param {number} [session.durationS] - elapsed seconds
 * @param {number} [session.accuracy]  - 0..1 fraction
 * @param {object} [session.meta]      - extra JSON (errors, level, etc.)
 */
export async function recordProgress(session) {
  if (!session || !session.gameId) return
  const childId = getActiveChildId()
  if (hasToken() && childId) {
    try {
      await api.recordProgress(childId, session)
      return
    } catch (e) {
      // Fall through to local cache on network error
      console.warn('[childSession] cloud save failed, falling back local:', e.message)
    }
  }
  // anonymous / no active child → localStorage append
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.push({ ...session, at: Date.now() })
    // cap so the file doesn't grow unbounded
    if (arr.length > 200) arr.splice(0, arr.length - 200)
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(arr))
  } catch { /* ignore */ }
}

export function getLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function clearLocalProgress() {
  try { localStorage.removeItem(LOCAL_PROGRESS_KEY) } catch { /* ignore */ }
}
