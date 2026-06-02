'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { Plus, Trash2, ArrowUp, ArrowDown, ImageUp, X } from 'lucide-react'

interface AchievementImage {
  id: number
  image_path: string
  sort_order: number
}

interface Achievement {
  id: number
  title: string
  sort_order: number
  image_count: number
  images?: AchievementImage[]
}

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [images, setImages] = useState<AchievementImage[]>([])
  const [uploading, setUploading] = useState(false)

  const resetForm = () => {
    setEditingId(null); setTitle('')
  }

  const fetchAchievements = () => {
    api.get('/admin/achievements').then((r: any) => setAchievements(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAchievements() }, [])

  const fetchImages = (achievement: Achievement) => {
    setSelectedAchievement(achievement)
    api.get(`/admin/achievements/${achievement.id}`).then((r: any) => {
      setImages(r.data?.images || [])
    }).catch(() => {})
  }

  const handleSubmit = async () => {
    if (!title) return
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/admin/achievements/${editingId}`, { title })
      } else {
        await api.post('/admin/achievements', { title })
      }
      resetForm()
      const r: any = await api.get('/admin/achievements')
      setAchievements(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (a: Achievement) => {
    setEditingId(a.id); setTitle(a.title)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this achievement and all its images?')) return
    await api.delete(`/admin/achievements/${id}`)
    if (selectedAchievement?.id === id) { setSelectedAchievement(null); setImages([]) }
    fetchAchievements()
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/achievements/${id}/move-up`, {}).then(() => fetchAchievements()).catch(() => {})
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/achievements/${id}/move-down`, {}).then(() => fetchAchievements()).catch(() => {})
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedAchievement) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData()
        formData.append('file', file)
        await api.upload(`/admin/achievements/${selectedAchievement.id}/images`, formData)
      }
      await fetchImages(selectedAchievement)
      fetchAchievements()
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!selectedAchievement) return
    if (!confirm('Delete this image?')) return
    await api.delete(`/admin/achievements/${selectedAchievement.id}/images/${imageId}`)
    await fetchImages(selectedAchievement)
    fetchAchievements()
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'title', label: 'Title' },
    { key: 'images', label: 'Images' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = achievements.map((a, i) => ({
    ...a,
    sl: i + 1,
    images: (
      <span className="text-sm text-gray-600">{a.image_count} image(s)</span>
    ),
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => handleMoveUp(a.id)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleMoveDown(a.id)} disabled={i === achievements.length - 1}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" onClick={() => fetchImages(a)}>Manage Images</Button>
        <Button variant="secondary" size="sm" onClick={() => handleEdit(a)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Achievements">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Achievement' : 'Add New Achievement'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input label="Title" placeholder="Achievement title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Achievements</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No achievements added yet" />
        </CardContent>
      </Card>

      {selectedAchievement && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Images for: {selectedAchievement.title}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedAchievement(null); setImages([]) }}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Upload Images</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  multiple
                  onChange={handleUploadImage}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && <span className="text-sm text-blue-600">Uploading...</span>}
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No images uploaded yet.</p>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={`${UPLOAD_BASE}/${img.image_path}`}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="14" fill="%23999">No img</text></svg>' }}
                    />
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
