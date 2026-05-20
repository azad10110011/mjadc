'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { api } from '@/lib/api'

interface Report {
  id: number
  year: string
  pdf_path: string
}

export default function AnnualReportsPage() {
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    api.get<{ data: Report[] }>('/annual-reports').then((res) => {
      setReports(res.data)
    }).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Annual Reports</h1>
      <div className="space-y-3">
        {reports.length === 0 && (
          <p className="py-8 text-center text-gray-500">No annual reports available yet.</p>
        )}
        {reports.map((r) => (
          <a key={r.id} href={r.pdf_path} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300">
            <span className="font-medium text-gray-900">Annual Report {r.year}</span>
            <FileDown className="h-5 w-5 text-blue-600" />
          </a>
        ))}
      </div>
    </div>
  )
}
