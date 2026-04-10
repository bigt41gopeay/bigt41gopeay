const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/api'

function getToken() {
  return localStorage.getItem('mazuju_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Klaida')
  return data
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  getMe: () => request('/auth/me'),

  // Products
  getProducts: (params = '') => request(`/products${params ? '?' + params : ''}`),
  getProduct: (id) => request(`/products/${id}`),

  // Orders
  createOrder: (items, shipping) => request('/orders', { method: 'POST', body: JSON.stringify({ items, shipping }) }),
  getOrders: () => request('/orders'),

  // Courses
  getCourses: (params = '') => request(`/courses${params ? '?' + params : ''}`),
  getCourse: (id) => request(`/courses/${id}`),
  getLesson: (id) => request(`/lessons/${id}`),
  completeLesson: (id) => request(`/lessons/${id}/complete`, { method: 'POST' }),

  // User
  updateProfile: (data) => request('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateMembership: (membership) => request('/user/membership', { method: 'PUT', body: JSON.stringify({ membership }) }),
  getProgress: () => request('/user/progress'),

  // Admin
  getStats: () => request('/admin/stats'),
  getAdminOrders: () => request('/admin/orders'),
  getAdminUsers: () => request('/admin/users'),
  updateOrderStatus: (id, status) => request(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
}

export function saveToken(token) { localStorage.setItem('mazuju_token', token) }
export function clearToken() { localStorage.removeItem('mazuju_token') }
export function hasToken() { return !!localStorage.getItem('mazuju_token') }
