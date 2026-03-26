import { useState, useCallback, memo } from 'react'
import { genId, isValidUrl } from '../utils/helpers'
import { useToast } from '../contexts/ToastContext'
import { BRAND } from '../utils/constants'
import {
  Modal, SectionHeader, SearchInput, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

const CATEGORIES = [
  { value: 'website', label: '🌐 Svetainė', color: BRAND.cyan },
  { value: 'server', label: '🖥️ Serveris / SSH', color: BRAND.purple },
  { value: 'plesk', label: '⚙️ Plesk / cPanel', color: '#f59e0b' },
  { value: 'wordpress', label: '📝 WordPress', color: '#22c55e' },
  { value: 'database', label: '🗄️ Duomenų bazė', color: '#06b6d4' },
  { value: 'email', label: '📧 El. paštas', color: '#ec4899' },
  { value: 'ftp', label: '📂 FTP / SFTP', color: '#f97316' },
  { value: 'api', label: '🔌 API / Servisas', color: '#a855f7' },
  { value: 'domain', label: '🏷️ Domenas / DNS', color: '#14b8a6' },
  { value: 'other', label: '🔑 Kita', color: BRAND.textMuted },
]

const getCategoryInfo = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1]

function CredForm({ initial, projects, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    projectId: '', category: 'website', label: '', url: '',
    username: '', password: '', port: '', ip: '', notes: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const errs = {}
    if (!form.label.trim()) errs.label = 'Pavadinimas privalomas'
    if (!isValidUrl(form.url)) errs.url = 'Neteisingas URL formatas'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const showServerFields = ['server', 'plesk', 'database', 'ftp'].includes(form.category)

  return (
    <form onSubmit={e => { e.preventDefault(); if (validate()) { onSave(form); onClose() } }}>
      <div style={formGroup}><label style={labelStyle}>Kategorija</label>
        <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select></div>
      <div style={formGroup}>
        <label style={labelStyle}>Pavadinimas *</label>
        <input style={{ ...inputStyle, borderColor: errors.label ? '#ef4444' : undefined }}
          required value={form.label} onChange={e => set('label', e.target.value)}
          placeholder="pvz. Kliento svetainė, Contabo VPS..." autoFocus />
        {errors.label && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.label}</span>}
      </div>
      <div style={formGroup}><label style={labelStyle}>Projektas</label>
        <select style={inputStyle} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div style={formGroup}>
        <label style={labelStyle}>URL</label>
        <input style={{ ...inputStyle, borderColor: errors.url ? '#ef4444' : undefined }}
          value={form.url} onChange={e => set('url', e.target.value)}
          placeholder={form.category === 'wordpress' ? 'https://example.com/wp-admin' : 'https://...'} />
        {errors.url && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.url}</span>}
      </div>

      {showServerFields && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...formGroup, flex: 2 }}><label style={labelStyle}>IP adresas</label>
            <input style={inputStyle} value={form.ip || ''} onChange={e => set('ip', e.target.value)}
              placeholder="161.97.xxx.xxx" /></div>
          <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Portas</label>
            <input style={inputStyle} type="number" value={form.port || ''} onChange={e => set('port', e.target.value)}
              placeholder={form.category === 'database' ? '3306' : form.category === 'ftp' ? '21' : '22'} /></div>
        </div>
      )}

      <div style={formGroup}><label style={labelStyle}>Vartotojas</label>
        <input style={inputStyle} value={form.username} onChange={e => set('username', e.target.value)}
          autoComplete="off" /></div>
      <div style={formGroup}><label style={labelStyle}>Slaptažodis</label>
        <input style={inputStyle} type="password" value={form.password} onChange={e => set('password', e.target.value)}
          autoComplete="new-password" /></div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="SSH komanda, papildoma info..." /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} className="btn-press" onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary} className="btn-press">Išsaugoti</button>
      </div>
    </form>
  )
}

export const Credentials = memo(function Credentials({ credentials, setCredentials, projects }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [revealed, setRevealed] = useState({})
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('visi')
  const toast = useToast()
  const getProject = id => projects.find(p => p.id === id)

  const categoryFilters = ['visi', ...CATEGORIES.map(c => c.value)]
  const categoryLabels = { visi: 'Visi', ...Object.fromEntries(CATEGORIES.map(c => [c.value, c.label])) }

  const filtered = credentials
    .filter(c => catFilter === 'visi' || c.category === catFilter)
    .filter(c =>
      [c.label, c.url, c.username, c.ip, getProject(c.projectId)?.name]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    )

  const save = useCallback((form) => {
    if (editing) {
      setCredentials(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
      toast.success('Prisijungimas atnaujintas')
    } else {
      setCredentials(cs => [...cs, { ...form, id: genId(), createdAt: new Date().toISOString() }])
      toast.success('Prisijungimas pridėtas')
    }
    setEditing(null)
  }, [editing, setCredentials, toast])

  const copyToClipboard = useCallback((text, label) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} nukopijuota`),
      () => toast.error('Nepavyko nukopijuoti')
    )
  }, [toast])

  return (
    <div>
      <SectionHeader title="Prisijungimai ir serveriai">
        <button data-action="add" style={btnPrimary} className="btn-press" onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </SectionHeader>

      <div role="alert" style={{
        background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 12,
        padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#f59e0b',
      }}>
        ⚠ Slaptažodžiai saugomi naršyklės localStorage. Rekomenduojame reguliariai daryti atsargines kopijas (Nustatymai → Eksportuoti).
      </div>

      {/* Category filter as icon buttons on mobile */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {categoryFilters.map(f => (
          <button key={f} onClick={() => setCatFilter(f)} className="btn-press" style={{
            ...btnSecondary, padding: '5px 10px', fontSize: 12,
            background: catFilter === f ? (getCategoryInfo(f).color || BRAND.purple) : BRAND.darkBorder,
            color: catFilter === f ? '#fff' : BRAND.textSecondary,
            borderRadius: 12, minWidth: 0,
          }}>
            {categoryLabels[f]}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Ieškoti pagal pavadinimą, URL, IP..." />

      {filtered.length === 0 && <EmptyState icon="🔑" message="Nėra prisijungimų" />}

      {filtered.map(c => {
        const project = getProject(c.projectId)
        const cat = getCategoryInfo(c.category)
        return (
          <article key={c.id} className="card-interactive" style={{ ...cardStyle, borderLeft: `3px solid ${cat.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44`,
                    borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  }}>{cat.label}</span>
                  <span style={{ fontWeight: 700, color: BRAND.textPrimary }}>{c.label}</span>
                </div>
                {project && <div style={{ color: BRAND.purple, fontSize: 12, marginTop: 2 }}>📁 {project.name}</div>}
                {c.url && (
                  <div style={{ marginTop: 4 }}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#06b6d4', fontSize: 13, wordBreak: 'break-all' }}>{c.url}</a>
                  </div>
                )}
                {c.ip && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: BRAND.textSecondary, fontSize: 13, fontFamily: 'monospace' }}>
                      {c.ip}{c.port ? `:${c.port}` : ''}
                    </span>
                    <button style={{ ...btnSecondary, padding: '1px 6px', fontSize: 10 }} className="btn-press"
                      onClick={() => copyToClipboard(
                        c.category === 'server' ? `ssh ${c.username || 'root'}@${c.ip}${c.port && c.port !== '22' ? ` -p ${c.port}` : ''}` : c.ip,
                        'IP'
                      )}>
                      {c.category === 'server' ? 'SSH komanda' : 'Kopijuoti IP'}
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.username && (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: BRAND.textSecondary, fontSize: 13 }}>👤 {c.username}</span>
                      <button style={{ ...btnSecondary, padding: '1px 6px', fontSize: 10 }} className="btn-press"
                        onClick={() => copyToClipboard(c.username, 'Vartotojas')}>Kopijuoti</button>
                    </span>
                  )}
                  {c.password && (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: BRAND.textSecondary, fontSize: 13, fontFamily: 'monospace' }}>
                        {revealed[c.id] ? c.password : '••••••••'}
                      </span>
                      <button style={{ ...btnSecondary, padding: '1px 6px', fontSize: 10 }} className="btn-press"
                        onClick={() => setRevealed(r => ({ ...r, [c.id]: !r[c.id] }))}>
                        {revealed[c.id] ? 'Slėpti' : 'Rodyti'}
                      </button>
                      <button style={{ ...btnSecondary, padding: '1px 6px', fontSize: 10 }} className="btn-press"
                        onClick={() => copyToClipboard(c.password, 'Slaptažodis')}>
                        Kopijuoti
                      </button>
                    </span>
                  )}
                </div>
                {c.notes && <div style={{ color: BRAND.textMuted, fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button style={btnSecondary} className="btn-press" onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} className="btn-press" onClick={() => {
                  setCredentials(cs => cs.filter(x => x.id !== c.id))
                  toast.success('Prisijungimas ištrintas')
                }}>Ištrinti</button>
              </div>
            </div>
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti prisijungimą' : 'Naujas prisijungimas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <CredForm initial={editing} projects={projects} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
