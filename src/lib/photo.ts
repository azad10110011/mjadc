import { UPLOAD_BASE } from '@/lib/api'

/**
 * Full URL of an uploaded photo (Session 86). Student photos are stored as "uploads/profiles/x.jpg";
 * some pages used to add another "/uploads/" (→ /uploads/uploads/…, photo never showed). Accepts both
 * forms, and absolute URLs unchanged.
 */
export function photoUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const p = path.replace(/^\/+/, '')
  return `${UPLOAD_BASE}/${p.startsWith('uploads/') ? p : `uploads/${p}`}`
}
