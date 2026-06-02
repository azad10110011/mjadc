'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'
import type { AcademicApproval } from '@/types'

export default function AcademicApprovalPage() {
  const [items, setItems] = useState<AcademicApproval[]>([])

  useEffect(() => {
    api.get<{ data: AcademicApproval[] }>('/academic-approvals').then((res) => {
      setItems(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/about" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> About Us
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Academic Approval</h1>
      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{item.heading}</h2>
            {item.image_path && (
              <img
                src={`${UPLOAD_BASE}/${item.image_path}`}
                alt={item.heading}
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: 900 }}
              />
            )}
            {item.image_width && (
              <p className="mt-2 text-xs text-gray-500">
                Image size: {item.image_width} x {item.image_height}px
              </p>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No approvals added yet.</div>
        )}
      </div>
    </PageContainer>
  )
}
