'use client'

// Admin › Update History (Session 121). Every insert / update / delete on every table, with who did it,
// when, from which device and IP. Admin can restore a record to before/after any change, edit the
// record directly, see a record's full history, and delete history entries. Admin only.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { History, RotateCcw, Redo2, Pencil, Trash2, X, RefreshCw, Search, ListFilter } from 'lucide-react'
import { PanelLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

type Data = Record<string, unknown> | null
interface Entry {
  id: number; table: string; row_pk: string; action: 'insert' | 'update' | 'delete'; changed: string[]
  user_id: number | null; user_name: string | null; user_roles: string | null; ip: string | null; device: string | null
  note: string | null; created_at: string; old?: Data; new?: Data; user_agent?: string | null
  client?: Record<string, string> | null; request_uri?: string | null; method?: string | null
}
interface Detail extends Entry { current: Data; tracked: boolean }
interface Status {
  triggers: { installed: number; total: number; refreshed: string[]; errors: Record<string, string> }
  total_entries: number; table_counts: Record<string, number>; tables: string[]
  sections: Record<string, string[]>; users: { user_id: number; user_name: string; n: number }[]
}
interface Filters { section: string; table: string; row_pk: string; user_id: string; action: string; from: string; to: string; q: string }
const EMPTY: Filters = { section: '', table: '', row_pk: '', user_id: '', action: '', from: '', to: '', q: '' }

const label = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const ACTION: Record<string, { text: string; v: 'success' | 'info' | 'danger' }> = {
  insert: { text: 'Added', v: 'success' }, update: { text: 'Changed', v: 'info' }, delete: { text: 'Deleted', v: 'danger' },
}
function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
function when(s: string) {
  const d = new Date(s.replace(' ', 'T'))
  return isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const inputCls = 'h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

function UpdateHistoryInner() {
  const params = useSearchParams()
  const [status, setStatus] = useState<Status | null>(null)
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, table: params.get('table') || '', row_pk: params.get('row') || '' })
  const [applied, setApplied] = useState<Filters>(filters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ total: number; per_page: number; entries: Entry[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Record<string, string> | null>(null)

  const loadStatus = useCallback((force = false) => {
    const req = force ? api.post<{ data: Status['triggers'] }>('/admin/audit/sync', { force: true }).then(() => api.get<{ data: Status }>('/admin/audit/status'))
      : api.get<{ data: Status }>('/admin/audit/status')
    return req.then((r) => setStatus(r.data)).catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' }))
  }, [])

  const load = useCallback((f: Filters, p: number) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(p), per_page: '50' })
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v) })
    api.get<{ data: { total: number; per_page: number; entries: Entry[] } }>(`/admin/audit?${qs}`)
      .then((r) => { setData(r.data); setSelected([]) })
      .catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load history' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStatus().then(() => load(applied, page)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (f: Filters) => { setApplied(f); setPage(1); load(f, 1) }
  const goPage = (p: number) => { setPage(p); load(applied, p) }

  const tablesInSection = useMemo(() => {
    if (!status) return []
    if (!filters.section) return status.tables
    if (filters.section === 'Other') {
      const listed = new Set(Object.values(status.sections).flat())
      return status.tables.filter((t) => !listed.has(t))
    }
    return status.sections[filters.section] || []
  }, [status, filters.section])

  const open = (id: number) => {
    setEditing(null)
    api.get<{ data: Detail }>(`/admin/audit/${id}`).then((r) => setDetail(r.data))
      .catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not open entry' }))
  }

  const restore = async (to: 'before' | 'after') => {
    if (!detail) return
    const what = to === 'before' ? 'undo this change (put the record back to how it was BEFORE)' : 're-apply this change (put the record back to how it was AFTER)'
    if (!confirm(`Do you want to ${what}?`)) return
    setBusy(true)
    try {
      const r = await api.post<{ message: string; data: { result: string } }>(`/admin/audit/${detail.id}/restore`, { to })
      setMsg({ ok: true, text: `${r.message} (${r.data.result}). A new history entry was added for this restore.` })
      open(detail.id); load(applied, page)
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed' }) }
    finally { setBusy(false) }
  }

  const saveEdit = async () => {
    if (!detail || !editing || !detail.current) return
    const changes: Record<string, string> = {}
    Object.entries(editing).forEach(([k, v]) => { if (fmt(detail.current?.[k]) !== v) changes[k] = v })
    if (!Object.keys(changes).length) { setEditing(null); return }
    setBusy(true)
    try {
      await api.post('/admin/audit/apply', { table: detail.table, row_pk: detail.row_pk, data: changes })
      setMsg({ ok: true, text: `Saved ${Object.keys(changes).length} field(s). The change is in the history.` })
      setEditing(null); open(detail.id); load(applied, page)
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }

  const deleteEntries = async (ids: number[]) => {
    if (!ids.length || !confirm(`Delete ${ids.length} history entr${ids.length === 1 ? 'y' : 'ies'}? This only removes the history, not the data.`)) return
    try {
      const r = await api.post<{ message: string }>('/admin/audit/delete', { ids })
      setMsg({ ok: true, text: r.message }); if (detail && ids.includes(detail.id)) setDetail(null)
      load(applied, page); loadStatus()
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  const showRecord = (e: Entry) => { const f = { ...EMPTY, table: e.table, row_pk: e.row_pk }; setFilters(f); setDetail(null); apply(f) }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1
  const errs = status ? Object.entries(status.triggers.errors) : []

  return (
    <PanelLayout role="admin" title="Update History">
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <History className="h-6 w-6 text-blue-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">Every change, by everyone</p>
              <p className="text-sm text-gray-600">
                {status ? <>Tracking <b>{status.triggers.installed}</b> of {status.triggers.total} tables · <b>{status.total_entries.toLocaleString()}</b> changes recorded</> : 'Loading…'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadStatus(true)}><RefreshCw className="mr-1 h-4 w-4" /> Refresh tracking</Button>
          </CardContent>
          {errs.length > 0 && (
            <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <b>{errs.length} table(s) could not be tracked</b> — the database refused to create triggers
              (on shared hosting ask your host to allow the TRIGGER privilege). First error: {errs[0][0]}: {errs[0][1]}
            </div>
          )}
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-end gap-2">
              <select aria-label="Section" className={inputCls} value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value, table: '' })}>
                <option value="">All sections</option>
                {status && Object.keys(status.sections).map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="Other">Other</option>
              </select>
              <select aria-label="Table" className={inputCls} value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value, row_pk: '' })}>
                <option value="">All data</option>
                {tablesInSection.map((t) => <option key={t} value={t}>{label(t)}{status?.table_counts[t] ? ` (${status.table_counts[t]})` : ''}</option>)}
              </select>
              <select aria-label="Changed by" className={inputCls} value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}>
                <option value="">Anyone</option>
                <option value="none">Not signed in / outside the app</option>
                {status?.users.map((u) => <option key={u.user_id} value={u.user_id}>{u.user_name} ({u.n})</option>)}
              </select>
              <select aria-label="Action" className={inputCls} value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
                <option value="">Any action</option><option value="update">Changed</option><option value="insert">Added</option><option value="delete">Deleted</option>
              </select>
              <input aria-label="From date" type="date" className={inputCls} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              <input aria-label="To date" type="date" className={inputCls} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input aria-label="Search history" type="search" className={`${inputCls} w-full pl-9`} placeholder="Search name, ID, value, IP, device…"
                  value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') apply(filters) }} />
              </div>
              <Button size="sm" onClick={() => apply(filters)}><ListFilter className="mr-1 h-4 w-4" /> Show</Button>
              <Button size="sm" variant="ghost" onClick={() => { setFilters(EMPTY); apply(EMPTY) }}>Clear</Button>
            </div>
            {applied.row_pk && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">Showing the full history of <b>{label(applied.table)} #{applied.row_pk}</b></p>}
            {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">{data ? <><b>{data.total.toLocaleString()}</b> change(s)</> : ''}{loading ? ' · loading…' : ''}</p>
              {selected.length > 0 && <Button size="sm" variant="danger" onClick={() => deleteEntries(selected)}><Trash2 className="mr-1 h-4 w-4" /> Delete {selected.length} selected</Button>}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-8 px-3 py-2"><input type="checkbox" aria-label="Select all on this page"
                      checked={!!data?.entries.length && selected.length === data.entries.length}
                      onChange={(e) => setSelected(e.target.checked ? (data?.entries.map((x) => x.id) || []) : [])} /></th>
                    <th className="px-3 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">What</th>
                    <th className="px-3 py-2">Record</th><th className="px-3 py-2">Fields</th><th className="px-3 py-2">Device / IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.entries.map((e) => (
                    <tr key={e.id} className="cursor-pointer border-t border-gray-100 hover:bg-blue-50/50" onClick={() => open(e.id)}>
                      <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select change ${e.id}`} checked={selected.includes(e.id)}
                          onChange={(ev) => setSelected(ev.target.checked ? [...selected, e.id] : selected.filter((x) => x !== e.id))} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{when(e.created_at)}</td>
                      <td className="px-3 py-2"><span className="font-medium text-gray-900">{e.user_name || '—'}</span>
                        <span className="block text-xs text-gray-500">{e.user_roles || (e.user_id ? '' : 'not signed in / outside the app')}</span></td>
                      <td className="px-3 py-2"><Badge variant={ACTION[e.action].v}>{ACTION[e.action].text}</Badge>
                        {e.note && <span className="mt-0.5 block text-xs text-amber-700">{e.note}</span>}</td>
                      <td className="px-3 py-2 text-gray-800">{label(e.table)} <span className="text-gray-500">#{e.row_pk.length > 30 ? e.row_pk.slice(0, 30) + '…' : e.row_pk}</span></td>
                      <td className="max-w-[220px] px-3 py-2 text-gray-600"><span className="line-clamp-2">{e.action === 'update' ? e.changed.join(', ') : '(whole record)'}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-600">{e.device || '—'}<span className="block text-gray-400">{e.ip}</span></td>
                    </tr>
                  ))}
                  {data && !data.entries.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-500">No changes match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goPage(page - 1)}>Previous</Button>
                <span>Page {page} of {pages}</span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <aside role="dialog" aria-label={`Change ${detail.id}`} className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs text-gray-500">Change #{detail.id} · {when(detail.created_at)}</p>
                <h2 className="text-lg font-semibold text-gray-900">
                  <Badge variant={ACTION[detail.action].v}>{ACTION[detail.action].text}</Badge>{' '}
                  {label(detail.table)} #{detail.row_pk}
                </h2>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Close" className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-2 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-2">
                <p><span className="text-gray-500">By:</span> <b>{detail.user_name || 'Not signed in / outside the app'}</b>{detail.user_roles ? ` (${detail.user_roles})` : ''}</p>
                <p><span className="text-gray-500">Device:</span> {detail.device || '—'}</p>
                <p><span className="text-gray-500">IP:</span> {detail.ip || '—'}</p>
                <p><span className="text-gray-500">Request:</span> {detail.method} {detail.request_uri}</p>
                {detail.client && <p className="sm:col-span-2"><span className="text-gray-500">Device details:</span> {Object.entries(detail.client).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                {detail.user_agent && <p className="break-all text-xs text-gray-500 sm:col-span-2">{detail.user_agent}</p>}
                {detail.note && <p className="text-amber-800 sm:col-span-2">{detail.note}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {detail.tracked && (
                  <>
                    <Button size="sm" onClick={() => restore('before')} disabled={busy}><RotateCcw className="mr-1 h-4 w-4" /> Restore to before</Button>
                    <Button size="sm" variant="outline" onClick={() => restore('after')} disabled={busy}><Redo2 className="mr-1 h-4 w-4" /> Restore to after</Button>
                    {detail.current && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(Object.fromEntries(Object.entries(detail.current || {}).map(([k, v]) => [k, fmt(v) === '—' ? '' : fmt(v)])))}>
                      <Pencil className="mr-1 h-4 w-4" /> Edit record now</Button>}
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => showRecord(detail)}><History className="mr-1 h-4 w-4" /> All history of this record</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteEntries([detail.id])}><Trash2 className="mr-1 h-4 w-4" /> Delete entry</Button>
              </div>
              {!detail.current && detail.tracked && <p className="text-sm text-amber-800">This record does not exist now. &quot;Restore to before&quot; on a delete brings it back.</p>}

              {editing && detail.current ? (
                <div className="space-y-2 rounded-lg border border-blue-200 p-3">
                  <p className="text-sm font-medium text-gray-900">Edit the record as it is now</p>
                  {Object.keys(editing).filter((k) => k !== 'password_hash').map((k) => (
                    <label key={k} className="grid gap-1 text-sm sm:grid-cols-[180px_1fr] sm:items-center">
                      <span className="text-gray-600">{k}</span>
                      <input className={`${inputCls} w-full`} value={editing[k]} disabled={k === 'id'}
                        onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit} disabled={busy}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Before</th><th className="px-3 py-2">After</th><th className="px-3 py-2">Now</th></tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set([...Object.keys(detail.old || {}), ...Object.keys(detail.new || {})])).map((k) => {
                        const changed = detail.changed.includes(k)
                        return (
                          <tr key={k} className={`border-t border-gray-100 align-top ${changed ? 'bg-amber-50' : ''}`}>
                            <td className="px-3 py-1.5 font-medium text-gray-700">{k}</td>
                            <td className="max-w-[200px] break-words px-3 py-1.5 text-gray-600">{detail.old ? fmt(detail.old[k]) : <i className="text-gray-400">did not exist</i>}</td>
                            <td className={`max-w-[200px] break-words px-3 py-1.5 ${changed ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{detail.new ? fmt(detail.new[k]) : <i className="text-gray-400">deleted</i>}</td>
                            <td className="max-w-[200px] break-words px-3 py-1.5 text-gray-500">{detail.current ? fmt(detail.current[k]) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </PanelLayout>
  )
}

export default function UpdateHistoryPage() {
  return (
    <Suspense fallback={null}>
      <UpdateHistoryInner />
    </Suspense>
  )
}
