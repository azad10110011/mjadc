'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui'
import { GraduationCap, CalendarDays, FileText, Award, ArrowRight } from 'lucide-react'
import { usePublicFont } from '@/contexts/PublicFontContext'
import { api, UPLOAD_BASE } from '@/lib/api'

import type { Notice } from '@/types'

const HP_FONT_SIZE_MAP: Record<string, string> = {
  'text-xs': '0.75rem',
  'text-sm': '0.875rem',
  'text-base': '1rem',
  'text-lg': '1.125rem',
  'text-xl': '1.25rem',
  'text-2xl': '1.5rem',
}

const HP_FONT_WEIGHT_MAP: Record<string, string> = {
  'font-normal': '400',
  'font-medium': '500',
  'font-semibold': '600',
  'font-bold': '700',
}

export default function HomePage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [aboutContent, setAboutContent] = useState('')
  const [collegePhoto, setCollegePhoto] = useState('')
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [heroInterval, setHeroInterval] = useState(2)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [galleryImages, setGalleryImages] = useState<{ id: number; photo_path: string; caption: string; event_name: string }[]>([])
  const pathname = usePathname()
  const { getFontForPath } = usePublicFont()
  const fontClasses = getFontForPath(pathname)
  const parts = fontClasses.split(' ')
  const hpFontSizeClass = parts.find((c) => HP_FONT_SIZE_MAP[c])
  const hpFontWeightClass = parts.find((c) => HP_FONT_WEIGHT_MAP[c])
  const hpFontSize = hpFontSizeClass ? HP_FONT_SIZE_MAP[hpFontSizeClass] : ''
  const hpFontWeight = hpFontWeightClass ? HP_FONT_WEIGHT_MAP[hpFontWeightClass] : ''
  const hpUid = useMemo(() => `hp-${pathname.replace(/[/]/g, '_')}`, [pathname])

  useEffect(() => {
    api.get<{ data: Notice[] }>('/notices').then((res) => {
      setNotices(res.data || [])
    }).catch(() => {})
    api.get<{ data: { content: string } }>('/pages/about').then((res) => {
      if (res.data?.content) setAboutContent(res.data.content)
    }).catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/college_photo')
      .then((res) => setCollegePhoto(res.data?.setting_value || ''))
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/hero_images')
      .then((res) => {
        try {
          const parsed = JSON.parse(res.data?.setting_value || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) setHeroImages(parsed)
        } catch { setHeroImages([]) }
      })
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/hero_interval')
      .then((res) => { const v = parseInt(res.data?.setting_value, 10); if (v > 0) setHeroInterval(v) })
      .catch(() => {})
    api.get<{ data: { id: number; photo_path: string; caption: string; event_name: string }[] }>('/gallery')
      .then((res) => setGalleryImages(res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (heroImages.length < 2) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, heroInterval * 1000)
    return () => clearInterval(timer)
  }, [heroImages.length, heroInterval])

  useEffect(() => {
    const styleId = `hp-style-${hpUid}`
    const existing = document.getElementById(styleId)
    if (existing) existing.remove()

    if (hpFontSize || hpFontWeight) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .${hpUid},
        .${hpUid} * {
          ${hpFontSize ? `font-size: ${hpFontSize} !important;` : ''}
          ${hpFontWeight ? `font-weight: ${hpFontWeight} !important;` : ''}
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      const s = document.getElementById(styleId)
      if (s) s.remove()
    }
  }, [hpFontSize, hpFontWeight, hpUid])

  return (
    <div>
      <section className="relative py-16 md:py-24 text-white overflow-hidden min-h-[50vh] md:min-h-[60vh] flex items-center">
        {heroImages.length > 0 ? (
          heroImages.map((img, i) => (
            <div key={i} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: `url(${UPLOAD_BASE}/${img})` }} />
          ))
        ) : (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(/bg_clg.jpg)` }} />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-tight">
            মিঞা জিন্নাহ আলম ডিগ্রী কলেজ
          </h1>
          <p className="mx-auto mb-6 md:mb-8 max-w-2xl text-sm sm:text-base md:text-lg text-blue-100">
            Empowering education, building futures — since our founding
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-3">
            <Link href="/achievements"><Button variant="primary" size="lg" className="w-full sm:w-auto text-sm md:text-base">Achievement</Button></Link>
            <Link href="/academic/results"><Button variant="primary" size="lg" className="w-full sm:w-auto text-sm md:text-base">View Results</Button></Link>
            <Link href="/admission"><Button variant="primary" size="lg" className="w-full sm:w-auto text-sm md:text-base">Apply for Admission</Button></Link>
          </div>
        </div>
      </section>

      <div className={fontClasses ? `${fontClasses} ${hpUid}` : hpUid}>
      <section className="border-b border-gray-200 bg-white py-2 md:py-3 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
          <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-blue-600" />
          <span className="shrink-0 font-medium text-blue-600 whitespace-nowrap">Latest Notices:</span>
          <div className="overflow-hidden">
            <div className="animate-scroll flex gap-12 whitespace-nowrap">
              {notices.length > 0 ? (
                <>
                  {notices.map((n) => (
                    <Link key={n.id} href={`/notices/${n.id}`} className="hover:text-blue-600 transition-colors">
                      {n.title}
                    </Link>
                  ))}
                  {notices.map((n) => (
                    <Link key={`dup-${n.id}`} href={`/notices/${n.id}`} className="hover:text-blue-600 transition-colors">
                      {n.title}
                    </Link>
                  ))}
                </>
              ) : (
                <span>No recent notices.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: GraduationCap, title: 'Academic Excellence', desc: 'HSC & Degree programs with dedicated faculty' },
              { icon: Award, title: 'Scholarships', desc: 'Merit-based and need-based financial support' },
              { icon: CalendarDays, title: 'Events & Activities', desc: 'Rich co-curricular and cultural programs' },
              { icon: FileText, title: 'Online Services', desc: 'Results, fees, and applications — all online' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 p-6 text-center transition-shadow hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-8 md:gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl md:text-3xl font-bold text-gray-900">About the College</h2>
              {aboutContent ? (
                <p className="mb-6 leading-relaxed text-gray-600">{aboutContent.replace(/<[^>]+>/g, '').substring(0, 300)}...</p>
              ) : (
                <p className="mb-6 leading-relaxed text-gray-600">
                  Miah Jinnah Alam Degree College is committed to providing quality education
                  in Science, Business Studies, and Humanities. Our dedicated faculty and modern
                  facilities help students achieve their full potential.
                </p>
              )}
              <Link href="/about">
                <Button variant="outline">Read More <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="aspect-video rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-400 overflow-hidden">
              {collegePhoto ? (
                <img src={`${UPLOAD_BASE}/${collegePhoto}`} alt="College Photo" className="w-full h-full object-cover" />
              ) : (
                'College Photo'
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 text-center text-xl md:text-2xl font-bold text-gray-900">Gallery</h2>
          {galleryImages.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {galleryImages.slice(0, 8).map((img) => (
                <Link key={img.id} href="/gallery" className="group relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={`${UPLOAD_BASE}/${img.photo_path}`}
                    alt={img.caption || ''}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {(img.event_name || img.caption) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      {img.event_name && <p className="text-xs font-semibold text-white truncate">{img.event_name}</p>}
                      {img.caption && <p className="text-[10px] text-gray-200 truncate">{img.caption}</p>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No images in gallery yet.</p>
          )}
          <div className="mt-6 text-center">
            <Link href="/gallery"><Button variant="outline">View All Photos</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 md:mb-8 text-center text-xl md:text-2xl font-bold text-gray-900">Quick Links</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Class Routine', href: '/academic/routine' },
              { label: 'Syllabus', href: '/academic/syllabus' },
              { label: 'Results', href: '/academic/results' },
              { label: 'Notice Board', href: '/notices' },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm font-medium text-gray-700 transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      </div>
    </div>
  )
}
