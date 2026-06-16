'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

import { UPLOAD_BASE } from '@/lib/api'

interface Routine {
  id: number
  class: string
  section: string
  uploaded_at?: string
  pdf_path?: string
}

export default function AdminRoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [class_, setClass_] = useState('11th')
  const [section, setSection] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadKey, setUploadKey] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchRoutines = () => {
    api.get<{ status: number; data: Routine[] }>('/admin/routines')
      .then((res) => setRoutines(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchRoutines() }, [])

  const handleEdit = (r: Routine) => {
    setEditingId(r.id)
    setClass_(r.class)
    setSection(r.section || '')
    setPdfFile(null)
    setUploadKey((k) => k + 1)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setClass_('11th')
    setSection('')
    setPdfFile(null)
    setUploadKey((k) => k + 1)
  }

  const handleUpload = async () => {
    if (!editingId && !pdfFile) { alert('Select a PDF file'); return }
    try {
      const fd = new FormData()
      fd.append('class', class_)
      fd.append('section', section)
      if (pdfFile) fd.append('pdf', pdfFile)

      if (editingId) {
        await api.upload(`/admin/routines/${editingId}`, fd)
      } else {
        await api.upload('/admin/routines', fd)
      }
      setSection(''); setPdfFile(null)
      setUploadKey((k) => k + 1)
      setEditingId(null)
      fetchRoutines()
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    }
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this routine?')) return
    api.delete(`/admin/routines/${id}`)
      .then(() => fetchRoutines())
      .catch(() => {})
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'uploaded_at', label: 'Uploaded At' },
    { key: 'pdf', label: 'PDF' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = routines.map((r) => ({
    ...r,
    uploaded_at: r.uploaded_at || '-',
    pdf: r.pdf_path
      ? <a href={`${UPLOAD_BASE}/${r.pdf_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
      : '-',
    actions: <div className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={() => handleEdit(r)}>Edit</Button>
      <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</Button>
    </div>,
  }))

  return (
    <PanelLayout role="admin" title="Routine Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} value={class_} onChange={(e) => setClass_(e.target.value)} />
            <Input label="Section" placeholder="e.g. A" value={section} onChange={(e) => setSection(e.target.value)} />
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
          <DataTable columns={columns} data={rows} emptyMessage="No routines" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
