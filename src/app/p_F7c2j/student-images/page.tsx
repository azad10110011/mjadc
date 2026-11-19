'use client'

// Administration › Student Images (Session 123). Pictures of money receipts, admission forms … saved under a
// student. Upload (camera / gallery) is in the mobile app; viewing works in the app and on the website.
// View + upload are per-user permissions (on by default for Administration; admin can switch them off in
// User Permissions). Admin can also change a picture's type/note and delete it.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Pencil, Trash2, Smartphone } from 'lucide-react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { AuthImage, ImagePicker, ImageViewer } from '@/components/media/PrivateImages'
import { useAuth } from '@/contexts/AuthContext'
import { api, UPLOAD_BASE } from '@/lib/api'
import { APP_MODE } from '@/lib/appMode'
import { can, isAdminUser } from '@/lib/permissions'

interface StudentHit { id: number; student_id: string; name: string; class: string; student_group: string | null; photo_path: string | null; docs: number }
interface Doc { id: number; student_id: number; doc_type: string; note: string | null; uploader: string | null; created_at: string }

const inputCls = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'
const when = (s: string) => { const d = new Date(s.replace(' ', 'T')); return isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function StudentImagesPage() {
  const { user } = useAuth()
  const admin = isAdminUser(user)
  const canUpload = admin || can(user, '/p_F7c2j/student-images#upload')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<StudentHit[]>([])
  const [student, setStudent] = useState<StudentHit | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [docType, setDocType] = useState('Money Receipt')
  const [customType, setCustomType] = useState('')
  const [note, setNote] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [progress, setProgress] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [viewing, setViewing] = useState<Doc | null>(null)
  const [editing, setEditing] = useState<{ doc_type: string; note: string } | null>(null)

  const search = useCallback((text: string) => {
    api.get<{ data: StudentHit[] }>(`/student-docs/students?q=${encodeURIComponent(text)}`)
      .then((r) => setHits(r.data)).catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Search failed' }))
  }, [])
  useEffect(() => {
    api.get<{ data: string[] }>('/student-docs/types').then((r) => setTypes(r.data)).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => search(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q, search])

  const loadDocs = useCallback((s: StudentHit) => {
    api.get<{ data: { documents: Doc[] } }>(`/student-docs?student_id=${s.id}`).then((r) => setDocs(r.data.documents))
      .catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load pictures' }))
  }, [])
  const choose = (s: StudentHit) => { setStudent(s); setDocs([]); setMsg(null); setTypeFilter(''); loadDocs(s) }

  const upload = async (files: File[]) => {
    if (!student) return
    const type = docType === '__other' ? customType.trim() : docType
    if (!type) { setMsg({ ok: false, text: 'Type what the picture is (e.g. Money Receipt).' }); return }
    let done = 0
    setMsg(null)
    for (const f of files) {
      setProgress(`Uploading ${done + 1} of ${files.length}…`)
      const fd = new FormData()
      fd.append('student_id', String(student.id))
      fd.append('doc_type', type)
      if (note.trim()) fd.append('note', note.trim())
      fd.append('image', f)
      try { await api.upload('/student-docs', fd); done++ }
      catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Upload failed' }); break }
    }
    setProgress('')
    if (done) { setMsg({ ok: true, text: `${done} picture(s) saved under ${student.name}.` }); setNote(''); loadDocs(student); search(q.trim()) }
  }

  const saveEdit = async () => {
    if (!viewing || !editing) return
    try {
      await api.put(`/student-docs/${viewing.id}`, editing)
      setMsg({ ok: true, text: 'Saved' }); setEditing(null); setViewing(null); if (student) loadDocs(student)
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
  }
  const remove = async (d: Doc) => {
    if (!confirm(`Delete this ${d.doc_type} picture? This cannot be undone here (admin can restore its record from Update History, but not the image file).`)) return
    try {
      await api.delete(`/student-docs/${d.id}`)
      setMsg({ ok: true, text: 'Picture deleted' }); setViewing(null); if (student) { loadDocs(student); search(q.trim()) }
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  const docTypes = useMemo(() => Array.from(new Set(docs.map((d) => d.doc_type))), [docs])
  const shown = typeFilter ? docs.filter((d) => d.doc_type === typeFilter) : docs

  return (
    <PanelLayout role="administration" title="Student Images">
      <div className="mx-auto max-w-4xl space-y-4">
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

        {!student ? (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <h3 className="font-semibold text-gray-900">Choose a student</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Student ID, name or mobile" aria-label="Find a student" className={`${inputCls} pl-10`} />
              </div>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {hits.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => choose(s)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-blue-50">
                      {s.photo_path
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${UPLOAD_BASE}/${s.photo_path}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                        : <span className="h-10 w-10 rounded-full bg-gray-200" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{s.name}</span>
                        <span className="block text-xs text-gray-500">{s.student_id} · {s.class}{s.student_group ? ` · ${s.student_group}` : ''}</span>
                      </span>
                      <span className="text-xs text-gray-500">{s.docs} picture{s.docs === 1 ? '' : 's'}</span>
                    </button>
                  </li>
                ))}
                {!hits.length && <li className="px-3 py-6 text-center text-sm text-gray-500">No students found.</li>}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-500">{student.student_id} · {student.class}{student.student_group ? ` · ${student.student_group}` : ''}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setStudent(null); setDocs([]) }}>Change student</Button>
              </CardContent>
            </Card>

            {canUpload && (APP_MODE ? (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <h3 className="font-semibold text-gray-900">Add a picture</h3>
                  <label className="block text-sm font-medium text-gray-700">What is it?
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className={`${inputCls} mt-1`}>
                      {types.filter((t) => t !== 'Other').map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value="__other">Other (type it)…</option>
                    </select>
                  </label>
                  {docType === '__other' && <input value={customType} onChange={(e) => setCustomType(e.target.value)} maxLength={60} placeholder="e.g. Transfer Certificate" aria-label="Picture type" className={inputCls} />}
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Note (optional), e.g. receipt no. 1234" aria-label="Note" className={inputCls} />
                  <ImagePicker onFiles={upload} disabled={!!progress} />
                  {progress && <p className="text-center text-sm text-blue-700">{progress}</p>}
                </CardContent>
              </Card>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600"><Smartphone className="h-4 w-4" /> Add pictures from the MJADC mobile app.</p>
            ))}

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">Saved pictures ({docs.length})</h3>
                  {docTypes.length > 1 && (
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type" className="h-9 rounded-lg border border-gray-300 px-2 text-sm">
                      <option value="">All types</option>
                      {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
                {shown.length ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {shown.map((d) => (
                      <li key={d.id} className="overflow-hidden rounded-xl border border-gray-200">
                        <AuthImage path={`/student-docs/file/${d.id}`} alt={d.doc_type} className="aspect-[3/4] w-full" onClick={() => { setEditing(null); setViewing(d) }} />
                        <div className="p-2">
                          <p className="truncate text-sm font-medium text-gray-900">{d.doc_type}</p>
                          {d.note && <p className="truncate text-xs text-gray-600">{d.note}</p>}
                          <p className="text-xs text-gray-400">{when(d.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="py-6 text-center text-sm text-gray-500">No pictures saved for this student yet.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {viewing && student && (
        <ImageViewer
          path={`/student-docs/file/${viewing.id}`}
          title={`${viewing.doc_type} — ${student.name}`}
          subtitle={[viewing.note, `by ${viewing.uploader || '—'} · ${when(viewing.created_at)}`].filter(Boolean).join(' · ')}
          filename={`${student.student_id}-${viewing.doc_type.replace(/\s+/g, '-')}-${viewing.id}.jpg`}
          onClose={() => { setViewing(null); setEditing(null) }}
          actions={admin && (editing ? (
            <span className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
              <input value={editing.doc_type} onChange={(e) => setEditing({ ...editing, doc_type: e.target.value })} aria-label="Type" className="h-9 rounded border border-gray-300 px-2 text-sm" />
              <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} aria-label="Note" placeholder="Note" className="h-9 rounded border border-gray-300 px-2 text-sm" />
              <Button size="sm" onClick={saveEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </span>
          ) : (
            <>
              <button type="button" onClick={() => setEditing({ doc_type: viewing.doc_type, note: viewing.note || '' })} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white"><Pencil className="h-4 w-4" /> Edit</button>
              <button type="button" onClick={() => remove(viewing)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><Trash2 className="h-4 w-4" /> Delete</button>
            </>
          ))}
        />
      )}
    </PanelLayout>
  )
}
