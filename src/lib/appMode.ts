// Mobile app mode (Session 116).
// The Android app (Capacitor, folder ../mobile) is built from this same code with
// NEXT_PUBLIC_APP_MODE=1 (npm run build:app). In app mode there is no public website:
// the app opens on /app/ (login) and only the logged-in panels are reachable.

import type { User } from '@/types'

export const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE === '1'

/**
 * Two apps are built from this code (Session 116):
 *   'staff'   → "MJADC"          admin, principal, administration, exam controller, teacher, staff
 *   'student' → "MJADC Student"  students only
 */
export type AppKind = 'staff' | 'student'
export const APP_KIND: AppKind = process.env.NEXT_PUBLIC_APP_KIND === 'student' ? 'student' : 'staff'
export const APP_NAME = APP_KIND === 'student' ? 'MJADC Student' : 'MJADC'

/** Login screen of the app. */
export const APP_LOGIN = '/app/'

const STUDENT_PANEL = /^\/p_G9n4s(\/|$)/

/** Paths the app may show; anything else (the public website, the other app's panels) goes to the login. */
export function appPathAllowed(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/app' || p === '/change-password') return true
  if (!/^\/p_[A-Za-z0-9]+(\/|$)/.test(p + '/')) return false
  const student = STUDENT_PANEL.test(p + '/')
  return APP_KIND === 'student' ? student : !student
}

const ROLE_PRIORITY = ['admin', 'principal', 'administration', 'exam_controller', 'teacher', 'staff', 'student'] as const
const HOME: Record<string, string> = {
  admin: '/p_Xk7mN',
  principal: '/p_W4q6z',
  administration: '/p_F7c2j',
  exam_controller: '/p_H3v5d',
  teacher: '/p_R2t9b',
  staff: '/p_L8p1x',
  student: '/p_G9n4s/dashboard',
}

/**
 * Where a user lands after login: their chosen default panel, else their highest role's panel.
 * In an app build only that app's panels count (student app → student panel; staff app → the rest).
 */
export function homeForUser(user: Pick<User, 'roles' | 'default_role'> | null | undefined): string | null {
  if (!user) return null
  const roles = ((user.roles || []) as string[]).filter((r) =>
    !APP_MODE ? true : APP_KIND === 'student' ? r === 'student' : r !== 'student')
  if (user.default_role && roles.includes(user.default_role) && HOME[user.default_role]) return HOME[user.default_role]
  const r = ROLE_PRIORITY.find((x) => roles.includes(x))
  return r ? HOME[r] : null
}

/** Shown when an account belongs to the other app. */
export function wrongAppMessage(): string {
  return APP_KIND === 'student'
    ? 'This app is for students. Teachers and staff, please use the MJADC app.'
    : 'Students, please use the MJADC Student app.'
}

/** Read the issue time (seconds) from the stored token, or 0. */
export function tokenIssuedAt(token: string | null): number {
  if (!token) return 0
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number(p.iat) || 0
  } catch {
    return 0
  }
}

// ---- Android bridge -------------------------------------------------------------------------
// MainActivity (mobile/android) adds window.AndroidBridge with saveFile() and print(), because an
// Android WebView ignores browser downloads (blob links) and window.print().

interface AndroidBridge {
  saveFile(base64: string, filename: string, mime: string): void
  print(jobName: string): void
}

function bridge(): AndroidBridge | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { AndroidBridge?: AndroidBridge }).AndroidBridge ?? null
}

async function blobUrlToBase64(url: string): Promise<{ data: string; mime: string }> {
  const blob = await (await fetch(url)).blob()
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
  return { data, mime: blob.type || 'application/octet-stream' }
}

let installed = false

/**
 * Route downloads and printing to Android. Every download in the app (jsPDF .save(), XLSX.writeFile,
 * a.download blob links) ends in a click on an <a download href="blob:|data:"> — often a detached
 * element — so both HTMLAnchorElement.click and dispatchEvent are intercepted.
 */
export function installNativeBridge(): void {
  const b = bridge()
  if (!b || installed) return
  installed = true

  window.print = () => b.print(document.title || 'MJADC')

  const handle = (a: HTMLAnchorElement): boolean => {
    const href = a.getAttribute('href') || ''
    if (!a.hasAttribute('download') || !/^(blob|data):/i.test(href)) return false
    const name = a.getAttribute('download') || 'download'
    blobUrlToBase64(href)
      .then(({ data, mime }) => b.saveFile(data, name, mime))
      .catch(() => alert('Could not save the file.'))
    return true
  }

  const origClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (!handle(this)) origClick.call(this)
  }
  // a real tap on a visible <a download> link
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a')
    if (a instanceof HTMLAnchorElement && handle(a)) e.preventDefault()
  }, true)
  const origDispatch = EventTarget.prototype.dispatchEvent
  EventTarget.prototype.dispatchEvent = function (this: EventTarget, ev: Event) {
    if (this instanceof HTMLAnchorElement && ev.type === 'click' && handle(this)) return false
    return origDispatch.call(this, ev)
  }
}
