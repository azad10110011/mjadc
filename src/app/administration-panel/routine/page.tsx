'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'

export default function AdminRoutinePage() {
  const [routines, setRoutines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [cls, setCls] = useState('')
  const [section, setSection] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

  useEffect(() => {
    api.get('/admin-panel/routines')
      .then((r: any) => setRoutines(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setCls(''); setSection(''); setPdfFile(null); setEditingId(null)
    setUploadKey((k) => k + 1)
  }

  const handleSubmit = async () => {
    if (!cls) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('class', cls)
      if (section) fd.append('section', section)
      if (pdfFile) fd.append('pdf', pdfFile)

      if (editingId) {
        await api.upload(`/admin-panel/routines/${editingId}`, fd, 'POST')
      } else {
        await api.upload('/admin-panel/routines', fd)
      }
      resetForm()
      const r: any = await api.get('/admin-panel/routines')
      setRoutines(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }

  const handleEdit = (r: any) => {
    setEditingId(r.id)
    setCls(r.class)
    setSection(r.section || '')
    setPdfFile(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this routine?')) return
    try {
      await api.delete(`/admin-panel/routines/${id}`)
      const r: any = await api.get('/admin-panel/routines')
      setRoutines(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const columns = [
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'actions', label: 'Actions' },
  ]

  const tableData = routines.map((r) => ({
    class: r.class,
    section: r.section || '-',
    actions: (
      <div className="flex gap-2">
        {r.pdf_path && <Button size="sm" variant="outline" onClick={() => window.open(`${UPLOAD_BASE}/${r.pdf_path}`, '_blank')}>View</Button>}
        <Button size="sm" variant="secondary" onClick={() => handleEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="administration" title="Class Routine Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Update Routine' : 'Upload Routine'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Select" />
            <Input label="Section (optional)" placeholder="e.g. A, B" value={section} onChange={(e) => setSection(e.target.value)} />
          </div>
          <Input label="PDF File" type="file" accept=".pdf" key={`${editingId ?? 'new'}-${uploadKey}`} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit} disabled={submitting || !cls}>
              {submitting ? 'Saving...' : editingId ? 'Update Routine' : 'Upload'}
            </Button>
            {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Uploaded Routines</h3>
          <DataTable columns={columns} data={tableData} loading={loading} emptyMessage="No routines uploaded" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
