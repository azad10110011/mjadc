'use client'

// Board Exam Management (Session 99): shared types, the selected-exam hook and the board PDFs.

import { useCallback, useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/api'
import { COLLEGE, benchesText, doorText, drawRoomMap, fmtTime, type RoomInfo, type SeatRow } from '@/lib/examPdf'

export interface BoardExam {
  id: number; name: string; year: number; center_name: string | null; center_code: string | null
  seat_mode: 'roll' | 'college_mixed'; per_invigilator: number; notes: string | null
  seat_warnings: string[]; seats_generated_at: string | null
  venues?: number; rooms?: number; candidates?: number; seated?: number; sessions?: number
}
export interface BoardRoom extends RoomInfo {
  venue_id: number; enabled: boolean; column_benches: number[]; total_benches: number; door_position: string
  gender_mode: 'mixed' | 'male' | 'female' | 'separate'; invigilators: number; teacher_gender: 'any' | 'male' | 'female' | 'mixed'
  notes: string | null; sort_order: number
}
export interface BoardVenue { id: number; name: string; address: string | null; colleges: string[]; sort_order: number; rooms: BoardRoom[]; capacity: number }
export interface BoardSeat {
  room_id: number; seat_no: number; col_no: number; bench_no: number; seat_pos: number
  candidate_id: number; roll_no: string; reg_no: string | null; name: string; college: string; group_name: string | null; gender: string | null
  subjects?: string[]; papers?: string[]
}

export const examTitle = (e: BoardExam) => `${e.name} ${e.year}`

const KEY = 'board_exam_id'
/** Board exams + the selected one (remembered across Board pages). */
export function useBoardExam() {
  const [exams, setExams] = useState<BoardExam[]>([])
  const [examId, setExamIdState] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => {
    try {
      const r = await api.get<{ data: BoardExam[] }>('/admin/board-exams')
      const list = r.data || []
      setExams(list)
      setExamIdState((cur) => {
        let saved: number | null = cur
        if (saved === null) { try { saved = Number(localStorage.getItem(KEY)) || null } catch { saved = null } }
        return list.some((e) => e.id === saved) ? saved : list[0]?.id ?? null
      })
    } catch { /* shown by pages */ }
    finally { setLoaded(true) }
  }, [])
  useEffect(() => { const t = setTimeout(() => void reload(), 0); return () => clearTimeout(t) }, [reload])
  const setExamId = (id: number | null) => {
    setExamIdState(id)
    try { if (id) localStorage.setItem(KEY, String(id)) } catch { /* ignore */ }
  }
  return { exams, exam: exams.find((e) => e.id === examId) || null, examId, setExamId, reload, loaded }
}

/** A board room as a RoomInfo, with "Venue · Room" as its printed name. */
export const roomLabel = (venue: string, room: string) => `${venue} · ${room}`

/** Board seats → the internal SeatRow shape (roll in the ID slot, college as the colour group) for the room map. */
const toSeatRow = (s: BoardSeat): SeatRow => ({
  room_id: s.room_id, seat_no: s.seat_no, col_no: s.col_no, bench_no: s.bench_no, seat_pos: s.seat_pos,
  student_id: s.roll_no, name: s.name, class: '', student_group: s.college, gender: s.gender || 'male', class_roll: null,
})

function header(doc: jsPDF, exam: BoardExam, logo: string | null, sub: string) {
  const W = doc.internal.pageSize.getWidth()
  if (logo) doc.addImage(logo, 'PNG', 12, 8, 14, 14, 'college-logo', 'FAST')
  doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(exam.center_name || COLLEGE, W / 2, 13, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(71, 85, 105)
  doc.text(`${examTitle(exam)}${exam.center_code ? `  ·  Centre code ${exam.center_code}` : ''}`, W / 2, 18.5, { align: 'center' })
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(sub, W / 2, 25, { align: 'center' })
}

/** Seat cards: 10 per A4 page — roll big, venue + room + seat, college. */
export function boardSeatCardsPdf(exam: BoardExam, venues: BoardVenue[], seats: BoardSeat[], logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const room = new Map<number, { venue: string; room: BoardRoom }>()
  for (const v of venues) for (const r of v.rooms) room.set(r.id, { venue: v.name, room: r })
  const W = 95, H = 55, X0 = 8, Y0 = 9, GX = 4, GY = 2.5
  seats.forEach((s, i) => {
    const k = i % 10
    if (i > 0 && k === 0) doc.addPage()
    const x = X0 + (k % 2) * (W + GX), y = Y0 + Math.floor(k / 2) * (H + GY)
    const info = room.get(s.room_id)
    doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.6); doc.roundedRect(x, y, W, H, 3, 3)
    doc.setFillColor(219, 234, 254); doc.rect(x + 0.3, y + 0.3, W - 0.6, 10.5, 'F')
    if (logo) doc.addImage(logo, 'PNG', x + 2.5, y + 1.3, 8.5, 8.5, 'college-logo', 'FAST')
    doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text(doc.splitTextToSize(exam.center_name || COLLEGE, W - 18)[0], x + W / 2 + 4, y + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(185, 28, 28)
    doc.text(examTitle(exam), x + W / 2 + 4, y + 9, { align: 'center' })
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(doc.splitTextToSize(`${info?.venue || ''} · Room ${info?.room.name || ''} · Seat ${s.seat_no}`, W - 8)[0], x + 4, y + 16.5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(71, 85, 105)
    doc.text(`Column ${s.col_no}  ·  Bench ${s.bench_no}  ·  Position ${s.seat_pos}`, x + 4, y + 20.8)
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
    doc.text(`Roll ${s.roll_no}`, x + W / 2, y + 31, { align: 'center' })
    doc.setFontSize(10)
    doc.text(doc.splitTextToSize(s.name, W - 10)[0], x + W / 2, y + 37.5, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(51, 65, 85)
    doc.text(doc.splitTextToSize(`${s.college}${s.group_name ? ` · ${s.group_name}` : ''}${s.reg_no ? ` · Reg ${s.reg_no}` : ''}`, W - 10)[0], x + W / 2, y + 42.5, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(194, 65, 12)
    doc.text(`Door: ${doorText(info?.room.door_position)}`, x + W / 2, y + 48, { align: 'center' })
  })
  if (!seats.length) doc.text('No seats yet. Generate the seat plan first.', 20, 20)
  return doc
}

/** Door-front list per room: roll ranges per college, graphical room map, then the full list. */
export function boardDoorListPdf(exam: BoardExam, venues: BoardVenue[], seats: BoardSeat[], logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  let first = true
  for (const v of venues) for (const room of v.rooms) {
    const list = seats.filter((s) => s.room_id === room.id).sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }))
    if (!list.length) continue
    if (!first) doc.addPage()
    first = false
    header(doc, exam, logo, v.name)
    doc.setFillColor(30, 58, 138); doc.roundedRect(W / 2 - 35, 28, 70, 12, 3, 3, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(19)
    doc.text(`ROOM ${room.name}`.toUpperCase(), W / 2, 36.5, { align: 'center' })
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    let y = 46
    doc.text(`${list.length} candidates · ${room.columns_count} columns (benches ${benchesText(room)}) · ${room.seats_per_bench} per bench · Door: ${doorText(room.door_position)}`, W / 2, y, { align: 'center' })
    y += 6
    const ranges = new Map<string, string[]>()
    for (const s of list) { if (!ranges.has(s.college)) ranges.set(s.college, []); ranges.get(s.college)!.push(s.roll_no) }
    for (const [col, rolls] of ranges) {
      doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize(`${col}:`, 95)[0], 16, y)
      doc.setFont('helvetica', 'normal'); doc.text(`Roll ${rolls[0]} – ${rolls[rolls.length - 1]}  (${rolls.length})`, 115, y)
      y += 5.2
    }
    drawRoomMap(doc, room, list.map(toSeatRow), 14, y + 3, W - 28, H - (y + 3) - 18)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
    doc.text('Find your roll number to see your column and bench. Full list on the next page.', W / 2, H - 8, { align: 'center' })
    doc.addPage()
    header(doc, exam, logo, `${v.name} · Room ${room.name} — candidate list`)
    autoTable(doc, {
      startY: 30, margin: { left: 12, right: 12 },
      head: [['Seat', 'Roll', 'Reg. No', 'Name', 'College', 'Col/Bench']],
      body: [...list].sort((a, b) => a.seat_no - b.seat_no).map((s) => [String(s.seat_no), s.roll_no, s.reg_no || '', s.name, s.college, `${s.col_no}/${s.bench_no}`]),
      styles: { fontSize: 8.5, cellPadding: 1.3 }, headStyles: { fillColor: [30, 58, 138] }, alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 22, fontStyle: 'bold' }, 5: { cellWidth: 20, halign: 'center' } },
    })
  }
  if (first) doc.text('No seats yet. Generate the seat plan first.', 20, 20)
  return doc
}

const longDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

/** Attendance / signature sheet per room for one session (only candidates taking that day's papers). */
export function boardAttendancePdf(exam: BoardExam, venues: BoardVenue[], seats: BoardSeat[], date: string, time: string, papers: string[], logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  let first = true
  for (const v of venues) for (const room of v.rooms) {
    const list = seats.filter((s) => s.room_id === room.id).sort((a, b) => a.seat_no - b.seat_no)
    if (!list.length) continue
    if (!first) doc.addPage()
    first = false
    const startPage = doc.getNumberOfPages()
    const head = () => {
      header(doc, exam, logo, `ATTENDANCE SHEET — ${v.name} · Room ${room.name}`)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 41, 59)
      doc.text(`${longDate(date)}${time ? `  ·  ${fmtTime(time)}` : ''}  ·  ${papers.join(', ')}`, W / 2, 31, { align: 'center' })
    }
    head()
    autoTable(doc, {
      startY: 35, margin: { top: 35, left: 10, right: 10, bottom: 34 },
      head: [['Seat', 'Roll', 'Reg. No', 'Name', 'College', 'Paper', 'Answer script no.', 'Signature']],
      body: list.map((s) => [String(s.seat_no), s.roll_no, s.reg_no || '', s.name, s.college, (s.papers || []).map((p) => p.split(' ')[0]).join(', '), '', '']),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.4, minCellHeight: 8, valign: 'middle', lineColor: [148, 163, 184], lineWidth: 0.15 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 18, fontStyle: 'bold' }, 2: { cellWidth: 18 }, 4: { cellWidth: 34 }, 5: { cellWidth: 14, halign: 'center' }, 6: { cellWidth: 24 }, 7: { cellWidth: 30 } },
      didDrawPage: () => { if (doc.getNumberOfPages() > startPage) head() },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fy = Math.min(H - 22, ((doc as any).lastAutoTable?.finalY ?? 200) + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42)
    doc.text(`Total: ${list.length}     Present: ________     Absent: ________     Absent rolls: ______________________________`, 10, fy)
    doc.setDrawColor(100); doc.line(14, fy + 13, 74, fy + 13); doc.line(W - 74, fy + 13, W - 14, fy + 13)
    doc.text('Invigilator (name & signature)', 44, fy + 17, { align: 'center' })
    doc.text('Invigilator (name & signature)', W - 44, fy + 17, { align: 'center' })
  }
  if (first) doc.text('Nobody sits this session (check seat plan and subject codes).', 20, 20)
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`Page ${p} of ${n}`, W - 10, H - 6, { align: 'right' }) }
  return doc
}
