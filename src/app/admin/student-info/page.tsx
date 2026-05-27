'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { Plus, Trash2, Save, Type } from 'lucide-react'
import { api } from '@/lib/api'

const FONT_SIZES = [
  { label: 'Extra Small', value: 'text-xs' },
  { label: 'Small', value: 'text-sm' },
  { label: 'Base', value: 'text-base' },
  { label: 'Large', value: 'text-lg' },
  { label: 'Extra Large', value: 'text-xl' },
  { label: '2X Large', value: 'text-2xl' },
]

const FONT_STYLES = [
  { label: 'Normal', value: 'font-normal' },
  { label: 'Medium', value: 'font-medium' },
  { label: 'Semibold', value: 'font-semibold' },
  { label: 'Bold', value: 'font-bold' },
]

export default function AdminStudentInfoPage() {
  const [headings, setHeadings] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [fontSize, setFontSize] = useState('text-sm')
  const [fontStyle, setFontStyle] = useState('font-normal')

  useEffect(() => {
    api.get<{ status: number; data: { headings: string[]; rows: string[][]; fontSize: string; fontStyle: string } }>('/admin/student-info')
      .then((res) => {
        setHeadings(res.data.headings || [])
        setRows(res.data.rows || [])
        setFontSize(res.data.fontSize || 'text-sm')
        setFontStyle(res.data.fontStyle || 'font-normal')
      })
      .catch(() => {})
  }, [])

  const addHeading = () => setHeadings([...headings, ''])
  const updateHeading = (i: number, v: string) => {
    const h = [...headings]; h[i] = v; setHeadings(h)
  }
  const removeHeading = (i: number) => {
    setHeadings(headings.filter((_, j) => j !== i))
    setRows(rows.map((r) => r.filter((_, j) => j !== i)))
  }

  const addRow = () => setRows([...rows, headings.map(() => '')])
  const updateCell = (rowIdx: number, colIdx: number, v: string) => {
    const r = [...rows]; r[rowIdx] = [...r[rowIdx]]; r[rowIdx][colIdx] = v; setRows(r)
  }
  const removeRow = (i: number) => setRows(rows.filter((_, j) => j !== i))

  const handleSave = async () => {
    await api.put('/admin/student-info', { headings, rows, fontSize, fontStyle })
    alert('Student info saved')
  }

  return (
    <PanelLayout role="admin" title="Student Info Table">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Table Headings</h3>
            <Button size="sm" onClick={addHeading}><Plus className="mr-1 h-4 w-4" /> Add Column</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {headings.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={h} onChange={(e) => updateHeading(i, e.target.value)} placeholder={`Column ${i + 1}`} className="w-44" />
                <button onClick={() => removeHeading(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rows</h3>
              <Button size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add Row</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {headings.map((h, i) => (
                      <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">{h || `Col ${i + 1}`}</th>
                    ))}
                    <th className="px-4 py-2 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2">
                          <Input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} className="w-full min-w-32" />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <button onClick={() => removeRow(ri)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No rows added yet.</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2"><Type className="h-5 w-5" /> Font Settings</h3>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="mb-1 block text-sm text-gray-600">Font Size</label>
                <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">Font Style</label>
                <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {FONT_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Table</Button>
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
