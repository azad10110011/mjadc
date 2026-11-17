'use client'

// Admin → Exam Management → Hall Duty Allocation (Session 80, admin only).
// Settings (min/max duties, own-subject rule) → Generate → review date-wise / teacher-wise / room-wise,
// add / remove / pre-assign (fixed) duties, exclude teachers, per-teacher limits → Finalize.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { AlertTriangle, CheckCircle2, Lock, Unlock, Pin, PinOff, RefreshCw, X, Wand2, CalendarDays, Users, DoorOpen, ListOrdered, ArrowUp, ArrowDown, Save } from 'lucide-react'

interface PlanRow { id: number; name: string; finalized: string | number; duties: string | number }
type OwnRule = 'none' | 'avoid' | 'must'
interface Config { min_duties: number; max_duties: number; avoid_own_subject: boolean; own_subject_rule: OwnRule; finalized: boolean; finalized_at: string | null }
interface SessionRoom { room_id: number; name: string; need: number; teacher_gender: string; students: number }
interface Session { key: string; exam_date: string; exam_time: string; classes: string[]; subjects: string[]; rooms: SessionRoom[] }
// excluded = this exam only; disabled = all exams; off = either; priority = rank in the extra-duty list (1 = first)
interface Teacher { id: number; name: string; gender: string; designation: string; subject: string | null; excluded: boolean; disabled: boolean; off: boolean; priority: number | null; min_duties: number | null; max_duties: number | null }
interface Duty { id: number; exam_date: string; exam_time: string; room_id: number; teacher_id: number; fixed: boolean; room_name: string; teacher_name: string }
interface Data { plan: { id: number; name: string; config: Config }; sessions: Session[]; teachers: Teacher[]; duties: Duty[]; warnings: string[] }

const niceDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}
const TG: Record<string, string> = { any: 'any', male: 'male only', female: 'female only', mixed: 'male + female' }

export default function ExamDutyPage() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [planId, setPlanId] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [view, setView] = useState<'date' | 'teacher' | 'room' | 'priority'>('date')
  const [minD, setMinD] = useState('0')
  const [maxD, setMaxD] = useState('5')
  const [ownRule, setOwnRule] = useState<OwnRule>('avoid')
  const [prio, setPrio] = useState<number[]>([])
  const [prioDirty, setPrioDirty] = useState(false)
  const [asFixed, setAsFixed] = useState(false)
  const [tSearch, setTSearch] = useState('')

  useEffect(() => {
    api.get<{ data: PlanRow[] }>('/admin/exam-duty/plans').then((r) => {
      setPlans(r.data || [])
      setPlanId((p) => p || String(r.data?.[0]?.id || ''))
    }).catch(() => {})
  }, [version])

  useEffect(() => {
    if (!planId) return
    let alive = true
    api.get<{ data: Data }>(`/admin/exam-duty/${planId}`).then((r) => {
      if (!alive) return
      setData(r.data)
      setMinD(String(r.data.plan.config.min_duties)); setMaxD(String(r.data.plan.config.max_duties)); setOwnRule(r.data.plan.config.own_subject_rule || (r.data.plan.config.avoid_own_subject ? 'avoid' : 'none'))
      setPrio(r.data.teachers.filter((t) => t.priority !== null).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map((t) => t.id)); setPrioDirty(false)
    }).catch((e: unknown) => alive && setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }))
    return () => { alive = false }
  }, [planId, version])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); setVersion((v) => v + 1) }
    catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }

  const cfg = data?.plan.config
  const final = !!cfg?.finalized
  const tById = useMemo(() => new Map((data?.teachers || []).map((t) => [t.id, t])), [data])
  const count = useMemo(() => {
    const m = new Map<number, number>()
    for (const d of data?.duties || []) m.set(d.teacher_id, (m.get(d.teacher_id) || 0) + 1)
    return m
  }, [data])
  const cells = useMemo(() => {
    const m = new Map<string, Duty[]>()
    for (const d of data?.duties || []) {
      const k = `${d.exam_date}|${d.exam_time}|${d.room_id}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(d)
    }
    return m
  }, [data])
  const busyIn = useMemo(() => {
    const m = new Map<string, Set<number>>()
    for (const d of data?.duties || []) {
      const k = `${d.exam_date}|${d.exam_time}`
      if (!m.has(k)) m.set(k, new Set())
      m.get(k)!.add(d.teacher_id)
    }
    return m
  }, [data])
  const slots = (data?.sessions || []).reduce((n, s) => n + s.rooms.reduce((a, r) => a + r.need, 0), 0)
  const rooms = useMemo(() => {
    const m = new Map<number, string>()
    for (const s of data?.sessions || []) for (const r of s.rooms) m.set(r.room_id, r.name)
    return [...m.entries()]
  }, [data])

  const saveConfig = () => run(async () => {
    await api.put(`/admin/exam-duty/${planId}/config`, { ...data?.plan.config, min_duties: Number(minD), max_duties: Number(maxD), own_subject_rule: ownRule })
    return 'Settings saved.'
  })
  const generate = () => {
    if ((data?.duties.length || 0) > 0 && !confirm('Regenerate? Non-fixed duties will be replaced. Fixed (pre-assigned) duties are kept.')) return
    run(async () => (await api.post<{ message: string }>(`/admin/exam-duty/${planId}/generate`, {})).message)
  }
  const finalize = (v: boolean) => run(async () => (await api.post<{ message: string }>(`/admin/exam-duty/${planId}/finalize`, { finalized: v })).message)
  const addDuty = (s: Session, roomId: number, teacherId: string) => teacherId && run(async () => {
    await api.post(`/admin/exam-duty/${planId}/duties`, { exam_date: s.exam_date, exam_time: s.exam_time, room_id: roomId, teacher_id: Number(teacherId), fixed: asFixed })
    return `${tById.get(Number(teacherId))?.name} added${asFixed ? ' (pre-assigned, fixed)' : ''}.`
  })
  const removeDuty = (d: Duty) => run(async () => { await api.delete(`/admin/exam-duty/${planId}/duties/${d.id}`); return `${d.teacher_name} removed.` })
  const toggleFixed = (d: Duty) => run(async () => { await api.put(`/admin/exam-duty/${planId}/duties/${d.id}`, { fixed: !d.fixed }); return d.fixed ? 'Unpinned.' : 'Pinned as fixed — kept on regenerate.' })
  const saveTeacher = (t: Teacher, patch: Partial<Teacher>) => run(async () => {
    const next = { ...t, ...patch }
    await api.put(`/admin/exam-duty/${planId}/teachers/${t.id}`, { excluded: next.excluded, min_duties: next.min_duties, max_duties: next.max_duties })
    return `${t.name}: ${next.excluded ? 'excluded from duty' : 'rule saved'}.`
  })

  const setDisabled = (t: Teacher, disabled: boolean) => run(async () =>
    (await api.put<{ message: string }>(`/admin/exam-duty-settings/teachers/${t.id}`, { disabled })).message)
  const movePrio = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= prio.length) return
    const next = [...prio]; [next[i], next[j]] = [next[j], next[i]]
    setPrio(next); setPrioDirty(true)
  }
  const savePrio = () => run(async () => {
    const r = await api.put<{ message: string }>('/admin/exam-duty-settings/priority', { order: prio })
    setPrioDirty(false)
    return r.message
  })

  const eligibleFor = (s: Session) => (data?.teachers || [])
    .filter((t) => !t.off && !busyIn.get(`${s.exam_date}|${s.exam_time}`)?.has(t.id))
    .sort((a, b) => (count.get(a.id) || 0) - (count.get(b.id) || 0) || a.name.localeCompare(b.name))

  return (
    <PanelLayout role="admin" title="Hall Duty Allocation">
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr]">
              <Select label="Seat plan (exam)" value={planId} onChange={(e) => setPlanId(e.target.value)}
                options={plans.map((p) => ({ value: String(p.id), label: `${p.name}${Number(p.finalized) ? ' · finalized' : ''}` }))} placeholder={plans.length ? 'Select' : 'No seat plans — create one first'} />
              <Input label="Min duties / teacher" type="number" min={0} value={minD} onChange={(e) => setMinD(e.target.value)} disabled={final} />
              <Input label="Max duties / teacher" type="number" min={0} value={maxD} onChange={(e) => setMaxD(e.target.value)} disabled={final} />
              <Select label="Own subject's exam day" value={ownRule} onChange={(e) => setOwnRule(e.target.value as OwnRule)} disabled={final}
                options={[
                  { value: 'none', label: 'No rule' },
                  { value: 'avoid', label: 'No duty on own subject\'s exam day' },
                  { value: 'must', label: 'Must duty on own subject\'s exam day' },
                ]} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={saveConfig} disabled={busy || final || !data}>Save Settings</Button>
              <Button onClick={generate} disabled={busy || final || !data}>
                {(data?.duties.length || 0) > 0 ? <><RefreshCw className="mr-1 h-4 w-4" /> Regenerate</> : <><Wand2 className="mr-1 h-4 w-4" /> Generate Duties</>}
              </Button>
              {data && (final
                ? <Button variant="secondary" onClick={() => finalize(false)} disabled={busy}><Unlock className="mr-1 h-4 w-4" /> Re-open for changes</Button>
                : <Button variant="primary" onClick={() => finalize(true)} disabled={busy || !data.duties.length}><Lock className="mr-1 h-4 w-4" /> Finalize</Button>)}
              <span className="flex-1" />
              {data && final && <Link href={`/p_Xk7mN/duty-letters?plan=${planId}`} className="text-sm font-medium text-blue-700 hover:underline">Appointment letters →</Link>}
            </div>
            {plans.length === 0 && <p className="text-sm text-gray-600">Duties are allocated per seat plan. <Link href="/p_Xk7mN/seat-plan" className="text-blue-700 underline">Create a seat plan</Link> first.</p>}
          </CardContent>
        </Card>

        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Sessions</p><p className="text-2xl font-bold">{data.sessions.length}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Slots filled</p><p className="text-2xl font-bold">{data.duties.length}/{slots}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Teachers on duty</p><p className="text-2xl font-bold">{count.size}</p></div>
              <div className={`rounded-xl p-3 text-center ${final ? 'bg-green-600 text-white' : 'border border-amber-200 bg-amber-50 text-amber-900'}`}>
                <p className="text-xs uppercase opacity-80">Status</p><p className="text-lg font-bold">{final ? 'Finalized' : 'Draft'}</p>
              </div>
            </div>

            {data.warnings.length > 0 ? (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{data.warnings.length} rule warning(s)</p>
                {data.warnings.map((w, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</p>)}
              </div>
            ) : data.duties.length > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" /> All rules satisfied.</p>
            )}

            {data.sessions.length === 0 && (
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No exam routine found for this exam. Add dates in <Link href="/p_Xk7mN/exam-routine" className="underline">Exam Routine</Link>.</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={view === 'date' ? 'primary' : 'outline'} size="sm" onClick={() => setView('date')}><CalendarDays className="mr-1 h-4 w-4" /> Date-wise</Button>
              <Button variant={view === 'teacher' ? 'primary' : 'outline'} size="sm" onClick={() => setView('teacher')}><Users className="mr-1 h-4 w-4" /> Teacher-wise</Button>
              <Button variant={view === 'room' ? 'primary' : 'outline'} size="sm" onClick={() => setView('room')}><DoorOpen className="mr-1 h-4 w-4" /> Room-wise</Button>
              <Button variant={view === 'priority' ? 'primary' : 'outline'} size="sm" onClick={() => setView('priority')}><ListOrdered className="mr-1 h-4 w-4" /> Priority list ({prio.length})</Button>
              {view === 'date' && !final && (
                <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={asFixed} onChange={(e) => setAsFixed(e.target.checked)} /> Add as pre-assigned (fixed)
                </label>
              )}
            </div>

            {/* -------- date-wise -------- */}
            {view === 'date' && (
              <div className="space-y-3">
                {data.sessions.map((s) => (
                  <Card key={s.key}>
                    <CardContent className="pt-4">
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-gray-900">{niceDate(s.exam_date)}{s.exam_time ? ` · ${s.exam_time}` : ''} <span className="text-sm font-normal text-gray-500">· {s.classes.join(', ')}</span></p>
                        <p className="text-xs text-gray-500">{s.subjects.join(', ')}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {s.rooms.map((r) => {
                          const list = cells.get(`${s.exam_date}|${s.exam_time}|${r.room_id}`) || []
                          const short = list.length < r.need
                          return (
                            <div key={r.room_id} className={`rounded-lg border p-2.5 ${short ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}>
                              <p className="mb-1.5 flex justify-between text-sm"><b>{r.name}</b><span className={short ? 'text-amber-700' : 'text-gray-500'}>{list.length}/{r.need} · {TG[r.teacher_gender]}</span></p>
                              <ul className="space-y-1">
                                {list.map((d) => {
                                  const t = tById.get(d.teacher_id)
                                  return (
                                    <li key={d.id} className="flex items-center gap-1.5 rounded bg-white px-2 py-1 text-sm shadow-sm ring-1 ring-gray-100">
                                      {d.fixed && <Pin className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-label="fixed" />}
                                      <span className="min-w-0 flex-1 truncate">{d.teacher_name} <span className="text-xs text-gray-400">{t?.gender === 'female' ? '♀' : '♂'} · {count.get(d.teacher_id)}</span></span>
                                      {!final && (
                                        <>
                                          <button type="button" onClick={() => toggleFixed(d)} className="rounded p-0.5 text-gray-400 hover:text-blue-700" aria-label={d.fixed ? 'Unpin' : 'Pin as fixed'} title={d.fixed ? 'Unpin' : 'Pin as fixed (kept on regenerate)'}>
                                            {d.fixed ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                          </button>
                                          <button type="button" onClick={() => removeDuty(d)} className="rounded p-0.5 text-gray-400 hover:text-red-600" aria-label={`Remove ${d.teacher_name}`}><X className="h-3.5 w-3.5" /></button>
                                        </>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                              {!final && (
                                <select aria-label={`Add teacher to ${r.name}`} value="" onChange={(e) => addDuty(s, r.room_id, e.target.value)}
                                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700">
                                  <option value="">+ Add teacher…</option>
                                  {eligibleFor(s).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.gender === 'female' ? 'F' : 'M'}, {count.get(t.id) || 0} duties{t.subject ? `, ${t.subject}` : ''})</option>)}
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* -------- teacher-wise -------- */}
            {view === 'teacher' && (
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <input type="search" value={tSearch} onChange={(e) => setTSearch(e.target.value)} aria-label="Search teachers" placeholder="Search teacher"
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm sm:w-64" />
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr><th className="px-3 py-2">Teacher</th><th className="px-3 py-2">Duties</th><th className="px-3 py-2">Min / Max (blank = default)</th><th className="px-3 py-2">On duty</th><th className="px-3 py-2">Availability</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.teachers.filter((t) => !tSearch || t.name.toLowerCase().includes(tSearch.toLowerCase())).map((t) => {
                          const n = count.get(t.id) || 0
                          const min = t.min_duties ?? cfg!.min_duties, max = t.max_duties ?? cfg!.max_duties
                          const mine = data.duties.filter((d) => d.teacher_id === t.id)
                          return (
                            <tr key={t.id} className={t.off ? 'bg-gray-50 text-gray-400' : ''}>
                              <td className="px-3 py-2">
                                <p className="font-medium">{t.name}{t.priority !== null && <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">Priority {t.priority}</span>}</p>
                                <p className="text-xs text-gray-500">{t.designation}{t.subject ? ` · ${t.subject}` : ''} · {t.gender}</p>
                              </td>
                              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.off ? 'bg-gray-100' : n < min ? 'bg-amber-100 text-amber-800' : n > max ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>{n}</span></td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <input type="number" min={0} aria-label={`${t.name} minimum`} placeholder={String(cfg!.min_duties)} defaultValue={t.min_duties ?? ''} disabled={final}
                                    onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== t.min_duties) saveTeacher(t, { min_duties: v }) }}
                                    className="w-14 rounded border border-gray-300 px-1.5 py-1 text-xs" />
                                  <span>/</span>
                                  <input type="number" min={0} aria-label={`${t.name} maximum`} placeholder={String(cfg!.max_duties)} defaultValue={t.max_duties ?? ''} disabled={final}
                                    onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== t.max_duties) saveTeacher(t, { max_duties: v }) }}
                                    className="w-14 rounded border border-gray-300 px-1.5 py-1 text-xs" />
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">{mine.map((d) => `${niceDate(d.exam_date)} ${d.room_name}${d.fixed ? ' 📌' : ''}`).join(' · ') || '—'}</td>
                              <td className="px-3 py-2">
                                <label className="flex items-center gap-1.5 whitespace-nowrap text-xs" title="Not available for any exam until turned off">
                                  <input type="checkbox" checked={t.disabled} disabled={busy} onChange={(e) => setDisabled(t, e.target.checked)} /> <span className={t.disabled ? 'font-semibold text-red-700' : ''}>Disabled (all exams)</span>
                                </label>
                                <label className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs" title="Not available for this exam only">
                                  <input type="checkbox" checked={t.excluded} disabled={final || busy} onChange={(e) => saveTeacher(t, { excluded: e.target.checked })} /> Excluded (this exam)
                                </label>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500"><b>Disabled</b> = no exam duty in any exam (e.g. on leave). <b>Excluded</b> = no duty in this exam only. Changes apply on the next Generate.</p>
                </CardContent>
              </Card>
            )}

            {/* -------- priority list -------- */}
            {view === 'priority' && (
              <Card>
                <CardContent className="space-y-4 pt-5">
                  <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    Every teacher first gets the <b>minimum</b> duties. When more invigilators are needed than that, the <b>extra duties</b> go to
                    the teachers in this list — top first, each up to their maximum — and only then to everyone else. The list applies to all exams.
                  </div>
                  <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {prio.map((id, i) => {
                      const t = tById.get(id)
                      return (
                        <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-gray-900">{t?.name || `Teacher #${id}`}</span>
                            <span className="block text-xs text-gray-500">{t?.designation}{t?.subject ? ` · ${t.subject}` : ''} · {count.get(id) || 0} duties in this exam{t?.off ? ' · not available' : ''}</span>
                          </span>
                          <button type="button" onClick={() => movePrio(i, -1)} disabled={i === 0} aria-label={`Move ${t?.name} up`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => movePrio(i, 1)} disabled={i === prio.length - 1} aria-label={`Move ${t?.name} down`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => { setPrio(prio.filter((x) => x !== id)); setPrioDirty(true) }} aria-label={`Remove ${t?.name} from priority list`} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                    {prio.length === 0 && <li className="px-3 py-5 text-center text-sm text-gray-500">No teachers in the priority list — extra duties are shared equally.</li>}
                  </ol>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Add teacher to priority list" value="" onChange={(e) => { if (e.target.value) { setPrio([...prio, Number(e.target.value)]); setPrioDirty(true) } }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-80">
                      <option value="">+ Add teacher to the list…</option>
                      {data.teachers.filter((t) => !prio.includes(t.id) && !t.disabled).map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>)}
                    </select>
                    <Button onClick={savePrio} disabled={busy || !prioDirty}><Save className="mr-1 h-4 w-4" /> {prioDirty ? 'Save priority list' : 'Saved'}</Button>
                    {prioDirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
                  </div>
                  <p className="text-xs text-gray-500">After saving, press <b>Regenerate</b> to apply it to this exam.</p>
                </CardContent>
              </Card>
            )}

            {/* -------- room-wise -------- */}
            {view === 'room' && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rooms.map(([rid, name]) => (
                  <Card key={rid}>
                    <CardContent className="pt-4">
                      <p className="mb-2 font-semibold text-gray-900">{name}</p>
                      <ul className="space-y-1.5 text-sm">
                        {data.sessions.filter((s) => s.rooms.some((r) => r.room_id === rid)).map((s) => (
                          <li key={s.key} className="flex gap-2">
                            <span className="w-24 shrink-0 text-gray-500">{niceDate(s.exam_date)}</span>
                            <span>{(cells.get(`${s.exam_date}|${s.exam_time}|${rid}`) || []).map((d) => d.teacher_name).join(', ') || <i className="text-amber-700">none</i>}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
