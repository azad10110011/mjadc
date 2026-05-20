'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

interface GalleryImage {
  id: number
  caption: string
  event_name: string
  photo_path: string
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])

  useEffect(() => {
    api.get<{ data: GalleryImage[] }>('/gallery').then((res) => {
      setImages(res.data)
    }).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Photo Gallery</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-video overflow-hidden rounded-xl bg-gray-100">
            <img
              src={img.photo_path}
              alt={img.caption || img.event_name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-sm text-white">{img.caption}</p>
              </div>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">No images in gallery yet.</div>
        )}
      </div>
    </div>
  )
}
