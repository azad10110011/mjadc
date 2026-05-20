'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

interface FormItem {
  id: number
  form_name: string
  pdf_path?: string
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [formName, setFormName] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const fetchForms = () => {
    api.get<{ status: number; data: FormItem[] }>('/admin/forms')
      .then((res) => setForms(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchForms() }, [])

  const handleUpload = async () => {
    if (!formName || !pdfFile) { alert('Form name and PDF file are required'); return }
    try {
      const fd = new FormData()
      fd.append('form_name', formName)
      fd.append('pdf', pdfFile)
      await api.upload('/admin/forms', fd)
      setFormName(''); setPdfFile(null)
      fetchForms()
    } catch { alert('Upload failed') }
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this form?')) return
    api.delete(`/admin/forms/${id}`)
      .then(() => fetchForms())
      .catch(() => {})
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'form_name', label: 'Form Name' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = forms.map((f) => ({
    id: f.id,
    form_name: f.form_name,
    actions: <Button variant="danger" size="sm" onClick={() => handleDelete(f.id)}>Delete</Button>,
  }))

  return (
    <PanelLayout role="admin" title="Form Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <Input label="Form Name" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input label="PDF File" type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <Button variant="primary" onClick={handleUpload}>Upload</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No forms" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
