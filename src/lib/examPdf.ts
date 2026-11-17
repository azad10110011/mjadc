// PDF builders for the admin exam modules (Session 80): seat cards, room entrance lists,
// duty appointment letters. jsPDF + autotable, A4. The logo is the site's own /college_logo.png
// (same origin, so it can be embedded without CORS problems).

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const COLLEGE = 'Miah Jinnah Alam Degree College'
export const COLLEGE_ADDR = 'Garaganj, Shailkupa, Jhenaidah'

export async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/college_logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    // The source logo is ~1 MB; shrink it once to 160 px so PDFs stay small (it is reused via an alias).
    const url = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = url
      })
      const size = 160
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      const scale = Math.min(size / img.width, size / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      return canvas.toDataURL('image/png')
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return null
  }
}

/** Download, or open the browser print dialog. */
export function finishPdf(doc: jsPDF, filename: string, mode: 'download' | 'print') {
  if (mode === 'download') {
    doc.save(filename)
    return
  }
  doc.autoPrint()
  const url = doc.output('bloburl')
  window.open(url, '_blank')
}

// ---------------------------------------------------------------- seat plan
export interface SeatRow {
  room_id: number | string
  seat_no: number | string
  col_no: number | string
  bench_no: number | string
  seat_pos: number | string
  student_id: string
  name: string
  class: string
  student_group: string | null
  gender: string
  class_roll: string | null
}
export interface RoomInfo { id: number; name: string; capacity: number; columns_count: number; benches_per_column: number; column_benches?: number[]; seats_per_bench: number; door_position?: string }

/** "10, 9, 10" — benches in each column (older rooms: same count everywhere). */
export const benchesText = (r: RoomInfo) => (r.column_benches?.length ? r.column_benches : Array(r.columns_count).fill(r.benches_per_column)).join(', ')

const GROUP_SHORT: Record<string, string> = { Science: 'Science', 'Business Studies': 'Business', Humanities: 'Humanities' }

/** "Left wall, near back" — readable door position (front = board side). */
export function doorText(p: string | undefined): string {
  const [wall, place] = (p || 'front-right').split('-')
  const W: Record<string, string> = { front: 'Front wall', back: 'Back wall', left: 'Left wall', right: 'Right wall' }
  const P: Record<string, string> = { left: 'left side', right: 'right side', center: 'centre', front: 'near front', middle: 'middle', back: 'near back' }
  return `${W[wall] || wall}, ${P[place] || place}`
}

/** Door rectangle on a room outline (x, y, w, h); DL = door length, DT = thickness. */
function doorRect(door: string | undefined, x: number, y: number, w: number, h: number, DL: number, DT: number) {
  const [wall, place] = (door || 'front-right').split('-')
  const along: Record<string, number> = { left: 0.16, front: 0.18, center: 0.5, middle: 0.5, right: 0.84, back: 0.82 }
  const f = along[place] ?? 0.5
  if (wall === 'front') return { wall, x: x + w * f - DL / 2, y: y - DT / 2, w: DL, h: DT }
  if (wall === 'back') return { wall, x: x + w * f - DL / 2, y: y + h - DT / 2, w: DL, h: DT }
  return { wall, x: wall === 'left' ? x - DT / 2 : x + w - DT / 2, y: y + h * f - DL / 2, w: DT, h: DL }
}

/** Tiny room map for a seat card: front, door, every bench, the student's seat in red. */
function drawMiniRoom(doc: jsPDF, room: RoomInfo | undefined, s: SeatRow, x: number, y: number, w: number, h: number) {
  if (!room) return
  const cb = room.column_benches?.length ? room.column_benches : Array(room.columns_count).fill(room.benches_per_column)
  const cols = Math.max(1, cb.length)
  const maxB = Math.max(1, ...cb)
  const seatsN = Math.max(1, room.seats_per_bench)
  doc.setDrawColor(51, 65, 85); doc.setLineWidth(0.45); doc.rect(x, y, w, h)
  doc.setFillColor(51, 65, 85); doc.rect(x + w * 0.2, y + 1.2, w * 0.6, 2.2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(4.2)
  doc.text('FRONT', x + w / 2, y + 2.85, { align: 'center' })
  const pad = 1.4, gap = cols > 5 ? 0.6 : 1
  const top = y + 4.6, areaH = h - 4.6 - 1.4
  const colW = (w - pad * 2 - gap * (cols - 1)) / cols
  const bGap = 0.45
  const bH = Math.max(0.6, Math.min(2.4, (areaH - bGap * maxB) / maxB))
  const tc = Number(s.col_no), tb = Number(s.bench_no), tp = Number(s.seat_pos)
  cb.forEach((n, c) => {
    const cx = x + pad + c * (colW + gap)
    for (let b = 1; b <= n; b++) {
      const by = top + (b - 1) * (bH + bGap)
      const mine = c + 1 === tc && b === tb
      if (mine) {
        doc.setFillColor(254, 202, 202); doc.rect(cx, by, colW, bH, 'F')
        const sw = colW / seatsN
        doc.setFillColor(220, 38, 38); doc.rect(cx + (tp - 1) * sw, by, sw, bH, 'F')
      } else {
        doc.setFillColor(253, 230, 138); doc.rect(cx, by, colW, bH, 'F')
      }
    }
  })
  const d = doorRect(room.door_position, x, y, w, h, Math.min(7, Math.max(w, h) * 0.28), 1.5)
  doc.setFillColor(234, 88, 12); doc.rect(d.x, d.y, d.w, d.h, 'F')
}

/** Individual seat cards — 10 per A4 page (2 × 5), to cut and place on each seat. */
export function seatCardsPdf(title: string, rooms: RoomInfo[], seats: SeatRow[], logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const roomById = new Map(rooms.map((r) => [String(r.id), r]))
  const W = 95, H = 55, X0 = 8, Y0 = 9, GX = 4, GY = 2.5
  seats.forEach((s, i) => {
    const k = i % 10
    if (i > 0 && k === 0) doc.addPage()
    const x = X0 + (k % 2) * (W + GX)
    const y = Y0 + Math.floor(k / 2) * (H + GY)
    const room = roomById.get(String(s.room_id))
    doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.6); doc.roundedRect(x, y, W, H, 3, 3)
    doc.setFillColor(219, 234, 254); doc.rect(x + 0.3, y + 0.3, W - 0.6, 10.5, 'F')
    if (logo) doc.addImage(logo, 'PNG', x + 2.5, y + 1.3, 8.5, 8.5, 'college-logo', 'FAST')
    doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(COLLEGE, x + W / 2 + 4, y + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(185, 28, 28)
    doc.text(title, x + W / 2 + 4, y + 9, { align: 'center' })

    // left: seat + student; right: mini room map with this seat and the door (Session 81)
    const cx = x + 34.5
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`${room?.name || 'Room'}  ·  Seat ${s.seat_no}`, x + 4, y + 16.5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(71, 85, 105)
    doc.text(`Column ${s.col_no}  ·  Bench ${s.bench_no}  ·  Position ${s.seat_pos}`, x + 4, y + 20.8)
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
    doc.text(String(s.student_id), cx, y + 30.5, { align: 'center' })
    doc.setFontSize(9.8)
    doc.text(doc.splitTextToSize(s.name, 62)[0], cx, y + 37, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(51, 65, 85)
    doc.text(`Class ${s.class}  ·  ${GROUP_SHORT[s.student_group || ''] || s.student_group || '-'}${s.class_roll ? `  ·  Roll ${s.class_roll}` : ''}`, cx, y + 42.3, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(194, 65, 12)
    doc.text(`Door: ${doorText(room?.door_position)}`, cx, y + 47.6, { align: 'center' })

    drawMiniRoom(doc, room, s, x + 69, y + 14, 23, 30)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(71, 85, 105)
    doc.setFillColor(220, 38, 38); doc.rect(x + 69.2, y + 45.8, 2, 1.6, 'F'); doc.text('Your seat', x + 72, y + 47.2)
    doc.setFillColor(234, 88, 12); doc.rect(x + 82.2, y + 45.8, 2, 1.6, 'F'); doc.text('Door', x + 85, y + 47.2)

    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139)
    doc.text('Sit only on this seat. Keep your admit card with you.', x + W / 2, y + 52.6, { align: 'center' })
  })
  if (seats.length === 0) doc.text('No seats in this plan.', 20, 20)
  return doc
}

const GROUP_FILL: Record<string, [number, number, number]> = { Science: [224, 242, 254], 'Business Studies': [254, 243, 199], Humanities: [209, 250, 229] }
const EXTRA_FILLS: [number, number, number][] = [[255, 228, 230], [237, 233, 254], [236, 252, 203], [255, 237, 213], [207, 250, 254]]
/** Seat colour for a group; groups added by the admin get a stable colour from their name. */
const groupFill = (g: string): [number, number, number] =>
  GROUP_FILL[g] || (g ? EXTRA_FILLS[[...g].reduce((a, c) => a + c.charCodeAt(0), 0) % EXTRA_FILLS.length] : [255, 255, 255])

/**
 * Graphical room map for the entrance sheet (Session 81): front/board at the top, the door on its wall,
 * every column with its own benches, and the student ID in each seat (colour = group).
 * Returns the y just below the drawing.
 */
export function drawRoomMap(doc: jsPDF, room: RoomInfo, list: SeatRow[], x: number, y: number, w: number, maxH: number): number {
  const cb = room.column_benches?.length ? room.column_benches : Array(room.columns_count).fill(room.benches_per_column)
  const cols = cb.length
  const maxB = Math.max(1, ...cb)
  const seatsN = Math.max(1, room.seats_per_bench)
  const pad = 7, front = 8, colHead = 4.5, back = 6, gap = cols > 6 ? 2.5 : 4
  const colW = (w - pad * 2 - gap * (cols - 1)) / cols
  const benchGap = 1.6
  // benches grow to use the page (sheet is read from a distance at the door), capped for small rooms
  const benchH = Math.max(4.2, Math.min(15, (maxH - front - colHead - back - pad - 12 - benchGap * maxB) / maxB))
  const h = front + colHead + 6 + maxB * (benchH + benchGap) + back + 4
  const at = new Map(list.map((s) => [`${s.col_no}-${s.bench_no}-${s.seat_pos}`, s]))

  // room outline
  doc.setDrawColor(51, 65, 85); doc.setLineWidth(1.1); doc.rect(x, y, w, h)
  // front: board / desk
  doc.setFillColor(51, 65, 85); doc.rect(x + w * 0.2, y + 3, w * 0.6, front - 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('FRONT  ·  BOARD / INVIGILATOR DESK', x + w / 2, y + 3 + (front - 2) / 2 + 1.1, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184)
  doc.text('BACK', x + w / 2, y + h - 2.2, { align: 'center' })

  const top = y + front + 5
  cb.forEach((nb, c) => {
    const cx = x + pad + c * (colW + gap)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105)
    doc.text(`Column ${c + 1}`, cx + colW / 2, top + 2.5, { align: 'center' })
    const cellW = colW / seatsN
    const fs = Math.max(4.6, Math.min(11, (cellW * 0.78) / 1.18, benchH * 1.55))
    for (let b = 1; b <= nb; b++) {
      const by = top + colHead + (b - 1) * (benchH + benchGap)
      for (let p = 1; p <= seatsN; p++) {
        const sx = cx + (p - 1) * cellW
        const st = at.get(`${c + 1}-${b}-${p}`)
        if (st) doc.setFillColor(...groupFill(st.student_group || ''))
        else doc.setFillColor(248, 250, 252)
        doc.rect(sx, by, cellW, benchH, 'F')
        if (st) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(15, 23, 42)
          doc.text(String(st.student_id), sx + cellW / 2, by + benchH / 2 + fs * 0.13, { align: 'center' })
        } else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(203, 213, 225)
          doc.text('-', sx + cellW / 2, by + benchH / 2 + 0.8, { align: 'center' })
        }
      }
      // bench outline + seat dividers
      doc.setDrawColor(146, 64, 14); doc.setLineWidth(0.35); doc.rect(cx, by, colW, benchH)
      doc.setLineWidth(0.15)
      for (let p = 1; p < seatsN; p++) doc.line(cx + p * cellW, by, cx + p * cellW, by + benchH)
    }
  })

  // door on its wall
  const DL = 16, DT = 3.2
  const dr = doorRect(room.door_position, x, y, w, h, DL, DT)
  const { wall } = dr
  const dx = dr.x, dy = dr.y, dw = dr.w, dh = dr.h
  doc.setFillColor(234, 88, 12); doc.rect(dx, dy, dw, dh, 'F')
  doc.setTextColor(234, 88, 12); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  if (wall === 'front') doc.text('DOOR', dx + DL / 2, dy - 1.2, { align: 'center' })
  else if (wall === 'back') doc.text('DOOR', dx + DL / 2, dy + DT + 3.2, { align: 'center' })
  else if (wall === 'left') doc.text('DOOR', dx - 1.2, dy + DL / 2, { align: 'right', baseline: 'middle' })
  else doc.text('DOOR', dx + DT + 1.2, dy + DL / 2, { baseline: 'middle' })

  // legend
  let lx = x
  const ly = y + h + 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  const present = [...new Set(list.map((s) => s.student_group || '').filter(Boolean))]
  const legendGroups = [...Object.keys(GROUP_FILL).filter((g) => present.includes(g)), ...present.filter((g) => !GROUP_FILL[g])]
  for (const g of legendGroups.length ? legendGroups : Object.keys(GROUP_FILL)) {
    doc.setFillColor(...groupFill(g)); doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.rect(lx, ly - 2.6, 4, 3, 'FD')
    doc.setTextColor(51, 65, 85); doc.text(g, lx + 5.5, ly)
    lx += doc.getTextWidth(g) + 12
  }
  doc.setFillColor(234, 88, 12); doc.rect(lx, ly - 2.6, 4, 3, 'F'); doc.text('Door', lx + 5.5, ly)
  return ly + 3
}

/** Room entrance list — one section per room, sorted by student ID, two columns per page. */
export function doorListPdf(title: string, rooms: RoomInfo[], seats: SeatRow[], logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  rooms.forEach((room, ri) => {
    if (ri > 0) doc.addPage()
    const list = seats.filter((s) => String(s.room_id) === String(room.id))
      .sort((a, b) => String(a.student_id).localeCompare(String(b.student_id), undefined, { numeric: true }))
    if (logo) doc.addImage(logo, 'PNG', 12, 8, 14, 14, 'college-logo', 'FAST')
    doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(COLLEGE, pageW / 2, 13, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105)
    doc.text(title, pageW / 2, 18.5, { align: 'center' })
    doc.setFillColor(30, 58, 138); doc.roundedRect(pageW / 2 - 35, 22, 70, 13, 3, 3, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
    doc.text(room.name.toUpperCase(), pageW / 2, 31, { align: 'center' })

    // ID ranges per class + group — quick "is my ID here?" check
    const ranges = new Map<string, string[]>()
    for (const s of list) {
      const k = `${s.class} ${GROUP_SHORT[s.student_group || ''] || s.student_group || ''}`.trim()
      if (!ranges.has(k)) ranges.set(k, [])
      ranges.get(k)!.push(String(s.student_id))
    }
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    let y = 42
    doc.text(`${list.length} students  ·  Capacity ${room.capacity}  ·  ${room.columns_count} columns (benches: ${benchesText(room)})  ·  ${room.seats_per_bench} per bench`, pageW / 2, y, { align: 'center' })
    y += 6
    for (const [k, ids] of ranges) {
      doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, 20, y)
      doc.setFont('helvetica', 'normal'); doc.text(`${ids[0]} – ${ids[ids.length - 1]}  (${ids.length})`, 62, y)
      y += 5.5
    }
    const pageH = doc.internal.pageSize.getHeight()
    // graphical short seat plan for the door (Session 81)
    drawRoomMap(doc, room, list, 14, y + 3, pageW - 28, pageH - (y + 3) - 20)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
    doc.text('Find your Student ID above to see your column and bench. Full list on the next page.', pageW / 2, pageH - 8, { align: 'center' })
    // seat list on the following page(s)
    doc.addPage()
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(30, 58, 138)
    doc.text(`${room.name} — Seat List`, pageW / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105)
    doc.text(title, pageW / 2, 19, { align: 'center' })
    y = 20
    // Two side-by-side columns per page with fixed row height, paginated explicitly so both columns
    // always share a page (autotable alone pushed the right column onto the next page).
    const ROW = 4.6, HEAD = 5.5, BOTTOM = 12
    const body = (rows: SeatRow[]) => rows.map((s) => [String(s.student_id), s.name, `${s.seat_no}`, `C${s.col_no}-B${s.bench_no}-${s.seat_pos}`])
    const opts = {
      head: [['Student ID', 'Name', 'Seat', 'Col-Bench']],
      theme: 'grid' as const,
      styles: { fontSize: 7, cellPadding: 0.8, minCellHeight: ROW, overflow: 'ellipsize' as const, valign: 'middle' as const },
      headStyles: { fillColor: [30, 58, 138] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, minCellHeight: HEAD },
      alternateRowStyles: { fillColor: [239, 246, 255] as [number, number, number] },
      columnStyles: { 0: { cellWidth: 17, fontStyle: 'bold' as const }, 1: { cellWidth: 40 }, 2: { cellWidth: 10, halign: 'center' as const }, 3: { cellWidth: 21 } },
      pageBreak: 'avoid' as const,
    }
    let startY = y + 2
    let i = 0
    while (i < list.length) {
      const perCol = Math.max(1, Math.floor((pageH - startY - BOTTOM - HEAD) / ROW))
      const left = list.slice(i, i + perCol)
      const right = list.slice(i + perCol, i + 2 * perCol)
      const pageNo = doc.getNumberOfPages()
      autoTable(doc, { ...opts, startY, body: body(left), margin: { left: 10, right: pageW / 2 + 1 } })
      if (right.length) {
        doc.setPage(pageNo)
        autoTable(doc, { ...opts, startY, body: body(right), margin: { left: pageW / 2 + 1, right: 10 } })
      }
      i += 2 * perCol
      if (i < list.length) {
        doc.addPage()
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 58, 138)
        doc.text(`${room.name} (continued)`, pageW / 2, 12, { align: 'center' })
        startY = 16
      }
    }
  })
  if (rooms.length === 0) doc.text('No rooms in this plan.', 20, 20)
  return doc
}

// ---------------------------------------------------------------- duty appointment letters
export interface LetterDuty { exam_date: string; exam_time: string; room: string; subjects: string[]; classes: string[] }
// college: set for external teachers (board exams) — printed instead of our college in the address
export interface LetterTeacher { id: number | string; name: string; designation: string; subject: string | null; gender: string; college?: string; duties: LetterDuty[] }
export interface LetterSettings {
  examTitle: string            // e.g. "Pre-Test Examination 2026"
  classes: string[]
  memoNo: string
  issueDate: string            // YYYY-MM-DD
  signatoryName: string
  signatoryDesignation: string
  reportingMinutes: number
  instructions: string         // one per line
}

const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}
const fmtDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long' })
}
export const fmtTime = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '')
  if (!m) return t || '—'
  const h = Number(m[1])
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

/** Draw one appointment letter on the current page. */
function drawLetter(doc: jsPDF, t: LetterTeacher, s: LetterSettings, logo: string | null) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const L = 18, R = W - 18
  // letterhead
  doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.8); doc.rect(8, 8, W - 16, H - 16)
  if (logo) doc.addImage(logo, 'PNG', L, 14, 22, 22, 'college-logo', 'FAST')
  doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(COLLEGE, W / 2 + 8, 22, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105)
  doc.text(COLLEGE_ADDR, W / 2 + 8, 28, { align: 'center' })
  doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.5); doc.line(L, 39, R, 39)
  doc.setLineWidth(0.2); doc.line(L, 40.2, R, 40.2)

  doc.setTextColor(15, 23, 42); doc.setFontSize(10)
  doc.text(`Memo No: ${s.memoNo || '……………………'}`, L, 47)
  doc.text(`Date: ${s.issueDate ? fmtDate(s.issueDate) : fmtDate(new Date().toISOString().slice(0, 10))}`, R, 47, { align: 'right' })

  doc.setFillColor(30, 58, 138); doc.roundedRect(W / 2 - 62, 52, 124, 9, 2, 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5)
  doc.text('APPOINTMENT LETTER — EXAMINATION HALL DUTY', W / 2, 58, { align: 'center' })

  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
  let y = 70
  doc.text('To', L, y); y += 5.5
  doc.setFont('helvetica', 'bold'); doc.text(t.name, L, y); y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(t.designation + (t.subject ? `, Department of ${t.subject}` : ''), L, y); y += 5
  doc.text(t.college || COLLEGE, L, y); y += 9

  doc.setFont('helvetica', 'bold')
  doc.text(`Subject: Appointment as invigilator — ${s.examTitle}${s.classes.length ? ` (Class ${s.classes.join(' & ')})` : ''}`, L, y, { maxWidth: R - L }); y += 8
  doc.setFont('helvetica', 'normal')
  const body = `You are hereby appointed as an invigilator (hall duty) for the ${s.examTitle}. Your duty schedule is given below. ` +
    `Please report to the examination office at least ${s.reportingMinutes} minutes before the start of each examination and perform your duties according to the rules of the institution.`
  const lines = doc.splitTextToSize(body, R - L)
  doc.text(lines, L, y, { lineHeightFactor: 1.45 }); y += lines.length * 5.3 + 3

  autoTable(doc, {
    startY: y,
    margin: { left: L, right: W - R },
    head: [['SL', 'Date', 'Day', 'Time', 'Room', 'Exam / Subject(s)']],
    body: t.duties.map((d, i) => [String(i + 1), fmtDate(d.exam_date), fmtDay(d.exam_date), fmtTime(d.exam_time), d.room, d.subjects.join(', ')]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8, valign: 'middle' },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 32 }, 2: { cellWidth: 22 }, 3: { cellWidth: 20 }, 4: { cellWidth: t.duties.some((d) => d.room.length > 12) ? 36 : 22, fontStyle: 'bold' } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(`Total duties: ${t.duties.length}`, L, y); y += 8

  const instr = s.instructions.split('\n').map((x) => x.trim()).filter(Boolean)
  if (instr.length) {
    doc.text('Instructions:', L, y); y += 5.5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    instr.forEach((line, i) => {
      const w = doc.splitTextToSize(`${i + 1}. ${line}`, R - L - 4)
      if (y + w.length * 4.6 > H - 58) return // keep room for signature
      doc.text(w, L + 2, y); y += w.length * 4.6 + 0.8
    })
  }

  // seal + signature (anchored to the bottom so every letter looks the same)
  const sy = H - 50
  doc.setDrawColor(148, 163, 184); doc.setLineDashPattern([1.5, 1.2], 0); doc.circle(L + 20, sy + 12, 15)
  doc.setLineDashPattern([], 0)
  doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text('Official Seal', L + 20, sy + 13, { align: 'center' })
  doc.setDrawColor(15, 23, 42); doc.line(R - 62, sy + 14, R, sy + 14)
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
  doc.text(s.signatoryName || 'Principal', R - 31, sy + 20, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
  doc.text(s.signatoryDesignation || 'Principal', R - 31, sy + 25, { align: 'center' })
  doc.text(COLLEGE, R - 31, sy + 30, { align: 'center' })
}

/** One PDF; one letter per page (pass a single teacher for an individual letter). */
export function dutyLettersPdf(teachers: LetterTeacher[], s: LetterSettings, logo: string | null): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  teachers.forEach((t, i) => {
    if (i > 0) doc.addPage()
    drawLetter(doc, t, s, logo)
  })
  if (!teachers.length) doc.text('No teachers selected.', 20, 20)
  return doc
}

export const letterFileName = (t: LetterTeacher) => `Duty-Letter-${t.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.pdf`
