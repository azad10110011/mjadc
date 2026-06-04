'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { PageContainer } from '@/components/ui/PageContainer'

interface Teacher {
  id: number
  name: string
  name_bangla?: string
  designation: string
  subject: string
  email: string
  mobile: string
  photo_path: string | null
  pds_id: string | null
  mpo_index: string | null
  date_of_birth: string | null
}

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])

  useEffect(() => {
    api.get<{ data: Teacher[] }>('/teachers-list').then((res) => {
      setTeachers(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Teacher&apos;s List</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['SL No', 'PDS ID', 'MPO Index', 'Name', 'Designation', 'Subject', 'E-mail', 'Mobile', 'Date of Birth', 'Picture'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {teachers.map((t, i) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.pds_id || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.mpo_index || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {t.name}
                  {t.name_bangla && <span className="block text-xs text-gray-500">({t.name_bangla})</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.subject}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.mobile}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.date_of_birth ? t.date_of_birth.split('-').reverse().join('/') : '-'}</td>
                <td className="px-4 py-3">
                  {t.photo_path ? (
                    <PhotoWithPreview src={`${UPLOAD_BASE}/${t.photo_path}`} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                  )}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">No teachers listed.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
