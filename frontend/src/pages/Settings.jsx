import { pb } from '../lib/pb'

export default function Settings() {
  return (
    <div>
      <div className="page-header"><h1>Nustatymai</h1></div>
      <div className="card mb-4">
        <h2>Paskyra</h2>
        <div className="text-sm text-muted">El. paštas: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{pb.authStore.model?.email}</span></div>
      </div>
      <div className="card mb-4">
        <h2>Integracijos</h2>
        <div className="text-sm" style={{ lineHeight: 1.8 }}>
          <div>🤖 <b>n8n workflow:</b> <a href={import.meta.env.VITE_N8N_URL || 'https://n8n.oktoja.lt'} target="_blank">atidaryti</a></div>
          <div>⚙ <b>PocketBase admin:</b> <a href="/_/" target="_blank">atidaryti</a></div>
          <div className="text-muted mt-2">API raktai ir SMTP konfigūruojami serveryje per <code>backend/.env</code></div>
        </div>
      </div>
      <div className="card">
        <h2>Email tracking</h2>
        <div className="text-sm">
          Tracking pixel URL: <code>https://crm.oktoja.lt/api/tracking/pixel/&#123;TRACKING_ID&#125;.gif</code><br/>
          Click tracking: <code>https://crm.oktoja.lt/api/tracking/click/&#123;TRACKING_ID&#125;?url=...</code><br/>
          Public proposal: <code>https://crm.oktoja.lt/p/&#123;TOKEN&#125;</code>
        </div>
      </div>
    </div>
  )
}
