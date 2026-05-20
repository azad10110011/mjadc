import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'

export const metadata: Metadata = {
  title: 'Principal & Vice-Principal - MJADC',
}

export default function PrincipalPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Principal & Vice-Principal</h1>
      <div className="prose max-w-none text-gray-700 mb-8">
        <DynamicContent pageKey="principal" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gray-200" />
          <h2 className="font-semibold text-gray-900">Principal Name</h2>
          <p className="text-sm text-gray-600">Principal</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gray-200" />
          <h2 className="font-semibold text-gray-900">Vice-Principal Name</h2>
          <p className="text-sm text-gray-600">Vice-Principal</p>
        </div>
      </div>
    </div>
  )
}
