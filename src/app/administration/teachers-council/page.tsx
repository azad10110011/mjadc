'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { PageContainer } from '@/components/ui/PageContainer'

interface CouncilMember {
  id: number
  name: string
  designation: string
  position: string
  mobile: string
  photo_path: string | null
}

export default function TeachersCouncilPage() {
  const [members, setMembers] = useState<CouncilMember[]>([])

  useEffect(() => {
    api.get<{ data: CouncilMember[] }>('/teachers-council').then((res) => {
      setMembers(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Teacher&apos;s Council</h1>
      <div className="prose max-w-none text-gray-700 mb-8">
        <DynamicContent pageKey="teachers_council" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SL No</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Designation</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mobile</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Picture</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {members.map((m, i) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{m.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{m.position || 'Member'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{m.mobile}</td>
                <td className="px-4 py-3">
                  {m.photo_path ? (
                    <PhotoWithPreview src={`${UPLOAD_BASE}/${m.photo_path}`} alt={m.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                  )}
                </td>
              </tr>
            ))}
              {members.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No council members listed.</td></tr>
              )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
