'use client'

// Board Exam Management › Board Routine (Session 99): date, time, subject code + name.
// A candidate sits a session when one of their imported subject codes (or names) matches.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtTime } from '@/lib/examPdf'
import { useBoardExam } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { Plus, Trash2, X, CalendarDays } from 'lucide-react'

interface Entry { id: number; exam_date: string; exam_time: string; subject_code: string; subject_name: string; candidates: number }
const longDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }

export default function BoardRoutinePage() {
  const { exams, exam, examId, setExamId, reload, loaded } = useBoardExam()
  const [rows, setRows] = useState<Entry[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ exam_date: '', exam_time: '10:00', subject_code: '', subject_name: '' })

  const load = useCallback(async () => {
    if (!examId) return
    try { setRows((await api.get<{ data: Entry[] }>(`/admin/board-exams/${examId}/routine`)).data || []) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); await Promise.all([load(), reload()]) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }
  const add = () => run(async () => {
    const r = await api.post<{ message: string }>(`/admin/board-exams/${examId}/routine`, form)
    setForm({ ...form, subject_code: '', subject_name: '' })
    return r.message
  })

  const days = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const r of rows) { const k = `${r.exam_date}|${r.exam_time}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r) }
    return [...m.entries()]
  }, [rows])

  return (
    <PanelLayout role="admin" title="Board Routine">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded} />
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}
        {exam && (
          <>
            <Card>
              <CardContent className="space-y-3 pt-6">
                <h2 className="text-base font-semibold text-gray-900">Add exam / paper</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_120px_120px_1fr_auto] lg:items-end">
                  <Input label="Date" type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                  <Input label="Time" type="time" value={form.exam_time} onChange={(e) => setForm({ ...form, exam_time: e.target.value })} />
                  <Input label="Subject code" value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value })} placeholder="e.g. 174" />
                  <Input label="Subject / paper name" value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} placeholder="e.g. Physics 1st Paper"
                    onKeyDown={(e) => { if (e.key === 'Enter' && form.exam_date) add() }} />
                  <Button onClick={add} disabled={busy || !form.exam_date || !(form.subject_code.trim() || form.subject_name.trim())}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                </div>
                <p className="text-xs text-gray-500">Several subjects on the same date and time form one session (e.g. Physics, Civics and Accounting 1st papers together). The candidate count shows how many imported candidates take each code.</p>
              </CardContent>
            </Card>
            {days.length === 0 && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No routine yet.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {days.map(([k, list]) => (
                <Card key={k}>
                  <CardContent className="pt-4">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-gray-900"><CalendarDays className="h-4 w-4 text-blue-700" /> {longDate(list[0].exam_date)} · {fmtTime(list[0].exam_time)}
                      <span className="ml-auto text-xs font-normal text-gray-500">{list.reduce((a, r) => a + r.candidates, 0)} candidate-papers</span></p>
                    <ul className="divide-y divide-gray-100 text-sm">
                      {list.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 py-1.5">
                          <span className="w-12 font-mono font-semibold text-blue-900">{r.subject_code || '—'}</span>
                          <span className="min-w-0 flex-1">{r.subject_name || <i className="text-gray-400">no name</i>}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${r.candidates ? 'bg-green-50 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.candidates} candidate(s)</span>
                          <button type="button" onClick={() => run(async () => (await api.delete<{ message: string }>(`/admin/board-routine/${r.id}`)).message)} aria-label={`Remove ${r.subject_code} ${r.subject_name}`} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </PanelLayout>
  )
}
