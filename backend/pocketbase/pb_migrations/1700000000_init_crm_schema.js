/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ─── LEADS ──────────────────────────────────────────────────────────────
  const leads = new Collection({
    name: 'leads',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'url', type: 'url', required: true, options: {} },
      { name: 'domain', type: 'text', required: true, options: { min: 3, max: 253 } },
      { name: 'company_name', type: 'text' },
      { name: 'contact_name', type: 'text' },
      { name: 'contact_email', type: 'email' },
      { name: 'contact_phone', type: 'text' },
      { name: 'country', type: 'select', options: { maxSelect: 1, values: ['LT','LV','EE','PL','DE','UK','US','OTHER'] } },
      { name: 'industry', type: 'text' },
      { name: 'source', type: 'select', options: { maxSelect: 1, values: ['google_maps','linkedin','yellow_pages','manual','import','referral','event'] } },
      { name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['cold','contacted','interested','proposal_sent','negotiating','won','lost'] } },
      { name: 'priority', type: 'select', options: { maxSelect: 1, values: ['low','medium','high','urgent'] } },
      { name: 'score', type: 'number', options: { min: 0, max: 100 } },
      { name: 'load_time_ms', type: 'number' },
      { name: 'ssl_valid', type: 'bool' },
      { name: 'ssl_expires', type: 'date' },
      { name: 'mobile_friendly', type: 'bool' },
      { name: 'has_analytics', type: 'bool' },
      { name: 'last_scanned', type: 'date' },
      { name: 'notes', type: 'editor' },
      { name: 'tags', type: 'json' },
      { name: 'assigned_to', type: 'relation', options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_leads_domain ON leads (domain)',
      'CREATE INDEX idx_leads_status ON leads (status)',
      'CREATE INDEX idx_leads_priority ON leads (priority)',
      'CREATE INDEX idx_leads_score ON leads (score)',
    ],
  })
  dao.saveCollection(leads)

  // ─── TECH STACK ─────────────────────────────────────────────────────────
  const tech = new Collection({
    name: 'tech_stack',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'lead', type: 'relation', required: true, options: { collectionId: leads.id, maxSelect: 1, cascadeDelete: true } },
      { name: 'category', type: 'select', options: { maxSelect: 1, values: ['cms','framework','language','server','analytics','ecommerce','cdn','ssl','security','other'] } },
      { name: 'name', type: 'text', required: true },
      { name: 'version', type: 'text' },
      { name: 'is_outdated', type: 'bool' },
      { name: 'has_vulnerability', type: 'bool' },
      { name: 'detected_at', type: 'date' },
      { name: 'raw_data', type: 'json' },
    ],
    indexes: [ 'CREATE INDEX idx_tech_lead ON tech_stack (lead)' ],
  })
  dao.saveCollection(tech)

  // ─── CLIENTS ────────────────────────────────────────────────────────────
  const clients = new Collection({
    name: 'clients',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'company', type: 'text' },
      { name: 'position', type: 'text' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'text' },
      { name: 'status', type: 'select', options: { maxSelect: 1, values: ['active','past','paused'] } },
      { name: 'source_lead', type: 'relation', options: { collectionId: leads.id, maxSelect: 1 } },
      { name: 'hosting_provider', type: 'text' },
      { name: 'systems', type: 'json' },
      { name: 'domains', type: 'json' },
      { name: 'ip_addresses', type: 'json' },
      { name: 'previous_companies', type: 'text' },
      { name: 'source', type: 'text' },
      { name: 'event_history', type: 'json' },
      { name: 'mrr', type: 'number' },
      { name: 'ltv', type: 'number' },
      { name: 'notes', type: 'editor' },
    ],
  })
  dao.saveCollection(clients)

  // Back-reference: add converted_client to leads now that clients exists
  leads.schema.addField(new SchemaField({
    name: 'converted_client',
    type: 'relation',
    options: { collectionId: clients.id, maxSelect: 1 },
  }))
  dao.saveCollection(leads)

  // ─── CREDENTIALS (encrypted) ────────────────────────────────────────────
  const credentials = new Collection({
    name: 'credentials',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'client', type: 'relation', options: { collectionId: clients.id, maxSelect: 1 } },
      { name: 'label', type: 'text', required: true },
      { name: 'server_type', type: 'select', options: { maxSelect: 1, values: ['hosting','ssh','ftp','domain_registrar','database','email','cms_admin','api','other'] } },
      { name: 'url', type: 'text' },
      { name: 'username', type: 'text' },
      { name: 'password_encrypted', type: 'text' },
      { name: 'notes', type: 'text' },
    ],
    indexes: [ 'CREATE INDEX idx_creds_client ON credentials (client)' ],
  })
  dao.saveCollection(credentials)

  // ─── EMAIL TEMPLATES ────────────────────────────────────────────────────
  const templates = new Collection({
    name: 'email_templates',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'subject_template', type: 'text', required: true },
      { name: 'body_template', type: 'editor', required: true },
      { name: 'ai_prompt', type: 'editor' },
      { name: 'trigger', type: 'select', options: { maxSelect: 1, values: ['cold_outreach','follow_up_1','follow_up_2','follow_up_3','proposal','nurture'] } },
      { name: 'personalization_fields', type: 'json' },
      { name: 'active', type: 'bool' },
    ],
  })
  dao.saveCollection(templates)

  // ─── OUTREACH (individual emails sent) ──────────────────────────────────
  const outreach = new Collection({
    name: 'outreach',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'lead', type: 'relation', required: true, options: { collectionId: leads.id, maxSelect: 1 } },
      { name: 'template', type: 'relation', options: { collectionId: templates.id, maxSelect: 1 } },
      { name: 'subject', type: 'text', required: true },
      { name: 'body_html', type: 'editor', required: true },
      { name: 'body_text', type: 'text' },
      { name: 'from_email', type: 'email' },
      { name: 'to_email', type: 'email', required: true },
      { name: 'status', type: 'select', options: { maxSelect: 1, values: ['queued','sent','delivered','opened','clicked','replied','bounced','failed'] } },
      { name: 'tracking_id', type: 'text' },
      { name: 'sent_at', type: 'date' },
      { name: 'opened_at', type: 'date' },
      { name: 'replied_at', type: 'date' },
      { name: 'ai_generated', type: 'bool' },
      { name: 'ai_model', type: 'text' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_outreach_tracking ON outreach (tracking_id)',
      'CREATE INDEX idx_outreach_lead ON outreach (lead)',
      'CREATE INDEX idx_outreach_status ON outreach (status)',
    ],
  })
  dao.saveCollection(outreach)

  // ─── EMAIL EVENTS (tracking pixel, link clicks) ─────────────────────────
  const events = new Collection({
    name: 'email_events',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: '', // writes via hooks only
    updateRule: null,
    deleteRule: null,
    schema: [
      { name: 'outreach', type: 'relation', required: true, options: { collectionId: outreach.id, maxSelect: 1, cascadeDelete: true } },
      { name: 'event_type', type: 'select', required: true, options: { maxSelect: 1, values: ['open','click','reply','bounce','unsubscribe'] } },
      { name: 'user_agent', type: 'text' },
      { name: 'ip', type: 'text' },
      { name: 'country', type: 'text' },
      { name: 'link_clicked', type: 'url' },
      { name: 'event_time', type: 'date', required: true },
    ],
    indexes: [ 'CREATE INDEX idx_events_outreach ON email_events (outreach)' ],
  })
  dao.saveCollection(events)

  // ─── PROPOSALS ──────────────────────────────────────────────────────────
  const proposals = new Collection({
    name: 'proposals',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'number', type: 'text', required: true },
      { name: 'lead', type: 'relation', options: { collectionId: leads.id, maxSelect: 1 } },
      { name: 'client', type: 'relation', options: { collectionId: clients.id, maxSelect: 1 } },
      { name: 'status', type: 'select', options: { maxSelect: 1, values: ['draft','sent','viewed','accepted','rejected','expired'] } },
      { name: 'items', type: 'json', required: true },
      { name: 'subtotal', type: 'number' },
      { name: 'vat', type: 'number' },
      { name: 'total', type: 'number' },
      { name: 'valid_until', type: 'date' },
      { name: 'pdf', type: 'file', options: { maxSize: 10485760, mimeTypes: ['application/pdf'] } },
      { name: 'public_view_token', type: 'text' },
    ],
  })
  dao.saveCollection(proposals)

  // ─── INVOICES ───────────────────────────────────────────────────────────
  const invoices = new Collection({
    name: 'invoices',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'number', type: 'text', required: true },
      { name: 'client', type: 'relation', options: { collectionId: clients.id, maxSelect: 1 } },
      { name: 'proposal', type: 'relation', options: { collectionId: proposals.id, maxSelect: 1 } },
      { name: 'status', type: 'select', options: { maxSelect: 1, values: ['draft','sent','paid','overdue','cancelled'] } },
      { name: 'items', type: 'json', required: true },
      { name: 'subtotal', type: 'number' },
      { name: 'vat', type: 'number' },
      { name: 'total', type: 'number' },
      { name: 'issue_date', type: 'date' },
      { name: 'due_date', type: 'date' },
      { name: 'paid_at', type: 'date' },
      { name: 'pdf', type: 'file', options: { maxSize: 10485760, mimeTypes: ['application/pdf'] } },
    ],
  })
  dao.saveCollection(invoices)

  // Back-reference on proposals: invoice_generated
  proposals.schema.addField(new SchemaField({
    name: 'invoice_generated',
    type: 'relation',
    options: { collectionId: invoices.id, maxSelect: 1 },
  }))
  dao.saveCollection(proposals)

  // ─── AUTOMATION LOGS ────────────────────────────────────────────────────
  const autoLogs = new Collection({
    name: 'automation_logs',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: '',
    updateRule: null,
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'workflow_name', type: 'text', required: true },
      { name: 'trigger', type: 'text' },
      { name: 'lead', type: 'relation', options: { collectionId: leads.id, maxSelect: 1 } },
      { name: 'action', type: 'text', required: true },
      { name: 'status', type: 'select', options: { maxSelect: 1, values: ['success','failed','retrying'] } },
      { name: 'input', type: 'json' },
      { name: 'output', type: 'json' },
      { name: 'error', type: 'text' },
      { name: 'duration_ms', type: 'number' },
      { name: 'executed_at', type: 'date', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_auto_workflow ON automation_logs (workflow_name)',
      'CREATE INDEX idx_auto_time ON automation_logs (executed_at)',
    ],
  })
  dao.saveCollection(autoLogs)

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────
  const notifications = new Collection({
    name: 'notifications',
    type: 'base',
    listRule: "@request.auth.id = user",
    viewRule: "@request.auth.id = user",
    createRule: '', // via hooks
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: true } },
      { name: 'type', type: 'select', options: { maxSelect: 1, values: ['email_opened','email_replied','proposal_viewed','new_lead','high_priority','task_due','automation_failed'] } },
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'text' },
      { name: 'deep_link', type: 'text' },
      { name: 'read', type: 'bool' },
      { name: 'sent_push', type: 'bool' },
      { name: 'related_lead', type: 'relation', options: { collectionId: leads.id, maxSelect: 1 } },
    ],
    indexes: [
      'CREATE INDEX idx_notif_user ON notifications (user)',
      'CREATE INDEX idx_notif_read ON notifications (read)',
    ],
  })
  dao.saveCollection(notifications)

  // ─── APP SETTINGS (singleton) ───────────────────────────────────────────
  const settings = new Collection({
    name: 'app_settings',
    type: 'base',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    schema: [
      { name: 'key', type: 'text', required: true },
      { name: 'value', type: 'json' },
      { name: 'description', type: 'text' },
    ],
    indexes: [ 'CREATE UNIQUE INDEX idx_settings_key ON app_settings (key)' ],
  })
  dao.saveCollection(settings)

}, (db) => {
  // Rollback
  const dao = new Dao(db)
  const names = ['notifications','app_settings','automation_logs','invoices','proposals','email_events','outreach','email_templates','credentials','clients','tech_stack','leads']
  for (const n of names) {
    try { dao.deleteCollection(dao.findCollectionByNameOrId(n)) } catch (_) {}
  }
})
