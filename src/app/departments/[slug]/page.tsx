import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DEPARTMENTS } from '@/types'
import { TeachersList } from './teachers-list-client'
import { PageContainer } from '@/components/ui/PageContainer'

export async function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const dept = DEPARTMENTS.find((d) => d.slug === slug)
  if (!dept) return { title: 'Department Not Found' }
  return { title: `${dept.name} - MJADC` }
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dept = DEPARTMENTS.find((d) => d.slug === slug)
  if (!dept) notFound()

  return (
    <PageContainer className="max-w-5xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">{dept.name}</h1>
      <TeachersList slug={slug} />
    </PageContainer>
  )
}
