const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'
export const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://mjadc.makafoodbd.com/mjadc-api'

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
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
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(error.message || `HTTP ${res.status}`)
      }
      return res.json() as Promise<T>
    })
  },
}
