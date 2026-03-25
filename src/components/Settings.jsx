import { useState, useCallback, useRef, memo } from 'react'
import { genId, formatDateLT } from '../utils/helpers'
import { loadGISScript, gcalListEvents } from '../utils/gcal'
import { exportAllData, importAllData } from '../utils/export'
import { useToast } from '../contexts/ToastContext'
import { GCAL_SCOPE } from '../utils/constants'
import {
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, cardStyle,
} from './ui'

export const Settings = memo(function Settings({ settings, setSettings, gcalToken, setGcalToken, tasks, setTasks }) {
  const [clientId, setClientId] = useState(settings.gcalClientId || '')
  const [status, setStatus] = useState('')
  const [gcalEvents, setGcalEvents] = useState([])
  const fileRef = useRef(null)
  const toast = useToast()

  const connect = useCallback(async () => {
    if (!clientId.trim()) { toast.error('Įveskite Client ID'); return }
    setStatus('⏳ Kraunama Google biblioteka...')
    try {
      await loadGISScript()
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: GCAL_SCOPE,
        callback: async (resp) => {
          if (resp.error) { setStatus('❌ Klaida: ' + resp.error); toast.error('Google Calendar klaida'); return }
          sessionStorage.setItem('gcal_token', resp.access_token)
          setGcalToken(resp.access_token)
          setSettings(s => ({ ...s, gcalClientId: clientId.trim() }))
          try {
            const data = await gcalListEvents(resp.access_token)
            setGcalEvents(data.items || [])
            setStatus(`✅ Prisijungta! Rasta ${data.items?.length || 0} artimų įvykių`)
            toast.success('Google Calendar prisijungta')
          } catch {
            setStatus('✅ Prisijungta!')
            toast.success('Google Calendar prisijungta')
          }
        },
      })
      tokenClient.requestAccessToken()
    } catch (e) {
      setStatus('❌ Klaida: ' + e.message)
      toast.error('Nepavyko prisijungti prie Google Calendar')
    }
  }, [clientId, setGcalToken, setSettings, toast])

  const disconnect = useCallback(() => {
    sessionStorage.removeItem('gcal_token')
    setGcalToken('')
    setGcalEvents([])
    setStatus('')
    toast.info('Atsijungta nuo Google Calendar')
  }, [setGcalToken, toast])

  const syncEvents = useCallback(async () => {
    if (!gcalToken) { toast.warning('Pirmiausia prisijunkite'); return }
    setStatus('⏳ Sinchronizuojama...')
    try {
      const data = await gcalListEvents(gcalToken)
      setGcalEvents(data.items || [])
      setStatus(`✅ Sinchronizuota: ${data.items?.length || 0} įvykių`)
      toast.success('Sinchronizuota')
    } catch (e) {
      setStatus('❌ Klaida: ' + e.message)
      toast.error(e.message)
    }
  }, [gcalToken, toast])

  const importEvent = useCallback((ev) => {
    const start = ev.start?.dateTime || ev.start?.date
    const newTask = {
      id: genId(),
      title: ev.summary || 'Google Calendar įvykis',
      type: 'susitikimas',
      status: 'laukia',
      deadline: start ? new Date(start).toISOString().slice(0, 16) : '',
      notes: ev.description || '',
      projectId: '',
      contactId: '',
      gcalEventId: ev.id,
      createdAt: new Date().toISOString(),
    }
    setTasks(ts => [...ts, newTask])
    toast.success(`Importuota: "${newTask.title}"`)
  }, [setTasks, toast])

  const handleExport = useCallback(() => {
    exportAllData()
    toast.success('Atsarginė kopija sukurta')
  }, [toast])

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importAllData(reader.result)
        toast.success(`Duomenys importuoti! Perkraukite puslapį.`)
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        toast.error('Importo klaida: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [toast])

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Nustatymai</h2>

      {/* Data Backup / Restore */}
      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💾</span> Duomenų atsarginė kopija
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          Eksportuokite visus duomenis (kontaktus, projektus, darbus, sąskaitas, prisijungimus) į JSON failą.
          Galite importuoti atgal bet kuriuo metu.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnPrimary} onClick={handleExport}>📥 Eksportuoti viską</button>
          <button style={btnSecondary} onClick={() => fileRef.current?.click()}>📤 Importuoti iš failo</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </section>

      {/* Google Calendar */}
      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📅</span> Google Calendar integracija
        </h3>

        {!gcalToken ? (
          <>
            <div style={formGroup}>
              <label style={labelStyle}>Google OAuth2 Client ID</label>
              <input style={inputStyle} placeholder="000000000000-xxxx.apps.googleusercontent.com"
                value={clientId} onChange={e => setClientId(e.target.value)} />
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                Kaip gauti — žr. instrukciją žemiau arba failą INSTRUKCIJA.md
              </div>
            </div>
            <button style={btnPrimary} onClick={connect}>🔗 Prisijungti prie Google Calendar</button>
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#22c55e', fontSize: 14 }}>✅ Google Calendar prisijungta</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>· Client ID: {settings.gcalClientId?.slice(0, 20)}...</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button style={btnPrimary} onClick={syncEvents}>🔄 Sinchronizuoti įvykius</button>
              <button style={btnSecondary} onClick={disconnect}>Atsijungti</button>
            </div>
            {gcalEvents.length > 0 && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Artimiausi Google Calendar įvykiai (importuoti kaip darbus):</div>
                {gcalEvents.map(ev => (
                  <div key={ev.id} style={{ ...cardStyle, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{ev.summary}</div>
                      <div style={{ color: '#4285f4', fontSize: 11 }}>
                        {ev.start?.dateTime ? formatDateLT(ev.start.dateTime) : ev.start?.date}
                      </div>
                    </div>
                    <button style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px' }} onClick={() => importEvent(ev)}>
                      ← Importuoti
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status && (
          <div style={{ marginTop: 12, color: status.startsWith('✅') ? '#22c55e' : status.startsWith('❌') ? '#ef4444' : '#f59e0b', fontSize: 13 }}>
            {status}
          </div>
        )}
      </section>

      {/* Keyboard shortcuts info */}
      <section style={cardStyle}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⌨️</span> Klaviatūros spartieji klavišai
        </h3>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 2 }}>
          <div><kbd style={kbdStyle}>Alt + 1-8</kbd> Perjungti skiltis</div>
          <div><kbd style={kbdStyle}>Alt + N</kbd> Naujas įrašas</div>
          <div><kbd style={kbdStyle}>Alt + S</kbd> Paieškos laukas</div>
          <div><kbd style={kbdStyle}>Esc</kbd> Uždaryti langą</div>
        </div>
      </section>

      {/* Setup instructions */}
      <section style={{ ...cardStyle, marginTop: 20 }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 12px' }}>📋 Google Calendar nustatymo instrukcija</h3>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
          {[
            ['1', 'Eikite į console.cloud.google.com'],
            ['2', 'Sukurkite naują projektą (arba pasirinkite esamą)'],
            ['3', 'APIs & Services → Library → ieškokite Google Calendar API → įjunkite'],
            ['4', 'Sukonfigūruokite OAuth consent screen: User Type = External'],
            ['5', 'Credentials → Create Credentials → OAuth client ID'],
            ['6', 'Application type: Web application'],
            ['7', 'Authorized JavaScript origins pridėkite savo domeną'],
            ['8', 'Nukopijuokite Client ID ir įklijuokite laukelyje aukščiau'],
            ['9', 'Pirmą kartą Google paprašys patvirtinti prieigą — leiskite'],
          ].map(([n, text]) => (
            <div key={n} style={{ marginBottom: 6 }}>
              <b style={{ color: '#6366f1' }}>{n}.</b> {text}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
})

const kbdStyle = {
  background: '#2e2e3e', border: '1px solid #3e3e4e', borderRadius: 4,
  padding: '2px 6px', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0',
  marginRight: 8,
}
