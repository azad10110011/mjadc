'use client'

// Teacher › Result Image Upload (Session 123, mobile app menu). Photograph result sheets (camera or gallery)
// and save them against year + class + exam + one of the teacher's subjects. The teacher sees and can delete
// only their own pictures; admin and the Exam Controller see everyone's (Admin › Result Images).

import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { AuthImage, ImagePicker, ImageViewer } from '@/components/media/PrivateImages'
import { api } from '@/lib/api'
import { useExamNames } from '@/lib/catalog'

interface SubjectItem { key: string; label: string; subject_name: string; paper_name: string | null }
interface Pic { id: number; year: number; class: string; exam_name: string; subject: string; note: string | null; created_at: string }

const inputCls = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'
const when = (s: string) => { const d = new Date(s.replace(' ', 'T')); return isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

export default function TeacherResultImagesPage() {
  const EXAM_NAMES = useExamNames()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(String(thisYear))
  const [cls, setCls] = useState('')
  const [exam, setExam] = useState('')
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [subject, setSubject] = useState('')
  const [note, setNote] = useState('')
  const [pics, setPics] = useState<Pic[]>([])
  const [progress, setProgress] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [viewing, setViewing] = useState<Pic | null>(null)

  const loadPics = useCallback(() => {
    api.get<{ data: Pic[] }>('/result-images').then((r) => setPics(r.data)).catch(() => {})
  }, [])
  useEffect(() => { loadPics() }, [loadPics])

  useEffect(() => {
    if (!year || !cls || !exam) return
    let alive = true
    api.get<{ data: { subjects: SubjectItem[] } }>(`/teacher/results/exam-subjects?year=${year}&class=${encodeURIComponent(cls)}&exam_name=${encodeURIComponent(exam)}`)
      .then((r) => { if (alive) setSubjects(r.data.subjects || []) })
      .catch((e: unknown) => { if (alive) setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load your subjects' }) })
    return () => { alive = false }
  }, [year, cls, exam])

  const subjectValue = (s: SubjectItem) => (s.paper_name ? `${s.subject_name} - ${s.paper_name}` : s.subject_name)
  const ready = !!(year && cls && exam && subject)

  const upload = async (files: File[]) => {
    if (!ready) { setMsg({ ok: false, text: 'Choose year, class, exam and subject first.' }); return }
    let done = 0
    setMsg(null)
    for (const f of files) {
      setProgress(`Uploading ${done + 1} of ${files.length}…`)
      const fd = new FormData()
      fd.append('year', year); fd.append('class', cls); fd.append('exam_name', exam); fd.append('subject', subject)
      if (note.trim()) fd.append('note', note.trim())
      fd.append('image', f)
      try { await api.upload('/result-images', fd); done++ }
      catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Upload failed' }); break }
    }
    setProgress('')
    if (done) { setMsg({ ok: true, text: `${done} result picture(s) saved.` }); setNote(''); loadPics() }
  }

  const remove = async (p: Pic) => {
    if (!confirm('Delete this result picture?')) return
    try { await api.delete(`/result-images/${p.id}`); setViewing(null); setMsg({ ok: true, text: 'Picture deleted' }); loadPics() }
    catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  const years = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2]
  const shown = pics.filter((p) => (!cls || p.class === cls) && (!exam || p.exam_name === exam) && (!subject || p.subject === subject) && (!year || String(p.year) === year))

  return (
    <PanelLayout role="teacher" title="Result Image Upload">
      <div className="mx-auto max-w-3xl space-y-4">
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-medium text-gray-700">Year
                <select value={year} onChange={(e) => { setYear(e.target.value); setSubject('') }} className={`${inputCls} mt-1`}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Class
                <select value={cls} onChange={(e) => { setCls(e.target.value); setExam(''); setSubject(''); setSubjects([]) }} className={`${inputCls} mt-1`}>
                  <option value="">Choose</option><option value="11th">11th</option><option value="12th">12th</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">Exam
              <select value={exam} onChange={(e) => { setExam(e.target.value); setSubject(''); setSubjects([]) }} disabled={!cls} className={`${inputCls} mt-1`}>
                <option value="">{cls ? 'Choose exam' : 'Choose class first'}</option>
                {(EXAM_NAMES[cls] || []).map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Subject
              <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!exam} className={`${inputCls} mt-1`}>
                <option value="">{exam ? (subjects.length ? 'Choose subject' : 'No subjects assigned to you for this exam') : 'Choose exam first'}</option>
                {subjects.map((s) => <option key={s.key} value={subjectValue(s)}>{s.label}</option>)}
              </select>
            </label>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Note (optional), e.g. Section A, page 1" aria-label="Note" className={inputCls} />
            <ImagePicker onFiles={upload} disabled={!ready || !!progress} />
            {!ready && <p className="text-center text-xs text-gray-500">Choose year, class, exam and subject to take or add pictures.</p>}
            {progress && <p className="text-center text-sm text-blue-700">{progress}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold text-gray-900">My result pictures ({shown.length}{shown.length !== pics.length ? ` of ${pics.length}` : ''})</h3>
            {shown.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {shown.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl border border-gray-200">
                    <AuthImage path={`/result-images/file/${p.id}`} alt={p.subject} className="aspect-[3/4] w-full" onClick={() => setViewing(p)} />
                    <div className="p-2">
                      <p className="truncate text-sm font-medium text-gray-900">{p.subject}</p>
                      <p className="truncate text-xs text-gray-600">{p.exam_name} {p.year} · {p.class}</p>
                      <p className="text-xs text-gray-400">{when(p.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-6 text-center text-sm text-gray-500">No pictures yet{cls || exam || subject ? ' for this selection' : ''}.</p>}
          </CardContent>
        </Card>
      </div>

      {viewing && (
        <ImageViewer
          path={`/result-images/file/${viewing.id}`}
          title={viewing.subject}
          subtitle={`${viewing.exam_name} ${viewing.year} · ${viewing.class}${viewing.note ? ' · ' + viewing.note : ''}`}
          filename={`result-${viewing.exam_name}-${viewing.year}-${viewing.subject}-${viewing.id}.jpg`.replace(/\s+/g, '-')}
          onClose={() => setViewing(null)}
          actions={<button type="button" onClick={() => remove(viewing)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><Trash2 className="h-4 w-4" /> Delete</button>}
        />
      )}
    </PanelLayout>
  )
}
