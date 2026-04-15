import { useEffect, useState } from 'react'
import { pb } from '../lib/pb'

export default function Proposals() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const load = async () => {
      try { setItems(await pb.collection('proposals').getFullList({ sort: '-created', expand: 'lead,client' })) } catch {}
    }
    load()
  }, [])

  const create = async () => {
    const number = 'P-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4)
    await pb.collection('proposals').create({ number, status: 'draft', items: [], subtotal: 0, vat: 0, total: 0 })
    const fresh = await pb.collection('proposals').getFullList({ sort: '-created', expand: 'lead,client' })
    setItems(fresh)
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Pasiūlymai</h1><div className="text-muted text-sm">{items.length} iš viso</div></div>
        <button className="btn btn-primary" onClick={create}>+ Naujas</button>
      </div>
      <div className="card">
        {items.length === 0 ? <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Nėra pasiūlymų</div> :
          <table className="table">
            <thead><tr><th>Nr.</th><th>Klientas</th><th>Suma</th><th>Galioja iki</th><th>Statusas</th></tr></thead>
            <tbody>{items.map(p => (
              <tr key={p.id}>
                <td className="font-mono">{p.number}</td>
                <td className="text-sm">{p.expand?.client?.name || p.expand?.lead?.domain || '—'}</td>
                <td className="font-mono">€{(p.total || 0).toFixed(2)}</td>
                <td className="text-sm text-muted">{p.valid_until ? new Date(p.valid_until).toLocaleDateString('lt-LT') : '—'}</td>
                <td><span className={'badge badge-' + (p.status === 'accepted' ? 'won' : p.status === 'rejected' ? 'lost' : 'contacted')}>{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  )
}
