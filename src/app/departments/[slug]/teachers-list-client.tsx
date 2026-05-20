'use client'

import { useState, useEffect } from 'react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'

interface Teacher {
  id: number
  name: string
  designation: string
  subject: string
  email: string
  mobile: string
  photo_path: string | null
}

export function TeachersList({ slug }: { slug: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])

  useEffect(() => {
    api.get<{ data: Teacher[] }>(`/departments/${slug}/teachers`).then((res) => {
      setTeachers(res.data)
    }).catch(() => {})
  }, [slug])

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['SL No', 'Name', 'Designation', 'Subject', 'E-mail', 'Mobile', 'Picture'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {teachers.map((t, i) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.designation}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.subject}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.email}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.mobile}</td>
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
            <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No teachers assigned yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
