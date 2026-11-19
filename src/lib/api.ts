// Session 108: a build accidentally made WITH .env.local (localhost addresses) must still work on the real
// website — the live site was broken twice that way (every API call went to the visitor's own computer).
// When the page is NOT opened on localhost but the built address IS localhost, use the site's own server.
const LOCALHOST_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i
function liveSafe(built: string, path: string): string {
  if (typeof window === 'undefined') return built
  const host = window.location.hostname
  if (LOCALHOST_URL.test(built) && host !== 'localhost' && host !== '127.0.0.1') return window.location.origin + path
  return built
}
export const API_BASE = liveSafe(process.env.NEXT_PUBLIC_API_URL || 'https://www.mjadc.ac.bd/mjadc-api/api', '/mjadc-api/api')
export const UPLOAD_BASE = liveSafe(process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://www.mjadc.ac.bd/mjadc-api', '/mjadc-api')

/**
 * Device details sent with every request (header X-Client-Info) so admin's Update History can show
 * who changed what from which device (Session 121). ASCII only — HTTP header values must be.
 */
let clientInfoCache = ''
function clientInfo(): string {
  if (typeof window === 'undefined') return ''
  if (clientInfoCache) return clientInfoCache
  type UAData = { platform?: string; getHighEntropyValues?: (h: string[]) => Promise<Record<string, string>> }
  const uad = (navigator as unknown as { userAgentData?: UAData }).userAgentData
  const info: Record<string, string> = {
    app: process.env.NEXT_PUBLIC_APP_MODE === '1' ? (process.env.NEXT_PUBLIC_APP_KIND === 'student' ? 'student' : 'staff') : 'web',
    screen: `${window.screen.width}x${window.screen.height}`,
    lang: navigator.language || '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    platform: uad?.platform || navigator.platform || '',
  }
  const encode = () => JSON.stringify(info).replace(/[^\x20-\x7e]/g, '')
  clientInfoCache = encode()
  // Chromium can tell the phone model (e.g. "SM-A546E") — filled in for later requests
  uad?.getHighEntropyValues?.(['model', 'platformVersion'])
    .then((v) => { if (v.model) info.model = v.model; if (v.platformVersion) info.os_version = v.platformVersion; clientInfoCache = encode() })
    .catch(() => {})
  return clientInfoCache
}

/** An error the server answered with (status = HTTP code). A network failure stays a plain Error. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(clientInfo() ? { "X-Client-Info": clientInfo() } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    // validation errors carry the reasons in `errors`; show them instead of a bare "Validation failed"
    const details = Array.isArray(error.errors) ? error.errors.filter((x: unknown) => typeof x === 'string') : []
    throw new ApiError(details.length && /^validation failed$/i.test(String(error.message || '')) ? details.join('; ') : error.message || `HTTP ${res.status}`, res.status)
  }

  return res.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(clientInfo() ? { "X-Client-Info": clientInfo() } : {}),
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new ApiError(error.message || `HTTP ${res.status}`, res.status)
      }
      return res.json() as Promise<T>
    })
  },
}
