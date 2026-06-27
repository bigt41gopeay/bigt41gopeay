// Family / children API
// Parent (users.id) owns 1..N children. Children write progress; parent reads
// dashboards. Tier limits (free=1 child, family=3, premium=∞) shown in
// response metadata so the frontend can render upgrade CTAs.

import express from 'express'
import db from './db.js'

const router = express.Router()

// Limits by membership tier — central place so business can tweak easily.
const TIER_LIMITS = {
  free:    { maxChildren: 1, dailyMinutes: 30,   reports: 'basic',     name: 'Nemokamas' },
  basic:   { maxChildren: 3, dailyMinutes: 9999, reports: 'standard',  name: 'Šeimos' },
  premium: { maxChildren: 9, dailyMinutes: 9999, reports: 'advanced',  name: 'Premium' },
}

function tierFor(membership) {
  return TIER_LIMITS[membership] || TIER_LIMITS.free
}

// --- Auth helper (resolves the parent from req.user populated by /api/auth) ---
function requireParent(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: 'Reikalingas prisijungimas' })
  const parent = db.prepare('SELECT id, membership FROM users WHERE id = ?').get(req.user.id)
  if (!parent) return res.status(401).json({ error: 'Sesija pasibaigusi' })
  req.parent = parent
  req.tier = tierFor(parent.membership)
  next()
}

// --- GET /api/children — list parent's children + tier metadata ---
router.get('/children', requireParent, (req, res) => {
  const children = db.prepare(
    'SELECT id, name, age, avatar, color, created_at, last_active FROM children WHERE parent_id = ? ORDER BY created_at'
  ).all(req.parent.id)

  res.json({
    children,
    tier: {
      ...req.tier,
      current: children.length,
      atLimit: children.length >= req.tier.maxChildren,
    },
  })
})

// --- POST /api/children — add a new child ---
router.post('/children', requireParent, (req, res) => {
  const { name, age, avatar, color } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Vaiko vardas privalomas' })

  const existing = db.prepare('SELECT COUNT(*) as c FROM children WHERE parent_id = ?').get(req.parent.id)
  if (existing.c >= req.tier.maxChildren) {
    return res.status(402).json({
      error: `Tavo plane (${req.tier.name}) gali turėti tik ${req.tier.maxChildren} vaiką(-us).`,
      upgrade: true,
      currentTier: req.parent.membership,
    })
  }

  const result = db.prepare(
    'INSERT INTO children (parent_id, name, age, avatar, color) VALUES (?, ?, ?, ?, ?)'
  ).run(req.parent.id, name.trim(), age || null, avatar || '🐣', color || '#6C63FF')

  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(result.lastInsertRowid)
  res.json({ child })
})

// --- PATCH /api/children/:id — rename / change avatar ---
router.patch('/children/:id', requireParent, (req, res) => {
  const childId = Number(req.params.id)
  const child = db.prepare('SELECT * FROM children WHERE id = ? AND parent_id = ?').get(childId, req.parent.id)
  if (!child) return res.status(404).json({ error: 'Vaikas nerastas' })

  const fields = []
  const values = []
  for (const key of ['name', 'age', 'avatar', 'color', 'pin']) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(req.body[key])
    }
  }
  if (!fields.length) return res.json({ child })
  values.push(childId)
  db.prepare(`UPDATE children SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const updated = db.prepare('SELECT * FROM children WHERE id = ?').get(childId)
  res.json({ child: updated })
})

// --- DELETE /api/children/:id ---
router.delete('/children/:id', requireParent, (req, res) => {
  const childId = Number(req.params.id)
  const child = db.prepare('SELECT * FROM children WHERE id = ? AND parent_id = ?').get(childId, req.parent.id)
  if (!child) return res.status(404).json({ error: 'Vaikas nerastas' })
  db.prepare('DELETE FROM children WHERE id = ?').run(childId)
  res.json({ ok: true })
})

// --- POST /api/children/:id/progress — record a play session ---
// Child does NOT log in directly. Parent's JWT authorises writing progress
// for any of their children.
router.post('/children/:id/progress', requireParent, (req, res) => {
  const childId = Number(req.params.id)
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, req.parent.id)
  if (!child) return res.status(404).json({ error: 'Vaikas nerastas' })

  const { gameId, score = 0, durationS = 0, accuracy = null, meta = {} } = req.body
  if (!gameId) return res.status(400).json({ error: 'Trūksta gameId' })

  db.prepare(
    'INSERT INTO child_progress (child_id, game_id, score, duration_s, accuracy, meta) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(childId, gameId, Math.round(score) || 0, Math.round(durationS) || 0, accuracy, JSON.stringify(meta))

  db.prepare('UPDATE children SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(childId)

  res.json({ ok: true })
})

// --- GET /api/children/:id/stats — parent dashboard data ---
// Returns aggregated stats + last 30-day timeline + per-game best scores.
router.get('/children/:id/stats', requireParent, (req, res) => {
  const childId = Number(req.params.id)
  const child = db.prepare('SELECT * FROM children WHERE id = ? AND parent_id = ?').get(childId, req.parent.id)
  if (!child) return res.status(404).json({ error: 'Vaikas nerastas' })

  const overall = db.prepare(`
    SELECT
      COUNT(*) as sessions,
      COALESCE(SUM(duration_s), 0) as total_seconds,
      COALESCE(SUM(score), 0) as total_score,
      COUNT(DISTINCT game_id) as games_played,
      COUNT(DISTINCT date(played_at)) as active_days
    FROM child_progress WHERE child_id = ?
  `).get(childId)

  const perGame = db.prepare(`
    SELECT
      game_id,
      COUNT(*) as sessions,
      MAX(score) as best_score,
      AVG(score) as avg_score,
      AVG(accuracy) as avg_accuracy,
      MAX(played_at) as last_played
    FROM child_progress
    WHERE child_id = ?
    GROUP BY game_id
    ORDER BY last_played DESC
  `).all(childId)

  const last30 = db.prepare(`
    SELECT date(played_at) as day, COUNT(*) as sessions, SUM(duration_s) as seconds
    FROM child_progress
    WHERE child_id = ? AND played_at >= date('now', '-30 days')
    GROUP BY date(played_at)
    ORDER BY day
  `).all(childId)

  // achievements
  const achievements = db.prepare(
    'SELECT achievement_id, unlocked_at FROM child_achievements WHERE child_id = ? ORDER BY unlocked_at DESC'
  ).all(childId)

  // recent sessions
  const recent = db.prepare(`
    SELECT game_id, score, duration_s, played_at
    FROM child_progress WHERE child_id = ?
    ORDER BY played_at DESC LIMIT 10
  `).all(childId)

  res.json({
    child,
    tier: req.tier,
    overall,
    perGame,
    last30,
    achievements,
    recent,
  })
})

// --- GET /api/children/:id/recommendations — weakness-driven suggestions ---
// Identifies games with the LOWEST avg_score and suggests them — drives more
// session diversity and gives the parent dashboard a "what to focus on" angle.
router.get('/children/:id/recommendations', requireParent, (req, res) => {
  const childId = Number(req.params.id)
  const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, req.parent.id)
  if (!child) return res.status(404).json({ error: 'Vaikas nerastas' })

  // Premium-only feature for advanced recommendations — keep visible but gated
  const advanced = req.tier.reports === 'advanced'

  const weak = db.prepare(`
    SELECT game_id, AVG(score) as avg_score, COUNT(*) as plays
    FROM child_progress
    WHERE child_id = ?
    GROUP BY game_id
    HAVING plays >= 2
    ORDER BY avg_score ASC
    LIMIT 3
  `).all(childId)

  const untouched = db.prepare(`
    SELECT DISTINCT game_id FROM child_progress WHERE child_id = ? LIMIT 100
  `).all(childId).map(r => r.game_id)

  res.json({
    weakAreas: weak,
    untouchedHint: untouched.length,
    upgradeForFullInsights: !advanced,
  })
})

export default router
