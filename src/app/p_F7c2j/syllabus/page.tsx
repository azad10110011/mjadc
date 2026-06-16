'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'

export default function AdminSyllabusPage() {
  const [syllabi, setSyllabi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [cls, setCls] = useState('')
  const [department, setDepartment] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

  useEffect(() => {
    api.get('/admin-panel/syllabus')
      .then((r: any) => setSyllabi(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setCls(''); setDepartment(''); setPdfFile(null); setEditingId(null)
    setUploadKey((k) => k + 1)
  }

  const handleSubmit = async () => {
    if (!cls) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('class', cls)
      if (department) fd.append('department', department)
      if (pdfFile) fd.append('pdf', pdfFile)

      if (editingId) {
        await api.upload(`/admin-panel/syllabus/${editingId}`, fd, 'POST')
      } else {
        await api.upload('/admin-panel/syllabus', fd)
      }
      resetForm()
      const r: any = await api.get('/admin-panel/syllabus')
      setSyllabi(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save syllabus')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (s: any) => {
    setEditingId(s.id)
    setCls(s.class)
    setDepartment(s.department || '')
    setPdfFile(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this syllabus?')) return
    try {
      await api.delete(`/admin-panel/syllabus/${id}`)
      const r: any = await api.get('/admin-panel/syllabus')
      setSyllabi(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const columns = [
    { key: 'class', label: 'Class' },
    { key: 'department', label: 'Department' },
    { key: 'actions', label: 'Actions' },
  ]

  const tableData = syllabi.map((s) => ({
    class: s.class,
    department: s.department || '-',
    actions: (
      <div className="flex gap-2">
        {s.pdf_path && <Button size="sm" variant="outline" onClick={() => window.open(`${UPLOAD_BASE}/${s.pdf_path}`, '_blank')}>View</Button>}
        <Button size="sm" variant="secondary" onClick={() => handleEdit(s)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="administration" title="Syllabus Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Update Syllabus' : 'Upload Syllabus'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }, { value: 'degree', label: 'Degree (Pass)' }]}
              value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Select" />
            <Select label="Department" options={[{ value: 'science', label: 'Science' }, { value: 'business-studies', label: 'Business Studies' }, { value: 'humanities', label: 'Humanities' }]}
              value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Select" />
          </div>
          <Input label="PDF File" type="file" accept=".pdf" key={`${editingId ?? 'new'}-${uploadKey}`} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit} disabled={submitting || !cls}>
              {submitting ? 'Saving...' : editingId ? 'Update Syllabus' : 'Upload'}
            </Button>
            {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Uploaded Syllabi</h3>
          <DataTable columns={columns} data={tableData} loading={loading} emptyMessage="No syllabi uploaded" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
