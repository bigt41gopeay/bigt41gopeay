import PocketBase from 'pocketbase'

// In production, PocketBase is same-origin (proxied by nginx)
const PB_URL = import.meta.env.VITE_PB_URL || window.location.origin

export const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

export function isAuthed() {
  return pb.authStore.isValid
}

export function onAuthChange(cb) {
  return pb.authStore.onChange(cb, true)
}

export async function login(email, password) {
  return pb.collection('users').authWithPassword(email, password)
}

export function logout() {
  pb.authStore.clear()
}
