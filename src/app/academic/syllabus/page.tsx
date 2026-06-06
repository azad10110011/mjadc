'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface SyllabusItem {
  id: number
  class: string
  department: string
  subject: string
  pdf_path: string
}

export default function SyllabusPage() {
  const [syllabi, setSyllabi] = useState<SyllabusItem[]>([])

  useEffect(() => {
    api.get<{ data: SyllabusItem[] }>('/syllabus').then((res) => {
      setSyllabi(res.data)
    }).catch(() => {})
  }, [])

  const byClass = syllabi.reduce<Record<string, SyllabusItem[]>>((acc, s) => {
    if (!acc[s.class]) acc[s.class] = []
    acc[s.class].push(s)
    return acc
  }, {})

  const classLabels: Record<string, string> = { HSC: 'HSC', 'Degree (Pass)': 'Degree (Pass)' }
  const classKeys = Object.keys(byClass).length > 0 ? Object.keys(byClass) : ['HSC', 'Degree (Pass)']

  return (
    <PageContainer className="max-w-4xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Syllabus</h1>
      {classKeys.map((cls) => (
        <div key={cls} className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{classLabels[cls] || cls}</h2>
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))' }}>
            {(byClass[cls]?.length > 0 ? byClass[cls] : (syllabi.length === 0 ? [] : [])).map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 font-medium text-gray-900">{s.department || s.subject}</h3>
                <a href={`${UPLOAD_BASE}/${s.pdf_path}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <FileDown className="h-4 w-4" /> Download PDF
                </a>
              </div>
            ))}
            {(!byClass[cls] || byClass[cls].length === 0) && (
              <div className="col-span-full py-4 text-center text-sm text-gray-500">
                No syllabus uploaded for {classLabels[cls] || cls} yet.
              </div>
            )}
            </div>
          </div>
        </div>
      ))}
    </PageContainer>
  )
}
