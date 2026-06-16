'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui'
import { GraduationCap, CalendarDays, FileText, Award, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePublicFont } from '@/contexts/PublicFontContext'
import { api, UPLOAD_BASE } from '@/lib/api'

import type { Notice } from '@/types'

interface HeroSlide {
  path: string
  cropX: number
  cropY: number
  title?: string
  subtitle?: string
  buttonText?: string
  buttonLink?: string
}

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

const resp = (val: string, min = 0.6, max = 1.5) => {
  const v = parseFloat(val)
  return v ? `clamp(${Math.round(v * min)}px, ${(v / 19.2).toFixed(2)}vw, ${Math.round(v * max)}px)` : undefined
}

export default function HomePage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [aboutContent, setAboutContent] = useState('')
  const [collegePhoto, setCollegePhoto] = useState('')
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [heroInterval, setHeroInterval] = useState(2)
  const [heroWidth, setHeroWidth] = useState(100)
  const [heroHeight, setHeroHeight] = useState(55)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [galleryImages, setGalleryImages] = useState<{ id: number; photo_path: string; caption: string; event_name: string }[]>([])
  const [homeLinkLabel, setHomeLinkLabel] = useState('')
  const [homeLinkUrl, setHomeLinkUrl] = useState('')
  const [menuSections, setMenuSections] = useState<{ title: string; titleSize: string; titleColor: string; titleStyle: string; titleAlign: string; bgColor: string; links: { label: string; url: string }[] }[]>([])
  const [noticeBg, setNoticeBg] = useState('#ffffff')
  const [noticeTextColor, setNoticeTextColor] = useState('#4b5563')
  const [noticeFontSize, setNoticeFontSize] = useState('')
  const [sliderBg, setSliderBg] = useState('#1e3a5f')
  const [collegePhotoWidth, setCollegePhotoWidth] = useState('')
  const [collegePhotoHeight, setCollegePhotoHeight] = useState('')
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
          if (Array.isArray(parsed) && parsed.length > 0) setHeroSlides(parsed.map((p: any) => typeof p === 'string' ? { path: p, cropX: 50, cropY: 50 } : p))
        } catch { setHeroSlides([]) }
      })
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/hero_interval')
      .then((res) => { const v = parseInt(res.data?.setting_value, 10); if (v > 0) setHeroInterval(v) })
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/hero_slider_width')
      .then((res) => { const v = parseInt(res.data?.setting_value, 10); if (v > 0 && v <= 100) setHeroWidth(v) })
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/hero_slider_height')
      .then((res) => { const v = parseInt(res.data?.setting_value, 10); if (v > 0 && v <= 100) setHeroHeight(v) })
      .catch(() => {})
    api.get<{ data: { id: number; photo_path: string; caption: string; event_name: string }[] }>('/gallery')
      .then((res) => setGalleryImages(res.data || []))
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/homepage_link_label')
      .then((res) => setHomeLinkLabel(res.data?.setting_value || ''))
      .catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/homepage_link_url')
      .then((res) => setHomeLinkUrl(res.data?.setting_value || ''))
      .catch(() => {})

    const extraKeys = ['notice_bg', 'notice_text_color', 'notice_font_size', 'slider_bg', 'homepage_menu_sections', 'college_photo_width', 'college_photo_height']
    Promise.all(extraKeys.map((k) =>
      api.get<{ data: { setting_value: string } }>(`/settings/${k}`).then((r) => ({ key: k, value: r.data?.setting_value })).catch(() => ({ key: k, value: null }))
    )).then((results) => {
      for (const r of results) {
        if (!r.value) continue
        if (r.key === 'notice_bg') setNoticeBg(r.value)
        if (r.key === 'notice_text_color') setNoticeTextColor(r.value)
        if (r.key === 'slider_bg') setSliderBg(r.value)
        if (r.key === 'notice_font_size') setNoticeFontSize(r.value)
        if (r.key === 'college_photo_width') setCollegePhotoWidth(r.value)
        if (r.key === 'college_photo_height') setCollegePhotoHeight(r.value)
        if (r.key === 'homepage_menu_sections') {
          try { const parsed = JSON.parse(r.value); if (Array.isArray(parsed) && parsed.length > 0) setMenuSections(parsed) }
          catch {}
        }
      }
    })
  }, [])

  useEffect(() => {
    if (heroSlides.length < 2) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, heroInterval * 1000)
    return () => clearInterval(timer)
  }, [heroSlides.length, heroInterval])

  useEffect(() => {
    setCurrentSlide(0)
  }, [heroSlides])

  const goToSlide = (idx: number) => setCurrentSlide(idx)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)

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

  const slide = heroSlides[currentSlide]

  return (
    <div>
      {/* Hero Slider */}
      <section style={{ backgroundColor: sliderBg, position: 'relative', minWidth: '100vw' }}>
        <div className="mx-auto relative" style={{ width: `${heroWidth}vw`, height: `${heroHeight}vh`, maxWidth: '100vw' }}>
          <div className="absolute inset-0 overflow-hidden rounded-none">
            {heroSlides.length > 0 && slide ? (
              <div className="w-full h-full bg-no-repeat" style={{ backgroundImage: `url(${UPLOAD_BASE}/${slide.path})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', WebkitFilter: 'blur(20px)', transform: 'scale(1.1)' }} />
            ) : (
              <div className="w-full h-full bg-no-repeat" style={{ backgroundImage: `url(/bg_clg.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', WebkitFilter: 'blur(20px)', transform: 'scale(1.1)' }} />
            )}
          </div>
          {heroSlides.length > 0 && slide ? (
            <>
              <div className="absolute inset-0 bg-black/40" />
              <div key={currentSlide} className="absolute inset-0 bg-no-repeat" style={{ backgroundImage: `url(${UPLOAD_BASE}/${slide.path})`, backgroundSize: 'contain', backgroundPosition: 'center' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-white z-10">
                {slide.title && (
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-center mb-3 drop-shadow-lg max-w-3xl">
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="text-sm md:text-lg text-center mb-6 drop-shadow-md max-w-2xl opacity-90">
                    {slide.subtitle}
                  </p>
                )}
                {slide.buttonText && slide.buttonLink && (
                  <Link href={slide.buttonLink}>
                    <Button variant="primary" size="lg" className="text-sm md:text-base font-semibold shadow-lg">
                      {slide.buttonText}
                    </Button>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 bg-no-repeat" style={{ backgroundImage: `url(/bg_clg.jpg)`, backgroundSize: 'contain', backgroundPosition: 'center' }} />
            </>
          )}
        </div>
        {heroSlides.length > 1 && (
          <>
            <button onClick={prevSlide} className="absolute z-20 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors" style={{ left: '12px' }}>
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button onClick={nextSlide} className="absolute z-20 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors" style={{ right: '12px' }}>
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Scrolling Notice */}
      <section className="border-b border-gray-200 overflow-hidden" style={{ backgroundColor: noticeBg, borderColor: noticeTextColor, minWidth: '100vw' }}>
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-2 py-2" style={{ color: noticeTextColor, fontSize: resp(noticeFontSize) }}>
          <FileText className="h-4 w-4 shrink-0" />
          <span className="shrink-0 font-semibold whitespace-nowrap">Notice:</span>
          <div className="overflow-hidden flex-1">
            <div className="animate-scroll flex gap-12 whitespace-nowrap">
              {notices.length > 0 ? (
                <>
                  {notices.map((n) => (
                    <Link key={n.id} href={n.pdf_path ? `${UPLOAD_BASE}/${n.pdf_path}` : '/notices'} target={n.pdf_path ? '_blank' : undefined} className="hover:underline transition-colors" style={{ color: noticeTextColor }}>
                      {n.title}
                    </Link>
                  ))}
                  {notices.map((n) => (
                    <Link key={`dup-${n.id}`} href={n.pdf_path ? `${UPLOAD_BASE}/${n.pdf_path}` : '/notices'} target={n.pdf_path ? '_blank' : undefined} className="hover:underline transition-colors" style={{ color: noticeTextColor }}>
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

      <div className={fontClasses ? `${fontClasses} ${hpUid}` : hpUid}>
      {/* Feature cards */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))' }}>
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
        </div>
      </section>

      {/* About */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-8">
    <div className="overflow-x-hidden">
              <h2 className="mb-4 text-[clamp(1.25rem,3vw,1.875rem)] font-bold text-gray-900">About the College</h2>
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
            <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-400 overflow-hidden"
              style={{
                width: collegePhotoWidth ? `${collegePhotoWidth}%` : undefined,
                height: collegePhotoHeight ? `${collegePhotoHeight}%` : undefined,
                aspectRatio: collegePhotoWidth && collegePhotoHeight ? 'auto' : '16 / 9',
              }}
            >
              {collegePhoto ? (
                <img
                  src={`${UPLOAD_BASE}/${collegePhoto}`}
                  alt="College Photo"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                'College Photo'
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 text-center text-[clamp(1.125rem,2.5vw,1.5rem)] font-bold text-gray-900">Gallery</h2>
          {galleryImages.length > 0 ? (
            <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))' }}>
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
            </div>
          ) : (
            <p className="text-center text-gray-500">No images in gallery yet.</p>
          )}
          <div className="mt-6 text-center">
            <Link href="/gallery"><Button variant="outline">View All Photos</Button></Link>
          </div>
        </div>
      </section>

      {homeLinkLabel && homeLinkUrl && (
        <section className="border-y border-gray-200 bg-blue-50 py-10">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <Link href={homeLinkUrl}
              className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              {homeLinkLabel}
            </Link>
          </div>
        </section>
      )}

      </div>

      {/* Menu sections */}
      {menuSections.length > 0 && (
        <section className="py-12 border-t border-gray-200">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-6 text-center text-[clamp(1.125rem,2.5vw,1.5rem)] font-bold text-gray-900">Quick Menu</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {menuSections.map((section, si) => (
                <div key={si} className="rounded-xl p-5" style={{ backgroundColor: section.bgColor || '#ffffff' }}>
                  {section.title && (
                    <h3 className={`mb-4 ${section.titleStyle || 'font-bold'} ${section.titleAlign || 'text-left'}`}
                      style={{ fontSize: HP_FONT_SIZE_MAP[section.titleSize || 'text-lg'] || '1.125rem', color: section.titleColor || '#111827' }}
                    >
                      {section.title}
                    </h3>
                  )}
                  {section.links.length > 0 && (
                    <ul className="space-y-2">
                      {section.links.filter((l) => l.label && l.url).map((link, li) => (
                        <li key={li}>
                          <Link href={link.url}
                            className="block rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
