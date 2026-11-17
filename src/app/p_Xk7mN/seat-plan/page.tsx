'use client'

// Admin → Exam Management → Exam Seat Plan (Session 80, admin only).
// Tab 1 Rooms: add/edit/enable/disable rooms (columns × benches × seats, groups, seating rules, invigilators).
// Tab 2 Seat Plans: generate for an exam + classes, view room maps, download/print seat cards & door lists.

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { useExamNames, useGroups } from '@/lib/catalog'
import { benchesText, doorListPdf, finishPdf, loadLogo, seatCardsPdf, type RoomInfo, type SeatRow } from '@/lib/examPdf'
import { RoomLayout, doorLabel } from '@/components/seatplan/RoomLayout'
import { Plus, Pencil, Trash2, RefreshCw, Eye, FileDown, Printer, DoorOpen, LayoutGrid, AlertTriangle, Power } from 'lucide-react'

const GROUP_TONE: Record<string, string> = { Science: 'bg-sky-100 text-sky-900 border-sky-200', 'Business Studies': 'bg-amber-100 text-amber-900 border-amber-200', Humanities: 'bg-emerald-100 text-emerald-900 border-emerald-200' }
const EXTRA_TONES = ['bg-rose-100 text-rose-900 border-rose-200', 'bg-violet-100 text-violet-900 border-violet-200', 'bg-lime-100 text-lime-900 border-lime-200', 'bg-orange-100 text-orange-900 border-orange-200', 'bg-cyan-100 text-cyan-900 border-cyan-200']
/** Colour for a group; groups added by the admin get a stable colour from their name. */
const groupTone = (g: string) => GROUP_TONE[g] || (g ? EXTRA_TONES[[...g].reduce((a, c) => a + c.charCodeAt(0), 0) % EXTRA_TONES.length] : '')
const GENDER_LABEL: Record<string, string> = { mixed: 'Male & female mixed', male: 'Male only', female: 'Female only', separate: 'Male & female separately (never same bench)' }
const TEACHER_LABEL: Record<string, string> = { any: 'Any', male: 'Male teachers', female: 'Female teachers', mixed: 'Mixed (at least one of each)' }

interface Room extends RoomInfo {
  column_benches: number[]
  door_position: string
  total_benches: number
  enabled: boolean
  student_groups: string[]
  group_mode: 'mixed' | 'sequential'
  gender_mode: 'mixed' | 'male' | 'female' | 'separate'
  invigilators: number
  teacher_gender: 'any' | 'male' | 'female' | 'mixed'
  notes: string | null
  sort_order: number
}
interface Plan { id: number; name: string; year: string; exam_name: string; classes: string[]; warnings: string[]; generated_at: string | null; seated: number | string; rooms_used: number | string }

// column_benches: benches in each column — columns may differ (e.g. 10, 9, 10)
const emptyRoom = { name: '', enabled: true, column_benches: [10, 10, 10] as number[], door_position: 'front-right', seats_per_bench: 2, student_groups: [] as string[], group_mode: 'mixed', gender_mode: 'mixed', invigilators: 2, teacher_gender: 'any', notes: '', sort_order: 0 }
type RoomForm = typeof emptyRoom

export default function SeatPlanPage() {
  const GROUPS = useGroups()
  const EXAM_NAMES = useExamNames()
  const [tab, setTab] = useState<'rooms' | 'plans'>('rooms')
  const [rooms, setRooms] = useState<Room[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState<RoomForm | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)

  // new plan
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [classes, setClasses] = useState<string[]>(['12th'])
  const [examName, setExamName] = useState('')
  const [planName, setPlanName] = useState('')

  // viewer
  const [viewId, setViewId] = useState<number | null>(null)
  const [view, setView] = useState<{ plan: Plan; rooms: Room[]; seats: SeatRow[] } | null>(null)

  useEffect(() => {
    api.get<{ data: Room[] }>('/admin/seat-plan/rooms').then((r) => setRooms(r.data || [])).catch(() => {})
    api.get<{ data: Plan[] }>('/admin/seat-plan/plans').then((r) => setPlans(r.data || [])).catch(() => {})
  }, [version])

  useEffect(() => {
    if (!viewId) return
    let alive = true
    api.get<{ data: { plan: Plan; rooms: Room[]; seats: SeatRow[] } }>(`/admin/seat-plan/plans/${viewId}`)
      .then((r) => { if (alive) setView(r.data) })
      .catch((e: unknown) => alive && setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load plan' }))
    return () => { alive = false }
  }, [viewId, version])

  const examOptions = useMemo(() => {
    const names = new Set<string>()
    for (const c of classes) for (const e of EXAM_NAMES[c] || []) names.add(e)
    return [...names]
  }, [classes, EXAM_NAMES])

  const enabledCapacity = rooms.filter((r) => r.enabled).reduce((n, r) => n + r.capacity, 0)
  const totalBenches = form ? form.column_benches.reduce((a, b) => a + (Number(b) || 0), 0) : 0
  const capacity = form ? totalBenches * (Number(form.seats_per_bench) || 0) : 0
  const [sameAll, setSameAll] = useState('')
  const setColumns = (n: number) => form && setForm({
    ...form,
    column_benches: Array.from({ length: Math.max(1, Math.min(30, n || 1)) }, (_, i) => form.column_benches[i] ?? form.column_benches[form.column_benches.length - 1] ?? 10),
  })
  const setBench = (i: number, v: number) => form && setForm({ ...form, column_benches: form.column_benches.map((x, j) => (j === i ? v : x)) })

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); setVersion((v) => v + 1) }
    catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }

  const saveRoom = () => form && run(async () => {
    const body = { ...form, column_benches: form.column_benches.map((b) => Number(b)), seats_per_bench: Number(form.seats_per_bench), invigilators: Number(form.invigilators), sort_order: Number(form.sort_order) }
    if (editId) await api.put(`/admin/seat-plan/rooms/${editId}`, body)
    else await api.post('/admin/seat-plan/rooms', body)
    setForm(null); setEditId(null)
    return `Room "${form.name}" saved.`
  })

  const toggleRoom = (r: Room) => run(async () => {
    await api.put(`/admin/seat-plan/rooms/${r.id}`, { enabled: !r.enabled })
    return `${r.name} ${r.enabled ? 'disabled' : 'enabled'}.`
  })
  const deleteRoom = (r: Room) => {
    if (!confirm(`Delete room "${r.name}"?`)) return
    run(async () => { await api.delete(`/admin/seat-plan/rooms/${r.id}`); return `${r.name} deleted.` })
  }

  const createPlan = () => run(async () => {
    const r = await api.post<{ data: { id: number }; message: string }>('/admin/seat-plan/plans', { year, exam_name: examName, classes, name: planName })
    setViewId(r.data.id)
    return r.message
  })
  const regenerate = (p: Plan) => {
    if (!confirm(`Regenerate "${p.name}"? Current seats will be replaced using the current room settings.`)) return
    run(async () => { const r = await api.post<{ message: string }>(`/admin/seat-plan/plans/${p.id}/generate`, {}); setViewId(p.id); return r.message })
  }
  const deletePlan = (p: Plan) => {
    if (!confirm(`Delete seat plan "${p.name}"?`)) return
    run(async () => { await api.delete(`/admin/seat-plan/plans/${p.id}`); if (viewId === p.id) { setViewId(null); setView(null) } return 'Seat plan deleted.' })
  }

  const pdf = async (kind: 'cards' | 'door', mode: 'download' | 'print', roomId?: number) => {
    if (!view) return
    const logo = await loadLogo()
    const rs = roomId ? view.rooms.filter((r) => r.id === roomId) : view.rooms
    const ss = roomId ? view.seats.filter((s) => Number(s.room_id) === roomId) : view.seats
    const title = `${view.plan.exam_name} Examination ${view.plan.year} · Class ${view.plan.classes.join(' & ')}`
    const doc = kind === 'cards' ? seatCardsPdf(title, rs, ss, logo) : doorListPdf(title, rs, ss, logo)
    const slug = view.plan.name.replace(/[^a-z0-9]+/gi, '-')
    finishPdf(doc, `${kind === 'cards' ? 'Seat-Cards' : 'Door-List'}-${slug}${roomId ? '-' + (rs[0]?.name || '').replace(/\s+/g, '') : ''}.pdf`, mode)
  }

  const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <PanelLayout role="admin" title="Exam Seat Plan">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === 'rooms' ? 'primary' : 'outline'} onClick={() => setTab('rooms')}><DoorOpen className="mr-1 h-4 w-4" /> Rooms ({rooms.length})</Button>
          <Button variant={tab === 'plans' ? 'primary' : 'outline'} onClick={() => setTab('plans')}><LayoutGrid className="mr-1 h-4 w-4" /> Seat Plans ({plans.length})</Button>
        </div>
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

        {/* ======================= ROOMS ======================= */}
        {tab === 'rooms' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                {rooms.filter((r) => r.enabled).length} enabled room(s) · total capacity <b className="text-gray-900">{enabledCapacity}</b> seats
              </p>
              {!form && <Button onClick={() => { setForm({ ...emptyRoom, sort_order: rooms.length + 1 }); setEditId(null) }}><Plus className="mr-1 h-4 w-4" /> Add Room</Button>}
            </div>

            {form && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <h3 className="font-semibold text-gray-900">{editId ? `Edit ${form.name}` : 'New Room'}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Input label="Room number / name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Room 101" />
                    <Input label="Number of columns" type="number" min={1} max={30} value={form.column_benches.length} onChange={(e) => setColumns(Number(e.target.value))} />
                    <Input label="Students per bench" type="number" min={1} max={10} value={form.seats_per_bench} onChange={(e) => setForm({ ...form, seats_per_bench: Number(e.target.value) })} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">Benches in each column</p>
                    <div className="flex flex-wrap items-end gap-2">
                      {form.column_benches.map((b, i) => (
                        <label key={i} className="w-20 text-center text-xs text-gray-500">
                          Column {i + 1}
                          <input type="number" min={1} max={60} value={b} aria-label={`Benches in column ${i + 1}`}
                            onChange={(e) => setBench(i, Number(e.target.value))}
                            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </label>
                      ))}
                      <div className="ml-1 flex items-end gap-1.5 border-l border-gray-200 pl-3">
                        <label className="w-24 text-xs text-gray-500">
                          Same for all
                          <input type="number" min={1} max={60} value={sameAll} onChange={(e) => setSameAll(e.target.value)} aria-label="Same benches for all columns"
                            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm text-gray-900" />
                        </label>
                        <Button type="button" size="sm" variant="secondary" disabled={!Number(sameAll)}
                          onClick={() => setForm({ ...form, column_benches: form.column_benches.map(() => Number(sameAll)) })}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    Seating capacity: <b>({form.column_benches.join(' + ')}) benches × {form.seats_per_bench} = {capacity || 0}</b>
                  </p>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">Room layout &amp; door position <span className="font-normal text-gray-500">(live preview)</span></p>
                    <div className="mx-auto max-w-2xl px-3 py-2">
                      <RoomLayout columnBenches={form.column_benches} seatsPerBench={form.seats_per_bench} door={form.door_position}
                        onDoorChange={(p) => setForm({ ...form, door_position: p })} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">Student groups in this room <span className="font-normal text-gray-500">(none ticked = all groups)</span></p>
                    <div className="flex flex-wrap gap-2">
                      {GROUPS.map((g) => (
                        <label key={g} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                          <input type="checkbox" checked={form.student_groups.includes(g)}
                            onChange={(e) => setForm({ ...form, student_groups: e.target.checked ? [...form.student_groups, g] : form.student_groups.filter((x) => x !== g) })} /> {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Select label="Group arrangement" value={form.group_mode} onChange={(e) => setForm({ ...form, group_mode: e.target.value })}
                      options={[{ value: 'mixed', label: 'Mixed (groups alternate)' }, { value: 'sequential', label: 'Group-wise sequential' }]} />
                    <Select label="Male / female seating" value={form.gender_mode} onChange={(e) => setForm({ ...form, gender_mode: e.target.value })}
                      options={Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }))} />
                    <Input label="Invigilators needed" type="number" min={0} max={20} value={form.invigilators} onChange={(e) => setForm({ ...form, invigilators: Number(e.target.value) })} />
                    <Select label="Invigilator gender" value={form.teacher_gender} onChange={(e) => setForm({ ...form, teacher_gender: e.target.value })}
                      options={Object.entries(TEACHER_LABEL).map(([value, label]) => ({ value, label }))} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                    <div>
                      <label htmlFor="room-notes" className="mb-1 block text-sm font-medium text-gray-700">Other requirements / notes</label>
                      <textarea id="room-notes" rows={2} className={field} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. ground floor, needs a senior teacher" />
                    </div>
                    <Input label="Order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Room enabled (used when generating seat plans)
                  </label>
                  <div className="flex gap-2">
                    <Button onClick={saveRoom} disabled={busy}>{busy ? 'Saving…' : 'Save Room'}</Button>
                    <Button variant="ghost" onClick={() => { setForm(null); setEditId(null) }}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((r) => (
                <Card key={r.id} className={r.enabled ? '' : 'opacity-60'}>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.columns_count} columns · benches {benchesText(r)} ({r.total_benches}) · {r.seats_per_bench} per bench</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{r.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-3xl font-bold text-blue-900">{r.capacity} <span className="text-sm font-medium text-gray-500">seats</span></p>
                      <div className="ml-auto w-36 px-1 py-1"><RoomLayout size="sm" columnBenches={r.column_benches} seatsPerBench={r.seats_per_bench} door={r.door_position} /></div>
                    </div>
                    <dl className="space-y-1 text-sm">
                      <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Groups</dt><dd>{r.student_groups.length ? r.student_groups.join(', ') : 'All groups'}</dd></div>
                      <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Arrangement</dt><dd>{r.group_mode === 'mixed' ? 'Mixed' : 'Group-wise sequential'}</dd></div>
                      <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Students</dt><dd>{GENDER_LABEL[r.gender_mode]}</dd></div>
                      <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Door</dt><dd>{doorLabel(r.door_position)}</dd></div>
                      <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Invigilators</dt><dd>{r.invigilators} · {TEACHER_LABEL[r.teacher_gender]}</dd></div>
                      {r.notes && <div className="flex gap-2"><dt className="w-28 shrink-0 text-gray-500">Notes</dt><dd className="text-gray-700">{r.notes}</dd></div>}
                    </dl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => { setForm({ ...emptyRoom, ...r, column_benches: [...r.column_benches], notes: r.notes || '' }); setEditId(r.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleRoom(r)}><Power className="mr-1 h-3.5 w-3.5" /> {r.enabled ? 'Disable' : 'Enable'}</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteRoom(r)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rooms.length === 0 && !form && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No rooms yet. Add your examination rooms first.</p>}
            </div>
          </>
        )}

        {/* ======================= PLANS ======================= */}
        {tab === 'plans' && (
          <>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold text-gray-900">Generate a Seat Plan</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}
                    options={Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map((y) => ({ value: y, label: y }))} />
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-700">Classes sitting together</p>
                    <div className="flex gap-2">
                      {['11th', '12th'].map((c) => (
                        <label key={c} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                          <input type="checkbox" checked={classes.includes(c)} onChange={(e) => setClasses(e.target.checked ? [...classes, c] : classes.filter((x) => x !== c))} /> {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Select label="Exam" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Select exam"
                    options={examOptions.map((e) => ({ value: e, label: e }))} />
                  <Input label="Plan name (optional)" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="auto" />
                </div>
                <p className="text-xs text-gray-500">Uses all <b>enabled</b> rooms ({enabledCapacity} seats) with their group and gender rules.</p>
                <Button onClick={createPlan} disabled={busy || !examName || classes.length === 0}>{busy ? 'Generating…' : 'Generate Seat Plan'}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-3 font-semibold text-gray-900">Seat Plans</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Seated</th><th className="px-3 py-2">Rooms</th><th className="px-3 py-2">Generated</th><th className="px-3 py-2">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {plans.map((p) => (
                        <tr key={p.id} className={viewId === p.id ? 'bg-blue-50/60' : ''}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.warnings.length > 0 && <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> {p.warnings.length} warning(s)</p>}
                          </td>
                          <td className="px-3 py-2">{p.seated}</td>
                          <td className="px-3 py-2">{p.rooms_used}</td>
                          <td className="px-3 py-2 text-gray-500">{p.generated_at || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="secondary" onClick={() => setViewId(p.id)}><Eye className="mr-1 h-3.5 w-3.5" /> View</Button>
                              <Button size="sm" variant="secondary" onClick={() => regenerate(p)} disabled={busy}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate</Button>
                              <Button size="sm" variant="danger" onClick={() => deletePlan(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {plans.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No seat plans yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {view && viewId === view.plan.id && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{view.plan.name}</h3>
                      <p className="text-sm text-gray-500">{view.seats.length} students seated in {view.rooms.length} room(s)</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => pdf('cards', 'download')}><FileDown className="mr-1 h-4 w-4" /> Seat Cards PDF</Button>
                      <Button size="sm" variant="secondary" onClick={() => pdf('cards', 'print')}><Printer className="mr-1 h-4 w-4" /> Print Cards</Button>
                      <Button size="sm" onClick={() => pdf('door', 'download')}><FileDown className="mr-1 h-4 w-4" /> Door Lists PDF</Button>
                      <Button size="sm" variant="secondary" onClick={() => pdf('door', 'print')}><Printer className="mr-1 h-4 w-4" /> Print Door Lists</Button>
                    </div>
                  </div>
                  {view.plan.warnings.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {view.plan.warnings.map((w, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}</p>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {GROUPS.map((g) => <span key={g} className={`rounded border px-2 py-0.5 ${groupTone(g)}`}>{g}</span>)}
                    <span className="text-gray-500">♀ = female</span>
                  </div>

                  {view.rooms.map((room) => {
                    const list = view.seats.filter((s) => Number(s.room_id) === room.id)
                    const at = new Map(list.map((s) => [`${s.col_no}-${s.bench_no}-${s.seat_pos}`, s]))
                    return (
                      <div key={room.id} className="rounded-xl border border-gray-200 p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900">{room.name} <span className="text-sm font-normal text-gray-500">· {list.length}/{room.capacity} seats · {GENDER_LABEL[room.gender_mode]}</span></p>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => pdf('cards', 'download', room.id)}><FileDown className="mr-1 h-3.5 w-3.5" /> Cards</Button>
                            <Button size="sm" variant="secondary" onClick={() => pdf('door', 'download', room.id)}><FileDown className="mr-1 h-3.5 w-3.5" /> Door list</Button>
                          </div>
                        </div>
                        <div className="px-3 py-3">
                        <RoomLayout columnBenches={room.column_benches} seatsPerBench={room.seats_per_bench} door={room.door_position || 'front-right'}>
                        <div className="overflow-x-auto">
                          <div className="mx-auto flex w-max gap-4">
                            {Array.from({ length: room.columns_count }, (_, c) => (
                              <div key={c} className="space-y-1.5">
                                <p className="text-center text-xs font-semibold text-gray-500">Column {c + 1}</p>
                                {Array.from({ length: room.column_benches?.[c] ?? room.benches_per_column }, (_, b) => (
                                  <div key={b} className="flex gap-1 rounded-md border border-gray-300 bg-gray-50 p-1" title={`Bench ${b + 1}`}>
                                    {Array.from({ length: room.seats_per_bench }, (_, p) => {
                                      const s = at.get(`${c + 1}-${b + 1}-${p + 1}`)
                                      return s ? (
                                        <div key={p} title={`${s.name} · ${s.class} ${s.student_group} · Seat ${s.seat_no}`}
                                          className={`w-[68px] rounded border px-1 py-0.5 text-center text-[11px] leading-tight ${groupTone(s.student_group || '') || 'bg-white'}`}>
                                          <span className="block font-mono font-semibold">{s.student_id}</span>
                                          <span className="block text-[10px] opacity-75">#{s.seat_no}{s.gender === 'female' ? ' ♀' : ''}</span>
                                        </div>
                                      ) : <div key={p} className="w-[68px] rounded border border-dashed border-gray-300 py-2 text-center text-[10px] text-gray-400">empty</div>
                                    })}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        </RoomLayout>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
