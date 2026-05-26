'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { GraduationCap, CalendarDays, FileText, Award, ArrowRight } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { api } from '@/lib/api'

interface Notice {
  id: number
  title: string
}

export default function HomePage() {
  const [latestNotice, setLatestNotice] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: Notice[] }>('/notices').then((res) => {
      if (res.data.length > 0) setLatestNotice(res.data[0].title)
    }).catch(() => {})
  }, [])

  return (
    <div>
      <section className="relative bg-cover bg-center py-24 text-white" style={{ backgroundImage: `url(/bg_clg.jpg)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/80 to-blue-950/80" />
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

      <section className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-600">Latest Notices:</span>
            <span className="truncate">{latestNotice || 'No recent notices.'}</span>
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
              <p className="mb-6 leading-relaxed text-gray-600">
                Miah Jinnah Alam Degree College is committed to providing quality education
                in Science, Business Studies, and Humanities. Our dedicated faculty and modern
                facilities help students achieve their full potential.
              </p>
              <Link href="/about">
                <Button variant="outline">Read More <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="aspect-video rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-400">
              College Photo
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
