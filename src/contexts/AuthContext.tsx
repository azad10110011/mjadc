'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { api, ApiError } from '@/lib/api'
import { APP_MODE, tokenIssuedAt } from '@/lib/appMode'

/** App sessions renew their 1-year token once it is older than this (Session 116). */
const RENEW_AFTER_SECONDS = 7 * 86400

interface AuthContextType {
  user: User | null
  loading: boolean
  /**
   * Mobile app only: the saved session could not be checked because the server was unreachable
   * (no internet). The session is kept; screens offer "Retry" instead of signing the user out.
   */
  offline: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  /** re-fetch the current user (e.g. after a forced password change, or Retry when offline) — Session 112 */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** In the app, quietly swap an ageing token for a fresh one so the session never runs out. */
function renewIfOld() {
  if (!APP_MODE) return
  const token = localStorage.getItem('token')
  if (!token || Date.now() / 1000 - tokenIssuedAt(token) < RENEW_AFTER_SECONDS) return
  api.post<{ data: { token: string } }>('/auth/refresh', {})
    .then((r) => { if (r.data?.token) localStorage.setItem('token', r.data.token) })
    .catch(() => { /* try again next time */ })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  /** Check the saved token. Only a real rejection (401) ends the session in the app. */
  const checkSession = useCallback(() => {
    return api.get<{ status: number; data: User }>('/auth/me')
      .then((res) => {
        setUser(res.data)
        setOffline(false)
        renewIfOld()
      })
      .catch((e: unknown) => {
        if (APP_MODE && !(e instanceof ApiError && e.status === 401)) {
          setOffline(true) // no internet / server down: keep the token, offer Retry
        } else {
          localStorage.removeItem('token')
          setUser(null)
          setOffline(false)
        }
      })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const check = token ? checkSession() : Promise.resolve()
    check.finally(() => setLoading(false))
  }, [checkSession])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ status: number; data: { token: string; user: User } }>(
      '/auth/login',
      APP_MODE ? { email, password, client: 'app' } : { email, password },
    )
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    setOffline(false)
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    setOffline(false)
  }, [])

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('token')) return
    if (APP_MODE) {
      setLoading(true)
      await checkSession()
      setLoading(false)
      return
    }
    try {
      const res = await api.get<{ status: number; data: User }>('/auth/me')
      setUser(res.data)
    } catch {
      /* keep the current user on a transient failure */
    }
  }, [checkSession])

  const hasRole = useCallback((role: UserRole) => {
    return user?.roles.includes(role) ?? false
  }, [user])

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    if (!user) return false
    return roles.some((r) => user.roles.includes(r))
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, offline, login, logout, hasRole, hasAnyRole, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
