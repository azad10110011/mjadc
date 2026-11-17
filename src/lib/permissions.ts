// Per-user permissions on the client (Session 80). The backend is the source of truth
// (utils/Permissions.php enforces every API call); this only decides what the UI shows.
// A permission key is a page path, optionally with a "#variant" (e.g. "#report" = reports-only).

import type { User } from '@/types'

export const normPath = (p: string) => (p.split('?')[0].replace(/\/+$/, '') || '/')

const baseOf = (key: string) => key.split('#')[0]

export function isAdminUser(user: User | null | undefined): boolean {
  return !!user?.roles?.includes('admin' as User['roles'][number])
}

/** Has this exact permission key. */
export function can(user: User | null | undefined, key: string): boolean {
  if (!user) return false
  if (isAdminUser(user)) return true
  return !!user.permissions?.includes(key)
}

/** May open this page (any variant of its key counts, e.g. "…#report"). */
export function canOpenPage(user: User | null | undefined, pageKey: string): boolean {
  if (!user) return false
  if (isAdminUser(user)) return true
  return !!user.permissions?.some((k) => baseOf(k) === pageKey)
}

/** The catalog key governing a path (longest matching page key), or null if the page is not permission-controlled. */
export function pageKeyFor(pathname: string, user: User | null | undefined): string | null {
  const path = normPath(pathname)
  let best: string | null = null
  for (const k of user?.permission_keys || []) {
    const b = baseOf(k)
    if ((path === b || path.startsWith(b + '/')) && (!best || b.length > best.length)) best = b
  }
  return best
}
