import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { PageContainer } from '@/components/ui/PageContainer'

export const metadata: Metadata = { title: 'Career Club - MJADC' }

export default function CareerClubPage() {
  return (
    <PageContainer>
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Career Club</h1>
      <div className="prose max-w-none text-gray-700">
        <DynamicContent pageKey="career_club" />
      </div>
    </PageContainer>
  )
}
