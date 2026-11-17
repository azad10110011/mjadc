'use client'

// Take / edit class attendance (Session 79) — shared by Teacher → Attendance and Admin → Attendance.
// • Any date: date box + ◀ Prev / Today / Next ▶ + list of dates already taken (click to reopen).
//   The list reloads automatically when subject/class/date change, so Save always writes the shown day.
//   (Before, changing the date after Load and pressing Save copied the old day's marks to the new date.)
// • Quick entry: type IDs separated by commas — "5" Humanities, "b7" Business, "s3" Science,
//   ranges "s1-5", full IDs — then mark them Present or Absent (everyone else gets the opposite).
// • All Present / All Absent, per-student toggles, search, unsaved-changes guard, stats.

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { parseQuickEntry, type QuickStudent } from '@/lib/attendanceQuickEntry'
import { Check, X, Save, BarChart3, ChevronLeft, ChevronRight, CalendarDays, Zap, Search, Users } from 'lucide-react'

type Status = 'present' | 'absent'
interface TakenDate { date: string; present: string | number; absent: string | number }
interface StatsRecord { student_id: string; name: string; total_classes: number; attended: number; percentage: number }
interface Teacher { id: number; name: string; subjects: string[] }

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => ymd(new Date())
const shiftDate = (s: string, days: number) => {
  const [y, m, d] = s.split('-').map(Number)
  return ymd(new Date(y, m - 1, d + days))
}
const niceDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export function AttendanceManager({ mode }: { mode: 'teacher' | 'admin' }) {
  const isAdmin = mode === 'admin'
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [cls, setCls] = useState('11th')
  const [date, setDate] = useState(today)

  const [students, setStudents] = useState<QuickStudent[]>([])
  const [attendance, setAttendance] = useState<Record<number, Status>>({})
  const [savedOnDate, setSavedOnDate] = useState(false)
  const [loadedKey, setLoadedKey] = useState('')
  const [loadError, setLoadError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [takenDates, setTakenDates] = useState<TakenDate[]>([])
  const [datesVersion, setDatesVersion] = useState(0)

  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [quickText, setQuickText] = useState('')
  const [quickMode, setQuickMode] = useState<Status>('present')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<StatsRecord[] | null>(null)

  const teacherParam = isAdmin && teacherId ? `&teacher_id=${teacherId}` : ''
  const ready = !!subject && !!cls && !!date && (!isAdmin || !!teacherId)
  const reqKey = ready ? `${teacherId}|${subject}|${cls}|${date}` : ''
  const loading = !!reqKey && loadedKey !== reqKey

  // subjects (teacher) / teachers (admin)
  useEffect(() => {
    if (isAdmin) {
      api.get<{ data: Teacher[] }>('/admin/attendance/teachers').then((r) => setTeachers(r.data || [])).catch(() => {})
    } else {
      api.get<{ data: string[] }>('/teacher/subjects').then((r) => {
        const subs = r.data || []
        setSubjects(subs)
        if (subs.length) setSubject(subs[0])
      }).catch(() => {})
    }
  }, [isAdmin])

  // students + that day's records — reloads whenever teacher/subject/class/date change
  useEffect(() => {
    if (!reqKey) return
    let alive = true
    const q = `subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(cls)}`
    Promise.all([
      api.get<{ data: QuickStudent[] }>(`/teacher/attendance/students?${q}`),
      api.get<{ data: Record<number, string> }>(`/teacher/attendance/records?${q}&date=${date}${teacherParam}`),
    ]).then(([sRes, aRes]) => {
      if (!alive) return
      const list = sRes.data || []
      const existing = aRes.data || {}
      const map: Record<number, Status> = {}
      for (const s of list) map[s.id] = existing[s.id] === 'absent' ? 'absent' : 'present'
      setStudents(list)
      setAttendance(map)
      setSavedOnDate(Object.keys(existing).length > 0)
      setDirty(false)
      setLoadError('')
      setLoadedKey(reqKey)
    }).catch((e: unknown) => {
      if (!alive) return
      setStudents([]); setAttendance({}); setLoadedKey(reqKey)
      setLoadError(e instanceof Error ? e.message : 'Failed to load students')
    })
    return () => { alive = false }
  }, [reqKey, subject, cls, date, teacherParam])

  // dates already taken for this teacher + subject + class
  useEffect(() => {
    if (!subject || !cls || (isAdmin && !teacherId)) return
    let alive = true
    api.get<{ data: TakenDate[] }>(`/teacher/attendance/dates?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(cls)}${teacherParam}`)
      .then((r) => { if (alive) setTakenDates(r.data || []) })
      .catch(() => { if (alive) setTakenDates([]) })
    return () => { alive = false }
  }, [subject, cls, teacherId, isAdmin, teacherParam, datesVersion])

  /** Switch context, asking first if there are unsaved marks. */
  const guard = (fn: () => void) => {
    if (dirty && !window.confirm('You have unsaved attendance changes. Discard them?')) return
    setNotice(''); setStats(null); fn()
  }

  const setAll = (status: Status) => {
    setAttendance(Object.fromEntries(students.map((s) => [s.id, status])))
    setDirty(true); setNotice('')
  }
  const toggle = (id: number) => {
    setAttendance((p) => ({ ...p, [id]: p[id] === 'present' ? 'absent' : 'present' }))
    setDirty(true); setNotice('')
  }

  const quick = useMemo(() => (quickText.trim() ? parseQuickEntry(quickText, students) : null), [quickText, students])
  const applyQuick = () => {
    if (!quick || quick.matched.length === 0) return
    const listed = new Set(quick.matched.map((s) => s.id))
    const other: Status = quickMode === 'present' ? 'absent' : 'present'
    setAttendance(Object.fromEntries(students.map((s) => [s.id, listed.has(s.id) ? quickMode : other])))
    setDirty(true)
    setNotice(`Applied: ${quick.matched.length} marked ${quickMode}, ${students.length - quick.matched.length} marked ${other}. Review and press Save.`)
  }

  const save = async () => {
    if (!ready || students.length === 0) return
    setSaving(true); setNotice('')
    try {
      await api.post('/teacher/attendance/save', {
        ...(isAdmin && { teacher_id: Number(teacherId) }),
        subject, class: cls, date,
        records: students.map((s) => ({ student_id: s.id, status: attendance[s.id] || 'present' })),
      })
      setDirty(false); setSavedOnDate(true); setDatesVersion((v) => v + 1)
      setNotice(`Saved attendance for ${niceDate(date)} — ${presentCount} present, ${absentCount} absent.`)
    } catch (e: unknown) {
      setNotice(e instanceof Error ? `Save failed: ${e.message}` : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const loadStats = async () => {
    try {
      const r = await api.get<{ data: StatsRecord[] }>(`/teacher/attendance/stats?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(cls)}${teacherParam}`)
      setStats(r.data || [])
    } catch { setStats([]) }
  }

  const presentCount = students.filter((s) => (attendance[s.id] || 'present') === 'present').length
  const absentCount = students.length - presentCount
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? students.filter((s) => s.name.toLowerCase().includes(q) || String(s.student_id).includes(q)) : students
  }, [students, search])
  const isFuture = date > today()

  const selectCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <PanelLayout role={isAdmin ? 'admin' : 'teacher'} title="Attendance">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* ---------- selection ---------- */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {isAdmin && (
                <div>
                  <label htmlFor="att-teacher" className="mb-1 block text-sm font-medium text-gray-700">Teacher</label>
                  <select id="att-teacher" className={selectCls} value={teacherId} onChange={(e) => guard(() => {
                    const t = teachers.find((x) => String(x.id) === e.target.value)
                    setTeacherId(e.target.value); setSubjects(t?.subjects || []); setSubject(t?.subjects?.[0] || '')
                  })}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name.trim()}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="att-subject" className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                <select id="att-subject" className={selectCls} value={subject} onChange={(e) => guard(() => setSubject(e.target.value))}>
                  <option value="">{subjects.length ? 'Select Subject' : 'No subjects assigned'}</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="att-class" className="mb-1 block text-sm font-medium text-gray-700">Class</label>
                <select id="att-class" className={selectCls} value={cls} onChange={(e) => guard(() => setCls(e.target.value))}>
                  <option value="11th">11th</option>
                  <option value="12th">12th</option>
                </select>
              </div>
              <div>
                <label htmlFor="att-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input id="att-date" type="date" className={selectCls} value={date}
                  onChange={(e) => e.target.value && guard(() => setDate(e.target.value))} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => guard(() => setDate(shiftDate(date, -1)))}><ChevronLeft className="h-4 w-4" /> Prev day</Button>
              <Button variant="secondary" size="sm" onClick={() => guard(() => setDate(today()))} disabled={date === today()}>Today</Button>
              <Button variant="secondary" size="sm" onClick={() => guard(() => setDate(shiftDate(date, 1)))}>Next day <ChevronRight className="h-4 w-4" /></Button>
              <span className="ml-1 text-sm font-medium text-gray-700">{niceDate(date)}</span>
              {isFuture && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Future date</span>}
              <span className="flex-1" />
              <Button variant="outline" size="sm" onClick={loadStats} disabled={!subject || (isAdmin && !teacherId)}>
                <BarChart3 className="mr-1 h-4 w-4" /> Stats
              </Button>
            </div>

            {takenDates.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" /> Already taken ({takenDates.length}) — click to open
                </p>
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                  {takenDates.map((d) => (
                    <button key={d.date} type="button" onClick={() => guard(() => setDate(d.date))}
                      title={`${d.present} present, ${d.absent} absent`}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${d.date === date ? 'border-blue-700 bg-blue-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                      {d.date.slice(8)}/{d.date.slice(5, 7)}/{d.date.slice(2, 4)} · {Number(d.present)}/{Number(d.present) + Number(d.absent)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!ready && (
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {isAdmin ? 'Select a teacher and subject to take attendance.' : 'Select a subject to take attendance.'}
          </p>
        )}
        {loadError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
        {ready && loading && <p className="text-sm text-gray-500">Loading students…</p>}

        {ready && !loading && students.length === 0 && !loadError && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">No students found for {subject} in {cls}.</p>
        )}

        {ready && !loading && students.length > 0 && (
          <>
            {/* ---------- quick entry ---------- */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Zap className="h-4 w-4 text-amber-500" /> Quick Entry</h3>
                <p className="text-xs text-gray-500">
                  Type student numbers separated by commas: <b>5</b> = Humanities, <b>b7</b> = Business, <b>s3</b> = Science
                  (capital B/S also work). Ranges like <b>s1-5</b> and full IDs work too.
                </p>
                <textarea value={quickText} onChange={(e) => setQuickText(e.target.value)} rows={2}
                  aria-label="Quick entry student numbers" placeholder="e.g. 5, 12, 23, b7, b9, s3"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-sm" role="radiogroup" aria-label="Typed students are">
                    {(['present', 'absent'] as const).map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={quickMode === m} onClick={() => setQuickMode(m)}
                        className={`px-3 py-1.5 font-medium ${quickMode === m ? (m === 'present' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        Typed = {m === 'present' ? 'Present' : 'Absent'}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={applyQuick} disabled={!quick || quick.matched.length === 0}>Apply</Button>
                  {quick && (
                    <span className="text-sm text-gray-600">
                      <b className="text-gray-900">{quick.matched.length}</b> matched · others will be {quickMode === 'present' ? 'absent' : 'present'}
                    </span>
                  )}
                </div>
                {quick && (quick.notFound.length > 0 || quick.invalid.length > 0) && (
                  <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {quick.notFound.length > 0 && <p>Not in this list: <b>{quick.notFound.join(', ')}</b></p>}
                    {quick.invalid.length > 0 && <p>Not understood: <b>{quick.invalid.join(', ')}</b> (use 5, b7, s3, s1-5 or a full ID)</p>}
                  </div>
                )}
                {quick && quick.matched.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {quick.matched.slice(0, 12).map((s) => `${s.student_id} ${s.name}`).join(' · ')}{quick.matched.length > 12 ? ` · +${quick.matched.length - 12} more` : ''}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ---------- list ---------- */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{subject} · {cls}</h3>
                    <p className="text-xs text-gray-500">
                      {niceDate(date)} · {savedOnDate ? 'saved before — editing' : 'not taken yet (everyone starts Present)'}
                      {dirty && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">unsaved changes</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1"><Users className="h-3.5 w-3.5" /> {students.length}</span>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">Present {presentCount}</span>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">Absent {absentCount}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAll('present')}><Check className="mr-1 h-4 w-4" /> All Present</Button>
                  <Button variant="secondary" size="sm" onClick={() => setAll('absent')}><X className="mr-1 h-4 w-4" /> All Absent</Button>
                  <div className="relative ml-auto w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students"
                      placeholder="Search name or ID" className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm" />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="w-12 px-3 py-2.5">SL</th>
                        <th className="px-3 py-2.5">Student ID</th>
                        <th className="px-3 py-2.5">Name</th>
                        <th className="w-32 px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visible.map((s, i) => {
                        const st = attendance[s.id] || 'present'
                        return (
                          <tr key={s.id} className={st === 'absent' ? 'bg-red-50/60' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-gray-700">{s.student_id}</td>
                            <td className="px-3 py-2 text-gray-900">{s.name}</td>
                            <td className="px-3 py-2 text-center">
                              <button type="button" onClick={() => toggle(s.id)} aria-label={`${s.name}: ${st}. Tap to change`}
                                className={`inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${st === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                {st === 'present' ? <><Check className="h-3 w-3" /> Present</> : <><X className="h-3 w-3" /> Absent</>}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {visible.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No match</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
                  <Button onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : <><Save className="mr-1 h-4 w-4" /> Save Attendance</>}
                  </Button>
                  <span className="text-sm text-gray-600">{niceDate(date)}: {presentCount} present, {absentCount} absent</span>
                </div>
                {notice && (
                  <p className={`rounded-lg px-3 py-2 text-sm ${notice.startsWith('Save failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>{notice}</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ---------- stats ---------- */}
        {stats && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 font-semibold text-gray-900">Attendance Statistics · {subject} · {cls}</h3>
              {stats.length === 0 ? <p className="text-sm text-gray-500">No attendance taken yet.</p> : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-3 py-2.5">Student ID</th><th className="px-3 py-2.5">Name</th>
                        <th className="px-3 py-2.5 text-center">Classes</th><th className="px-3 py-2.5 text-center">Attended</th>
                        <th className="px-3 py-2.5 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.map((s) => (
                        <tr key={s.student_id}>
                          <td className="px-3 py-2 font-mono text-gray-700">{s.student_id}</td>
                          <td className="px-3 py-2 text-gray-900">{s.name}</td>
                          <td className="px-3 py-2 text-center">{s.total_classes}</td>
                          <td className="px-3 py-2 text-center">{s.attended}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.percentage >= 75 ? 'bg-green-100 text-green-700' : s.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.percentage}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PanelLayout>
  )
}
