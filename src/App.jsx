import { useState, useEffect, useMemo } from 'react'
import jsPDF from 'jspdf'
import './App.css'

const STORAGE_KEYS = {
  properties: 'rpm_properties',
  tenants: 'rpm_tenants',
  leases: 'rpm_leases',
  payments: 'rpm_payments',
  maintenance: 'rpm_maintenance',
  utilities: 'rpm_utilities',
  warranties: 'rpm_warranties',
  settings: 'rpm_settings',
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue]
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const STATUS_COLORS = {
  active: '#22c55e', inactive: '#6b7280', expired: '#ef4444', pending: '#f59e0b',
  paid: '#22c55e', overdue: '#ef4444', partial: '#f59e0b', unpaid: '#6b7280',
  open: '#3b82f6', 'in-progress': '#f59e0b', resolved: '#22c55e', closed: '#6b7280',
  emergency: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e',
  'under-warranty': '#22c55e', 'warranty-expired': '#ef4444', claimed: '#3b82f6',
  house: '#8b5cf6', apartment: '#3b82f6', condo: '#06b6d4', commercial: '#f97316',
}

function Badge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280'
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{status}</span>
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 24, width: '100%', maxWidth: wide ? 720 : 560, border: '1px solid #2e2e3e', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#0f0f1a', border: '1px solid #2e2e3e', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none' }
const selectStyle = { ...inputStyle, appearance: 'auto' }
const labelStyle = { color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }
const formGroup = { marginBottom: 16 }
const btnPrimary = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnSecondary = { background: '#2e2e3e', color: '#e2e8f0', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnDanger = { ...btnPrimary, background: '#ef4444' }
const btnSuccess = { ...btnPrimary, background: '#22c55e' }
const cardStyle = { background: '#1a1a2e', borderRadius: 10, padding: 16, border: '1px solid #2e2e3e' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle = { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', borderBottom: '1px solid #2e2e3e', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #1e1e2e', color: '#e2e8f0' }
const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...cardStyle, flex: '1 1 200px', minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: color || '#e2e8f0' }}>{value}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.3 }}>{icon}</div>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>{message}</div>
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel}>
      <p style={{ color: '#e2e8f0', marginBottom: 20 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={btnDanger} onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  )
}

function SearchBar({ value, onChange, placeholder }) {
  return <input style={{ ...inputStyle, maxWidth: 300 }} placeholder={placeholder || 'Search...'} value={value} onChange={e => onChange(e.target.value)} />
}

// ─── DASHBOARD ───
function Dashboard({ properties, tenants, leases, payments, maintenance, utilities }) {
  const activeLeases = leases.filter(l => l.status === 'active')
  const totalRentExpected = activeLeases.reduce((s, l) => s + Number(l.rentAmount || 0), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const paidThisMonth = payments.filter(p => p.date?.startsWith(thisMonth) && p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  const openMaintenance = maintenance.filter(m => m.status === 'open' || m.status === 'in-progress').length
  const overduePayments = payments.filter(p => p.status === 'overdue').length
  const occupiedProps = [...new Set(activeLeases.map(l => l.propertyId))].length
  const vacantProps = properties.length - occupiedProps
  const totalUtilities = utilities.filter(u => u.date?.startsWith(thisMonth)).reduce((s, u) => s + Number(u.amount || 0), 0)

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Dashboard</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Properties" value={properties.length} icon="🏠" color="#8b5cf6" />
        <StatCard label="Active Leases" value={activeLeases.length} icon="📋" color="#3b82f6" />
        <StatCard label="Occupied / Vacant" value={`${occupiedProps} / ${vacantProps}`} icon="🔑" color="#22c55e" />
        <StatCard label="Total Tenants" value={tenants.length} icon="👥" color="#06b6d4" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <StatCard label="Rent Expected (Month)" value={`$${totalRentExpected.toLocaleString()}`} icon="💰" color="#22c55e" />
        <StatCard label="Rent Collected (Month)" value={`$${paidThisMonth.toLocaleString()}`} icon="✅" color="#3b82f6" />
        <StatCard label="Overdue Payments" value={overduePayments} icon="⚠️" color="#ef4444" />
        <StatCard label="Utilities (Month)" value={`$${totalUtilities.toLocaleString()}`} icon="💡" color="#f59e0b" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <StatCard label="Open Maintenance" value={openMaintenance} icon="🔧" color="#f97316" />
        <StatCard label="Emergency Issues" value={maintenance.filter(m => m.priority === 'emergency').length} icon="🚨" color="#ef4444" />
      </div>

      {openMaintenance > 0 && (
        <div style={{ ...cardStyle, marginTop: 24 }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>Recent Maintenance Issues</h3>
          <table style={tableStyle}>
            <thead><tr><th style={thStyle}>Property</th><th style={thStyle}>Issue</th><th style={thStyle}>Priority</th><th style={thStyle}>Status</th></tr></thead>
            <tbody>
              {maintenance.filter(m => m.status !== 'resolved' && m.status !== 'closed').slice(0, 5).map(m => {
                const prop = properties.find(p => p.id === m.propertyId)
                return (
                  <tr key={m.id}>
                    <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                    <td style={tdStyle}>{m.title}</td>
                    <td style={tdStyle}><Badge status={m.priority} /></td>
                    <td style={tdStyle}><Badge status={m.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── PROPERTIES ───
function Properties({ properties, setProperties, leases }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const empty = { name: '', address: '', type: 'apartment', units: 1, bedrooms: '', bathrooms: '', sqft: '', yearBuilt: '', purchasePrice: '', marketValue: '', notes: '' }
  const [form, setForm] = useState(empty)

  const filtered = properties.filter(p => `${p.name} ${p.address} ${p.type}`.toLowerCase().includes(search.toLowerCase()))

  function save() {
    if (!form.name || !form.address) return
    if (editing) {
      setProperties(prev => prev.map(p => p.id === editing ? { ...form, id: editing } : p))
    } else {
      setProperties(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  function del(id) { setProperties(prev => prev.filter(p => p.id !== id)); setConfirmDel(null) }

  function getOccupancy(propId) {
    return leases.some(l => l.propertyId === propId && l.status === 'active') ? 'Occupied' : 'Vacant'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Properties ({properties.length})</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search properties..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ Add Property</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No properties found. Add your first property!" /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Address</th><th style={thStyle}>Type</th><th style={thStyle}>Beds/Baths</th><th style={thStyle}>Sq Ft</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={tdStyle}><strong>{p.name}</strong></td>
                <td style={tdStyle}>{p.address}</td>
                <td style={tdStyle}><Badge status={p.type} /></td>
                <td style={tdStyle}>{p.bedrooms || '-'} / {p.bathrooms || '-'}</td>
                <td style={tdStyle}>{p.sqft ? Number(p.sqft).toLocaleString() : '-'}</td>
                <td style={tdStyle}><Badge status={getOccupancy(p.id) === 'Occupied' ? 'active' : 'inactive'} /></td>
                <td style={tdStyle}>
                  <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => { setForm(p); setEditing(p.id); setShowForm(true) }}>Edit</button>
                  <button style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDel(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDel && <ConfirmDialog message="Delete this property? This cannot be undone." onConfirm={() => del(confirmDel)} onCancel={() => setConfirmDel(null)} />}

      {showForm && (
        <Modal title={editing ? 'Edit Property' : 'Add Property'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <div style={formGroup}><label style={labelStyle}>Property Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div style={formGroup}><label style={labelStyle}>Address *</label><input style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Type</label><select style={selectStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="apartment">Apartment</option><option value="house">House</option><option value="condo">Condo</option><option value="commercial">Commercial</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Units</label><input style={inputStyle} type="number" min="1" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Bedrooms</label><input style={inputStyle} type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Bathrooms</label><input style={inputStyle} type="number" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Sq Ft</label><input style={inputStyle} type="number" value={form.sqft} onChange={e => setForm({ ...form, sqft: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Year Built</label><input style={inputStyle} type="number" value={form.yearBuilt} onChange={e => setForm({ ...form, yearBuilt: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Purchase Price</label><input style={inputStyle} type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Market Value</label><input style={inputStyle} type="number" value={form.marketValue} onChange={e => setForm({ ...form, marketValue: e.target.value })} /></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Add'} Property</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── TENANTS ───
function Tenants({ tenants, setTenants }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const empty = { firstName: '', lastName: '', email: '', phone: '', emergencyContact: '', emergencyPhone: '', idNumber: '', notes: '', portalPin: '' }
  const [form, setForm] = useState(empty)

  const filtered = tenants.filter(t => `${t.firstName} ${t.lastName} ${t.email} ${t.phone}`.toLowerCase().includes(search.toLowerCase()))

  function save() {
    if (!form.firstName || !form.lastName) return
    if (editing) {
      setTenants(prev => prev.map(t => t.id === editing ? { ...form, id: editing } : t))
    } else {
      setTenants(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Tenants ({tenants.length})</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search tenants..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ Add Tenant</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No tenants found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Email</th><th style={thStyle}>Phone</th><th style={thStyle}>Emergency Contact</th><th style={thStyle}>Portal PIN</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td style={tdStyle}><strong>{t.firstName} {t.lastName}</strong></td>
                <td style={tdStyle}>{t.email || '-'}</td>
                <td style={tdStyle}>{t.phone || '-'}</td>
                <td style={tdStyle}>{t.emergencyContact ? `${t.emergencyContact} (${t.emergencyPhone || ''})` : '-'}</td>
                <td style={tdStyle}><code style={{ background: '#2e2e3e', padding: '2px 6px', borderRadius: 4, color: '#8b5cf6' }}>{t.portalPin || 'Not set'}</code></td>
                <td style={tdStyle}>
                  <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => { setForm(t); setEditing(t.id); setShowForm(true) }}>Edit</button>
                  <button style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDel(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDel && <ConfirmDialog message="Delete this tenant?" onConfirm={() => { setTenants(prev => prev.filter(t => t.id !== confirmDel)); setConfirmDel(null) }} onCancel={() => setConfirmDel(null)} />}

      {showForm && (
        <Modal title={editing ? 'Edit Tenant' : 'Add Tenant'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>First Name *</label><input style={inputStyle} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Emergency Contact</label><input style={inputStyle} value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Emergency Phone</label><input style={inputStyle} value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>ID / Passport Number</label><input style={inputStyle} value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Portal PIN (for tenant login)</label><input style={inputStyle} value={form.portalPin} onChange={e => setForm({ ...form, portalPin: e.target.value })} placeholder="e.g. 1234" /></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Add'} Tenant</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── LEASES ───
function Leases({ leases, setLeases, properties, tenants }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [viewLease, setViewLease] = useState(null)
  const empty = { propertyId: '', tenantId: '', startDate: '', endDate: '', rentAmount: '', securityDeposit: '', paymentDueDay: '1', status: 'active', terms: '', notes: '' }
  const [form, setForm] = useState(empty)

  const filtered = leases.filter(l => {
    const prop = properties.find(p => p.id === l.propertyId)
    const ten = tenants.find(t => t.id === l.tenantId)
    return `${prop?.name || ''} ${ten?.firstName || ''} ${ten?.lastName || ''} ${l.status}`.toLowerCase().includes(search.toLowerCase())
  })

  function save() {
    if (!form.propertyId || !form.tenantId || !form.startDate || !form.rentAmount) return
    if (editing) {
      setLeases(prev => prev.map(l => l.id === editing ? { ...form, id: editing } : l))
    } else {
      setLeases(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  function exportLeasePdf(lease) {
    const prop = properties.find(p => p.id === lease.propertyId)
    const ten = tenants.find(t => t.id === lease.tenantId)
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text('Lease Agreement', 20, 25)
    doc.setFontSize(12)
    doc.text(`Property: ${prop?.name || 'N/A'} - ${prop?.address || ''}`, 20, 45)
    doc.text(`Tenant: ${ten?.firstName || ''} ${ten?.lastName || ''}`, 20, 55)
    doc.text(`Lease Period: ${lease.startDate} to ${lease.endDate || 'Month-to-month'}`, 20, 65)
    doc.text(`Monthly Rent: $${Number(lease.rentAmount).toLocaleString()}`, 20, 75)
    doc.text(`Security Deposit: $${Number(lease.securityDeposit || 0).toLocaleString()}`, 20, 85)
    doc.text(`Payment Due Day: ${lease.paymentDueDay || '1st'} of each month`, 20, 95)
    doc.text(`Status: ${lease.status}`, 20, 105)
    if (lease.terms) { doc.text('Terms:', 20, 120); const lines = doc.splitTextToSize(lease.terms, 170); doc.text(lines, 20, 130) }
    doc.text('________________________', 20, 230); doc.text('Landlord Signature', 20, 240)
    doc.text('________________________', 110, 230); doc.text('Tenant Signature', 110, 240)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 255)
    doc.save(`lease-${ten?.lastName || 'agreement'}.pdf`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Leases ({leases.length})</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search leases..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ New Lease</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No leases found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Property</th><th style={thStyle}>Tenant</th><th style={thStyle}>Period</th><th style={thStyle}>Rent</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(l => {
              const prop = properties.find(p => p.id === l.propertyId)
              const ten = tenants.find(t => t.id === l.tenantId)
              return (
                <tr key={l.id}>
                  <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                  <td style={tdStyle}>{ten ? `${ten.firstName} ${ten.lastName}` : 'N/A'}</td>
                  <td style={tdStyle}>{l.startDate} — {l.endDate || 'Ongoing'}</td>
                  <td style={tdStyle}>${Number(l.rentAmount).toLocaleString()}</td>
                  <td style={tdStyle}><Badge status={l.status} /></td>
                  <td style={tdStyle}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => setViewLease(l)}>View</button>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => { setForm(l); setEditing(l.id); setShowForm(true) }}>Edit</button>
                    <button style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }} onClick={() => exportLeasePdf(l)}>PDF</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {viewLease && (
        <Modal title="Lease Details" onClose={() => setViewLease(null)} wide>
          {(() => {
            const prop = properties.find(p => p.id === viewLease.propertyId)
            const ten = tenants.find(t => t.id === viewLease.tenantId)
            return (
              <div style={{ color: '#e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div><strong style={{ color: '#94a3b8' }}>Property:</strong><br />{prop?.name} — {prop?.address}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Tenant:</strong><br />{ten?.firstName} {ten?.lastName}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Lease Period:</strong><br />{viewLease.startDate} to {viewLease.endDate || 'Month-to-month'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Monthly Rent:</strong><br />${Number(viewLease.rentAmount).toLocaleString()}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Security Deposit:</strong><br />${Number(viewLease.securityDeposit || 0).toLocaleString()}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Due Day:</strong><br />{viewLease.paymentDueDay || '1'}st of each month</div>
                  <div><strong style={{ color: '#94a3b8' }}>Status:</strong><br /><Badge status={viewLease.status} /></div>
                </div>
                {viewLease.terms && <div style={{ ...cardStyle, marginBottom: 16 }}><strong style={{ color: '#94a3b8' }}>Terms & Conditions:</strong><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{viewLease.terms}</p></div>}
                <button style={btnSuccess} onClick={() => exportLeasePdf(viewLease)}>Download PDF</button>
              </div>
            )
          })()}
        </Modal>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Lease' : 'New Lease'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <div style={formGroup}><label style={labelStyle}>Property *</label><select style={selectStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}</select></div>
          <div style={formGroup}><label style={labelStyle}>Tenant *</label><select style={selectStyle} value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">Select tenant...</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Start Date *</label><input style={inputStyle} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>End Date</label><input style={inputStyle} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Monthly Rent *</label><input style={inputStyle} type="number" value={form.rentAmount} onChange={e => setForm({ ...form, rentAmount: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Security Deposit</label><input style={inputStyle} type="number" value={form.securityDeposit} onChange={e => setForm({ ...form, securityDeposit: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Due Day</label><input style={inputStyle} type="number" min="1" max="28" value={form.paymentDueDay} onChange={e => setForm({ ...form, paymentDueDay: e.target.value })} /></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="expired">Expired</option><option value="pending">Pending</option></select></div>
          <div style={formGroup}><label style={labelStyle}>Terms & Conditions</label><textarea style={{ ...textareaStyle, minHeight: 120 }} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} placeholder="Enter lease terms, rules, and conditions..." /></div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Create'} Lease</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── RENT COLLECTION ───
function RentCollection({ payments, setPayments, leases, properties, tenants }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const empty = { leaseId: '', amount: '', date: '', method: 'bank-transfer', status: 'paid', reference: '', lateFee: '', notes: '' }
  const [form, setForm] = useState(empty)

  const filtered = payments.filter(p => {
    const lease = leases.find(l => l.id === p.leaseId)
    const ten = tenants.find(t => t.id === lease?.tenantId)
    const matchSearch = `${ten?.firstName || ''} ${ten?.lastName || ''} ${p.reference || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)

  function save() {
    if (!form.leaseId || !form.amount || !form.date) return
    if (editing) {
      setPayments(prev => prev.map(p => p.id === editing ? { ...form, id: editing } : p))
    } else {
      setPayments(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  function generateReceipt(payment) {
    const lease = leases.find(l => l.id === payment.leaseId)
    const prop = properties.find(p => p.id === lease?.propertyId)
    const ten = tenants.find(t => t.id === lease?.tenantId)
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text('Payment Receipt', 20, 25)
    doc.setFontSize(12)
    doc.text(`Receipt #: ${payment.id}`, 20, 45)
    doc.text(`Date: ${payment.date}`, 20, 55)
    doc.text(`Tenant: ${ten?.firstName || ''} ${ten?.lastName || ''}`, 20, 70)
    doc.text(`Property: ${prop?.name || 'N/A'} - ${prop?.address || ''}`, 20, 80)
    doc.text(`Amount Paid: $${Number(payment.amount).toLocaleString()}`, 20, 95)
    if (payment.lateFee) doc.text(`Late Fee: $${Number(payment.lateFee).toLocaleString()}`, 20, 105)
    doc.text(`Payment Method: ${payment.method}`, 20, 115)
    doc.text(`Reference: ${payment.reference || 'N/A'}`, 20, 125)
    doc.text(`Status: ${payment.status}`, 20, 135)
    doc.save(`receipt-${payment.id}.pdf`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Rent Collection — Total: ${totalCollected.toLocaleString()}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select style={{ ...selectStyle, maxWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option><option value="partial">Partial</option>
          </select>
          <SearchBar value={search} onChange={setSearch} placeholder="Search payments..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ Record Payment</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No payments found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Tenant</th><th style={thStyle}>Property</th><th style={thStyle}>Amount</th><th style={thStyle}>Date</th><th style={thStyle}>Method</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(p => {
              const lease = leases.find(l => l.id === p.leaseId)
              const prop = properties.find(pr => pr.id === lease?.propertyId)
              const ten = tenants.find(t => t.id === lease?.tenantId)
              return (
                <tr key={p.id}>
                  <td style={tdStyle}>{ten ? `${ten.firstName} ${ten.lastName}` : 'N/A'}</td>
                  <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                  <td style={tdStyle}>${Number(p.amount).toLocaleString()}{p.lateFee ? ` (+$${p.lateFee} fee)` : ''}</td>
                  <td style={tdStyle}>{p.date}</td>
                  <td style={tdStyle}>{p.method}</td>
                  <td style={tdStyle}><Badge status={p.status} /></td>
                  <td style={tdStyle}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => { setForm(p); setEditing(p.id); setShowForm(true) }}>Edit</button>
                    <button style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }} onClick={() => generateReceipt(p)}>Receipt</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Payment' : 'Record Payment'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <div style={formGroup}><label style={labelStyle}>Lease *</label><select style={selectStyle} value={form.leaseId} onChange={e => setForm({ ...form, leaseId: e.target.value })}><option value="">Select lease...</option>{leases.filter(l => l.status === 'active').map(l => { const t = tenants.find(t2 => t2.id === l.tenantId); const p = properties.find(p2 => p2.id === l.propertyId); return <option key={l.id} value={l.id}>{t?.firstName} {t?.lastName} — {p?.name} (${l.rentAmount}/mo)</option> })}</select></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Amount *</label><input style={inputStyle} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Late Fee</label><input style={inputStyle} type="number" value={form.lateFee} onChange={e => setForm({ ...form, lateFee: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Date *</label><input style={inputStyle} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Method</label><select style={selectStyle} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option value="bank-transfer">Bank Transfer</option><option value="cash">Cash</option><option value="check">Check</option><option value="card">Card</option><option value="online">Online</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option><option value="partial">Partial</option></select></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Reference #</label><input style={inputStyle} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Record'} Payment</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── MAINTENANCE ───
function Maintenance({ maintenance, setMaintenance, properties, tenants, leases }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const empty = { propertyId: '', tenantId: '', title: '', description: '', category: 'plumbing', priority: 'medium', status: 'open', assignedTo: '', estimatedCost: '', actualCost: '', scheduledDate: '', completedDate: '', notes: '' }
  const [form, setForm] = useState(empty)

  const filtered = maintenance.filter(m => {
    const prop = properties.find(p => p.id === m.propertyId)
    const matchSearch = `${prop?.name || ''} ${m.title} ${m.category}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    const matchPriority = filterPriority === 'all' || m.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  function save() {
    if (!form.propertyId || !form.title) return
    if (editing) {
      setMaintenance(prev => prev.map(m => m.id === editing ? { ...form, id: editing } : m))
    } else {
      setMaintenance(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString(), submittedBy: 'manager' }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Maintenance ({maintenance.length})</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select style={{ ...selectStyle, maxWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
          <select style={{ ...selectStyle, maxWidth: 130 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="all">All Priority</option><option value="emergency">Emergency</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <SearchBar value={search} onChange={setSearch} placeholder="Search issues..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ New Issue</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No maintenance issues found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Property</th><th style={thStyle}>Issue</th><th style={thStyle}>Category</th><th style={thStyle}>Priority</th><th style={thStyle}>Status</th><th style={thStyle}>Assigned</th><th style={thStyle}>Cost</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(m => {
              const prop = properties.find(p => p.id === m.propertyId)
              return (
                <tr key={m.id}>
                  <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                  <td style={tdStyle}><strong>{m.title}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{m.description?.substring(0, 60)}{m.description?.length > 60 ? '...' : ''}</span></td>
                  <td style={tdStyle}>{m.category}</td>
                  <td style={tdStyle}><Badge status={m.priority} /></td>
                  <td style={tdStyle}><Badge status={m.status} /></td>
                  <td style={tdStyle}>{m.assignedTo || '-'}</td>
                  <td style={tdStyle}>{m.actualCost ? `$${Number(m.actualCost).toLocaleString()}` : m.estimatedCost ? `~$${Number(m.estimatedCost).toLocaleString()}` : '-'}</td>
                  <td style={tdStyle}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={() => { setForm(m); setEditing(m.id); setShowForm(true) }}>Edit</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Maintenance Issue' : 'New Maintenance Issue'} onClose={() => { setShowForm(false); setEditing(null) }} wide>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Property *</label><select style={selectStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Reported By (Tenant)</label><select style={selectStyle} value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">Select tenant...</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Issue Title *</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div style={formGroup}><label style={labelStyle}>Description</label><textarea style={textareaStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Category</label><select style={selectStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="hvac">HVAC</option><option value="appliance">Appliance</option><option value="structural">Structural</option><option value="pest-control">Pest Control</option><option value="landscaping">Landscaping</option><option value="other">Other</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Priority</label><select style={selectStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Assigned To</label><input style={inputStyle} value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Contractor / Handyman" /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Scheduled Date</label><input style={inputStyle} type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Estimated Cost</label><input style={inputStyle} type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Actual Cost</label><input style={inputStyle} type="number" value={form.actualCost} onChange={e => setForm({ ...form, actualCost: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Completed Date</label><input style={inputStyle} type="date" value={form.completedDate} onChange={e => setForm({ ...form, completedDate: e.target.value })} /></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Submit'} Issue</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── UTILITY BILLS ───
function UtilityBills({ utilities, setUtilities, properties }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const empty = { propertyId: '', type: 'electricity', provider: '', accountNumber: '', amount: '', date: '', dueDate: '', status: 'unpaid', meterReading: '', notes: '' }
  const [form, setForm] = useState(empty)

  const filtered = utilities.filter(u => {
    const prop = properties.find(p => p.id === u.propertyId)
    return `${prop?.name || ''} ${u.type} ${u.provider}`.toLowerCase().includes(search.toLowerCase())
  })

  const totalUnpaid = utilities.filter(u => u.status === 'unpaid').reduce((s, u) => s + Number(u.amount || 0), 0)

  function save() {
    if (!form.propertyId || !form.type || !form.amount) return
    if (editing) {
      setUtilities(prev => prev.map(u => u.id === editing ? { ...form, id: editing } : u))
    } else {
      setUtilities(prev => [...prev, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Utility Bills — Unpaid: ${totalUnpaid.toLocaleString()}</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search utilities..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ Add Bill</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No utility bills found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Property</th><th style={thStyle}>Type</th><th style={thStyle}>Provider</th><th style={thStyle}>Amount</th><th style={thStyle}>Bill Date</th><th style={thStyle}>Due Date</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => {
              const prop = properties.find(p => p.id === u.propertyId)
              return (
                <tr key={u.id}>
                  <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                  <td style={tdStyle}>{u.type}</td>
                  <td style={tdStyle}>{u.provider || '-'}</td>
                  <td style={tdStyle}>${Number(u.amount).toLocaleString()}</td>
                  <td style={tdStyle}>{u.date}</td>
                  <td style={tdStyle}>{u.dueDate || '-'}</td>
                  <td style={tdStyle}><Badge status={u.status} /></td>
                  <td style={tdStyle}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => { setForm(u); setEditing(u.id); setShowForm(true) }}>Edit</button>
                    {u.status === 'unpaid' && <button style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }} onClick={() => setUtilities(prev => prev.map(x => x.id === u.id ? { ...x, status: 'paid' } : x))}>Mark Paid</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Utility Bill' : 'Add Utility Bill'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <div style={formGroup}><label style={labelStyle}>Property *</label><select style={selectStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Utility Type *</label><select style={selectStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="electricity">Electricity</option><option value="water">Water</option><option value="gas">Gas</option><option value="internet">Internet</option><option value="trash">Trash</option><option value="sewer">Sewer</option><option value="other">Other</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Provider</label><input style={inputStyle} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Account #</label><input style={inputStyle} value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Amount *</label><input style={inputStyle} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Bill Date</label><input style={inputStyle} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Due Date</label><input style={inputStyle} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Meter Reading</label><input style={inputStyle} value={form.meterReading} onChange={e => setForm({ ...form, meterReading: e.target.value })} /></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Add'} Bill</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── WARRANTIES ───
function Warranties({ warranties, setWarranties, properties }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [viewWarranty, setViewWarranty] = useState(null)
  const empty = { propertyId: '', itemName: '', category: 'appliance', manufacturer: '', modelNumber: '', serialNumber: '', purchaseDate: '', warrantyStart: '', warrantyEnd: '', purchasePrice: '', vendor: '', status: 'under-warranty', proofOfPurchase: '', signedDocument: '', coverageDetails: '', claimHistory: '', contactInfo: '', notes: '' }
  const [form, setForm] = useState(empty)

  const today = new Date().toISOString().slice(0, 10)
  const filtered = warranties.filter(w => {
    const prop = properties.find(p => p.id === w.propertyId)
    return `${prop?.name || ''} ${w.itemName} ${w.manufacturer} ${w.category}`.toLowerCase().includes(search.toLowerCase())
  })

  const expiringCount = warranties.filter(w => {
    if (!w.warrantyEnd) return false
    const end = new Date(w.warrantyEnd)
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24)
    return diff > 0 && diff <= 30
  }).length

  function save() {
    if (!form.itemName || !form.propertyId) return
    const autoStatus = form.warrantyEnd && form.warrantyEnd < today ? 'warranty-expired' : form.status
    if (editing) {
      setWarranties(prev => prev.map(w => w.id === editing ? { ...form, status: autoStatus, id: editing } : w))
    } else {
      setWarranties(prev => [...prev, { ...form, status: autoStatus, id: genId(), createdAt: new Date().toISOString() }])
    }
    setShowForm(false); setEditing(null); setForm(empty)
  }

  function exportWarrantyPdf(w) {
    const prop = properties.find(p => p.id === w.propertyId)
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text('Warranty Record', 20, 25)
    doc.setFontSize(12)
    doc.text(`Item: ${w.itemName}`, 20, 45)
    doc.text(`Property: ${prop?.name || 'N/A'} - ${prop?.address || ''}`, 20, 55)
    doc.text(`Manufacturer: ${w.manufacturer || 'N/A'}`, 20, 65)
    doc.text(`Model: ${w.modelNumber || 'N/A'}  |  Serial: ${w.serialNumber || 'N/A'}`, 20, 75)
    doc.text(`Purchase Date: ${w.purchaseDate || 'N/A'}  |  Price: $${w.purchasePrice || 'N/A'}`, 20, 85)
    doc.text(`Vendor: ${w.vendor || 'N/A'}`, 20, 95)
    doc.text(`Warranty Period: ${w.warrantyStart || 'N/A'} to ${w.warrantyEnd || 'N/A'}`, 20, 105)
    doc.text(`Status: ${w.status}`, 20, 115)
    doc.text(`Contact: ${w.contactInfo || 'N/A'}`, 20, 125)
    if (w.proofOfPurchase) { doc.text(`Proof of Purchase: ${w.proofOfPurchase}`, 20, 140) }
    if (w.signedDocument) { doc.text(`Signed Document: ${w.signedDocument}`, 20, 150) }
    if (w.coverageDetails) { doc.text('Coverage:', 20, 165); const lines = doc.splitTextToSize(w.coverageDetails, 170); doc.text(lines, 20, 175) }
    if (w.claimHistory) { doc.text('Claim History:', 20, 210); const lines2 = doc.splitTextToSize(w.claimHistory, 170); doc.text(lines2, 20, 220) }
    doc.save(`warranty-${w.itemName.replace(/\s+/g, '-')}.pdf`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>Warranties ({warranties.length})</h2>
          {expiringCount > 0 && <span style={{ color: '#f59e0b', fontSize: 13 }}>⚠ {expiringCount} expiring within 30 days</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search warranties..." />
          <button style={btnPrimary} onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }}>+ Add Warranty</button>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No warranties found." /> : (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Item</th><th style={thStyle}>Property</th><th style={thStyle}>Manufacturer</th><th style={thStyle}>Purchase</th><th style={thStyle}>Warranty Ends</th><th style={thStyle}>Status</th><th style={thStyle}>Proof</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {filtered.map(w => {
              const prop = properties.find(p => p.id === w.propertyId)
              const daysLeft = w.warrantyEnd ? Math.ceil((new Date(w.warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24)) : null
              return (
                <tr key={w.id}>
                  <td style={tdStyle}><strong>{w.itemName}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{w.category}</span></td>
                  <td style={tdStyle}>{prop?.name || 'N/A'}</td>
                  <td style={tdStyle}>{w.manufacturer || '-'}</td>
                  <td style={tdStyle}>{w.purchaseDate || '-'}{w.purchasePrice ? <><br /><span style={{ color: '#64748b', fontSize: 12 }}>${Number(w.purchasePrice).toLocaleString()}</span></> : ''}</td>
                  <td style={tdStyle}>{w.warrantyEnd || '-'}{daysLeft !== null && daysLeft > 0 ? <><br /><span style={{ color: daysLeft <= 30 ? '#f59e0b' : '#22c55e', fontSize: 12 }}>{daysLeft} days left</span></> : daysLeft !== null && daysLeft <= 0 ? <><br /><span style={{ color: '#ef4444', fontSize: 12 }}>Expired</span></> : ''}</td>
                  <td style={tdStyle}><Badge status={w.warrantyEnd && w.warrantyEnd < today ? 'warranty-expired' : w.status} /></td>
                  <td style={tdStyle}>
                    {w.proofOfPurchase ? <span title={w.proofOfPurchase} style={{ color: '#22c55e', fontSize: 12, cursor: 'help' }}>Receipt ✓</span> : <span style={{ color: '#64748b', fontSize: 12 }}>None</span>}
                    {w.signedDocument && <><br /><span title={w.signedDocument} style={{ color: '#3b82f6', fontSize: 12, cursor: 'help' }}>Doc ✓</span></>}
                  </td>
                  <td style={tdStyle}>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => setViewWarranty(w)}>View</button>
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => { setForm(w); setEditing(w.id); setShowForm(true) }}>Edit</button>
                    <button style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }} onClick={() => exportWarrantyPdf(w)}>PDF</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {viewWarranty && (
        <Modal title="Warranty Details" onClose={() => setViewWarranty(null)} wide>
          {(() => {
            const w = viewWarranty
            const prop = properties.find(p => p.id === w.propertyId)
            return (
              <div style={{ color: '#e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div><strong style={{ color: '#94a3b8' }}>Item:</strong><br />{w.itemName} ({w.category})</div>
                  <div><strong style={{ color: '#94a3b8' }}>Property:</strong><br />{prop?.name} — {prop?.address}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Manufacturer:</strong><br />{w.manufacturer || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Model / Serial:</strong><br />{w.modelNumber || 'N/A'} / {w.serialNumber || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Purchase Date:</strong><br />{w.purchaseDate || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Purchase Price:</strong><br />{w.purchasePrice ? `$${Number(w.purchasePrice).toLocaleString()}` : 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Vendor:</strong><br />{w.vendor || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Warranty Period:</strong><br />{w.warrantyStart || 'N/A'} to {w.warrantyEnd || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Status:</strong><br /><Badge status={w.status} /></div>
                  <div><strong style={{ color: '#94a3b8' }}>Contact:</strong><br />{w.contactInfo || 'N/A'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div style={cardStyle}><strong style={{ color: '#94a3b8' }}>Proof of Purchase:</strong><p style={{ marginTop: 8 }}>{w.proofOfPurchase || 'Not provided'}</p></div>
                  <div style={cardStyle}><strong style={{ color: '#94a3b8' }}>Signed Document:</strong><p style={{ marginTop: 8 }}>{w.signedDocument || 'Not provided'}</p></div>
                </div>
                {w.coverageDetails && <div style={{ ...cardStyle, marginBottom: 16 }}><strong style={{ color: '#94a3b8' }}>Coverage Details:</strong><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{w.coverageDetails}</p></div>}
                {w.claimHistory && <div style={{ ...cardStyle, marginBottom: 16 }}><strong style={{ color: '#94a3b8' }}>Claim History:</strong><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{w.claimHistory}</p></div>}
                <button style={btnSuccess} onClick={() => exportWarrantyPdf(w)}>Download PDF</button>
              </div>
            )
          })()}
        </Modal>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Warranty' : 'Add Warranty'} onClose={() => { setShowForm(false); setEditing(null) }} wide>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Property *</label><select style={selectStyle} value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}><option value="">Select property...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Category</label><select style={selectStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="appliance">Appliance</option><option value="hvac">HVAC</option><option value="roof">Roof</option><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="structural">Structural</option><option value="flooring">Flooring</option><option value="other">Other</option></select></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Item Name *</label><input style={inputStyle} value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Samsung Refrigerator, Carrier AC Unit" /></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Manufacturer</label><input style={inputStyle} value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Model Number</label><input style={inputStyle} value={form.modelNumber} onChange={e => setForm({ ...form, modelNumber: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Serial Number</label><input style={inputStyle} value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Purchase Date</label><input style={inputStyle} type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Purchase Price</label><input style={inputStyle} type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Vendor / Store</label><input style={inputStyle} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Warranty Start</label><input style={inputStyle} type="date" value={form.warrantyStart} onChange={e => setForm({ ...form, warrantyStart: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Warranty End</label><input style={inputStyle} type="date" value={form.warrantyEnd} onChange={e => setForm({ ...form, warrantyEnd: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Status</label><select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="under-warranty">Under Warranty</option><option value="warranty-expired">Expired</option><option value="claimed">Claimed</option></select></div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Proof of Purchase (receipt reference, file name, or description)</label><input style={inputStyle} value={form.proofOfPurchase} onChange={e => setForm({ ...form, proofOfPurchase: e.target.value })} placeholder="e.g. Receipt #12345, scanned copy in Dropbox, Home Depot order #ABC" /></div>
          <div style={formGroup}><label style={labelStyle}>Signed Document / Warranty Certificate (reference or description)</label><input style={inputStyle} value={form.signedDocument} onChange={e => setForm({ ...form, signedDocument: e.target.value })} placeholder="e.g. Warranty card filed in office, PDF in Google Drive" /></div>
          <div style={formGroup}><label style={labelStyle}>Warranty Contact Info</label><input style={inputStyle} value={form.contactInfo} onChange={e => setForm({ ...form, contactInfo: e.target.value })} placeholder="e.g. 1-800-SAMSUNG, support@carrier.com" /></div>
          <div style={formGroup}><label style={labelStyle}>Coverage Details</label><textarea style={textareaStyle} value={form.coverageDetails} onChange={e => setForm({ ...form, coverageDetails: e.target.value })} placeholder="What's covered, exclusions, conditions..." /></div>
          <div style={formGroup}><label style={labelStyle}>Claim History</label><textarea style={textareaStyle} value={form.claimHistory} onChange={e => setForm({ ...form, claimHistory: e.target.value })} placeholder="Log of any warranty claims made..." /></div>
          <div style={formGroup}><label style={labelStyle}>Notes</label><textarea style={textareaStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button style={btnPrimary} onClick={save}>{editing ? 'Update' : 'Add'} Warranty</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── TENANT PORTAL ───
function TenantPortal({ tenants, leases, properties, payments, setPayments, maintenance, setMaintenance, utilities }) {
  const [loggedInTenant, setLoggedInTenant] = useState(null)
  const [loginName, setLoginName] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const issueEmpty = { title: '', description: '', category: 'plumbing', priority: 'medium' }
  const [issueForm, setIssueForm] = useState(issueEmpty)
  const payEmpty = { amount: '', method: 'bank-transfer', reference: '' }
  const [payForm, setPayForm] = useState(payEmpty)

  function login() {
    const found = tenants.find(t => `${t.firstName} ${t.lastName}`.toLowerCase() === loginName.toLowerCase().trim() && t.portalPin === loginPin)
    if (found) { setLoggedInTenant(found); setLoginError('') }
    else { setLoginError('Invalid name or PIN. Please contact your property manager.') }
  }

  if (!loggedInTenant) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h2 style={{ color: '#e2e8f0', marginBottom: 8 }}>Tenant Portal</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>Log in with your full name and PIN provided by your property manager.</p>
        <div style={{ ...cardStyle, padding: 24, textAlign: 'left' }}>
          <div style={formGroup}><label style={labelStyle}>Full Name</label><input style={inputStyle} value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="John Smith" onKeyDown={e => e.key === 'Enter' && login()} /></div>
          <div style={formGroup}><label style={labelStyle}>PIN</label><input style={inputStyle} type="password" value={loginPin} onChange={e => setLoginPin(e.target.value)} placeholder="****" onKeyDown={e => e.key === 'Enter' && login()} /></div>
          {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
          <button style={{ ...btnPrimary, width: '100%' }} onClick={login}>Log In</button>
        </div>
      </div>
    )
  }

  const tenantLeases = leases.filter(l => l.tenantId === loggedInTenant.id)
  const activeLeaseIds = tenantLeases.filter(l => l.status === 'active').map(l => l.id)
  const tenantPayments = payments.filter(p => activeLeaseIds.includes(p.leaseId) || tenantLeases.map(l => l.id).includes(p.leaseId))
  const tenantMaintenance = maintenance.filter(m => m.tenantId === loggedInTenant.id || tenantLeases.some(l => l.propertyId === m.propertyId))
  const tenantPropertyIds = [...new Set(tenantLeases.map(l => l.propertyId))]
  const tenantUtilities = utilities.filter(u => tenantPropertyIds.includes(u.propertyId))
  const activeLease = tenantLeases.find(l => l.status === 'active')

  function submitIssue() {
    if (!issueForm.title || !activeLease) return
    setMaintenance(prev => [...prev, { ...issueForm, id: genId(), propertyId: activeLease.propertyId, tenantId: loggedInTenant.id, status: 'open', createdAt: new Date().toISOString(), submittedBy: 'tenant' }])
    setShowIssueForm(false); setIssueForm(issueEmpty)
  }

  function submitPayment() {
    if (!payForm.amount || !activeLease) return
    setPayments(prev => [...prev, { leaseId: activeLease.id, amount: payForm.amount, date: new Date().toISOString().slice(0, 10), method: payForm.method, reference: payForm.reference, status: 'paid', id: genId(), createdAt: new Date().toISOString() }])
    setShowPayForm(false); setPayForm(payEmpty)
  }

  const portalTabs = [
    { id: 'dashboard', label: 'Overview', icon: '📊' },
    { id: 'lease', label: 'My Lease', icon: '📋' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'maintenance', label: 'Issues', icon: '🔧' },
    { id: 'bills', label: 'Bills', icon: '💡' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>Welcome, {loggedInTenant.firstName}!</h2>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Tenant Portal</span>
        </div>
        <button style={btnSecondary} onClick={() => setLoggedInTenant(null)}>Log Out</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {portalTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...activeTab === tab.id ? btnPrimary : btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <StatCard label="Monthly Rent" value={activeLease ? `$${Number(activeLease.rentAmount).toLocaleString()}` : 'N/A'} icon="💰" color="#22c55e" />
            <StatCard label="Payments Made" value={tenantPayments.filter(p => p.status === 'paid').length} icon="✅" color="#3b82f6" />
            <StatCard label="Open Issues" value={tenantMaintenance.filter(m => m.status === 'open' || m.status === 'in-progress').length} icon="🔧" color="#f59e0b" />
            <StatCard label="Pending Bills" value={tenantUtilities.filter(u => u.status === 'unpaid').length} icon="💡" color="#ef4444" />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button style={{ ...btnPrimary, flex: 1, padding: 16, fontSize: 16 }} onClick={() => setShowPayForm(true)}>Pay Rent</button>
            <button style={{ ...btnSuccess, flex: 1, padding: 16, fontSize: 16 }} onClick={() => setShowIssueForm(true)}>Report Issue</button>
          </div>
        </div>
      )}

      {activeTab === 'lease' && (
        <div>
          {activeLease ? (
            <div style={cardStyle}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Current Lease Agreement</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, color: '#e2e8f0' }}>
                <div><strong style={{ color: '#94a3b8' }}>Property:</strong><br />{properties.find(p => p.id === activeLease.propertyId)?.name} — {properties.find(p => p.id === activeLease.propertyId)?.address}</div>
                <div><strong style={{ color: '#94a3b8' }}>Lease Period:</strong><br />{activeLease.startDate} to {activeLease.endDate || 'Month-to-month'}</div>
                <div><strong style={{ color: '#94a3b8' }}>Monthly Rent:</strong><br />${Number(activeLease.rentAmount).toLocaleString()}</div>
                <div><strong style={{ color: '#94a3b8' }}>Security Deposit:</strong><br />${Number(activeLease.securityDeposit || 0).toLocaleString()}</div>
                <div><strong style={{ color: '#94a3b8' }}>Payment Due:</strong><br />{activeLease.paymentDueDay || '1'}st of each month</div>
                <div><strong style={{ color: '#94a3b8' }}>Status:</strong><br /><Badge status={activeLease.status} /></div>
              </div>
              {activeLease.terms && (
                <div style={{ marginTop: 20, padding: 16, background: '#0f0f1a', borderRadius: 8 }}>
                  <strong style={{ color: '#94a3b8' }}>Terms & Conditions:</strong>
                  <p style={{ color: '#e2e8f0', marginTop: 8, whiteSpace: 'pre-wrap' }}>{activeLease.terms}</p>
                </div>
              )}
            </div>
          ) : <EmptyState message="No active lease found." />}
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>Payment History</h3>
            <button style={btnPrimary} onClick={() => setShowPayForm(true)}>Pay Rent</button>
          </div>
          {tenantPayments.length === 0 ? <EmptyState message="No payment records." /> : (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Amount</th><th style={thStyle}>Method</th><th style={thStyle}>Reference</th><th style={thStyle}>Status</th></tr></thead>
              <tbody>
                {tenantPayments.sort((a, b) => b.date?.localeCompare(a.date)).map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.date}</td>
                    <td style={tdStyle}>${Number(p.amount).toLocaleString()}</td>
                    <td style={tdStyle}>{p.method}</td>
                    <td style={tdStyle}>{p.reference || '-'}</td>
                    <td style={tdStyle}><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>Maintenance Issues</h3>
            <button style={btnPrimary} onClick={() => setShowIssueForm(true)}>Report Issue</button>
          </div>
          {tenantMaintenance.length === 0 ? <EmptyState message="No maintenance issues." /> : (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Issue</th><th style={thStyle}>Category</th><th style={thStyle}>Priority</th><th style={thStyle}>Status</th><th style={thStyle}>Submitted</th></tr></thead>
              <tbody>
                {tenantMaintenance.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(m => (
                  <tr key={m.id}>
                    <td style={tdStyle}><strong>{m.title}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{m.description?.substring(0, 80)}</span></td>
                    <td style={tdStyle}>{m.category}</td>
                    <td style={tdStyle}><Badge status={m.priority} /></td>
                    <td style={tdStyle}><Badge status={m.status} /></td>
                    <td style={tdStyle}>{m.createdAt?.slice(0, 10) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'bills' && (
        <div>
          <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Utility Bills</h3>
          {tenantUtilities.length === 0 ? <EmptyState message="No utility bills." /> : (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Type</th><th style={thStyle}>Provider</th><th style={thStyle}>Amount</th><th style={thStyle}>Due Date</th><th style={thStyle}>Status</th></tr></thead>
              <tbody>
                {tenantUtilities.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(u => (
                  <tr key={u.id}>
                    <td style={tdStyle}>{u.type}</td>
                    <td style={tdStyle}>{u.provider || '-'}</td>
                    <td style={tdStyle}>${Number(u.amount).toLocaleString()}</td>
                    <td style={tdStyle}>{u.dueDate || '-'}</td>
                    <td style={tdStyle}><Badge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showIssueForm && (
        <Modal title="Report Maintenance Issue" onClose={() => setShowIssueForm(false)}>
          <div style={formGroup}><label style={labelStyle}>Issue Title *</label><input style={inputStyle} value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} placeholder="Brief description of the problem" /></div>
          <div style={formGroup}><label style={labelStyle}>Description</label><textarea style={textareaStyle} value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} placeholder="Provide details about the issue..." /></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Category</label><select style={selectStyle} value={issueForm.category} onChange={e => setIssueForm({ ...issueForm, category: e.target.value })}><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="hvac">HVAC</option><option value="appliance">Appliance</option><option value="structural">Structural</option><option value="pest-control">Pest Control</option><option value="other">Other</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Priority</label><select style={selectStyle} value={issueForm.priority} onChange={e => setIssueForm({ ...issueForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setShowIssueForm(false)}>Cancel</button>
            <button style={btnPrimary} onClick={submitIssue}>Submit Issue</button>
          </div>
        </Modal>
      )}

      {showPayForm && activeLease && (
        <Modal title="Pay Rent" onClose={() => setShowPayForm(false)}>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Amount Due</div>
            <div style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700 }}>${Number(activeLease.rentAmount).toLocaleString()}</div>
          </div>
          <div style={formGroup}><label style={labelStyle}>Payment Amount *</label><input style={inputStyle} type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder={activeLease.rentAmount} /></div>
          <div style={{ display: 'flex', gap: 12, ...formGroup }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Payment Method</label><select style={selectStyle} value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}><option value="bank-transfer">Bank Transfer</option><option value="card">Card</option><option value="online">Online</option><option value="cash">Cash</option><option value="check">Check</option></select></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Reference #</label><input style={inputStyle} value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setShowPayForm(false)}>Cancel</button>
            <button style={btnSuccess} onClick={submitPayment}>Submit Payment</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── REPORTS ───
function Reports({ properties, tenants, leases, payments, maintenance, utilities, warranties }) {
  const [reportType, setReportType] = useState('income')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const activeLeases = leases.filter(l => l.status === 'active')
  const totalRentExpected = activeLeases.reduce((s, l) => s + Number(l.rentAmount || 0), 0)
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalMaintCost = maintenance.reduce((s, m) => s + Number(m.actualCost || 0), 0)
  const totalUtilCost = utilities.reduce((s, u) => s + Number(u.amount || 0), 0)

  const propReport = properties.map(p => {
    const pLeases = leases.filter(l => l.propertyId === p.id)
    const activeL = pLeases.find(l => l.status === 'active')
    const pPayments = payments.filter(pay => pLeases.some(l => l.id === pay.leaseId) && pay.status === 'paid')
    const pMaint = maintenance.filter(m => m.propertyId === p.id)
    const pUtil = utilities.filter(u => u.propertyId === p.id)
    return {
      name: p.name, address: p.address,
      occupied: !!activeL,
      rent: activeL ? Number(activeL.rentAmount) : 0,
      collected: pPayments.reduce((s, pay) => s + Number(pay.amount || 0), 0),
      maintCost: pMaint.reduce((s, m) => s + Number(m.actualCost || 0), 0),
      utilCost: pUtil.reduce((s, u) => s + Number(u.amount || 0), 0),
      openIssues: pMaint.filter(m => m.status === 'open' || m.status === 'in-progress').length,
    }
  })

  function exportReport() {
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text('Property Management Report', 20, 25)
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35)
    doc.setFontSize(14); doc.text('Financial Summary', 20, 50)
    doc.setFontSize(11)
    doc.text(`Total Properties: ${properties.length}`, 20, 62)
    doc.text(`Active Leases: ${activeLeases.length}`, 20, 70)
    doc.text(`Monthly Rent Expected: $${totalRentExpected.toLocaleString()}`, 20, 78)
    doc.text(`Total Rent Collected: $${totalCollected.toLocaleString()}`, 20, 86)
    doc.text(`Maintenance Costs: $${totalMaintCost.toLocaleString()}`, 20, 94)
    doc.text(`Utility Costs: $${totalUtilCost.toLocaleString()}`, 20, 102)
    doc.text(`Net Income: $${(totalCollected - totalMaintCost - totalUtilCost).toLocaleString()}`, 20, 114)
    let y = 130
    doc.setFontSize(14); doc.text('Property Breakdown', 20, y); y += 14
    doc.setFontSize(9)
    propReport.forEach(p => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`${p.name} (${p.address})`, 20, y); y += 8
      doc.text(`  Status: ${p.occupied ? 'Occupied' : 'Vacant'} | Rent: $${p.rent.toLocaleString()} | Collected: $${p.collected.toLocaleString()} | Maint: $${p.maintCost.toLocaleString()} | Util: $${p.utilCost.toLocaleString()}`, 20, y); y += 10
    })
    doc.save('property-report.pdf')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0 }}>Reports</h2>
        <button style={btnSuccess} onClick={exportReport}>Export PDF Report</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Income" value={`$${totalCollected.toLocaleString()}`} icon="💰" color="#22c55e" />
        <StatCard label="Total Expenses" value={`$${(totalMaintCost + totalUtilCost).toLocaleString()}`} icon="📉" color="#ef4444" />
        <StatCard label="Net Income" value={`$${(totalCollected - totalMaintCost - totalUtilCost).toLocaleString()}`} icon="📈" color={totalCollected - totalMaintCost - totalUtilCost >= 0 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Occupancy Rate" value={properties.length > 0 ? `${Math.round(propReport.filter(p => p.occupied).length / properties.length * 100)}%` : '0%'} icon="🏠" color="#8b5cf6" />
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Property Breakdown</h3>
        {propReport.length === 0 ? <EmptyState message="No properties to report on." /> : (
          <table style={tableStyle}>
            <thead><tr><th style={thStyle}>Property</th><th style={thStyle}>Status</th><th style={thStyle}>Rent</th><th style={thStyle}>Collected</th><th style={thStyle}>Maintenance</th><th style={thStyle}>Utilities</th><th style={thStyle}>Net</th><th style={thStyle}>Open Issues</th></tr></thead>
            <tbody>
              {propReport.map((p, i) => (
                <tr key={i}>
                  <td style={tdStyle}><strong>{p.name}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{p.address}</span></td>
                  <td style={tdStyle}><Badge status={p.occupied ? 'active' : 'inactive'} /></td>
                  <td style={tdStyle}>${p.rent.toLocaleString()}/mo</td>
                  <td style={tdStyle}>${p.collected.toLocaleString()}</td>
                  <td style={tdStyle}>${p.maintCost.toLocaleString()}</td>
                  <td style={tdStyle}>${p.utilCost.toLocaleString()}</td>
                  <td style={{ ...tdStyle, color: p.collected - p.maintCost - p.utilCost >= 0 ? '#22c55e' : '#ef4444' }}>${(p.collected - p.maintCost - p.utilCost).toLocaleString()}</td>
                  <td style={tdStyle}>{p.openIssues > 0 ? <span style={{ color: '#f59e0b' }}>{p.openIssues}</span> : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── SETTINGS ───
function Settings({ settings, setSettings }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Settings</h2>
      <div style={{ ...cardStyle, maxWidth: 600 }}>
        <div style={formGroup}><label style={labelStyle}>Company Name</label><input style={inputStyle} value={settings.companyName || ''} onChange={e => setSettings({ ...settings, companyName: e.target.value })} /></div>
        <div style={formGroup}><label style={labelStyle}>Company Address</label><input style={inputStyle} value={settings.companyAddress || ''} onChange={e => setSettings({ ...settings, companyAddress: e.target.value })} /></div>
        <div style={formGroup}><label style={labelStyle}>Phone</label><input style={inputStyle} value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} /></div>
        <div style={formGroup}><label style={labelStyle}>Email</label><input style={inputStyle} value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} /></div>
        <div style={formGroup}><label style={labelStyle}>Default Late Fee ($)</label><input style={inputStyle} type="number" value={settings.defaultLateFee || ''} onChange={e => setSettings({ ...settings, defaultLateFee: e.target.value })} /></div>
        <div style={formGroup}><label style={labelStyle}>Grace Period (days)</label><input style={inputStyle} type="number" value={settings.gracePeriod || ''} onChange={e => setSettings({ ...settings, gracePeriod: e.target.value })} /></div>
      </div>
    </div>
  )
}

// ─── MAIN APP ───
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'properties', label: 'Properties', icon: '🏠' },
  { id: 'tenants', label: 'Tenants', icon: '👥' },
  { id: 'leases', label: 'Leases', icon: '📋' },
  { id: 'payments', label: 'Rent Collection', icon: '💰' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'utilities', label: 'Utility Bills', icon: '💡' },
  { id: 'warranties', label: 'Warranties', icon: '🛡️' },
  { id: 'portal', label: 'Tenant Portal', icon: '🚪' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [properties, setProperties] = useLocalStorage(STORAGE_KEYS.properties, [])
  const [tenants, setTenants] = useLocalStorage(STORAGE_KEYS.tenants, [])
  const [leases, setLeases] = useLocalStorage(STORAGE_KEYS.leases, [])
  const [payments, setPayments] = useLocalStorage(STORAGE_KEYS.payments, [])
  const [maintenance, setMaintenance] = useLocalStorage(STORAGE_KEYS.maintenance, [])
  const [utilities, setUtilities] = useLocalStorage(STORAGE_KEYS.utilities, [])
  const [warranties, setWarranties] = useLocalStorage(STORAGE_KEYS.warranties, [])
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, {})

  const sidebarWidth = sidebarOpen ? 240 : 60

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: sidebarWidth, background: '#12121e', borderRight: '1px solid #2e2e3e', transition: 'width 0.2s', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: sidebarOpen ? '16px 20px' : '16px 8px', borderBottom: '1px solid #2e2e3e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 18 }}>PropertyPro</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: 4 }}>{sidebarOpen ? '◀' : '▶'}</button>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: sidebarOpen ? '10px 20px' : '10px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center',
              background: page === item.id ? '#6366f122' : 'none', color: page === item.id ? '#8b5cf6' : '#94a3b8',
              border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left',
              borderLeft: page === item.id ? '3px solid #6366f1' : '3px solid transparent',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #2e2e3e', color: '#64748b', fontSize: 11 }}>
            {settings.companyName || 'PropertyPro'}<br />Rental Management System
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', maxHeight: '100vh' }}>
        {page === 'dashboard' && <Dashboard properties={properties} tenants={tenants} leases={leases} payments={payments} maintenance={maintenance} utilities={utilities} />}
        {page === 'properties' && <Properties properties={properties} setProperties={setProperties} leases={leases} />}
        {page === 'tenants' && <Tenants tenants={tenants} setTenants={setTenants} />}
        {page === 'leases' && <Leases leases={leases} setLeases={setLeases} properties={properties} tenants={tenants} />}
        {page === 'payments' && <RentCollection payments={payments} setPayments={setPayments} leases={leases} properties={properties} tenants={tenants} />}
        {page === 'maintenance' && <Maintenance maintenance={maintenance} setMaintenance={setMaintenance} properties={properties} tenants={tenants} leases={leases} />}
        {page === 'utilities' && <UtilityBills utilities={utilities} setUtilities={setUtilities} properties={properties} />}
        {page === 'warranties' && <Warranties warranties={warranties} setWarranties={setWarranties} properties={properties} />}
        {page === 'portal' && <TenantPortal tenants={tenants} leases={leases} properties={properties} payments={payments} setPayments={setPayments} maintenance={maintenance} setMaintenance={setMaintenance} utilities={utilities} />}
        {page === 'reports' && <Reports properties={properties} tenants={tenants} leases={leases} payments={payments} maintenance={maintenance} utilities={utilities} warranties={warranties} />}
        {page === 'settings' && <Settings settings={settings} setSettings={setSettings} />}
      </div>
    </div>
  )
}
