'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'

interface Routine {
  id: number
  class: string
  section: string
  pdf_path: string
}

export default function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([])

  useEffect(() => {
    api.get<{ data: Routine[] }>('/routines').then((res) => {
      setRoutines(res.data)
    }).catch(() => {})
  }, [])

  const grouped = routines.reduce<Record<string, Routine[]>>((acc, r) => {
    if (!acc[r.class]) acc[r.class] = []
    acc[r.class].push(r)
    return acc
  }, {})

  const classKeys = Object.keys(grouped).length > 0 ? Object.keys(grouped) : ['11th', '12th']

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Class Routine</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {classKeys.map((cls) => (
          <div key={cls} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-gray-900">Class {cls}</h2>
            {grouped[cls]?.map((r) => (
              <a key={r.id} href={`${UPLOAD_BASE}/${r.pdf_path}`} target="_blank" rel="noopener noreferrer"
                className="mb-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 last:mb-0">
                <FileDown className="h-4 w-4" />
                {r.section ? `${r.section} Section` : 'Download PDF'}
              </a>
            ))}
            {(!grouped[cls] || grouped[cls].length === 0) && (
              <p className="text-sm text-gray-500">No routine uploaded yet.</p>
            )}
          </div>
        ))}
        {routines.length === 0 && classKeys.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-500">No routines available.</div>
        )}
      </div>
    </div>
  )
}
