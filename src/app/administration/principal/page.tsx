'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { PageContainer } from '@/components/ui/PageContainer'
import type { Principal } from '@/types'

export default function PrincipalPage() {
  const [members, setMembers] = useState<Principal[]>([])
  const [fontSize, setFontSize] = useState('text-base')
  const [fontStyle, setFontStyle] = useState('font-semibold')

  useEffect(() => {
    api.get<{ data: Principal[] }>('/principals').then((res) => {
      setMembers(res.data)
    }).catch(() => {})
    api.get<{ data: { setting_value: string } }>('/settings/principal_font')
      .then((res) => {
        try { const p = JSON.parse(res.data.setting_value); setFontSize(p.fontSize || 'text-base'); setFontStyle(p.fontStyle || 'font-semibold') }
        catch {}
      })
      .catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Principal & Vice-Principal</h1>
      <div className="prose max-w-none text-gray-700 mb-8">
        <DynamicContent pageKey="principal" />
      </div>
      {members.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              {m.photo_path ? (
                <PhotoWithPreview src={`${UPLOAD_BASE}/${m.photo_path}`} alt={m.name} className="mx-auto mb-4 h-24 w-24 rounded-full object-cover" />
              ) : (
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gray-200" />
              )}
              <h2 className={`${fontSize} ${fontStyle} text-gray-900`}>{m.name}</h2>
              <p className={`${fontSize} text-gray-600`}>{m.designation}</p>
              {m.message && <p className={`mt-3 ${fontSize} text-gray-700 text-left whitespace-pre-line`}>{m.message}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No principal or vice-principal information available.
        </div>
      )}
    </PageContainer>
  )
}
