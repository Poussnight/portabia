/* PortabIA — client API (backend isolé, jamais d'IA). E²SN — Guillaume BOUTON. Apache-2.0. */
const BASE = '/portabia-api'
const TOKEN_KEY = 'portabia_token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) || null }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) }

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const tok = getToken()
  if (tok) headers.Authorization = `Bearer ${tok}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { /* noop */ }
  if (!res.ok) throw new Error((data && data.error) || `Erreur ${res.status}`)
  return data
}

export const api = {
  register: (p) => req('POST', '/auth/register', p),
  login: (p) => req('POST', '/auth/login', p),
  verifyEmail: (token) => req('POST', '/auth/verify-email', { token }),
  me: () => req('GET', '/auth/me'),
  historyList: () => req('GET', '/history'),
  historyAdd: (m) => req('POST', '/history', m),
  historyDel: (id) => req('DELETE', `/history/${id}`),
  referral: (email) => req('POST', '/referral', { email }),
  reviewsList: () => req('GET', '/reviews'),
  reviewAdd: (p) => req('POST', '/reviews', p),
}
