'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { UPLOAD_BASE } from '@/lib/api'

interface ImageItem {
  id: number
  photo_path: string
  caption?: string
  event_name?: string
}

interface ImageSliderProps {
  images: ImageItem[]
  currentIndex: number
  open: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export default function ImageSlider({ images, currentIndex, open, onClose, onPrev, onNext }: ImageSliderProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [open, onClose, onPrev, onNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || images.length === 0) return null

  const img = images[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={`${UPLOAD_BASE}/${img.photo_path}`}
          alt={img.caption || ''}
          className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
        />
        {(img.event_name || img.caption) && (
          <div className="mt-2 text-center text-white">
            {img.event_name && <p className="text-sm font-semibold">{img.event_name}</p>}
            {img.caption && <p className="text-sm text-gray-300">{img.caption}</p>}
          </div>
        )}
        {images.length > 1 && (
          <p className="mt-1 text-xs text-gray-400">{currentIndex + 1} / {images.length}</p>
        )}
      </div>
    </div>
  )
}
