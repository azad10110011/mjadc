'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { GraduationCap, CalendarDays, FileText, Award, ArrowRight } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { api, UPLOAD_BASE } from '@/lib/api'

import type { Notice } from '@/types'

export default function HomePage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [aboutContent, setAboutContent] = useState('')
  const [collegePhoto, setCollegePhoto] = useState('')
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [heroInterval, setHeroInterval] = useState(2)
  const [currentSlide, setCurrentSlide] = useState(0)

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
  }, [])

  useEffect(() => {
    if (heroImages.length < 2) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, heroInterval * 1000)
    return () => clearInterval(timer)
  }, [heroImages.length, heroInterval])

  return (
    <div>
      <section className="relative py-24 text-white overflow-hidden">
        {heroImages.length > 0 ? (
          heroImages.map((img, i) => (
            <div key={i} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: `url(${UPLOAD_BASE}/${img})` }} />
          ))
        ) : (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(/bg_clg.jpg)` }} />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            মিঞা জিন্নাহ আলম ডিগ্রী কলেজ
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100">
            Empowering education, building futures — since our founding
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/academic/results"><Button variant="primary" size="lg">View Results</Button></Link>
            <Link href="/admission"><Button variant="secondary" size="lg" className="bg-white/20 text-white hover:bg-white/30">Apply for Admission</Button></Link>
            <Link href="/pay-fees"><Button variant="secondary" size="lg" className="bg-white/20 text-white hover:bg-white/30">Pay Fees</Button></Link>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white py-3 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-2 text-sm text-gray-600">
          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="shrink-0 font-medium text-blue-600">Latest Notices:</span>
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

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold text-gray-900">About the College</h2>
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

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="prose max-w-none text-gray-700">
            <DynamicContent pageKey="home" />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Quick Links</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  )
}
