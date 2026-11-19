'use client'

// Mobile app login (Session 116). Two apps share this screen:
//   MJADC          — admin, principal, administration, exam controller, teacher, staff (email login)
//   MJADC Student  — students (Student ID login)
// After sign-in the user goes straight to their own panel, where the sidebar shows only the menus
// their role and permissions allow. The session then stays signed in (no automatic sign-out).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, UPLOAD_BASE } from '@/lib/api'
import { APP_KIND, APP_NAME, homeForUser, wrongAppMessage } from '@/lib/appMode'
import { OfflineScreen } from '@/components/layout/OfflineScreen'

const IS_STUDENT_APP = APP_KIND === 'student'

export default function AppLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, offline, login, logout } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [logo, setLogo] = useState('/college_logo.png')
  const [college, setCollege] = useState('Miah Jinnah Alam Degree College')

  // already signed in → go to the panel
  useEffect(() => {
    if (authLoading || !user) return
    const home = homeForUser(user)
    if (home) router.replace(home)
  }, [user, authLoading, router])

  useEffect(() => {
    api.get<{ data?: { setting_value?: string } }>('/settings/college_logo')
      .then((r) => { const v = r.data?.setting_value; if (v) setLogo(`${UPLOAD_BASE}/${v.replace(/^\/+/, '')}`) })
      .catch(() => {})
    api.get<{ data?: { setting_value?: string } }>('/settings/college_name_en')
      .then((r) => { const v = r.data?.setting_value; if (v) setCollege(v) })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await login(identifier.trim(), password)
      const home = homeForUser(u)
      if (!home) {
        logout()
        const roles = (u.roles || []) as string[]
        const belongsElsewhere = IS_STUDENT_APP ? roles.some((r) => r !== 'student') : roles.includes('student')
        setError(belongsElsewhere ? wrongAppMessage() : 'This account has no panel to open. Please contact the college office.')
        return
      }
      router.replace(home)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  // a saved session that couldn't be checked (no internet): keep it, offer Retry
  if (offline && !user) return <OfflineScreen />

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-900 to-blue-700 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="mb-6 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="mx-auto h-20 w-20 rounded-full bg-white object-contain p-1 shadow-lg" />
          <h1 className="mt-3 text-lg font-bold leading-snug">{college}</h1>
          <p className="text-sm text-blue-100">{APP_NAME}{IS_STUDENT_APP ? '' : ' · Teachers & Staff'}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-xl">
          <div>
            <label htmlFor="app-id" className="mb-1 block text-sm font-medium text-gray-700">{IS_STUDENT_APP ? 'Student ID' : 'Email'}</label>
            <input id="app-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required
              autoComplete="username" autoCapitalize="none" autoCorrect="off" inputMode={IS_STUDENT_APP ? 'text' : 'email'}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label htmlFor="app-pw" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input id="app-pw" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 pr-11 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            <LogIn className="h-5 w-5" /> {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-blue-100">Forgot your password? Please contact the college office.</p>
      </div>
    </div>
  )
}
