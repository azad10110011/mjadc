'use client'

// Admin › Users › Dashboard Quick Access (Session 110).
// The default shortcut list of every panel's dashboard. One user can get their own list on
// Users › User Permissions. Pages a user may not open are never shown, whatever the list says.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import type { PanelRole } from '@/components/layout/PanelLayout'
import { Button, Card, CardContent } from '@/components/ui'
import { QuickAccessEditor } from '@/components/quickAccess/QuickAccessEditor'
import { api } from '@/lib/api'
import { panelLabel, qaInvalidate, QA_BUILTIN, QA_EMPTY_DEFAULTS, QA_PANELS, type QaDefaults } from '@/lib/quickAccess'
import { RotateCcw, Save } from 'lucide-react'

function QuickAccessInner() {
  const params = useSearchParams()
  const initial = params.get('panel') as PanelRole | null
  const [panel, setPanel] = useState<PanelRole>(initial && QA_PANELS.includes(initial) ? initial : 'teacher')
  const [defaults, setDefaults] = useState<QaDefaults | null>(null)
  const [list, setList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.get<{ data: QaDefaults }>('/admin/quick-access')
      .then((r) => {
        const d = { ...QA_EMPTY_DEFAULTS, ...r.data }
        setDefaults(d)
        setList(d.panels[panel] ?? QA_BUILTIN[panel])
      })
      .catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load settings' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saved = defaults ? (defaults.panels[panel] ?? null) : null
  const choosePanel = (p: PanelRole) => {
    setPanel(p); setMsg(null)
    if (defaults) setList(defaults.panels[p] ?? QA_BUILTIN[p])
  }

  const current = saved ?? QA_BUILTIN[panel]
  const dirty = JSON.stringify(list) !== JSON.stringify(current)

  const put = async (items: string[] | null) => {
    setSaving(true); setMsg(null)
    try {
      const r = await api.put<{ data: QaDefaults; message?: string }>('/admin/quick-access/defaults', { panel, items })
      setDefaults({ ...QA_EMPTY_DEFAULTS, ...r.data })
      setList(items ?? QA_BUILTIN[panel])
      qaInvalidate()
      setMsg({ ok: true, text: items === null ? `${panelLabel(panel)}: back to the built-in list.` : `${panelLabel(panel)} default saved. Users see it on their next page load.` })
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  const setAddAssigned = async (on: boolean) => {
    setMsg(null)
    try {
      const r = await api.put<{ data: QaDefaults }>('/admin/quick-access/options', { add_assigned: on })
      setDefaults({ ...QA_EMPTY_DEFAULTS, ...r.data })
      qaInvalidate()
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  return (
    <PanelLayout role="admin" title="Dashboard Quick Access">
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Choose the shortcuts on each panel&apos;s dashboard. A user only sees the pages they are allowed to open.
          To give one person their own list, open <Link href="/p_Xk7mN/users/permissions" className="font-medium underline">User Permissions</Link> and pick the user.
        </p>

        <div role="tablist" aria-label="Panel" className="flex flex-wrap gap-2">
          {QA_PANELS.map((p) => (
            <button key={p} type="button" role="tab" aria-selected={p === panel} onClick={() => choosePanel(p)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${p === panel ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
              {panelLabel(p)}
              {defaults?.panels[p] && <span className={`ml-1.5 text-xs ${p === panel ? 'text-blue-100' : 'text-blue-600'}`}>• set</span>}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{panelLabel(panel)} dashboard: default shortcuts</h3>
                <p className="text-xs text-gray-500">{saved ? 'Set by admin' : 'Built-in list (not changed yet)'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={saving || !saved} onClick={() => put(null)}><RotateCcw className="mr-1 h-4 w-4" /> Built-in list</Button>
                <Button size="sm" disabled={saving || !defaults || !dirty} onClick={() => put(list)}><Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</Button>
              </div>
            </div>
            {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
            {defaults ? <QuickAccessEditor panel={panel} value={list} onChange={setList} disabled={saving} /> : <p className="text-sm text-gray-500">Loading…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={defaults?.add_assigned ?? true} disabled={!defaults}
                onChange={(e) => setAddAssigned(e.target.checked)} />
              <span>
                <span className="block font-medium text-gray-900">Also add pages given from other panels</span>
                <span className="block text-gray-500">
                  When you grant a user a page from another panel (e.g. a teacher given Exam Fee Collection), it is added at the end of their
                  Quick Access automatically. Users with their own list are not affected.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}

export default function QuickAccessSettingsPage() {
  return (
    <Suspense fallback={null}>
      <QuickAccessInner />
    </Suspense>
  )
}
