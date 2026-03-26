import { useState, useCallback, useMemo, memo } from 'react'
import { genId, formatCurrency } from '../utils/helpers'
import { generateInvoicePDF } from '../utils/pdf'
import { useToast } from '../contexts/ToastContext'
import { STATUS_COLORS, VAT_RATE, BRAND } from '../utils/constants'
import {
  Modal, Badge, SectionHeader, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

function InvoiceForm({ initial, contacts, onSave, onClose }) {
  const defaultItem = { name: '', qty: 1, price: '' }
  const [form, setForm] = useState(initial || {
    number: `SF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    date: new Date().toISOString().slice(0, 10),
    contactId: '',
    status: 'juodraštis',
    items: [{ ...defaultItem }],
    notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }
  })
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...defaultItem }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0)
  const vat = subtotal * VAT_RATE
  const total = subtotal + vat

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, subtotal, vat, total }); onClose() }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Numeris *</label>
          <input style={inputStyle} required value={form.number} onChange={e => set('number', e.target.value)} /></div>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Data</label>
          <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      </div>
      <div style={formGroup}><label style={labelStyle}>Klientas</label>
        <select style={inputStyle} value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Statusas</label>
        <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
          {['juodraštis', 'išsiųsta', 'apmokėta', 'vėluoja'].map(s => <option key={s}>{s}</option>)}
        </select></div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={labelStyle}>Paslaugos</label>
          <button type="button" style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={addItem}>+ Eilutė</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 24px', gap: 6, marginBottom: 4 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Pavadinimas</span>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Kiekis</span>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Kaina €</span>
          <span />
        </div>
        {form.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 24px', gap: 6, marginBottom: 6 }}>
            <input style={inputStyle} placeholder="Paslaugos pavadinimas" value={it.name}
              onChange={e => setItem(i, 'name', e.target.value)} />
            <input style={inputStyle} type="number" min="0.01" step="0.01" value={it.qty}
              onChange={e => setItem(i, 'qty', e.target.value)} />
            <input style={inputStyle} type="number" min="0" step="0.01" value={it.price}
              onChange={e => setItem(i, 'price', e.target.value)} />
            <button type="button" onClick={() => removeItem(i)} aria-label="Pašalinti eilutę"
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>
        ))}
        <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13 }}>
          <div style={{ color: BRAND.textSecondary }}>Suma be PVM: <b style={{ color: BRAND.textPrimary }}>{formatCurrency(subtotal)}</b></div>
          <div style={{ color: BRAND.textSecondary }}>PVM 21%: <b style={{ color: BRAND.textPrimary }}>{formatCurrency(vat)}</b></div>
          <div style={{ color: '#22c55e', fontSize: 16, fontWeight: 700, marginTop: 4 }}>Iš viso: {formatCurrency(total)}</div>
        </div>
      </div>

      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

export const Invoices = memo(function Invoices({ invoices, setInvoices, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')
  const toast = useToast()

  const statuses = ['visi', 'juodraštis', 'išsiųsta', 'apmokėta', 'vėluoja']
  const filtered = invoices
    .filter(inv => filter === 'visi' || inv.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date))
  const getContact = id => contacts.find(c => c.id === id)

  const save = useCallback((form) => {
    if (editing) {
      setInvoices(is => is.map(i => i.id === editing.id ? { ...i, ...form } : i))
      toast.success('Sąskaita atnaujinta')
    } else {
      setInvoices(is => [...is, { ...form, id: genId(), createdAt: new Date().toISOString() }])
      toast.success('Sąskaita sukurta')
    }
    setEditing(null)
  }, [editing, setInvoices, toast])

  const { totalUnpaid, totalPaid } = useMemo(() => ({
    totalUnpaid: invoices
      .filter(i => i.status === 'išsiųsta' || i.status === 'vėluoja')
      .reduce((s, i) => s + (i.total || 0), 0),
    totalPaid: invoices
      .filter(i => i.status === 'apmokėta')
      .reduce((s, i) => s + (i.total || 0), 0),
  }), [invoices])

  return (
    <div>
      <SectionHeader title="Sąskaitos">
        <button data-action="add" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Nauja sąskaita</button>
      </SectionHeader>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card-interactive" style={{ background: '#22c55e18', border: '1px solid #22c55e33', borderRadius: 14, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: BRAND.textMuted }}>Apmokėta: </span><b style={{ color: '#22c55e' }}>{formatCurrency(totalPaid)}</b>
        </div>
        {totalUnpaid > 0 && (
          <div className="card-interactive" style={{ background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: 14, padding: '8px 14px', fontSize: 13 }}>
            <span style={{ color: BRAND.textMuted }}>Laukia apmokėjimo: </span><b style={{ color: '#f59e0b' }}>{formatCurrency(totalUnpaid)}</b>
          </div>
        )}
      </div>

      <FilterBar options={statuses} value={filter} onChange={setFilter} />

      {filtered.length === 0 && <EmptyState icon="📄" message="Nėra sąskaitų" />}

      {filtered.map(inv => {
        const contact = getContact(inv.contactId)
        return (
          <article key={inv.id} className="card-interactive" style={{ ...cardStyle, borderLeft: `3px solid ${STATUS_COLORS[inv.status] || BRAND.textMuted}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: BRAND.textPrimary, fontSize: 16 }}>📄 {inv.number}</div>
                {contact && <div style={{ color: BRAND.textSecondary, fontSize: 13 }}>{contact.name}{contact.company ? ` · ${contact.company}` : ''}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={inv.status} />
                  <span style={{ color: BRAND.textMuted, fontSize: 12 }}>{inv.date}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>{formatCurrency(inv.total)}</span>
                </div>
                <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2 }}>
                  Be PVM: {formatCurrency(inv.subtotal)} · PVM: {formatCurrency(inv.vat)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {inv.status !== 'apmokėta' && (
                  <button className="btn-press" style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px', color: '#22c55e' }}
                    onClick={() => {
                      setInvoices(is => is.map(x => x.id === inv.id ? { ...x, status: 'apmokėta' } : x))
                      toast.success('Sąskaita pažymėta kaip apmokėta')
                    }}>
                    ✓ Apmokėta
                  </button>
                )}
                <button className="btn-press" style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px' }}
                  onClick={() => { generateInvoicePDF(inv, contact); toast.success('PDF sugeneruotas') }}>📥 PDF</button>
                <button className="btn-press" style={btnSecondary} onClick={() => { setEditing(inv); setShowForm(true) }}>Redaguoti</button>
                <button className="btn-press" style={btnDanger} onClick={() => {
                  setInvoices(is => is.filter(x => x.id !== inv.id))
                  toast.success('Sąskaita ištrinta')
                }}>Ištrinti</button>
              </div>
            </div>
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti sąskaitą' : 'Nauja sąskaita'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <InvoiceForm initial={editing} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
