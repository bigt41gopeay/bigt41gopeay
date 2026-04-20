import * as XLSX from 'xlsx'
import { genId, isValidEmail } from './helpers'

// Common column name patterns (lowercase, normalized)
const FIELD_PATTERNS = {
  name: [
    'vardas', 'vardaspavarde', 'vardas pavarde', 'vardas pavardė',
    'pavadinimas', 'name', 'fullname', 'full name', 'contact',
    'klientas', 'asmuo', 'imones pavadinimas',
  ],
  company: [
    'imone', 'įmonė', 'kompanija', 'firma', 'company', 'organization',
    'organizacija', 'imones pavadinimas', 'įmonės pavadinimas',
  ],
  email: [
    'email', 'e-mail', 'e mail', 'elpastas', 'el. paštas', 'el.paštas',
    'el paštas', 'pastas', 'paštas', 'mail',
  ],
  phone: [
    'telefonas', 'tel', 'tel.', 'telefono nr', 'telefono numeris',
    'phone', 'mobile', 'mobilus', 'mob', 'mob.', 'gsm',
  ],
  notes: [
    'pastabos', 'komentaras', 'komentarai', 'notes', 'note',
    'comment', 'comments', 'aprasymas', 'aprašymas', 'description',
  ],
}

/**
 * Normalize a string for comparison: lowercase, strip diacritics, trim
 */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Detect which field a given column header maps to.
 * Returns field key ('name'|'company'|'email'|'phone'|'notes') or null.
 */
export function detectField(header) {
  const n = normalize(header)
  if (!n) return null
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    if (patterns.some(p => n === p || n.includes(p))) {
      return field
    }
  }
  return null
}

/**
 * Parse an uploaded file (CSV or XLSX) and return { headers, rows }.
 * rows is an array of objects keyed by column header.
 */
export async function parseContactFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
    blankrows: false,
  })
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return { headers, rows }
}

/**
 * Auto-detect column mapping from headers.
 * Returns { name: 'ColA', email: 'ColB', ... }
 */
export function autoMapColumns(headers) {
  const map = {}
  for (const h of headers) {
    const field = detectField(h)
    if (field && !map[field]) map[field] = h
  }
  return map
}

/**
 * Apply a mapping to a row. Returns a contact object (without id).
 */
function applyMapping(row, mapping) {
  const contact = { name: '', company: '', email: '', phone: '', notes: '' }
  for (const [field, col] of Object.entries(mapping)) {
    if (!col) continue
    const val = row[col]
    contact[field] = String(val ?? '').trim()
  }
  return contact
}

/**
 * Transform raw rows + mapping into importable contacts.
 * Deduplicates against existing contacts (by email first, then name+phone).
 * Returns { valid, invalid, duplicates }.
 */
export function prepareImport(rows, mapping, existingContacts = []) {
  const valid = []
  const invalid = []
  const duplicates = []

  const existingEmails = new Set(
    existingContacts.filter(c => c.email).map(c => c.email.toLowerCase())
  )
  const existingKeys = new Set(
    existingContacts.map(c => `${(c.name || '').toLowerCase()}|${(c.phone || '').replace(/\D/g, '')}`)
  )

  const seenInBatch = new Set()

  for (const row of rows) {
    const c = applyMapping(row, mapping)
    if (!c.name) {
      invalid.push({ reason: 'Nėra vardo', data: row })
      continue
    }
    if (c.email && !isValidEmail(c.email)) {
      invalid.push({ reason: `Neteisingas el. paštas: ${c.email}`, data: row })
      continue
    }
    const emailKey = c.email.toLowerCase()
    const nameKey = `${c.name.toLowerCase()}|${c.phone.replace(/\D/g, '')}`

    if (emailKey && (existingEmails.has(emailKey) || seenInBatch.has(emailKey))) {
      duplicates.push(c)
      continue
    }
    if (!emailKey && existingKeys.has(nameKey)) {
      duplicates.push(c)
      continue
    }

    if (emailKey) seenInBatch.add(emailKey)
    existingKeys.add(nameKey)

    valid.push({
      ...c,
      id: genId(),
      createdAt: new Date().toISOString(),
    })
  }

  return { valid, invalid, duplicates }
}
