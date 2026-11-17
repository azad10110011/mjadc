'use client'

// Board Exam Management › Board Exams & Venues (Session 99).
// Create a board exam (name + year + centre), then its venues; each venue has its own rooms
// (room numbers only need to be unique inside a venue). Venues can be limited to certain colleges.

import { useCallback, useEffect, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { benchesText } from '@/lib/examPdf'
import { useBoardExam, type BoardExam, type BoardRoom, type BoardVenue } from '@/lib/boardExam'
import { RoomLayout, doorLabel } from '@/components/seatplan/RoomLayout'
import { Plus, Pencil, Trash2, Power, Copy, MapPin, Building2, X } from 'lucide-react'

const GENDER_LABEL: Record<string, string> = { mixed: 'Male & female mixed', male: 'Male only', female: 'Female only', separate: 'Male & female separately (never same bench)' }
const TEACHER_LABEL: Record<string, string> = { any: 'Any', male: 'Male teachers', female: 'Female teachers', mixed: 'Mixed (at least one of each)' }
const emptyExam = { name: 'HSC Examination', year: new Date().getFullYear(), center_name: '', center_code: '', seat_mode: 'college_mixed', per_invigilator: 0, notes: '' }
const emptyRoom = { name: '', enabled: true, column_benches: [10, 10, 10] as number[], door_position: 'front-right', seats_per_bench: 2, gender_mode: 'mixed', invigilators: 2, teacher_gender: 'any', notes: '', sort_order: 0 }
type ExamForm = typeof emptyExam
type RoomForm = typeof emptyRoom
type Msg = { ok: boolean; text: string } | null
const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function BoardExamsPage() {
  const { exams, exam, examId, setExamId, reload, loaded } = useBoardExam()
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const [examForm, setExamForm] = useState<ExamForm | null>(null)
  const [editExamId, setEditExamId] = useState<number | null>(null)
  const [copyFrom, setCopyFrom] = useState('')

  const [venues, setVenues] = useState<BoardVenue[]>([])
  const [colleges, setColleges] = useState<Record<string, number>>({})
  const [venueForm, setVenueForm] = useState<{ id: number | null; name: string; address: string; colleges: string[]; sort_order: number } | null>(null)
  const [collegeInput, setCollegeInput] = useState('')
  const [roomForm, setRoomForm] = useState<(RoomForm & { venue_id: number; id: number | null }) | null>(null)
  const [sameAll, setSameAll] = useState('')

  const loadVenues = useCallback(async () => {
    if (!examId) { setVenues([]); return }
    try {
      const r = await api.get<{ data: { venues: BoardVenue[]; colleges: Record<string, number> } }>(`/admin/board-exams/${examId}/venues`)
      setVenues(r.data.venues || []); setColleges(r.data.colleges || {})
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load venues' }) }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void loadVenues(), 0); return () => clearTimeout(t) }, [loadVenues])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); await Promise.all([reload(), loadVenues()]) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }

  // ---------- exams ----------
  const saveExam = () => examForm && run(async () => {
    const body = { ...examForm, year: Number(examForm.year), per_invigilator: Number(examForm.per_invigilator) }
    if (editExamId) {
      const r = await api.put<{ message: string }>(`/admin/board-exams/${editExamId}`, body)
      setExamForm(null); setEditExamId(null); return r.message
    }
    const r = await api.post<{ data: BoardExam; message: string }>('/admin/board-exams', body)
    setExamForm(null); setExamId(r.data.id); return r.message
  })
  const deleteExam = (e: BoardExam) => {
    if (!confirm(`Delete ${e.name} ${e.year}? Its venues, rooms, candidates, routine, seat plan and duties are deleted too.`)) return
    run(async () => { const r = await api.delete<{ message: string }>(`/admin/board-exams/${e.id}`); setExamId(null); return r.message })
  }
  const copyVenues = () => copyFrom && examId && run(async () =>
    (await api.post<{ message: string }>(`/admin/board-exams/${examId}/copy-venues`, { from_exam_id: Number(copyFrom) })).message)

  // ---------- venues ----------
  const saveVenue = () => venueForm && examId && run(async () => {
    const body = { name: venueForm.name, address: venueForm.address, colleges: venueForm.colleges, sort_order: Number(venueForm.sort_order) }
    const r = venueForm.id
      ? await api.put<{ message: string }>(`/admin/board-venues/${venueForm.id}`, body)
      : await api.post<{ message: string }>(`/admin/board-exams/${examId}/venues`, body)
    setVenueForm(null); return r.message
  })
  const deleteVenue = (v: BoardVenue) => {
    if (!confirm(`Delete venue "${v.name}" and its ${v.rooms.length} room(s)?`)) return
    run(async () => (await api.delete<{ message: string }>(`/admin/board-venues/${v.id}`)).message)
  }
  const addCollege = (c: string) => {
    const v = c.trim()
    if (v && venueForm && !venueForm.colleges.includes(v)) setVenueForm({ ...venueForm, colleges: [...venueForm.colleges, v] })
    setCollegeInput('')
  }

  // ---------- rooms ----------
  const saveRoom = () => roomForm && run(async () => {
    const { venue_id, id, ...rest } = roomForm
    const body = { ...rest, column_benches: rest.column_benches.map(Number), seats_per_bench: Number(rest.seats_per_bench), invigilators: Number(rest.invigilators), sort_order: Number(rest.sort_order) }
    const r = id ? await api.put<{ message: string }>(`/admin/board-rooms/${id}`, body) : await api.post<{ message: string }>(`/admin/board-venues/${venue_id}/rooms`, body)
    setRoomForm(null); return r.message
  })
  const toggleRoom = (r: BoardRoom) => run(async () => { await api.put(`/admin/board-rooms/${r.id}`, { enabled: !r.enabled }); return `Room ${r.name} ${r.enabled ? 'disabled' : 'enabled'}.` })
  const deleteRoom = (r: BoardRoom) => { if (confirm(`Delete room ${r.name}?`)) run(async () => (await api.delete<{ message: string }>(`/admin/board-rooms/${r.id}`)).message) }
  const setColumns = (n: number) => roomForm && setRoomForm({ ...roomForm, column_benches: Array.from({ length: Math.max(1, Math.min(30, n || 1)) }, (_, i) => roomForm.column_benches[i] ?? roomForm.column_benches.at(-1) ?? 10) })

  const totalCapacity = venues.reduce((n, v) => n + v.capacity, 0)
  const candidates = Object.values(colleges).reduce((a, b) => a + b, 0)
  const roomCap = roomForm ? roomForm.column_benches.reduce((a, b) => a + (Number(b) || 0), 0) * (Number(roomForm.seats_per_bench) || 0) : 0

  return (
    <PanelLayout role="admin" title="Board Exams & Venues">
      <div className="space-y-5">
        {msg && (
          <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            <span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </p>
        )}

        {/* ================= exams ================= */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">Board Exams</h2>
              {!examForm && <Button onClick={() => { setExamForm({ ...emptyExam }); setEditExamId(null) }}><Plus className="mr-1 h-4 w-4" /> New Board Exam</Button>}
            </div>
            {examForm && (
              <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input label="Exam name" value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} placeholder="HSC Examination" />
                  <Input label="Year" type="number" value={examForm.year} onChange={(e) => setExamForm({ ...examForm, year: Number(e.target.value) })} />
                  <Input label="Centre name" value={examForm.center_name} onChange={(e) => setExamForm({ ...examForm, center_name: e.target.value })} placeholder="e.g. Miah Jinnah Alam Degree College Centre" />
                  <Input label="Centre code" value={examForm.center_code} onChange={(e) => setExamForm({ ...examForm, center_code: e.target.value })} />
                  <Select label="Seating" value={examForm.seat_mode} onChange={(e) => setExamForm({ ...examForm, seat_mode: e.target.value })}
                    options={[{ value: 'college_mixed', label: 'Mix colleges (neighbours from different colleges)' }, { value: 'roll', label: 'Roll order (college blocks)' }]} />
                  <Input label="Candidates per invigilator" type="number" min={0} value={examForm.per_invigilator}
                    onChange={(e) => setExamForm({ ...examForm, per_invigilator: Number(e.target.value) })} />
                  <div className="sm:col-span-2">
                    <label htmlFor="exam-notes" className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <input id="exam-notes" className={field} value={examForm.notes} onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Candidates per invigilator: 0 = use each room&apos;s own invigilator number; e.g. 25 = one invigilator for every 25 candidates sitting in a room that day.</p>
                <div className="flex gap-2">
                  <Button onClick={saveExam} disabled={busy}>{editExamId ? 'Save Exam' : 'Create Exam'}</Button>
                  <Button variant="ghost" onClick={() => { setExamForm(null); setEditExamId(null) }}>Cancel</Button>
                </div>
              </div>
            )}
            {loaded && exams.length === 0 && !examForm && <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">No board exams yet. Create one (e.g. HSC Examination {new Date().getFullYear()}).</p>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {exams.map((e) => (
                <button key={e.id} type="button" onClick={() => setExamId(e.id)}
                  className={`rounded-xl border p-3 text-left transition ${e.id === examId ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  <p className="font-semibold text-gray-900">{e.name} {e.year}</p>
                  <p className="text-xs text-gray-500">{e.center_name || 'Centre not set'}{e.center_code ? ` · Code ${e.center_code}` : ''}</p>
                  <p className="mt-1 text-xs text-gray-600">{e.venues} venue(s) · {e.rooms} room(s) · {e.candidates} candidate(s) · {e.seated} seated</p>
                </button>
              ))}
            </div>
            {exam && !examForm && (
              <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                <Button size="sm" variant="secondary" onClick={() => { setExamForm({ name: exam.name, year: exam.year, center_name: exam.center_name || '', center_code: exam.center_code || '', seat_mode: exam.seat_mode, per_invigilator: exam.per_invigilator, notes: exam.notes || '' }); setEditExamId(exam.id) }}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit {exam.name} {exam.year}
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteExam(exam)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                {exams.length > 1 && (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <select aria-label="Copy venues from" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                      <option value="">Copy venues &amp; rooms from…</option>
                      {exams.filter((e) => e.id !== examId).map((e) => <option key={e.id} value={e.id}>{e.name} {e.year}</option>)}
                    </select>
                    <Button size="sm" variant="secondary" onClick={copyVenues} disabled={!copyFrom || busy}><Copy className="mr-1 h-3.5 w-3.5" /> Copy</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= venues ================= */}
        {exam && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Venues of {exam.name} {exam.year}</h2>
                <p className={`text-sm ${candidates > totalCapacity ? 'text-red-700' : 'text-gray-600'}`}>
                  Enabled capacity <b>{totalCapacity}</b> seats for <b>{candidates}</b> candidate(s){candidates > totalCapacity ? ' — not enough seats' : ''}
                </p>
              </div>
              {!venueForm && <Button onClick={() => setVenueForm({ id: null, name: '', address: '', colleges: [], sort_order: venues.length + 1 })}><Plus className="mr-1 h-4 w-4" /> Add Venue</Button>}
            </div>

            {venueForm && (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <h3 className="font-semibold text-gray-900">{venueForm.id ? `Edit ${venueForm.name}` : 'New Venue'}</h3>
                  <div className="grid gap-3 sm:grid-cols-[2fr_3fr_100px]">
                    <Input label="Venue name" value={venueForm.name} onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} placeholder="e.g. Main Campus" />
                    <Input label="Address" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} />
                    <Input label="Order" type="number" value={venueForm.sort_order} onChange={(e) => setVenueForm({ ...venueForm, sort_order: Number(e.target.value) })} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-700">Colleges seated here <span className="font-normal text-gray-500">(none = any college)</span></p>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {venueForm.colleges.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-2.5 pr-1 text-sm text-blue-900 ring-1 ring-blue-200">
                          {c}<button type="button" onClick={() => setVenueForm({ ...venueForm, colleges: venueForm.colleges.filter((x) => x !== c) })} aria-label={`Remove ${c}`} className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select aria-label="Add college from candidates" value="" onChange={(e) => addCollege(e.target.value)} className={`${field} sm:max-w-xs`}>
                        <option value="">+ College from imported candidates…</option>
                        {Object.entries(colleges).filter(([c]) => !venueForm.colleges.includes(c)).map(([c, n]) => <option key={c} value={c}>{c || '(no college)'} ({n})</option>)}
                      </select>
                      <input value={collegeInput} onChange={(e) => setCollegeInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCollege(collegeInput) } }}
                        placeholder="or type a college name and press Enter" className={field} aria-label="College name" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveVenue} disabled={busy || !venueForm.name.trim()}>Save Venue</Button>
                    <Button variant="ghost" onClick={() => setVenueForm(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {roomForm && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <h3 className="font-semibold text-gray-900">{roomForm.id ? `Edit Room ${roomForm.name}` : 'New Room'} · {venues.find((v) => v.id === roomForm.venue_id)?.name}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Input label="Room number / name" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. 101" />
                    <Input label="Number of columns" type="number" min={1} max={30} value={roomForm.column_benches.length} onChange={(e) => setColumns(Number(e.target.value))} />
                    <Input label="Candidates per bench" type="number" min={1} max={10} value={roomForm.seats_per_bench} onChange={(e) => setRoomForm({ ...roomForm, seats_per_bench: Number(e.target.value) })} />
                    <Input label="Order" type="number" value={roomForm.sort_order} onChange={(e) => setRoomForm({ ...roomForm, sort_order: Number(e.target.value) })} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">Benches in each column</p>
                    <div className="flex flex-wrap items-end gap-2">
                      {roomForm.column_benches.map((b, i) => (
                        <label key={i} className="w-20 text-center text-xs text-gray-500">Column {i + 1}
                          <input type="number" min={1} max={60} value={b} aria-label={`Benches in column ${i + 1}`}
                            onChange={(e) => setRoomForm({ ...roomForm, column_benches: roomForm.column_benches.map((x, j) => (j === i ? Number(e.target.value) : x)) })}
                            className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm text-gray-900" />
                        </label>
                      ))}
                      <div className="ml-1 flex items-end gap-1.5 border-l border-gray-200 pl-3">
                        <label className="w-24 text-xs text-gray-500">Same for all
                          <input type="number" min={1} max={60} value={sameAll} onChange={(e) => setSameAll(e.target.value)} aria-label="Same benches for all columns" className="mt-0.5 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm" />
                        </label>
                        <Button type="button" size="sm" variant="secondary" disabled={!Number(sameAll)} onClick={() => setRoomForm({ ...roomForm, column_benches: roomForm.column_benches.map(() => Number(sameAll)) })}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">Seating capacity: <b>({roomForm.column_benches.join(' + ')}) × {roomForm.seats_per_bench} = {roomCap}</b></p>
                  <div className="mx-auto max-w-2xl px-3 py-2">
                    <RoomLayout columnBenches={roomForm.column_benches} seatsPerBench={roomForm.seats_per_bench} door={roomForm.door_position} onDoorChange={(p) => setRoomForm({ ...roomForm, door_position: p })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select label="Male / female seating" value={roomForm.gender_mode} onChange={(e) => setRoomForm({ ...roomForm, gender_mode: e.target.value })} options={Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }))} />
                    <Input label="Invigilators needed" type="number" min={0} max={20} value={roomForm.invigilators} onChange={(e) => setRoomForm({ ...roomForm, invigilators: Number(e.target.value) })} />
                    <Select label="Invigilator gender" value={roomForm.teacher_gender} onChange={(e) => setRoomForm({ ...roomForm, teacher_gender: e.target.value })} options={Object.entries(TEACHER_LABEL).map(([value, label]) => ({ value, label }))} />
                  </div>
                  <div>
                    <label htmlFor="room-notes" className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <input id="room-notes" className={field} value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={roomForm.enabled} onChange={(e) => setRoomForm({ ...roomForm, enabled: e.target.checked })} /> Room enabled (used for seating)</label>
                  <div className="flex gap-2">
                    <Button onClick={saveRoom} disabled={busy || !roomForm.name.trim()}>Save Room</Button>
                    <Button variant="ghost" onClick={() => setRoomForm(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {venues.length === 0 && !venueForm && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No venues yet. Add the venues (exam centres / buildings) for this exam.</p>}
            {venues.map((v) => (
              <Card key={v.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-lg font-bold text-gray-900"><Building2 className="h-5 w-5 text-blue-700" /> {v.name}</p>
                      {v.address && <p className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" /> {v.address}</p>}
                      <p className="mt-1 text-sm text-gray-600">{v.rooms.length} room(s) · capacity <b>{v.capacity}</b> · {v.colleges.length ? <>colleges: <b>{v.colleges.join(', ')}</b></> : 'any college'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => { setRoomForm({ ...emptyRoom, venue_id: v.id, id: null, sort_order: v.rooms.length + 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Plus className="mr-1 h-3.5 w-3.5" /> Room</Button>
                      <Button size="sm" variant="secondary" onClick={() => setVenueForm({ id: v.id, name: v.name, address: v.address || '', colleges: v.colleges, sort_order: v.sort_order })}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteVenue(v)} aria-label={`Delete venue ${v.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {v.rooms.map((r) => (
                      <div key={r.id} className={`rounded-lg border border-gray-200 p-3 ${r.enabled ? '' : 'opacity-60'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-gray-900">Room {r.name} <span className="text-sm font-medium text-blue-900">· {r.capacity} seats</span></p>
                            <p className="text-xs text-gray-500">{r.columns_count} cols · benches {benchesText(r)} · {r.seats_per_bench}/bench</p>
                            <p className="text-xs text-gray-500">{GENDER_LABEL[r.gender_mode]} · {r.invigilators} invigilator(s) · door {doorLabel(r.door_position).toLowerCase()}</p>
                          </div>
                          <div className="w-24 shrink-0"><RoomLayout size="sm" columnBenches={r.column_benches} seatsPerBench={r.seats_per_bench} door={r.door_position} /></div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => { setRoomForm({ ...emptyRoom, ...r, notes: r.notes || '', column_benches: [...r.column_benches], venue_id: v.id, id: r.id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => toggleRoom(r)}><Power className="mr-1 h-3.5 w-3.5" /> {r.enabled ? 'Disable' : 'Enable'}</Button>
                          <Button size="sm" variant="danger" onClick={() => deleteRoom(r)} aria-label={`Delete room ${r.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                    {v.rooms.length === 0 && <p className="text-sm text-gray-500">No rooms yet — add the rooms of this venue.</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
