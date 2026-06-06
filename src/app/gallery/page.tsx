'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'
import ImageSlider from '@/components/ui/ImageSlider'

interface GalleryImage {
  id: number
  caption: string
  event_name: string
  photo_path: string
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [sliderIndex, setSliderIndex] = useState(0)
  const [sliderOpen, setSliderOpen] = useState(false)

  useEffect(() => {
    api.get<{ data: GalleryImage[] }>('/gallery').then((res) => {
      setImages(res.data)
    }).catch(() => {})
  }, [])

  const groups = images.reduce<Record<string, GalleryImage[]>>((acc, img) => {
    const key = img.event_name || ''
    if (!acc[key]) acc[key] = []
    acc[key].push(img)
    return acc
  }, {})

  const flatIndex = (() => {
    const map: number[] = []
    let idx = 0
    for (const key of Object.keys(groups)) {
      for (const img of groups[key]) {
        map[img.id] = idx++
      }
    }
    return map
  })()

  const openSlider = (imgId: number) => {
    setSliderIndex(flatIndex[imgId] || 0)
    setSliderOpen(true)
  }

  return (
    <PageContainer className="max-w-6xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Photo Gallery</h1>
      {Object.entries(groups).map(([eventName, imgs]) => (
        <div key={eventName || '__none__'} className="mb-8">
          {eventName && <h2 className="mb-3 text-lg font-bold text-gray-800 border-b pb-1">{eventName}</h2>}
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))' }}>
            {imgs.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-video overflow-hidden rounded-xl bg-gray-100 cursor-pointer"
                onClick={() => openSlider(img.id)}
              >
                <img
                  src={`${UPLOAD_BASE}/${img.photo_path}`}
                  alt={img.caption || img.event_name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-xs text-gray-200">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      ))}
      {images.length === 0 && (
        <div className="py-12 text-center text-gray-500">No images in gallery yet.</div>
      )}
      <ImageSlider
        images={images}
        currentIndex={sliderIndex}
        open={sliderOpen}
        onClose={() => setSliderOpen(false)}
        onPrev={() => setSliderIndex((p) => (p === 0 ? images.length - 1 : p - 1))}
        onNext={() => setSliderIndex((p) => (p === images.length - 1 ? 0 : p + 1))}
      />
    </PageContainer>
  )
}
