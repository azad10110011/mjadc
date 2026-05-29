import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CO_CURRICULAR_CLUBS } from '@/types'
import { MembersList } from './members-client'
import { PageContainer } from '@/components/ui/PageContainer'

export async function generateStaticParams() {
  return CO_CURRICULAR_CLUBS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const club = CO_CURRICULAR_CLUBS.find((c) => c.slug === slug)
  if (!club) return { title: 'Not Found' }
  return { title: `${club.name} - MJADC` }
}

export default async function CoCurricularPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = CO_CURRICULAR_CLUBS.find((c) => c.slug === slug)
  if (!club) notFound()

  return (
    <PageContainer className="max-w-5xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">{club.name}</h1>
      <MembersList slug={slug} />
    </PageContainer>
  )
}
