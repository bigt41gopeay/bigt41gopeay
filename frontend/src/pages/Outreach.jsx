import { useEffect, useState } from 'react'
import { pb } from '../lib/pb'

export default function Outreach() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const load = async () => {
      try { setItems(await pb.collection('outreach').getFullList({ sort: '-sent_at', expand: 'lead' })) } catch {}
    }
    load()
    try {
      pb.collection('outreach').subscribe('*', load)
      return () => pb.collection('outreach').unsubscribe('*')
    } catch {}
  }, [])

  return (
    <div>
      <div className="page-header">
        <div><h1>Outreach</h1><div className="text-muted text-sm">{items.length} išsiųstų laiškų</div></div>
      </div>
      <div className="card">
        {items.length === 0 ? <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Dar nebuvo siųsta laiškų</div> :
          <table className="table">
            <thead><tr><th>Lead</th><th>Tema</th><th>Išsiųsta</th><th>Atidaryta</th><th>Statusas</th></tr></thead>
            <tbody>{items.map(o => (
              <tr key={o.id}>
                <td className="text-sm font-mono">{o.expand?.lead?.domain || o.lead}</td>
                <td>{o.subject}</td>
                <td className="text-sm text-muted font-mono">{o.sent_at ? new Date(o.sent_at).toLocaleString('lt-LT') : '—'}</td>
                <td className="text-sm text-muted font-mono">{o.opened_at ? new Date(o.opened_at).toLocaleString('lt-LT') : '—'}</td>
                <td><span className={'badge badge-' + (o.status === 'replied' ? 'won' : o.status === 'opened' ? 'interested' : 'contacted')}>{o.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  )
}
