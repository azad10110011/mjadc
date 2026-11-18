'use client'

// Dashboard Quick Access (Session 110).
// Every panel dashboard shows shortcut tiles. The admin sets each panel's DEFAULT list and may give one
// user a CUSTOM list per panel (Admin › Users › Dashboard Quick Access / User Permissions).
// Backend: routes/admin/quick-access.php. The tiles still follow permissions: a page the user may not
// open is never shown, even if it is in the list.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { panelNav, ROLE_LABELS, type PanelRole } from '@/components/layout/PanelLayout'
import { canSeeLink, isAdminUser, normPath, pageKeyFor } from '@/lib/permissions'
import type { User, UserRole } from '@/types'

export const QA_PANELS: PanelRole[] = ['admin', 'principal', 'administration', 'exam_controller', 'teacher', 'staff', 'student']

export interface QaLink {
  href: string
  label: string
  /** menu section, e.g. "Internal Exam Management" */
  section?: string
  icon: ReactNode
  /** the panel whose menu holds this page (first one when shared) */
  panel: PanelRole
  desc?: string
}

const DESCRIPTIONS: Record<string, string> = {
  '/p_G9n4s/results': 'Marks, GPA and position',
  '/p_G9n4s/attendance': 'Subject-wise report',
  '/p_G9n4s/pay-fees': 'Dues and online payment',
  '/change-password': 'Keep your account safe',
}

/** Built-in lists (= the dashboards before Session 110). Used until the admin saves a default. */
export const QA_BUILTIN: Record<PanelRole, string[]> = {
  admin: ['/p_Xk7mN/notices', '/p_Xk7mN/results', '/p_Xk7mN/students', '/p_Xk7mN/teachers', '/p_Xk7mN/exam-fee-collection', '/p_Xk7mN/settings'],
  principal: ['/p_W4q6z/add-teacher', '/p_W4q6z/add-staff', '/p_W4q6z/result-publish', '/p_W4q6z/tuition-fee', '/p_W4q6z/leave-management'],
  administration: ['/p_F7c2j/notices', '/p_F7c2j/results', '/p_F7c2j/syllabus', '/p_F7c2j/routine', '/p_F7c2j/fee-collection', '/p_F7c2j/students', '/p_F7c2j/forms'],
  exam_controller: ['/p_H3v5d/upload-result', '/p_H3v5d/approve-result'],
  teacher: ['/p_R2t9b/upload-result', '/p_R2t9b/update-result', '/p_R2t9b/leave-management', '/p_R2t9b/form-download'],
  staff: ['/p_L8p1x/leave-management'],
  student: ['/p_G9n4s/results', '/p_G9n4s/attendance', '/p_G9n4s/pay-fees', '/change-password'],
}

let linkCache: QaLink[] | null = null

/** Every page that can be a shortcut: all panel menu items (dashboards excluded) + Change Password. */
export function qaAllLinks(): QaLink[] {
  if (linkCache) return linkCache
  const out: QaLink[] = []
  const seen = new Set<string>()
  const add = (l: QaLink) => { if (!seen.has(l.href)) { seen.add(l.href); out.push(l) } }
  for (const panel of QA_PANELS) {
    for (const it of panelNav[panel] || []) {
      if (it.href) {
        if (it.label === 'Dashboard') continue
        add({ href: it.href, label: it.label, icon: it.icon, panel, desc: DESCRIPTIONS[it.href] })
      }
      for (const c of it.children || []) add({ href: c.href, label: c.label, section: it.label, icon: it.icon, panel, desc: DESCRIPTIONS[c.href] })
    }
  }
  add({ href: '/change-password', label: 'Change Password', icon: <KeyRound className="h-4 w-4" />, panel: 'student', desc: DESCRIPTIONS['/change-password'] })
  linkCache = out
  return out
}

export function qaLink(href: string): QaLink | undefined {
  return qaAllLinks().find((l) => l.href === href)
}

/** Hrefs shown in a panel's own menu (incl. shared pages such as Exam Fee Collection). */
export function qaPanelHrefs(panel: PanelRole): Set<string> {
  const s = new Set<string>()
  for (const it of panelNav[panel] || []) {
    if (it.href && it.label !== 'Dashboard') s.add(it.href)
    for (const c of it.children || []) s.add(c.href)
  }
  if (panel !== 'admin') s.add('/change-password')
  return s
}

/** May this user open the shortcut? Same rule as the menu; pages outside the permission catalog need the panel role. */
export function qaUserCanOpen(user: User | null | undefined, href: string, panel: PanelRole): boolean {
  if (!user) return false
  if (href === '/change-password') return true
  if (!canSeeLink(user, href)) return false
  if (user.permission_keys && pageKeyFor(href, user)) return true
  const link = qaLink(href)
  const owner = link?.panel || panel
  return isAdminUser(user) || user.roles.includes(owner as unknown as UserRole)
}

/** Pages granted to the user that are NOT in this panel's own menu (e.g. a teacher given Exam Fee Collection). */
export function qaAssigned(user: User | null | undefined, panel: PanelRole): string[] {
  if (!user || isAdminUser(user) || !user.permissions) return []
  const own = new Set([...qaPanelHrefs(panel)].map(normPath))
  const out: string[] = []
  for (const k of user.permissions) {
    const base = k.split('#')[0]
    if (own.has(base) || out.includes(base)) continue
    if (qaAllLinks().some((l) => normPath(l.href) === base)) out.push(qaAllLinks().find((l) => normPath(l.href) === base)!.href)
  }
  return out
}

export interface QaDefaults { panels: Partial<Record<PanelRole, string[]>>; add_assigned: boolean }
export interface QaData { defaults: QaDefaults; mine: Partial<Record<PanelRole, string[]>> }

export type QaSource = 'custom' | 'default' | 'builtin'

/** The list a user sees on one panel's dashboard, before permission filtering. */
export function qaResolveRaw(panel: PanelRole, user: User | null | undefined, defaults: QaDefaults, custom?: string[] | null): { items: string[]; source: QaSource; assigned: string[] } {
  if (custom) return { items: custom, source: 'custom', assigned: [] }
  const base = defaults.panels[panel]
  const items = [...(base ?? QA_BUILTIN[panel])]
  const assigned = defaults.add_assigned ? qaAssigned(user, panel).filter((h) => !items.includes(h)) : []
  return { items: [...items, ...assigned], source: base ? 'default' : 'builtin', assigned }
}

/** Final tiles: resolved list → known pages the user may open. */
export function qaResolve(panel: PanelRole, user: User | null | undefined, defaults: QaDefaults, custom?: string[] | null): QaLink[] {
  return qaResolveRaw(panel, user, defaults, custom).items
    .map((h) => qaLink(h))
    .filter((l): l is QaLink => !!l && qaUserCanOpen(user, l.href, panel))
}

export const QA_EMPTY_DEFAULTS: QaDefaults = { panels: {}, add_assigned: true }

let dataCache: { uid: number; p: Promise<QaData> } | null = null

function loadQa(uid: number): Promise<QaData> {
  if (dataCache?.uid === uid) return dataCache.p
  const p = api.get<{ data: QaData }>('/quick-access')
    .then((r) => ({ defaults: { ...QA_EMPTY_DEFAULTS, ...(r.data?.defaults || {}) }, mine: r.data?.mine || {} }))
    .catch(() => { dataCache = null; return { defaults: QA_EMPTY_DEFAULTS, mine: {} } })
  dataCache = { uid, p }
  return p
}

/** Drop the cached lists (after the admin edits their own). */
export function qaInvalidate() { dataCache = null }

/** Tiles for the logged-in user on this panel's dashboard; null while loading. */
export function useQuickAccess(panel: PanelRole): QaLink[] | null {
  const { user } = useAuth()
  const [data, setData] = useState<QaData | null>(null)
  useEffect(() => {
    if (!user) return
    let alive = true
    loadQa(user.id).then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [user])
  return useMemo(() => (data && user ? qaResolve(panel, user, data.defaults, data.mine[panel] ?? null) : null), [data, user, panel])
}

export const panelLabel = (p: PanelRole) => ROLE_LABELS[p]
