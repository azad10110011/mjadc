import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'

export const metadata: Metadata = { title: 'Scholarship - MJADC' }

export default function ScholarshipPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Scholarship Information</h1>
      <div className="prose max-w-none text-gray-700">
        <DynamicContent pageKey="scholarship" />
      </div>
    </div>
  )
}
