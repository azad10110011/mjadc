'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/ui/PageContainer'
import { api } from '@/lib/api'

export default function StudentInfoPage() {
  const [headings, setHeadings] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])

  useEffect(() => {
    api.get<{ status: number; data: { headings: string[]; rows: string[][] } }>('/student-info')
      .then((res) => {
        setHeadings(res.data.headings || [])
        setRows(res.data.rows || [])
      })
      .catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/academic" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Academic
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Student Info</h1>

      {headings.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headings.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-gray-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-400 py-12">No student info available yet.</p>
      )}
    </PageContainer>
  )
}
