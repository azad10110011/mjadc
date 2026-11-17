'use client'

// Board Exam Management › Board Seat Plan (Session 99): one fixed seat per candidate for the whole exam,
// across all venues. Colleges are mixed on a bench (or kept in roll order) as set on the exam.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { finishPdf, loadLogo } from '@/lib/examPdf'
import { boardDoorListPdf, boardSeatCardsPdf, examTitle, useBoardExam, type BoardExam, type BoardSeat, type BoardVenue } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { RoomLayout } from '@/components/seatplan/RoomLayout'
import { AlertTriangle, FileDown, Printer, Wand2, RefreshCw, X, Building2 } from 'lucide-react'

const TONES = ['bg-sky-100 text-sky-900 border-sky-200', 'bg-amber-100 text-amber-900 border-amber-200', 'bg-emerald-100 text-emerald-900 border-emerald-200', 'bg-rose-100 text-rose-900 border-rose-200', 'bg-violet-100 text-violet-900 border-violet-200', 'bg-lime-100 text-lime-900 border-lime-200', 'bg-orange-100 text-orange-900 border-orange-200', 'bg-cyan-100 text-cyan-900 border-cyan-200']

export default function BoardSeatPlanPage() {
  const { exams, exam, examId, setExamId, reload, loaded } = useBoardExam()
  const [data, setData] = useState<{ exam: BoardExam; venues: BoardVenue[]; seats: BoardSeat[]; candidates: number } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [venueFilter, setVenueFilter] = useState<number | 'all'>('all')

  const load = useCallback(async () => {
    if (!examId) return
    try { setData((await api.get<{ data: { exam: BoardExam; venues: BoardVenue[]; seats: BoardSeat[]; candidates: number } }>(`/admin/board-exams/${examId}/seats`)).data) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const generate = async () => {
    if (data?.seats.length && !confirm('Regenerate the seat plan? Every candidate gets a new seat (hall duties should be regenerated afterwards).')) return
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: (await api.post<{ message: string }>(`/admin/board-exams/${examId}/seats/generate`, {})).message }); await Promise.all([load(), reload()]) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Generation failed' }) }
    finally { setBusy(false) }
  }

  const tone = useMemo(() => {
    const colleges = [...new Set((data?.seats || []).map((s) => s.college))].sort()
    return new Map(colleges.map((c, i) => [c, TONES[i % TONES.length]]))
  }, [data])

  const pdf = async (kind: 'cards' | 'door', mode: 'download' | 'print', venueId?: number, roomId?: number) => {
    if (!data) return
    setBusy(true)
    try {
      const venues = data.venues.filter((v) => !venueId || v.id === venueId).map((v) => ({ ...v, rooms: v.rooms.filter((r) => !roomId || r.id === roomId) }))
      const ids = new Set(venues.flatMap((v) => v.rooms.map((r) => r.id)))
      const seats = data.seats.filter((s) => ids.has(s.room_id))
      const logo = await loadLogo()
      const doc = kind === 'cards' ? boardSeatCardsPdf(data.exam, venues, seats, logo) : boardDoorListPdf(data.exam, venues, seats, logo)
      const v = venueId ? `-${venues[0]?.name}` : ''
      const r = roomId ? `-Room-${venues[0]?.rooms[0]?.name}` : ''
      finishPdf(doc, `${kind === 'cards' ? 'Seat-Cards' : 'Door-Lists'}-${examTitle(data.exam)}${v}${r}.pdf`.replace(/[^a-z0-9.-]+/gi, '-'), mode)
    } finally { setBusy(false) }
  }

  const shownVenues = (data?.venues || []).filter((v) => venueFilter === 'all' || v.id === venueFilter)

  return (
    <PanelLayout role="admin" title="Board Seat Plan">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded}
          extra={exam && <Button onClick={generate} disabled={busy}>{data?.seats.length ? <><RefreshCw className="mr-1 h-4 w-4" /> Regenerate</> : <><Wand2 className="mr-1 h-4 w-4" /> Generate Seat Plan</>}</Button>} />
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Candidates</p><p className="text-2xl font-bold">{data.candidates}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Seated</p><p className={`text-2xl font-bold ${data.seats.length < data.candidates ? 'text-amber-700' : 'text-green-700'}`}>{data.seats.length}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Venues</p><p className="text-2xl font-bold">{data.venues.length}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">Seating</p><p className="text-sm font-bold">{data.exam.seat_mode === 'roll' ? 'Roll order' : 'Colleges mixed'}</p><p className="text-[11px] text-gray-500">{data.exam.seats_generated_at || 'not generated'}</p></div>
            </div>
            {data.exam.seat_warnings.length > 0 && (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {data.exam.seat_warnings.map((w, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}</p>)}
              </div>
            )}
            {data.seats.length > 0 && (
              <Card>
                <CardContent className="flex flex-wrap items-center gap-2 pt-5">
                  <select aria-label="Venue" value={venueFilter} onChange={(e) => setVenueFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="all">All venues</option>
                    {data.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <Button size="sm" onClick={() => pdf('cards', 'download', venueFilter === 'all' ? undefined : venueFilter)} disabled={busy}><FileDown className="mr-1 h-4 w-4" /> Seat Cards PDF</Button>
                  <Button size="sm" variant="secondary" onClick={() => pdf('cards', 'print', venueFilter === 'all' ? undefined : venueFilter)} disabled={busy}><Printer className="mr-1 h-4 w-4" /> Print Cards</Button>
                  <Button size="sm" onClick={() => pdf('door', 'download', venueFilter === 'all' ? undefined : venueFilter)} disabled={busy}><FileDown className="mr-1 h-4 w-4" /> Door Lists PDF</Button>
                  <Button size="sm" variant="secondary" onClick={() => pdf('door', 'print', venueFilter === 'all' ? undefined : venueFilter)} disabled={busy}><Printer className="mr-1 h-4 w-4" /> Print Door Lists</Button>
                  <div className="flex w-full flex-wrap gap-1.5 pt-1 text-xs">
                    {[...tone.entries()].map(([c, t]) => <span key={c} className={`rounded border px-2 py-0.5 ${t}`}>{c}</span>)}
                    <span className="text-gray-500">♀ = female</span>
                  </div>
                </CardContent>
              </Card>
            )}
            {data.venues.length === 0 && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No venues yet — add them in Board Exams &amp; Venues.</p>}

            {shownVenues.map((v) => (
              <div key={v.id} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Building2 className="h-5 w-5 text-blue-700" /> {v.name}
                  <span className="text-sm font-normal text-gray-500">· {data.seats.filter((s) => v.rooms.some((r) => r.id === s.room_id)).length}/{v.capacity} seats</span></h2>
                {v.rooms.filter((r) => r.enabled).map((room) => {
                  const list = data.seats.filter((s) => s.room_id === room.id)
                  const at = new Map(list.map((s) => [`${s.col_no}-${s.bench_no}-${s.seat_pos}`, s]))
                  return (
                    <Card key={room.id}>
                      <CardContent className="pt-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900">Room {room.name} <span className="text-sm font-normal text-gray-500">· {list.length}/{room.capacity} seats</span></p>
                          {list.length > 0 && (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="secondary" onClick={() => pdf('cards', 'download', v.id, room.id)} disabled={busy}><FileDown className="mr-1 h-3.5 w-3.5" /> Cards</Button>
                              <Button size="sm" variant="secondary" onClick={() => pdf('door', 'download', v.id, room.id)} disabled={busy}><FileDown className="mr-1 h-3.5 w-3.5" /> Door list</Button>
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-3">
                          <RoomLayout columnBenches={room.column_benches} seatsPerBench={room.seats_per_bench} door={room.door_position}>
                            <div className="overflow-x-auto">
                              <div className="mx-auto flex w-max gap-4">
                                {room.column_benches.map((n, c) => (
                                  <div key={c} className="space-y-1.5">
                                    <p className="text-center text-xs font-semibold text-gray-500">Column {c + 1}</p>
                                    {Array.from({ length: n }, (_, b) => (
                                      <div key={b} className="flex gap-1 rounded-md border border-gray-300 bg-gray-50 p-1">
                                        {Array.from({ length: room.seats_per_bench }, (_, p) => {
                                          const s = at.get(`${c + 1}-${b + 1}-${p + 1}`)
                                          return s ? (
                                            <div key={p} title={`${s.name} · ${s.college} · Seat ${s.seat_no}`} className={`w-[72px] rounded border px-1 py-0.5 text-center text-[11px] leading-tight ${tone.get(s.college) || 'bg-white'}`}>
                                              <span className="block font-mono font-semibold">{s.roll_no}</span>
                                              <span className="block text-[10px] opacity-75">#{s.seat_no}{s.gender === 'female' ? ' ♀' : ''}</span>
                                            </div>
                                          ) : <div key={p} className="w-[72px] rounded border border-dashed border-gray-300 py-2 text-center text-[10px] text-gray-400">empty</div>
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </RoomLayout>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
