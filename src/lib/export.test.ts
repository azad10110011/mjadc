import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('xlsx', () => {
  return {
    utils: {
      aoa_to_sheet: vi.fn((aoa: unknown[][]) => ({ aoa })),
      book_new: vi.fn(() => ({ sheets: [] })),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  }
})

vi.mock('jspdf', () => {
  const docInstance = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  }
  class MockJsPDF {
    constructor() {
      return docInstance
    }
  }
  return {
    default: Object.assign(MockJsPDF, { __doc: docInstance }),
  }
})

vi.mock('jspdf-autotable', () => {
  return { default: vi.fn() }
})

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportToExcel, exportToPDF } from './export'

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps rows to header + row arrays in column order', () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 40 },
    ]
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'age', label: 'Age' },
    ]

    exportToExcel(data, columns, 'people')

    const ws = XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>
    expect(ws).toHaveBeenCalledOnce()
    expect(ws.mock.calls[0][0]).toEqual([
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '40'],
    ])
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'people.xlsx'
    )
  })

  it('renders null and undefined as "-"', () => {
    const data = [{ a: null, b: undefined, c: 'x' }]
    const columns = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C' },
    ]

    exportToExcel(data, columns, 'nulls')

    const ws = XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>
    expect(ws.mock.calls[0][0]).toEqual([
      ['A', 'B', 'C'],
      ['-', '-', 'x'],
    ])
  })

  it('joins arrays and stringifies objects', () => {
    const data = [{ tags: ['x', 'y'], meta: { k: 1 } }]
    const columns = [
      { key: 'tags', label: 'Tags' },
      { key: 'meta', label: 'Meta' },
    ]

    exportToExcel(data, columns, 'complex')

    const ws = XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>
    expect(ws.mock.calls[0][0]).toEqual([
      ['Tags', 'Meta'],
      ['x, y', '{"k":1}'],
    ])
  })

  it('caps column width at 50 characters', () => {
    const longValue = 'x'.repeat(100)
    const data = [{ v: longValue }]
    const columns = [{ key: 'v', label: 'V' }]

    exportToExcel(data, columns, 'wide')

    const ws = XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>
    const sheet = ws.mock.calls[0][0] as Record<string, unknown>
    expect(sheet).toBeDefined()
    // aoa_to_sheet returns the sheet the export mutates with !cols
    expect(ws).toHaveBeenCalledOnce()
    // verify !cols was set on the sheet object passed through book_append_sheet
    const append = XLSX.utils.book_append_sheet as unknown as ReturnType<typeof vi.fn>
    const mutatedSheet = append.mock.calls[0][1] as Record<string, unknown>
    expect(mutatedSheet['!cols']).toEqual([{ wch: 50 }])
  })
})

describe('exportToPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title and passes headers/body to autoTable', () => {
    const data = [{ name: 'Alice', score: 95 }]
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'score', label: 'Score' },
    ]

    exportToPDF(data, columns, 'Results', 'results')

    const docInstance = (jsPDF as unknown as { __doc: { setFontSize: ReturnType<typeof vi.fn>; text: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } }).__doc
    expect(docInstance.setFontSize).toHaveBeenCalledWith(14)
    expect(docInstance.text).toHaveBeenCalledWith('Results', 14, 15)
    expect(docInstance.save).toHaveBeenCalledWith('results.pdf')

    expect(autoTable).toHaveBeenCalledOnce()
    const autoTableMock = autoTable as unknown as ReturnType<typeof vi.fn>
    expect(autoTableMock.mock.calls[0][1]).toMatchObject({
      head: [['Name', 'Score']],
      body: [['Alice', '95']],
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    })
  })

  it('renders null values as "-" in the PDF body', () => {
    const data = [{ a: null, b: 5 }]
    const columns = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]

    exportToPDF(data, columns, 'T', 'out')

    const autoTableMock = autoTable as unknown as ReturnType<typeof vi.fn>
    expect(autoTableMock.mock.calls[0][1]).toMatchObject({
      body: [['-', '5']],
    })
  })
})
