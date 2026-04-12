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
  googleLogin: (data) => request('/auth/google', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  changePassword: (current_password, new_password) => request('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),

  // Products
  getProducts: (params = '') => request(`/products${params ? '?' + params : ''}`),
  getProduct: (id) => request(`/products/${id}`),

  // Orders
  createOrder: (items, shipping, coupon_code, gift_card_code, affiliate_code) =>
    request('/orders', { method: 'POST', body: JSON.stringify({ items, shipping, coupon_code, gift_card_code, affiliate_code }) }),
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

  // Admin - stats & users
  getStats: () => request('/admin/stats'),
  getAdminOrders: () => request('/admin/orders'),
  getAdminUsers: () => request('/admin/users'),
  updateOrderStatus: (id, status) => request(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Admin - products
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Admin - courses & lessons
  createCourse: (data) => request('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => request(`/admin/courses/${id}`, { method: 'DELETE' }),
  getAdminLessons: (courseId) => request(`/admin/courses/${courseId}/lessons`),
  createLesson: (courseId, data) => request(`/admin/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (id, data) => request(`/admin/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLesson: (id) => request(`/admin/lessons/${id}`, { method: 'DELETE' }),

  // Reviews
  getReviews: (productId) => request(`/products/${productId}/reviews`),
  addReview: (productId, data) => request(`/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  getAdminReviews: () => request('/admin/reviews'),
  approveReview: (id, is_approved) => request(`/admin/reviews/${id}`, { method: 'PUT', body: JSON.stringify({ is_approved }) }),

  // Newsletter
  subscribeNewsletter: (email, name, source) => request('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email, name, source }) }),
  unsubscribeNewsletter: (email) => request('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ email }) }),
  getNewsletterSubs: () => request('/admin/newsletter'),
  deleteSubscriber: (id) => request(`/admin/newsletter/${id}`, { method: 'DELETE' }),

  // Coupons
  validateCoupon: (code, order_total) => request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, order_total }) }),
  getAdminCoupons: () => request('/admin/coupons'),
  createCoupon: (data) => request('/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id, data) => request(`/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoupon: (id) => request(`/admin/coupons/${id}`, { method: 'DELETE' }),

  // Gift Cards
  validateGiftCard: (code) => request('/giftcards/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  purchaseGiftCard: (data) => request('/giftcards/purchase', { method: 'POST', body: JSON.stringify(data) }),
  getMyGiftCards: () => request('/giftcards/my'),
  getAdminGiftCards: () => request('/admin/giftcards'),
  createAdminGiftCard: (data) => request('/admin/giftcards', { method: 'POST', body: JSON.stringify(data) }),
  deleteGiftCard: (id) => request(`/admin/giftcards/${id}`, { method: 'DELETE' }),

  // Affiliates
  applyAffiliate: () => request('/affiliates/apply', { method: 'POST' }),
  getMyAffiliate: () => request('/affiliates/my'),
  trackAffiliate: (code) => request(`/affiliates/track/${code}`, { method: 'POST' }),
  getAdminAffiliates: () => request('/admin/affiliates'),
  updateAdminAffiliate: (id, data) => request(`/admin/affiliates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export function saveToken(token) { localStorage.setItem('mazuju_token', token) }
export function clearToken() { localStorage.removeItem('mazuju_token') }
export function hasToken() { return !!localStorage.getItem('mazuju_token') }
