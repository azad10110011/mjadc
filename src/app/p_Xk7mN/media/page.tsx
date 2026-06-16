'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

interface MediaItem {
  filename: string
  path: string
  directory: string
  size: number
  modified: string
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [file, setFile] = useState<File | null>(null)

  const fetchMedia = () => {
    api.get<{ status: number; data: MediaItem[] }>('/admin/media')
      .then((res) => setMedia(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchMedia() }, [])

  const handleUpload = async () => {
    if (!file) { alert('Select a file'); return }
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('directory', 'gallery')
      await api.upload('/admin/media/upload', fd)
      setFile(null)
      fetchMedia()
    } catch { alert('Upload failed') }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete ${item.filename}?`)) return
    const token = localStorage.getItem('token')
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'}/admin/media`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ path: item.path }),
    })
    fetchMedia()
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'filename', label: 'Filename' },
    { key: 'type', label: 'Type' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = media.map((m, i) => ({
    id: i + 1,
    filename: m.filename,
    type: m.directory,
    actions: (
      <div className="flex gap-2">
        <Link href={`/p_Xk7mN/media/${i + 1}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(m)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Media Library">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input label="Upload Media" type="file" accept=".jpg,.png,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button className="mt-4" variant="primary" onClick={handleUpload}>Upload</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No media files" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
