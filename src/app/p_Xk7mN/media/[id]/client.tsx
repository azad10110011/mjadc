'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'

interface MediaItem {
  filename: string
  path: string
  directory: string
  size: number
  modified: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(filename: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename)
}

export default function AdminMediaViewClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<MediaItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [directory, setDirectory] = useState('')
  const [newFilename, setNewFilename] = useState('')
  const [replaceFile, setReplaceFile] = useState<File | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<{ status: number; data: MediaItem[] }>('/admin/media')
      .then((res) => {
        const idx = parseInt(id, 10)
        const found = res.data[idx - 1]
        if (found) {
          setItem(found)
          setDirectory(found.directory)
          setNewFilename(found.filename)
        } else {
          router.push('/p_Xk7mN/media')
        }
      })
      .catch(() => { router.push('/p_Xk7mN/media') })
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      if (replaceFile) {
        const fd = new FormData()
        fd.append('file', replaceFile)
        fd.append('directory', directory)
        await api.upload('/admin/media/upload', fd)
        const token = localStorage.getItem('token')
        const delRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'}/admin/media`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ path: item.path }),
        })
        if (!delRes.ok) throw new Error('Failed to delete old file')
      }
      router.push('/p_Xk7mN/media')
    } catch {
      alert('Failed to update')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!item || !confirm(`Delete "${item.filename}"?`)) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'}/admin/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ path: item.path }),
      })
      router.push('/p_Xk7mN/media')
    } catch {
      alert('Failed to delete')
    }
  }

  const fileUrl = item ? `${UPLOAD_BASE}/${item.path}` : ''

  return (
    <PanelLayout role="admin" title={item ? item.filename : 'Media'}>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !item ? null : (
        <div className="space-y-6">
          {isImage(item.filename) && (
            <Card>
              <CardContent className="flex items-center justify-center pt-6">
                <img src={fileUrl} alt={item.filename} className="max-h-[50vh] rounded-lg object-contain shadow" />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Path</span>
                  <p className="mt-0.5 font-mono text-gray-900">{item.path}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Size</span>
                  <p className="mt-0.5 text-gray-900">{formatSize(item.size)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Modified</span>
                  <p className="mt-0.5 text-gray-900">{item.modified}</p>
                </div>
              </div>
              <hr />
              <h3 className="font-medium text-gray-700">Edit</h3>
              <Input label="Filename" value={newFilename} onChange={(e) => setNewFilename(e.target.value)} />
              <Input label="Directory" value={directory} onChange={(e) => setDirectory(e.target.value)} />
              <Input label="Replace File" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf" onChange={(e) => setReplaceFile(e.target.files?.[0] || null)} />
              <div className="flex gap-3">
                <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={() => router.push('/p_Xk7mN/media')}>Back</Button>
                <Button variant="danger" onClick={handleDelete} className="ml-auto">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PanelLayout>
  )
}
