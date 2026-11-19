'use client'

// Admin / Exam Controller › Result Images (Session 123). Every teacher's result-sheet pictures (uploaded from
// the mobile app), filterable by year, class, exam, subject and teacher. Admin can delete.

import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { AuthImage, ImageViewer } from '@/components/media/PrivateImages'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { isAdminUser } from '@/lib/permissions'

interface Pic { id: number; user_id: number; teacher: string | null; year: number; class: string; exam_name: string; subject: string; note: string | null; created_at: string }
const sel = 'h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'
const when = (s: string) => { const d = new Date(s.replace(' ', 'T')); return isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort((x, y) => x.localeCompare(y, undefined, { numeric: true }))

export default function ResultImagesPage() {
  const { user } = useAuth()
  const admin = isAdminUser(user)
  const [pics, setPics] = useState<Pic[]>([])
  const [f, setF] = useState({ year: '', class: '', exam: '', subject: '', teacher: '' })
  const [viewing, setViewing] = useState<Pic | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => api.get<{ data: Pic[] }>('/result-images').then((r) => setPics(r.data))
    .catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' }))
  useEffect(() => { load() }, [])

  const opts = useMemo(() => ({
    year: uniq(pics.map((p) => String(p.year))), class: uniq(pics.map((p) => p.class)), exam: uniq(pics.map((p) => p.exam_name)),
    subject: uniq(pics.map((p) => p.subject)), teacher: uniq(pics.map((p) => p.teacher || '')),
  }), [pics])
  const shown = pics.filter((p) => (!f.year || String(p.year) === f.year) && (!f.class || p.class === f.class) && (!f.exam || p.exam_name === f.exam)
    && (!f.subject || p.subject === f.subject) && (!f.teacher || p.teacher === f.teacher))

  const remove = async (p: Pic) => {
    if (!confirm('Delete this result picture?')) return
    try { await api.delete(`/result-images/${p.id}`); setViewing(null); setMsg({ ok: true, text: 'Picture deleted' }); load() }
    catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  const dd = (key: keyof typeof f, label: string, values: string[]) => (
    <select aria-label={label} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} className={sel}>
      <option value="">All {label.toLowerCase()}</option>
      {values.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  )

  return (
    <PanelLayout role="admin" title="Result Images">
      <div className="space-y-4">
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">Result-sheet pictures teachers took in the MJADC app.</p>
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap gap-2">
              {dd('year', 'Years', opts.year)}{dd('class', 'Classes', opts.class)}{dd('exam', 'Exams', opts.exam)}
              {dd('subject', 'Subjects', opts.subject)}{dd('teacher', 'Teachers', opts.teacher)}
            </div>
            <p className="text-sm text-gray-600">Showing <b>{shown.length}</b> of {pics.length} picture(s)</p>
            {shown.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {shown.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl border border-gray-200">
                    <AuthImage path={`/result-images/file/${p.id}`} alt={p.subject} className="aspect-[3/4] w-full" onClick={() => setViewing(p)} />
                    <div className="p-2">
                      <p className="truncate text-sm font-medium text-gray-900">{p.subject}</p>
                      <p className="truncate text-xs text-gray-600">{p.teacher || '—'}</p>
                      <p className="truncate text-xs text-gray-500">{p.exam_name} {p.year} · {p.class}</p>
                      <p className="text-xs text-gray-400">{when(p.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-8 text-center text-sm text-gray-500">No result pictures{pics.length ? ' match these filters' : ' yet'}.</p>}
          </CardContent>
        </Card>
      </div>
      {viewing && (
        <ImageViewer
          path={`/result-images/file/${viewing.id}`}
          title={`${viewing.subject} — ${viewing.teacher || ''}`}
          subtitle={`${viewing.exam_name} ${viewing.year} · ${viewing.class}${viewing.note ? ' · ' + viewing.note : ''} · ${when(viewing.created_at)}`}
          filename={`result-${viewing.exam_name}-${viewing.year}-${viewing.subject}-${viewing.id}.jpg`.replace(/\s+/g, '-')}
          onClose={() => setViewing(null)}
          actions={admin ? <button type="button" onClick={() => remove(viewing)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><Trash2 className="h-4 w-4" /> Delete</button> : undefined}
        />
      )}
    </PanelLayout>
  )
}
