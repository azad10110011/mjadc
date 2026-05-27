'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { PageContainer } from '@/components/ui/PageContainer'
import { api } from '@/lib/api'

export default function ContactPage() {
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [map, setMap] = useState('')

  useEffect(() => {
    api.get<{ status: number; data: { address: string; phone: string; email: string; map: string } }>('/contact')
      .then((res) => {
        setAddress(res.data.address || '')
        setPhone(res.data.phone || '')
        setEmail(res.data.email || '')
        setMap(res.data.map || '')
      })
      .catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Contact Us</h1>

      <div className="prose max-w-none text-gray-700 mb-8">
        <DynamicContent pageKey="contact" />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Address</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{address || 'Miah Jinnah Alam Degree College'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Phone</h3>
              <p className="text-sm text-gray-600">{phone || 'Contact number'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Email</h3>
              <p className="text-sm text-gray-600">{email || 'info@mjadc.ac.bd'}</p>
            </div>
          </div>
        </div>
        <div>
          {map ? (
            map.includes('<iframe') ? (
              <div className="w-full rounded-xl border border-gray-200 overflow-hidden [&_iframe]:w-full" style={{ height: 320 }}
                dangerouslySetInnerHTML={{ __html: map }} />
            ) : (
              <iframe
                src={map}
                className="w-full rounded-xl border border-gray-200"
                style={{ height: 320 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )
          ) : (
            <div className="aspect-video rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
              Google Map
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
