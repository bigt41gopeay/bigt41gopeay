/// <reference path="../pb_data/types.d.ts" />

// Tracking pixel: GET /api/tracking/pixel/:trackingId.gif → logs open event
routerAdd('GET', '/api/tracking/pixel/:trackingId.gif', (c) => {
  const trackingId = c.pathParam('trackingId')

  try {
    const outreach = $app.dao().findFirstRecordByData('outreach', 'tracking_id', trackingId)
    if (outreach) {
      // Insert open event
      const evCol = $app.dao().findCollectionByNameOrId('email_events')
      const ev = new Record(evCol, {
        outreach: outreach.id,
        event_type: 'open',
        user_agent: c.request().header.get('User-Agent') || '',
        ip: c.realIp() || '',
        event_time: new Date().toISOString(),
      })
      $app.dao().saveRecord(ev)

      // Update outreach status + opened_at (first open only)
      if (!outreach.get('opened_at')) {
        outreach.set('opened_at', new Date().toISOString())
        outreach.set('status', 'opened')
        $app.dao().saveRecord(outreach)
      }
    }
  } catch (err) {
    console.log('[tracking-pixel] Error:', err)
  }

  // 1x1 transparent GIF
  const gif = new Uint8Array([
    0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,0x80,0x00,0x00,
    0xff,0xff,0xff,0x00,0x00,0x00,0x21,0xf9,0x04,0x01,0x00,0x00,0x00,
    0x00,0x2c,0x00,0x00,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0x02,0x02,
    0x44,0x01,0x00,0x3b,
  ])
  c.response().header().set('Content-Type', 'image/gif')
  c.response().header().set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  c.response().header().set('Pragma', 'no-cache')
  c.response().writeHeader(200)
  c.response().write(gif)
  return
})

// Click tracking: GET /api/tracking/click/:trackingId?url=...
routerAdd('GET', '/api/tracking/click/:trackingId', (c) => {
  const trackingId = c.pathParam('trackingId')
  const targetUrl = c.queryParam('url')

  try {
    const outreach = $app.dao().findFirstRecordByData('outreach', 'tracking_id', trackingId)
    if (outreach) {
      const evCol = $app.dao().findCollectionByNameOrId('email_events')
      const ev = new Record(evCol, {
        outreach: outreach.id,
        event_type: 'click',
        user_agent: c.request().header.get('User-Agent') || '',
        ip: c.realIp() || '',
        link_clicked: targetUrl,
        event_time: new Date().toISOString(),
      })
      $app.dao().saveRecord(ev)
      outreach.set('status', 'clicked')
      $app.dao().saveRecord(outreach)
    }
  } catch (err) {
    console.log('[tracking-click] Error:', err)
  }

  return c.redirect(302, targetUrl || 'https://crm.oktoja.lt')
})

// Public proposal view: GET /p/:token → logs "proposal_viewed"
routerAdd('GET', '/p/:token', (c) => {
  const token = c.pathParam('token')
  try {
    const proposal = $app.dao().findFirstRecordByData('proposals', 'public_view_token', token)
    if (proposal) {
      if (proposal.get('status') === 'sent') {
        proposal.set('status', 'viewed')
        $app.dao().saveRecord(proposal)

        // Notify owner via PocketBase notifications
        const leadId = proposal.get('lead')
        if (leadId) {
          const lead = $app.dao().findRecordById('leads', leadId)
          const userId = lead.get('assigned_to')
          if (userId) {
            const col = $app.dao().findCollectionByNameOrId('notifications')
            const n = new Record(col, {
              user: userId,
              type: 'proposal_viewed',
              title: '👁 Pasiūlymas ' + proposal.get('number') + ' peržiūrėtas',
              body: (lead.get('company_name') || lead.get('domain')) + ' ką tik atidarė pasiūlymą',
              deep_link: '/proposals/' + proposal.id,
              related_lead: leadId,
              read: false,
            })
            $app.dao().saveRecord(n)
          }
        }
      }
      return c.redirect(302, '/proposal?id=' + proposal.id + '&token=' + token)
    }
  } catch (err) {
    console.log('[proposal-view] Error:', err)
  }
  return c.string(404, 'Not found')
})
