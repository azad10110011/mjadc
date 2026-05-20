'use client'

import { useState, useEffect, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'

interface Notice {
  id: number
  title: string
  body: string
  status: string
  pdf_path: string | null
  published_at: string | null
  author?: string
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('draft')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [existingPdf, setExistingPdf] = useState<string | null>(null)
  const [removePdf, setRemovePdf] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchNotices = () => {
    api.get<{ status: number; data: Notice[] }>('/admin/notices')
      .then((res) => setNotices(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchNotices() }, [])

  const resetForm = () => {
    setTitle(''); setBody(''); setStatus('draft')
    setEditingId(null); setPdfFile(null); setExistingPdf(null); setRemovePdf(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    try {
      const useFormData = pdfFile !== null

      if (editingId) {
        if (useFormData) {
          const fd = new FormData()
          fd.append('title', title)
          fd.append('body', body)
          fd.append('status', status)
          fd.append('pdf', pdfFile!)
          await api.upload(`/admin/notices/${editingId}`, fd)
        } else if (removePdf) {
          await api.put(`/admin/notices/${editingId}`, { title, body, status, remove_pdf: true })
        } else {
          await api.put(`/admin/notices/${editingId}`, { title, body, status })
        }
      } else {
        if (useFormData) {
          const fd = new FormData()
          fd.append('title', title)
          fd.append('body', body)
          fd.append('status', status)
          fd.append('pdf', pdfFile!)
          await api.upload('/admin/notices', fd)
        } else {
          await api.post('/admin/notices', { title, body, status })
        }
      }
      resetForm()
      fetchNotices()
    } catch { alert('Failed to save notice') }
  }

  const handleEdit = (n: Notice) => {
    setTitle(n.title); setBody(n.body); setStatus(n.status)
    setEditingId(n.id); setExistingPdf(n.pdf_path)
    setPdfFile(null); setRemovePdf(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this notice?')) return
    api.delete(`/admin/notices/${id}`)
      .then(() => fetchNotices())
      .catch(() => {})
  }

  const handleRemovePdf = () => {
    setExistingPdf(null)
    setRemovePdf(true)
    setPdfFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPdfFile(file)
    if (file) setRemovePdf(false)
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'pdf', label: 'PDF' },
    { key: 'published_at', label: 'Published At' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = notices.map((n) => ({
    ...n,
    published_at: n.published_at || '-',
    pdf: n.pdf_path ? (
      <a href={`${UPLOAD_BASE}/${n.pdf_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
    ) : '-',
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(n)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(n.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Notice Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Notice' : 'Create Notice'}</h3>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          <Select label="Status" options={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} value={status} onChange={(e) => setStatus(e.target.value)} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">PDF Attachment</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            {existingPdf && !pdfFile && (
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate">Current: {existingPdf.split('/').pop()}</span>
                <button type="button" onClick={handleRemovePdf} className="text-red-600 hover:underline">Remove</button>
              </div>
            )}
            {pdfFile && (
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate">{pdfFile.name}</span>
                <button type="button" onClick={handleRemovePdf} className="text-red-600 hover:underline">Clear</button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit}>
              {editingId ? 'Update Notice' : 'Save Notice'}
            </Button>
            {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">All Notices</h3>
          <DataTable columns={columns} data={rows} emptyMessage="No notices yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
