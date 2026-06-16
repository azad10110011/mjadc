'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

interface Notice {
  id: number
  title: string
  body: string
  status: string
  published_at: string | null
  created_at?: string
  author?: string
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('draft')
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchNotices = () => {
    api.get<{ status: number; data: Notice[] }>('/admin-panel/notices')
      .then((res) => setNotices(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotices() }, [])

  const handleSubmit = async () => {
    if (!title) return
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/admin-panel/notices/${editingId}`, { title, body, status })
      } else {
        await api.post('/admin-panel/notices', { title, body, status })
      }
      setTitle(''); setBody(''); setStatus('draft'); setEditingId(null)
      fetchNotices()
    } catch (e: any) {
      alert(e.message || 'Failed to save notice')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (n: Notice) => {
    setTitle(n.title); setBody(n.body); setStatus(n.status); setEditingId(n.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notice?')) return
    try {
      await api.delete(`/admin-panel/notices/${id}`)
      fetchNotices()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const noticeColumns = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'author', label: 'Author' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions' },
  ]

  const noticeData = notices.map((n) => ({
    title: n.title,
    status: n.status,
    author: n.author,
    created_at: n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(n)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(n.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="administration" title="Notice Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Notice' : 'Create New Notice'}</h3>
          <Input label="Title" placeholder="Notice title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Body" rows={5} placeholder="Notice content..." value={body} onChange={(e) => setBody(e.target.value)} />
          <Select label="Status" options={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Select status" />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Notice' : 'Save Notice'}
            </Button>
            {editingId && <Button variant="secondary" onClick={() => { setTitle(''); setBody(''); setStatus('draft'); setEditingId(null) }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">All Notices</h3>
          <DataTable columns={noticeColumns} data={noticeData} loading={loading} emptyMessage="No notices created" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
