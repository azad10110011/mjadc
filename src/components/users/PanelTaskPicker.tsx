'use client'

// Panel tasks on the create / edit user forms (Session 102).
// After roles are ticked, every task (menu feature) of those panels is listed — one section per panel —
// all ticked by default. Unticked tasks are sent as `disabled_features`; the user then does not see
// them in the menu / dashboard and cannot use them (enforced on the backend).

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

interface CatalogItem { key: string; label: string; group: string; roles: string[]; grantable: boolean }

const PANEL: Record<string, string> = {
  teacher: 'Teacher Panel', staff: 'Staff Panel', exam_controller: 'Exam Controller Panel', principal: 'Principal Panel',
  administration: 'Administration Panel', student: 'Student Panel',
}
const ORDER = ['teacher', 'exam_controller', 'principal', 'administration', 'staff', 'student']

let catalogCache: Promise<CatalogItem[]> | null = null
const loadCatalog = () => {
  catalogCache ??= api.get<{ data: CatalogItem[] }>('/admin/permissions/catalog').then((r) => r.data || []).catch(() => { catalogCache = null; return [] })
  return catalogCache
}

/** Load the unticked (revoked) tasks of an existing user, for the edit form. */
export async function loadDisabledTasks(userId: number): Promise<string[]> {
  try {
    const r = await api.get<{ data: { overrides: Record<string, string> } }>(`/admin/permissions/user/${userId}`)
    return Object.entries(r.data.overrides || {}).filter(([, v]) => v === 'revoke').map(([k]) => k)
  } catch { return [] }
}

export function PanelTaskPicker({ roles, disabled, onChange }: {
  roles: string[]; disabled: string[]; onChange: (keys: string[]) => void
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  useEffect(() => { let alive = true; void loadCatalog().then((c) => { if (alive) setCatalog(c) }); return () => { alive = false } }, [])

  // one section per selected panel; a task shared by two selected panels is listed under the first
  const sections = useMemo(() => {
    const seen = new Set<string>()
    return ORDER.filter((r) => roles.includes(r)).map((role) => {
      const items = catalog.filter((it) => it.roles.includes(role) && !seen.has(it.key))
      items.forEach((it) => seen.add(it.key))
      return { role, items }
    }).filter((s) => s.items.length > 0)
  }, [catalog, roles])

  const off = new Set(disabled)
  const set = (keys: string[], on: boolean) => {
    const next = new Set(off)
    keys.forEach((k) => (on ? next.delete(k) : next.add(k)))
    onChange([...next])
  }

  if (roles.includes('admin')) {
    return <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">Admin has every task of every panel — nothing to choose.</p>
  }
  if (!roles.length) return null
  if (!catalog.length) return <p className="text-sm text-gray-500">Loading panel tasks…</p>

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">Panel tasks <span className="font-normal text-gray-500">— the user only sees and can use the ticked tasks in their panel</span></p>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(({ role, items }) => {
          const onCount = items.filter((it) => !off.has(it.key)).length
          return (
            <div key={role} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{PANEL[role] || role} <span className="font-normal text-gray-500">· {onCount}/{items.length}</span></p>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => set(items.map((i) => i.key), true)} className="text-blue-700 hover:underline">All</button>
                  <button type="button" onClick={() => set(items.map((i) => i.key), false)} className="text-gray-500 hover:underline">None</button>
                </div>
              </div>
              <div className="space-y-1">
                {items.map((it) => (
                  <label key={it.key} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 ${off.has(it.key) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    <input type="checkbox" checked={!off.has(it.key)} onChange={(e) => set([it.key], e.target.checked)} />
                    {it.label}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
