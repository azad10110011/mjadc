'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { PageContainer } from '@/components/ui/PageContainer'

interface StaffMember {
  id: number
  name: string
  name_bangla?: string
  designation: string
  mobile: string
  photo_path: string | null
}

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    api.get<{ data: StaffMember[] }>('/staff-list').then((res) => {
      setStaff(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Staff List</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['SL No', 'Name', 'Designation', 'Mobile', 'Picture'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {staff.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.mobile}</td>
                <td className="px-4 py-3">
                  {s.photo_path ? (
                    <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                  )}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No staff listed.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
