import { useEffect, useState } from 'react'
import { pb } from '../lib/pb'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      try { setClients(await pb.collection('clients').getFullList({ sort: '-created' })) } catch {}
    }
    load()
  }, [])

  const filtered = clients.filter(c =>
    !search || [c.name, c.company, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const create = async () => {
    const name = prompt('Kliento vardas:')
    if (!name) return
    await pb.collection('clients').create({ name, status: 'active' })
    setClients(await pb.collection('clients').getFullList({ sort: '-created' }))
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Klientai</h1><div className="text-muted text-sm">{clients.length} įrašų</div></div>
        <button className="btn btn-primary" onClick={create}>+ Naujas klientas</button>
      </div>
      <input className="input mb-4" placeholder="Ieškoti..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="card">
        {filtered.length === 0 ? <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Nėra klientų</div> :
          <table className="table">
            <thead><tr><th>Vardas</th><th>Įmonė</th><th>El. paštas</th><th>MRR</th><th>Statusas</th></tr></thead>
            <tbody>{filtered.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="text-sm text-muted">{c.company || '—'}</td>
                <td className="text-sm">{c.email || '—'}</td>
                <td className="font-mono">{c.mrr ? `€${c.mrr}` : '—'}</td>
                <td><span className="badge badge-won">{c.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  )
}
