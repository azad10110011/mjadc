import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn {
  key: string
  label: string
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export function exportToExcel(data: any[], columns: ExportColumn[], filename: string) {
  const headers = columns.map((c) => c.label)
  const rows = data.map((row) => columns.map((c) => formatValue(row[c.key])))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const colWidths = columns.map((_, i) => {
    const maxLen = Math.max(
      headers[i].length,
      ...rows.map((r) => String(r[i]).length)
    )
    return { wch: Math.min(maxLen + 3, 50) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(data: any[], columns: ExportColumn[], title: string, filename: string) {
  const doc = new jsPDF('landscape')
  const headers = columns.map((c) => c.label)
  const rows = data.map((row) => columns.map((c) => formatValue(row[c.key])))

  doc.setFontSize(14)
  doc.text(title, 14, 15)

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  doc.save(`${filename}.pdf`)
}
