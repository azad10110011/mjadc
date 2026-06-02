'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface AchievementImage {
  id: number
  image_path: string
}

interface Achievement {
  id: number
  title: string
  images: AchievementImage[]
}

function ImageSlider({ images }: { images: AchievementImage[] }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
      {images.map((img, i) => (
        <img
          key={img.id}
          src={`${UPLOAD_BASE}/${img.image_path}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ))}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full ${i === current ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Achievement[] }>('/achievements')
      .then((res) => setAchievements(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageContainer>
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-8 text-2xl md:text-3xl font-bold text-gray-900">Our Achievements</h1>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : achievements.length === 0 ? (
        <div className="py-12 text-center text-gray-500">No achievements yet.</div>
      ) : (
        <div className="space-y-12">
          {achievements.map((achievement) => (
            <div key={achievement.id}>
              <h2 className="mb-4 text-xl md:text-2xl font-semibold text-gray-900">{achievement.title}</h2>
              {achievement.images && achievement.images.length > 0 ? (
                <ImageSlider images={achievement.images} />
              ) : (
                <p className="text-sm text-gray-400 italic">No images for this achievement.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
