export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Sanitize user input to prevent XSS when used in dynamic contexts
export function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Validate email format
export function isValidEmail(email) {
  if (!email) return true // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Validate phone format (loose — allows international)
export function isValidPhone(phone) {
  if (!phone) return true // optional field
  return /^[+]?[\d\s\-()]{6,20}$/.test(phone)
}

// Validate URL format
export function isValidUrl(url) {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Transliterate Lithuanian chars for PDF (jsPDF standard fonts don't support them)
export function lt(str) {
  return (str || '')
    .replace(/[ą]/g, 'a').replace(/[č]/g, 'c').replace(/[ę]/g, 'e').replace(/[ė]/g, 'e')
    .replace(/[į]/g, 'i').replace(/[š]/g, 's').replace(/[ų]/g, 'u').replace(/[ū]/g, 'u').replace(/[ž]/g, 'z')
    .replace(/[Ą]/g, 'A').replace(/[Č]/g, 'C').replace(/[Ę]/g, 'E').replace(/[Ė]/g, 'E')
    .replace(/[Į]/g, 'I').replace(/[Š]/g, 'S').replace(/[Ų]/g, 'U').replace(/[Ū]/g, 'U').replace(/[Ž]/g, 'Z')
}

// Format date for Lithuanian locale
export function formatDateLT(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('lt-LT')
}

// Format currency
export function formatCurrency(amount) {
  return (amount || 0).toFixed(2) + ' €'
}

// Debounce helper for search inputs
export function debounce(fn, ms = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
