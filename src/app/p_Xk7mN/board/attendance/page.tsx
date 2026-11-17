'use client'

// Board Exam Management › Attendance Sheets (Session 99): for one exam day, a signature sheet per room
// listing only the candidates who sit that day's papers (seat, roll, reg. no, name, college, paper).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { finishPdf, fmtTime, loadLogo } from '@/lib/examPdf'
import { boardAttendancePdf, examTitle, useBoardExam, type BoardExam, type BoardSeat, type BoardVenue } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { FileDown, Printer, X, ClipboardCheck } from 'lucide-react'

interface Entry { exam_date: string; exam_time: string; subject_code: string; subject_name: string }
interface Att { exam: BoardExam; venues: BoardVenue[]; routine: Entry[]; seats: BoardSeat[] }
const niceDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) }

export default function BoardAttendancePage() {
  const { exams, exam, examId, setExamId, loaded } = useBoardExam()
  const [routine, setRoutine] = useState<Entry[]>([])
  const [session, setSession] = useState('')
  const [data, setData] = useState<Att | null>(null)
  const [venue, setVenue] = useState<number | 'all'>('all')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!examId) return
    let alive = true
    api.get<{ data: Entry[] }>(`/admin/board-exams/${examId}/routine`).then((r) => { if (alive) { setRoutine(r.data || []); setSession(''); setData(null) } }).catch(() => {})
    return () => { alive = false }
  }, [examId])

  const sessions = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const r of routine) { const k = `${r.exam_date}|${r.exam_time}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r) }
    return [...m.entries()]
  }, [routine])

  const load = useCallback(async (key: string) => {
    setSession(key); setData(null); setMsg(null)
    if (!key || !examId) return
    const [date, time] = key.split('|')
    try { setData((await api.get<{ data: Att }>(`/admin/board-exams/${examId}/attendance?date=${date}&time=${encodeURIComponent(time)}`)).data) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
  }, [examId])

  const papers = data ? data.routine.map((r) => `${r.subject_code} ${r.subject_name}`.trim()) : []
  const shownVenues = (data?.venues || []).filter((v) => venue === 'all' || v.id === venue)
  const roomCount = (roomId: number) => data?.seats.filter((s) => s.room_id === roomId).length || 0

  const pdf = async (mode: 'download' | 'print', venueId?: number, roomId?: number) => {
    if (!data) return
    setBusy(true)
    try {
      const [date, time] = session.split('|')
      const vs = data.venues.filter((v) => (!venueId || v.id === venueId)).map((v) => ({ ...v, rooms: v.rooms.filter((r) => !roomId || r.id === roomId) }))
      const doc = boardAttendancePdf(data.exam, vs, data.seats, date, time, papers, await loadLogo())
      finishPdf(doc, `Attendance-${examTitle(data.exam)}-${date}${venueId ? '-' + vs[0]?.name : ''}${roomId ? '-Room-' + vs[0]?.rooms[0]?.name : ''}.pdf`.replace(/[^a-z0-9.-]+/gi, '-'), mode)
    } finally { setBusy(false) }
  }

  return (
    <PanelLayout role="admin" title="Board Attendance Sheets">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded} />
        {msg && <p role="status" className="flex items-start justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}
        {exam && (
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-6">
              <label className="min-w-0 flex-1 text-sm sm:max-w-md">
                <span className="mb-1 block font-medium text-gray-700">Exam day</span>
                <select value={session} onChange={(e) => void load(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">{sessions.length ? 'Select a date…' : 'No routine yet'}</option>
                  {sessions.map(([k, list]) => <option key={k} value={k}>{niceDate(list[0].exam_date)} · {fmtTime(list[0].exam_time)} — {list.map((r) => r.subject_code || r.subject_name).join(', ')}</option>)}
                </select>
              </label>
              {data && (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-gray-700">Venue</span>
                    <select value={venue} onChange={(e) => setVenue(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      <option value="all">All venues</option>
                      {data.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </label>
                  <Button onClick={() => pdf('download', venue === 'all' ? undefined : venue)} disabled={busy || !data.seats.length}><FileDown className="mr-1 h-4 w-4" /> Attendance PDF</Button>
                  <Button variant="secondary" onClick={() => pdf('print', venue === 'all' ? undefined : venue)} disabled={busy || !data.seats.length}><Printer className="mr-1 h-4 w-4" /> Print</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
        {data && (
          <>
            <p className="flex items-center gap-2 text-sm text-gray-700"><ClipboardCheck className="h-4 w-4 text-green-700" /> <b>{data.seats.length}</b> candidate(s) sit {papers.join(', ')}</p>
            {data.seats.length === 0 && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Nobody seated takes these papers. Check that the seat plan is generated and the candidates&apos; subject codes match the routine codes.</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shownVenues.flatMap((v) => v.rooms.filter((r) => roomCount(r.id) > 0).map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between gap-2 pt-4">
                    <div><p className="font-semibold text-gray-900">{v.name} · Room {r.name}</p><p className="text-sm text-gray-500">{roomCount(r.id)} candidate(s)</p></div>
                    <Button size="sm" variant="secondary" onClick={() => pdf('download', v.id, r.id)} disabled={busy} aria-label={`Attendance sheet ${v.name} room ${r.name}`}><FileDown className="h-3.5 w-3.5" /></Button>
                  </CardContent>
                </Card>
              )))}
            </div>
          </>
        )}
      </div>
    </PanelLayout>
  )
}
