'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Mail, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  const [footerText, setFooterText] = useState('© 2026-MJADC. WebSite Created & Designed By MAK Azad, Lecturer (ICT)')

  useEffect(() => {
    api.get<{ data: { setting_value: string } }>('/settings/footer-text')
      .then((res) => setFooterText(res.data.setting_value))
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                Miah Jinnah Alam Degree College
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                Contact number
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                info@mjadc.ac.bd
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-blue-600">About Us</Link></li>
              <li><Link href="/admission" className="hover:text-blue-600">Admission</Link></li>
              <li><Link href="/academic/results" className="hover:text-blue-600">Results</Link></li>
              <li><Link href="/notices" className="hover:text-blue-600">Notices</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Academics</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/academic/routine" className="hover:text-blue-600">Class Routine</Link></li>
              <li><Link href="/academic/syllabus" className="hover:text-blue-600">Syllabus</Link></li>
              <li><Link href="/academic/forms" className="hover:text-blue-600">Form Downloads</Link></li>
              <li><Link href="/academic/scholarship" className="hover:text-blue-600">Scholarship</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Portals</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/student/login" className="hover:text-blue-600">Student Login</Link></li>
              <li><Link href="/pay-fees" className="hover:text-blue-600">Pay Fees</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 bg-white py-4 text-center">
        <p className="text-sm text-gray-500">{footerText}</p>
      </div>
    </footer>
  )
}
