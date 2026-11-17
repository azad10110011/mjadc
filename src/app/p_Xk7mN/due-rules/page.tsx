'use client'

// Internal Exam Management › Fee Due Rules (Session 100).
// 1. Which students subject teachers / exam controller can enter marks for (by fee status).
// 2. Whose result and marksheet are held (student panel, public result, QR verify, transcripts).
// 3. Check any exam: every student's exam-fee / tuition status and whether they are allowed / held.

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { useExamNames, useGroupOptions } from '@/lib/catalog'
import { DUE_FILTER_OPTIONS, DueBadges, type DueStatus } from '@/lib/dues'
import { Save, Search, ShieldAlert, PenLine, X } from 'lucide-react'

const MARK_OPTIONS = [
  { value: 'all', label: 'All students (no fee check)' },
  { value: 'exam_paid', label: 'Only students who paid the exam fee' },
  { value: 'tuition_paid', label: 'Only students with no tuition due' },
  { value: 'all_paid', label: 'Only students with all dues paid' },
]
const HOLD_OPTIONS = [
  { value: 'none', label: 'Do not hold any result' },
  { value: 'exam_due', label: 'Hold if exam fee is due' },
  { value: 'tuition_due', label: 'Hold if tuition fee is due' },
  { value: 'any_due', label: 'Hold if any fee is due' },
]
const ALL_GROUPS = [{ value: '', label: 'All Groups' }]
interface Row extends DueStatus { student_id: string; name: string; class_roll: string | null; group: string | null; mark_entry_allowed: boolean; held: boolean }
interface Preview { counts: Record<string, number>; exam_fee: number; students: Row[] }

export default function DueRulesPage() {
  const examNames = useExamNames()
  const groupOptions = useGroupOptions(ALL_GROUPS)
  const thisYear = new Date().getFullYear()
  const [rules, setRules] = useState({ mark_entry: 'all', result_hold: 'none' })
  const [saved, setSaved] = useState({ mark_entry: 'all', result_hold: 'none' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [year, setYear] = useState(String(thisYear))
  const [cls, setCls] = useState('12th')
  const [exam, setExam] = useState('')
  const [group, setGroup] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [show, setShow] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get<{ data: { settings: { mark_entry: string; result_hold: string } } }>('/admin/due-rules')
      .then((r) => { setRules(r.data.settings); setSaved(r.data.settings) }).catch(() => {})
  }, [])

  const exams = examNames[cls] || []
  const examValue = exams.includes(exam) ? exam : exams[0] || ''
  const dirty = rules.mark_entry !== saved.mark_entry || rules.result_hold !== saved.result_hold

  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.put<{ data: typeof rules; message: string }>('/admin/due-rules', rules)
      setSaved(r.data); setRules(r.data); setMsg({ ok: true, text: r.message })
      if (preview) void check()
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }
  const check = async () => {
    if (!examValue) return
    setBusy(true)
    try { setPreview((await api.post<{ data: Preview }>('/admin/due-rules/preview', { year: Number(year), class: cls, exam_name: examValue, group })).data) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Check failed' }) }
    finally { setBusy(false) }
  }

  const rows = useMemo(() => {
    if (!preview) return []
    const s = q.trim().toLowerCase()
    return preview.students.filter((r) => {
      if (s && !`${r.student_id} ${r.name}`.toLowerCase().includes(s)) return false
      switch (show) {
        case 'exam_paid': return r.exam_paid
        case 'tuition_paid': return r.tuition_clear
        case 'all_paid': return r.all_clear
        case 'exam_due': return !r.exam_paid
        case 'tuition_due': return !r.tuition_clear
        case 'any_due': return !r.all_clear
        case 'held': return r.held
        case 'blocked': return !r.mark_entry_allowed
        default: return true
      }
    })
  }, [preview, show, q])

  const c = preview?.counts
  return (
    <PanelLayout role="admin" title="Fee Due Rules">
      <div className="mx-auto max-w-6xl space-y-5">
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-1 flex items-center gap-2 font-semibold text-gray-900"><PenLine className="h-4 w-4 text-blue-700" /> Mark entry by subject teacher / exam controller</p>
                <p className="mb-3 text-xs text-gray-500">Teachers and the exam controller only see — and can only save marks for — these students. Admin can always enter marks for anyone (Result Management has its own &quot;Students&quot; dropdown).</p>
                <Select label="Allow mark entry for" value={rules.mark_entry} onChange={(e) => setRules({ ...rules, mark_entry: e.target.value })} options={MARK_OPTIONS} />
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-1 flex items-center gap-2 font-semibold text-gray-900"><ShieldAlert className="h-4 w-4 text-red-700" /> Hold result &amp; marksheet</p>
                <p className="mb-3 text-xs text-gray-500">Held students cannot see their result (student panel, public result search, QR verification) and are left out of transcript / marksheet printing. Released automatically as soon as the dues are paid.</p>
                <Select label="Hold rule" value={rules.result_hold} onChange={(e) => setRules({ ...rules, result_hold: e.target.value })} options={HOLD_OPTIONS} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={busy || !dirty}><Save className="mr-1 h-4 w-4" /> {dirty ? 'Save Rules' : 'Saved'}</Button>
              <p className="text-xs text-gray-500">Exam fee paid = paid + waived ≥ the exam&apos;s fee in Exam Fee Set. Tuition clear = no outstanding tuition / other fee up to this month.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-base font-semibold text-gray-900">Check students of an exam</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={Array.from({ length: 6 }, (_, i) => String(thisYear - 2 + i)).map((y) => ({ value: y, label: y }))} />
              <Select label="Class" value={cls} onChange={(e) => setCls(e.target.value)} options={[{ value: '12th', label: '12th' }, { value: '11th', label: '11th' }]} />
              <Select label="Exam" value={examValue} onChange={(e) => setExam(e.target.value)} options={exams.map((x) => ({ value: x, label: x }))} />
              <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={groupOptions} />
              <Button onClick={check} disabled={busy || !examValue}><Search className="mr-1 h-4 w-4" /> Check</Button>
            </div>
            {preview && c && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[['Students', c.total, 'bg-gray-50 text-gray-900'], ['Exam fee paid', c.exam_paid, 'bg-green-50 text-green-800'], ['Tuition clear', c.tuition_clear, 'bg-green-50 text-green-800'],
                    ['All dues paid', c.all_clear, 'bg-green-50 text-green-800'], ['Mark entry allowed', c.mark_entry_allowed, 'bg-blue-50 text-blue-800'], ['Result on hold', c.held, 'bg-red-50 text-red-700']].map(([l, v, t]) => (
                    <div key={String(l)} className={`rounded-xl p-3 text-center ${t}`}><p className="text-[11px] uppercase opacity-80">{l}</p><p className="text-2xl font-bold">{v}</p></div>
                  ))}
                </div>
                {!preview.exam_fee && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">No fee amount is set for this exam in Exam Fee Set — any payment counts as &quot;exam fee paid&quot;.</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID or name" aria-label="Search students" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-64" />
                  <select value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {DUE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    <option value="held">Result on hold</option>
                    <option value="blocked">Mark entry not allowed</option>
                  </select>
                  <span className="text-sm text-gray-500">Showing {rows.length}</span>
                </div>
                <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Group</th><th className="px-3 py-2">Exam fee</th><th className="px-3 py-2">Tuition due</th><th className="px-3 py-2">Mark entry</th><th className="px-3 py-2">Result</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((r) => (
                        <tr key={r.student_id}>
                          <td className="px-3 py-2"><span className="font-mono font-semibold">{r.student_id}</span> <span className="text-gray-700">{r.name}</span><DueBadges dues={r} compact /></td>
                          <td className="px-3 py-2 text-gray-600">{r.group || '—'}</td>
                          <td className="px-3 py-2">{r.exam_paid ? <span className="text-green-700">Paid ৳{Math.round(r.exam_paid_amount)}</span> : <span className="text-amber-700">Due{r.exam_due ? ` ৳${Math.round(r.exam_due)}` : ''}</span>}</td>
                          <td className="px-3 py-2">{r.tuition_clear ? <span className="text-green-700">—</span> : <span className="font-semibold text-red-700">৳{Math.round(r.tuition_due).toLocaleString('en-US')}</span>}</td>
                          <td className="px-3 py-2">{r.mark_entry_allowed ? <span className="text-green-700">Allowed</span> : <span className="text-gray-500">Not allowed</span>}</td>
                          <td className="px-3 py-2">{r.held ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">On hold</span> : <span className="text-green-700">Visible</span>}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No students</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
