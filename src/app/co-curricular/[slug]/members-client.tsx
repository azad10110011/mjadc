'use client'

import { useState, useEffect } from 'react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'

interface Member {
  id: number
  club: string
  name: string
  designation: string
  mobile: string
  photo_path: string | null
}

export function MembersList({ slug }: { slug: string }) {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    api.get<{ data: Member[] }>(`/co-curricular/${slug}`).then((res) => {
      setMembers(res.data)
    }).catch(() => {})
  }, [slug])

  return (
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
          {members.map((m, i) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.name}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{m.designation}</td>
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
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No members listed yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
