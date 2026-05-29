'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { api } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface Form {
  id: number
  form_name: string
  pdf_path: string
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])

  useEffect(() => {
    api.get<{ data: Form[] }>('/forms').then((res) => {
      setForms(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer className="max-w-3xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Form Downloads</h1>
      <div className="space-y-3">
        {forms.length === 0 && (
          <p className="py-8 text-center text-gray-500">No downloadable forms available yet.</p>
        )}
        {forms.map((f) => (
          <a key={f.id} href={f.pdf_path} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300">
            <span className="font-medium text-gray-900">{f.form_name}</span>
            <FileDown className="h-5 w-5 text-blue-600" />
          </a>
        ))}
      </div>
    </PageContainer>
  )
}
