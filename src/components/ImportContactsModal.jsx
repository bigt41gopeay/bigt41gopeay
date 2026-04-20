import { useState, useRef } from 'react'
import { BRAND } from '../utils/constants'
import { parseContactFile, autoMapColumns, prepareImport } from '../utils/importContacts'
import { useToast } from '../contexts/ToastContext'
import {
  Modal, inputStyle, labelStyle, formGroup,
  btnPrimary, btnSecondary,
} from './ui'

const FIELD_LABELS = {
  name: 'Vardas Pavardė *',
  company: 'Įmonė',
  email: 'El. paštas',
  phone: 'Telefonas',
  notes: 'Pastabos',
}

export function ImportContactsModal({ existingContacts, onImport, onClose }) {
  const [step, setStep] = useState(1) // 1=upload, 2=map, 3=preview
  const [parsed, setParsed] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState(null) // { valid, invalid, duplicates }
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true)
    try {
      const { headers, rows } = await parseContactFile(file)
      if (rows.length === 0) {
        toast.error('Failas tuščias arba netinkamo formato')
        setLoading(false)
        return
      }
      setParsed({ headers, rows })
      setMapping(autoMapColumns(headers))
      setStep(2)
    } catch (err) {
      console.error(err)
      toast.error('Klaida skaitant failą: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    if (!mapping.name) {
      toast.error('Privaloma nurodyti "Vardas Pavardė" stulpelį')
      return
    }
    const result = prepareImport(parsed.rows, mapping, existingContacts)
    setPreview(result)
    setStep(3)
  }

  const handleImport = () => {
    const toAdd = skipDuplicates
      ? preview.valid
      : [...preview.valid, ...preview.duplicates.map(c => ({
          ...c, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
        }))]
    onImport(toAdd)
    toast.success(`Importuota ${toAdd.length} kontaktų`)
    onClose()
  }

  return (
    <Modal title="Importuoti kontaktus" onClose={onClose}>
      {/* Progress steps */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, fontSize: 12, fontWeight: 600,
      }}>
        {[
          { n: 1, label: 'Failas' },
          { n: 2, label: 'Stulpeliai' },
          { n: 3, label: 'Peržiūra' },
        ].map(s => (
          <div key={s.n} style={{
            flex: 1, padding: '8px 10px', borderRadius: 10,
            background: step >= s.n
              ? `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDeep})`
              : BRAND.darkCard,
            color: step >= s.n ? '#fff' : BRAND.textMuted,
            textAlign: 'center',
          }}>
            {s.n}. {s.label}
          </div>
        ))}
      </div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <div>
          <p style={{ color: BRAND.textSecondary, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Įkelkite Excel (.xlsx, .xls) arba CSV failą su kontaktais.
            Sistema automatiškai atpažins stulpelius (vardas, įmonė, el. paštas, telefonas, pastabos).
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${BRAND.darkBorderLight}`,
              borderRadius: 16, padding: '40px 20px', textAlign: 'center',
              cursor: 'pointer', background: BRAND.darkCard,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = BRAND.purple }}
            onDragLeave={e => { e.currentTarget.style.borderColor = BRAND.darkBorderLight }}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.style.borderColor = BRAND.darkBorderLight
              const file = e.dataTransfer.files?.[0]
              if (file && fileRef.current) {
                const dt = new DataTransfer()
                dt.items.add(file)
                fileRef.current.files = dt.files
                handleFileChange({ target: { files: dt.files } })
              }
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ color: BRAND.textPrimary, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {loading ? 'Kraunama...' : 'Spauskite čia arba nutempkite failą'}
            </div>
            <div style={{ color: BRAND.textMuted, fontSize: 12 }}>
              .xlsx, .xls, .csv
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button style={btnSecondary} className="btn-press" onClick={onClose}>Atšaukti</button>
          </div>
        </div>
      )}

      {/* STEP 2 — Map columns */}
      {step === 2 && parsed && (
        <div>
          <p style={{ color: BRAND.textSecondary, fontSize: 14, marginBottom: 8 }}>
            Failas: <b style={{ color: BRAND.textPrimary }}>{fileName}</b> · {parsed.rows.length} eilutės
          </p>
          <p style={{ color: BRAND.textMuted, fontSize: 13, marginBottom: 16 }}>
            Priskirkite CRM laukus prie failo stulpelių. Auto-atpažinta pateikiama žemiau.
          </p>

          {Object.keys(FIELD_LABELS).map(field => (
            <div key={field} style={formGroup}>
              <label style={labelStyle}>{FIELD_LABELS[field]}</label>
              <select
                style={inputStyle}
                value={mapping[field] || ''}
                onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
              >
                <option value="">— Nepriskirta —</option>
                {parsed.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}

          {/* Preview first row */}
          {parsed.rows[0] && (
            <div style={{
              background: BRAND.dark, border: `1px solid ${BRAND.darkBorder}`,
              borderRadius: 12, padding: 14, marginTop: 12,
            }}>
              <div style={{ color: BRAND.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                PAVYZDYS (pirma eilutė)
              </div>
              {Object.keys(FIELD_LABELS).map(field => {
                const col = mapping[field]
                const val = col ? parsed.rows[0][col] : ''
                return (
                  <div key={field} style={{
                    display: 'flex', gap: 8, fontSize: 13, padding: '4px 0',
                    borderBottom: `1px solid ${BRAND.darkBorder}22`,
                  }}>
                    <span style={{ color: BRAND.textMuted, minWidth: 110 }}>{FIELD_LABELS[field]}</span>
                    <span style={{ color: val ? BRAND.textPrimary : BRAND.textMuted, fontStyle: val ? 'normal' : 'italic' }}>
                      {val || '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
            <button style={btnSecondary} className="btn-press" onClick={() => setStep(1)}>← Atgal</button>
            <button style={btnPrimary} className="btn-press" onClick={handlePreview}>Peržiūrėti →</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Preview & confirm */}
      {step === 3 && preview && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 120px', minWidth: 100, padding: 14, borderRadius: 12,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>{preview.valid.length}</div>
              <div style={{ fontSize: 12, color: BRAND.textSecondary, marginTop: 4 }}>Nauji</div>
            </div>
            <div style={{
              flex: '1 1 120px', minWidth: 100, padding: 14, borderRadius: 12,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{preview.duplicates.length}</div>
              <div style={{ fontSize: 12, color: BRAND.textSecondary, marginTop: 4 }}>Dublikatai</div>
            </div>
            {preview.invalid.length > 0 && (
              <div style={{
                flex: '1 1 120px', minWidth: 100, padding: 14, borderRadius: 12,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{preview.invalid.length}</div>
                <div style={{ fontSize: 12, color: BRAND.textSecondary, marginTop: 4 }}>Neteisingi</div>
              </div>
            )}
          </div>

          {preview.duplicates.length > 0 && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, background: BRAND.darkCard, borderRadius: 12,
              border: `1px solid ${BRAND.darkBorder}`, marginBottom: 14, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
                style={{ accentColor: BRAND.purple, width: 18, height: 18 }}
              />
              <span style={{ color: BRAND.textPrimary, fontSize: 14 }}>
                Praleisti dublikatus ({preview.duplicates.length})
              </span>
            </label>
          )}

          {/* Preview list */}
          <div style={{
            maxHeight: 260, overflowY: 'auto', background: BRAND.dark,
            border: `1px solid ${BRAND.darkBorder}`, borderRadius: 12, padding: 10,
          }}>
            {preview.valid.slice(0, 20).map((c, i) => (
              <div key={i} style={{
                padding: '8px 10px', fontSize: 13,
                borderBottom: `1px solid ${BRAND.darkBorder}22`,
              }}>
                <div style={{ color: BRAND.textPrimary, fontWeight: 600 }}>{c.name}</div>
                <div style={{ color: BRAND.textMuted, fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {c.company && <span>🏢 {c.company}</span>}
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>📞 {c.phone}</span>}
                </div>
              </div>
            ))}
            {preview.valid.length > 20 && (
              <div style={{ padding: 10, color: BRAND.textMuted, fontSize: 12, textAlign: 'center' }}>
                ...ir dar {preview.valid.length - 20} kontaktų
              </div>
            )}
            {preview.valid.length === 0 && (
              <div style={{ padding: 20, color: BRAND.textMuted, fontSize: 13, textAlign: 'center' }}>
                Nėra naujų kontaktų importui
              </div>
            )}
          </div>

          {preview.invalid.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{
                color: '#ef4444', fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}>
                Rodyti {preview.invalid.length} neteisingas eilutes
              </summary>
              <div style={{
                marginTop: 8, maxHeight: 140, overflowY: 'auto',
                background: BRAND.dark, border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: 10, fontSize: 12,
              }}>
                {preview.invalid.slice(0, 30).map((i, idx) => (
                  <div key={idx} style={{ padding: 4, color: BRAND.textMuted }}>
                    <span style={{ color: '#ef4444' }}>⚠</span> {i.reason}
                  </div>
                ))}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
            <button style={btnSecondary} className="btn-press" onClick={() => setStep(2)}>← Atgal</button>
            <button
              style={btnPrimary}
              className="btn-press"
              onClick={handleImport}
              disabled={preview.valid.length === 0 && (skipDuplicates || preview.duplicates.length === 0)}
            >
              Importuoti {skipDuplicates ? preview.valid.length : preview.valid.length + preview.duplicates.length} kontaktų
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
