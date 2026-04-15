/// <reference path="../pb_data/types.d.ts" />

// Auto-score lead on create/update based on tech signals
onRecordBeforeCreateRequest((e) => {
  scoreLead(e.record)
}, 'leads')

onRecordBeforeUpdateRequest((e) => {
  scoreLead(e.record)
}, 'leads')

function scoreLead(lead) {
  let score = 0

  const loadMs = lead.get('load_time_ms') || 0
  if (loadMs > 5000) score += 35
  else if (loadMs > 3000) score += 25
  else if (loadMs > 2000) score += 10

  if (lead.get('ssl_valid') === false) score += 20

  const sslExp = lead.get('ssl_expires')
  if (sslExp) {
    const days = (new Date(sslExp).getTime() - Date.now()) / 86400000
    if (days < 30 && days > 0) score += 15
    if (days <= 0) score += 25
  }

  if (lead.get('mobile_friendly') === false) score += 15
  if (lead.get('has_analytics') === false) score += 5

  // Derive priority
  let priority = 'low'
  if (score >= 60) priority = 'urgent'
  else if (score >= 40) priority = 'high'
  else if (score >= 20) priority = 'medium'

  lead.set('score', score)
  if (!lead.get('priority')) {
    lead.set('priority', priority)
  }
}
