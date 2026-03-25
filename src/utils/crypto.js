// Web Crypto API based encryption for credential storage
// Uses AES-GCM with a derived key from a passphrase

const ALGO = 'AES-GCM'
const KEY_ALGO = 'PBKDF2'
const ITERATIONS = 100000

async function getKeyMaterial(passphrase) {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    KEY_ALGO,
    false,
    ['deriveKey']
  )
}

async function deriveKey(keyMaterial, salt) {
  return crypto.subtle.deriveKey(
    { name: KEY_ALGO, salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(plaintext, passphrase) {
  if (!plaintext) return ''
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyMaterial = await getKeyMaterial(passphrase)
  const key = await deriveKey(keyMaterial, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext)
  )
  // Pack salt + iv + ciphertext as base64
  const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return btoa(String.fromCharCode(...packed))
}

export async function decryptText(encoded, passphrase) {
  if (!encoded) return ''
  try {
    const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    const salt = packed.slice(0, 16)
    const iv = packed.slice(16, 28)
    const ciphertext = packed.slice(28)
    const keyMaterial = await getKeyMaterial(passphrase)
    const key = await deriveKey(keyMaterial, salt)
    const plainBuffer = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(plainBuffer)
  } catch {
    return '[Nepavyko iššifruoti]'
  }
}

// Simple check if a string looks like it's encrypted (base64)
export function isEncrypted(str) {
  if (!str || str.length < 40) return false
  try {
    return btoa(atob(str)) === str
  } catch {
    return false
  }
}
