'use client'

import { useState, useEffect, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { ArrowUp, ArrowDown, Plus } from 'lucide-react'
import type { AcademicApproval } from '@/types'

export default function AdminAcademicApprovalsPage() {
  const [items, setItems] = useState<AcademicApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [heading, setHeading] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [imageHeight, setImageHeight] = useState<number | null>(null)
  const [dimensionError, setDimensionError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setEditingId(null); setHeading(''); setImageFile(null); setExistingImagePath(null)
    setImageWidth(null); setImageHeight(null); setDimensionError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const fetchItems = () => {
    api.get('/admin/academic-approvals').then((r: any) => setItems(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Invalid image'))
      }
      img.src = url
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setDimensionError('')
    try {
      const dims = await validateImageDimensions(file)
      setImageWidth(dims.width)
      setImageHeight(dims.height)
    } catch {
      setDimensionError('Could not read image dimensions')
    }
  }

  const uploadImage = async (): Promise<string> => {
    const formData = new FormData()
    formData.append('file', imageFile!)
    formData.append('directory', 'documents')
    const res: any = await api.upload('/admin/media/upload', formData)
    if (!res.data?.path) throw new Error('Upload succeeded but no path returned')
    return res.data.path
  }

  const handleSubmit = async () => {
    if (!heading) return
    setSubmitting(true)
    try {
      let imgPath = existingImagePath
      let imgW = imageWidth
      let imgH = imageHeight

      if (imageFile) {
        imgPath = await uploadImage()
        if (!imgW || !imgH) {
          const dims = await validateImageDimensions(imageFile)
          imgW = dims.width
          imgH = dims.height
        }
      }

      if (editingId) {
        await api.put(`/admin/academic-approvals/${editingId}`, {
          heading, image_path: imgPath || undefined,
          image_width: imgW, image_height: imgH,
        })
      } else {
        await api.post('/admin/academic-approvals', {
          heading, image_path: imgPath || undefined,
          image_width: imgW, image_height: imgH,
        })
      }
      resetForm()
      const r: any = await api.get('/admin/academic-approvals')
      setItems(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: AcademicApproval) => {
    setEditingId(item.id); setHeading(item.heading)
    setExistingImagePath(item.image_path || null); setImageFile(null)
    setImageWidth(item.image_width || null); setImageHeight(item.image_height || null)
    setDimensionError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this approval?')) return
    api.delete(`/admin/academic-approvals/${id}`).then(() => fetchItems()).catch(() => {})
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/academic-approvals/${id}/move-up`, {}).then(() => fetchItems()).catch(() => {})
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/academic-approvals/${id}/move-down`, {}).then(() => fetchItems()).catch(() => {})
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'heading', label: 'Heading' },
    { key: 'image', label: 'Image' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = items.map((item, i) => ({
    ...item,
    sl: i + 1,
    image: item.image_path
      ? <img src={`${UPLOAD_BASE}/${item.image_path}`} alt={item.heading} className="h-12 w-auto rounded object-cover" />
      : <span className="text-gray-400 text-xs">No image</span>,
    dimensions: item.image_width
      ? `${item.image_width} x ${item.image_height}px`
      : '—',
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => handleMoveUp(item.id)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleMoveDown(item.id)} disabled={i === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Academic Approvals">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Approval' : 'Add New Approval'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Heading" placeholder="Approval heading text" required value={heading} onChange={(e) => setHeading(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                ref={fileInputRef}
                key={editingId ?? 'new'}
                onChange={handleImageChange}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {dimensionError && <p className="text-xs text-red-600 mt-1">{dimensionError}</p>}
              {existingImagePath && !imageFile && (
                <p className="text-xs text-gray-500 mt-1">Current: {existingImagePath.split('/').pop()} ({imageWidth} x {imageHeight}px)</p>
              )}
              {imageWidth && imageFile && (
                <p className="text-xs text-green-600 mt-1">{imageWidth} x {imageHeight}px</p>
              )}
            </div>
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Approval' : 'Add Approval'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Academic Approvals</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No approvals added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
