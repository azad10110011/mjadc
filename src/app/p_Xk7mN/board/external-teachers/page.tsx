'use client'

// Board Exam Management › External Teachers (Session 99): teachers hired from other colleges for
// board exam invigilation. One shared list (reused every year); they have no login.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, Power, X, Search, UserPlus } from 'lucide-react'

interface Ext { id: number; name: string; college: string; designation: string | null; subject: string | null; mobile: string | null; email: string | null; gender: string; enabled: boolean; notes: string | null }
const empty = { name: '', college: '', designation: 'Lecturer', subject: '', mobile: '', email: '', gender: 'male', notes: '', enabled: true }
type Form = typeof empty

export default function ExternalTeachersPage() {
  const [list, setList] = useState<Ext[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [college, setCollege] = useState('')

  const load = useCallback(async () => {
    try { setList((await api.get<{ data: Ext[] }>('/admin/board-external-teachers')).data || []) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
  }, [])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); await load() }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }
  const save = () => form && run(async () => {
    const r = editId ? await api.put<{ message: string }>(`/admin/board-external-teachers/${editId}`, form) : await api.post<{ message: string }>('/admin/board-external-teachers', form)
    setForm(null); setEditId(null); return r.message
  })

  const colleges = useMemo(() => [...new Set(list.map((t) => t.college))].sort(), [list])
  const shown = list.filter((t) => (!college || t.college === college) &&
    (!q.trim() || [t.name, t.subject, t.mobile, t.designation].some((v) => (v || '').toLowerCase().includes(q.trim().toLowerCase()))))

  return (
    <PanelLayout role="admin" title="External Teachers">
      <div className="space-y-5">
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Teachers hired from other colleges for board exam hall duty. They are offered in <b>Board Hall Duty</b> together with our own teachers, and get appointment letters addressed to their own college.</p>
          {!form && <Button onClick={() => { setForm({ ...empty }); setEditId(null) }}><UserPlus className="mr-1 h-4 w-4" /> Add External Teacher</Button>}
        </div>

        {form && (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <h3 className="font-semibold text-gray-900">{editId ? `Edit ${form.name}` : 'New external teacher'}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <div>
                  <label htmlFor="ext-college" className="mb-1 block text-sm font-medium text-gray-700">College</label>
                  <input id="ext-college" list="ext-colleges" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Their college" />
                  <datalist id="ext-colleges">{colleges.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <Input label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="used for the own-subject rule" />
                <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="01XXXXXXXXX" />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
                <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Available for duty</label>
              <div className="flex gap-2">
                <Button onClick={save} disabled={busy || !form.name.trim() || !form.college.trim()}>{editId ? 'Save' : <><Plus className="mr-1 h-4 w-4" /> Add</>}</Button>
                <Button variant="ghost" onClick={() => { setForm(null); setEditId(null) }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, subject, mobile" aria-label="Search external teachers" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" />
              </div>
              <select value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">All colleges ({list.length})</option>
                {colleges.map((c) => <option key={c} value={c}>{c} ({list.filter((t) => t.college === c).length})</option>)}
              </select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-3 py-2">Teacher</th><th className="px-3 py-2">College</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((t) => (
                    <tr key={t.id} className={t.enabled ? '' : 'bg-gray-50 text-gray-400'}>
                      <td className="px-3 py-2"><p className="font-medium">{t.name}</p><p className="text-xs text-gray-500">{t.designation || '—'} · {t.gender}</p></td>
                      <td className="px-3 py-2">{t.college}</td>
                      <td className="px-3 py-2">{t.subject || '—'}</td>
                      <td className="px-3 py-2">{t.mobile || '—'}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{t.enabled ? 'Available' : 'Disabled'}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => { setForm({ ...empty, ...t, designation: t.designation || '', subject: t.subject || '', mobile: t.mobile || '', email: t.email || '', notes: t.notes || '' }); setEditId(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label={`Edit ${t.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="secondary" onClick={() => run(async () => (await api.put<{ message: string }>(`/admin/board-external-teachers/${t.id}`, { enabled: !t.enabled })).message)} aria-label={`${t.enabled ? 'Disable' : 'Enable'} ${t.name}`}><Power className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="danger" onClick={() => { if (confirm(`Delete ${t.name}?`)) run(async () => (await api.delete<{ message: string }>(`/admin/board-external-teachers/${t.id}`)).message) }} aria-label={`Delete ${t.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">{list.length ? 'No teachers match' : 'No external teachers yet'}</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
