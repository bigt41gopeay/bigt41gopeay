/// <reference path="../pb_data/types.d.ts" />

// Auto-send OneSignal push when notification is created
onRecordAfterCreateRequest((e) => {
  const notif = e.record

  const appId = $os.getenv('ONESIGNAL_APP_ID')
  const apiKey = $os.getenv('ONESIGNAL_API_KEY')

  if (!appId || !apiKey) {
    console.log('[push] OneSignal creds missing; skipping push')
    return
  }

  const userId = notif.get('user')
  const title = notif.get('title') || 'ModernCRM'
  const body = notif.get('body') || ''
  const deepLink = notif.get('deep_link') || ''

  try {
    const res = $http.send({
      url: 'https://onesignal.com/api/v1/notifications',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [userId],
        channel_for_external_user_ids: 'push',
        headings: { en: title, lt: title },
        contents: { en: body, lt: body },
        data: { deep_link: deepLink, related_lead: notif.get('related_lead') },
      }),
      timeout: 10,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      notif.set('sent_push', true)
      $app.dao().saveRecord(notif)
    } else {
      console.log('[push] OneSignal error:', res.statusCode, res.raw)
    }
  } catch (err) {
    console.log('[push] Exception:', err)
  }
}, 'notifications')

// When email_event "open" is created -> create notification for assigned user
onRecordAfterCreateRequest((e) => {
  const ev = e.record
  if (ev.get('event_type') !== 'open') return

  try {
    const outreach = $app.dao().findRecordById('outreach', ev.get('outreach'))
    const lead = $app.dao().findRecordById('leads', outreach.get('lead'))
    const userId = lead.get('assigned_to')
    if (!userId) return

    const notifCol = $app.dao().findCollectionByNameOrId('notifications')
    const notif = new Record(notifCol, {
      user: userId,
      type: 'email_opened',
      title: '📬 ' + (lead.get('company_name') || lead.get('domain')) + ' atidarė laišką',
      body: outreach.get('subject'),
      deep_link: '/leads/' + lead.id,
      related_lead: lead.id,
      read: false,
      sent_push: false,
    })
    $app.dao().saveRecord(notif)
  } catch (err) {
    console.log('[email-open-notif] Error:', err)
  }
}, 'email_events')

// When lead is created with priority=high|urgent → notify assigned user
onRecordAfterCreateRequest((e) => {
  const lead = e.record
  const p = lead.get('priority')
  if (p !== 'high' && p !== 'urgent') return

  const userId = lead.get('assigned_to')
  if (!userId) return

  try {
    const col = $app.dao().findCollectionByNameOrId('notifications')
    const notif = new Record(col, {
      user: userId,
      type: 'high_priority',
      title: '🔥 Aukšto prioriteto lead\'as',
      body: (lead.get('company_name') || lead.get('domain')) + ' — score: ' + (lead.get('score') || 0),
      deep_link: '/leads/' + lead.id,
      related_lead: lead.id,
      read: false,
    })
    $app.dao().saveRecord(notif)
  } catch (err) {
    console.log('[high-priority-notif] Error:', err)
  }
}, 'leads')
