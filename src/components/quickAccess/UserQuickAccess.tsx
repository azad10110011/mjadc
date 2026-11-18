'use client'

// Quick Access for ONE user (Session 110) — shown on Admin › Users › User Permissions.
// For each panel the user has: use the panel default (plus pages granted from other panels, if that
// option is on) or a custom list for this user only.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, RotateCcw, Save } from 'lucide-react'
import type { PanelRole } from '@/components/layout/PanelLayout'
import { Button, Card, CardContent } from '@/components/ui'
import { QuickAccessEditor } from '@/components/quickAccess/QuickAccessEditor'
import { api } from '@/lib/api'
import {
  panelLabel, qaInvalidate, qaLink, qaResolveRaw, qaUserCanOpen, QA_EMPTY_DEFAULTS, QA_PANELS, type QaDefaults,
} from '@/lib/quickAccess'
import type { User } from '@/types'

type Lists = Partial<Record<PanelRole, string[]>>

interface Props {
  userId: number
  roles: string[]
  /** permission keys the user has (as currently ticked on the page) */
  permissions: string[]
  /** every permission-controlled key */
  permissionKeys: string[]
}

export function UserQuickAccess({ userId, roles, permissions, permissionKeys }: Props) {
  const [defaults, setDefaults] = useState<QaDefaults | null>(null)
  const [saved, setSaved] = useState<Lists>({})
  const [draft, setDraft] = useState<Lists>({})
  const [busy, setBusy] = useState<PanelRole | null>(null)
  const [msg, setMsg] = useState<{ panel: PanelRole; ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true

    Promise.all([
      api.get<{ data: QaDefaults }>('/admin/quick-access'),
      api.get<{ data: { lists: Lists } }>(`/admin/quick-access/user/${userId}`),
    ]).then(([d, u]) => {
      if (!alive) return
      setDefaults({ ...QA_EMPTY_DEFAULTS, ...d.data })
      setSaved(u.data.lists || {})
      setDraft(u.data.lists || {})
    }).catch(() => alive && setDefaults(QA_EMPTY_DEFAULTS))
    return () => { alive = false }
  }, [userId])

  const panels = QA_PANELS.filter((p) => roles.includes(p))
  const fakeUser = useMemo(() => ({ id: userId, roles, permissions, permission_keys: permissionKeys } as unknown as User), [userId, roles, permissions, permissionKeys])

  if (!defaults) return null
  if (panels.length === 0) return null

  const save = async (panel: PanelRole, items: string[] | null) => {
    setBusy(panel); setMsg(null)
    try {
      const r = await api.put<{ data: { lists: Lists } }>(`/admin/quick-access/user/${userId}`, { panel, items })
      const lists = r.data.lists || {}
      setSaved(lists)
      setDraft((d) => { const n = { ...d }; if (lists[panel]) n[panel] = lists[panel]; else delete n[panel]; return n })
      qaInvalidate()
      setMsg({ panel, ok: true, text: items === null ? 'Now uses the panel default.' : 'Saved for this user.' })
    } catch (e: unknown) {
      setMsg({ panel, ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally { setBusy(null) }
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-gray-900"><LayoutGrid className="h-4 w-4 text-blue-600" /> Dashboard Quick Access</h4>
          <p className="text-sm text-gray-500">
            Shortcuts on this user&apos;s dashboard. Panel defaults are set in{' '}
            <Link href="/p_Xk7mN/users/quick-access" className="text-blue-700 underline">Dashboard Quick Access</Link>.
            The preview follows the ticks above, so save permission changes too.
          </p>
        </div>

        {panels.map((panel) => {
          const custom = draft[panel]
          const isCustom = !!custom
          const auto = qaResolveRaw(panel, fakeUser, defaults, null)
          const autoShown = auto.items.filter((h) => qaLink(h) && qaUserCanOpen(fakeUser, h, panel))
          const dirty = JSON.stringify(custom ?? null) !== JSON.stringify(saved[panel] ?? null)
          return (
            <div key={panel} className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-gray-900">{panelLabel(panel)} dashboard</p>
                <div role="radiogroup" aria-label={`${panelLabel(panel)} Quick Access source`} className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-sm">
                  <button type="button" role="radio" aria-checked={!isCustom}
                    onClick={() => setDraft((d) => { const n = { ...d }; delete n[panel]; return n })}
                    className={`px-3 py-1.5 font-medium ${!isCustom ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Panel default</button>
                  <button type="button" role="radio" aria-checked={isCustom}
                    onClick={() => !isCustom && setDraft((d) => ({ ...d, [panel]: autoShown }))}
                    className={`px-3 py-1.5 font-medium ${isCustom ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Custom for this user</button>
                </div>
              </div>

              {isCustom ? (
                <QuickAccessEditor panel={panel} value={custom} disabled={busy === panel}
                  onChange={(v) => setDraft((d) => ({ ...d, [panel]: v }))}
                  otherAllowed={(h) => qaUserCanOpen(fakeUser, h, panel)}
                  note={(h) => (qaUserCanOpen(fakeUser, h, panel) ? null : 'hidden: this user cannot open it')} />
              ) : (
                <div>
                  {autoShown.length === 0 ? <p className="text-sm text-gray-500">No shortcuts (section hidden).</p> : (
                    <ul className="flex flex-wrap gap-1.5">
                      {autoShown.map((h) => (
                        <li key={h} className={`rounded-full px-2.5 py-1 text-xs ${auto.assigned.includes(h) ? 'bg-green-50 text-green-800 ring-1 ring-green-200' : 'bg-gray-100 text-gray-700'}`}>
                          {qaLink(h)?.label}{auto.assigned.includes(h) ? ' (granted)' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {saved[panel] && !isCustom && <span className="text-xs text-amber-700">Their custom list will be removed when you save.</span>}
                <span className="flex-1" />
                {isCustom && (
                  <Button size="sm" variant="secondary" disabled={busy === panel} onClick={() => setDraft((d) => ({ ...d, [panel]: autoShown }))}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Copy default
                  </Button>
                )}
                <Button size="sm" disabled={busy === panel || !dirty} onClick={() => save(panel, custom ?? null)}>
                  <Save className="mr-1 h-4 w-4" /> {busy === panel ? 'Saving…' : dirty ? 'Save Quick Access' : 'Saved'}
                </Button>
              </div>
              {msg?.panel === panel && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
