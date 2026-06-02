'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { Trash2, Upload, Expand } from 'lucide-react'
import ImageSlider from '@/components/ui/ImageSlider'

interface GalleryImage {
  id: number
  caption: string
  event_name: string
  photo_path: string
  uploaded_at: string
  uploaded_by_name: string
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [eventName, setEventName] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sliderIndex, setSliderIndex] = useState(0)
  const [sliderOpen, setSliderOpen] = useState(false)

  const fetchImages = () => {
    api.get<{ data: GalleryImage[] }>('/admin/gallery')
      .then((res) => setImages(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchImages() }, [])

  const handleUpload = async () => {
    if (!files || files.length === 0) { alert('Select at least one image'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) {
        fd.append('files[]', files[i])
      }
      fd.append('caption', caption)
      fd.append('event_name', eventName)
      await api.upload('/admin/gallery', fd)
      setFiles(null)
      setCaption('')
      setEventName('')
      fetchImages()
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this image?')) return
    try {
      await api.delete(`/admin/gallery/${id}`)
      fetchImages()
    } catch (e: any) {
      alert(e.message || 'Delete failed')
    }
  }

  return (
    <PanelLayout role="admin" title="Gallery Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Upload New Image</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Title / Caption" placeholder="Image caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <Input label="Event Name (optional)" placeholder="e.g. Annual Sports Day" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          </div>
          <div>
            <Input label="Image Files" type="file" accept=".jpg,.jpeg,.png,.gif,.webp" multiple onChange={(e) => setFiles(e.target.files)} />
            {files && files.length > 0 && <p className="text-sm text-gray-500">{files.length} file(s) selected</p>}
          </div>
          <Button variant="primary" onClick={handleUpload} disabled={uploading || !files || files.length === 0}>
            {uploading ? 'Uploading...' : `Upload${files && files.length > 1 ? ` (${files.length} files)` : ''}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Gallery Images ({images.length})</h3>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : images.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No images uploaded yet.</div>
          ) : (
            Object.entries(
              images.reduce<Record<string, GalleryImage[]>>((acc, img) => {
                const key = img.event_name || 'Uncategorized'
                if (!acc[key]) acc[key] = []
                acc[key].push(img)
                return acc
              }, {})
            ).map(([eventName, imgs]) => (
              <div key={eventName} className="mb-6">
                <h4 className="mb-2 text-sm font-bold text-gray-700 border-b pb-1">{eventName}</h4>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {imgs.map((img, i) => {
                    const globalIndex = images.findIndex((x) => x.id === img.id)
                    return (
                      <div key={img.id} className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                          src={`${UPLOAD_BASE}/${img.photo_path}`}
                          alt={img.caption || ''}
                          className="h-full w-full object-cover cursor-pointer"
                          onClick={() => { setSliderIndex(globalIndex); setSliderOpen(true) }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        {img.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <p className="text-[10px] text-gray-200 truncate">{img.caption}</p>
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(img.id)}
                          className="absolute top-1 right-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setSliderIndex(globalIndex); setSliderOpen(true) }}
                          className="absolute top-1 left-1 rounded-full bg-black/50 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Expand className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <ImageSlider
        images={images}
        currentIndex={sliderIndex}
        open={sliderOpen}
        onClose={() => setSliderOpen(false)}
        onPrev={() => setSliderIndex((p) => (p === 0 ? images.length - 1 : p - 1))}
        onNext={() => setSliderIndex((p) => (p === images.length - 1 ? 0 : p + 1))}
      />
    </PanelLayout>
  )
}
