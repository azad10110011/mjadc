'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'

interface SyllabusItem {
  id: number
  class: string
  department: string
  uploaded_at?: string
  pdf_path?: string
}

export default function AdminSyllabusPage() {
  const [syllabi, setSyllabi] = useState<SyllabusItem[]>([])
  const [class_, setClass_] = useState('11th')
  const [department, setDepartment] = useState('science')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadKey, setUploadKey] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchSyllabi = () => {
    api.get<{ status: number; data: SyllabusItem[] }>('/admin/syllabus')
      .then((res) => setSyllabi(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchSyllabi() }, [])

  const handleEdit = (s: SyllabusItem) => {
    setEditingId(s.id)
    setClass_(s.class)
    setDepartment(s.department || '')
    setPdfFile(null)
    setUploadKey((k) => k + 1)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setClass_('11th')
    setDepartment('science')
    setPdfFile(null)
    setUploadKey((k) => k + 1)
  }

  const handleUpload = async () => {
    if (!editingId && !pdfFile) { alert('Select a PDF file'); return }
    try {
      const fd = new FormData()
      fd.append('class', class_)
      fd.append('department', department)
      if (pdfFile) fd.append('pdf', pdfFile)

      if (editingId) {
        await api.upload(`/admin/syllabus/${editingId}`, fd)
      } else {
        await api.upload('/admin/syllabus', fd)
      }
      setPdfFile(null)
      setUploadKey((k) => k + 1)
      setEditingId(null)
      fetchSyllabi()
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    }
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this syllabus?')) return
    api.delete(`/admin/syllabus/${id}`)
      .then(() => fetchSyllabi())
      .catch(() => {})
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'class', label: 'Class' },
    { key: 'department', label: 'Department' },
    { key: 'uploaded_at', label: 'Uploaded At' },
    { key: 'pdf', label: 'PDF' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = syllabi.map((s) => ({
    ...s,
    uploaded_at: s.uploaded_at || '-',
    pdf: s.pdf_path
      ? <a href={`${UPLOAD_BASE}/${s.pdf_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
      : '-',
    actions: <div className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>Edit</Button>
      <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Delete</Button>
    </div>,
  }))

  return (
    <PanelLayout role="admin" title="Syllabus Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }, { value: 'degree', label: 'Degree' }]} value={class_} onChange={(e) => setClass_(e.target.value)} />
            <Select label="Department" options={[{ value: 'science', label: 'Science' }, { value: 'business-studies', label: 'Business Studies' }, { value: 'humanities', label: 'Humanities' }]} value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <Input label="PDF File" type="file" accept=".pdf" key={uploadKey} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleUpload}>{editingId ? 'Update' : 'Upload'}</Button>
            {editingId && <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No syllabus" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
