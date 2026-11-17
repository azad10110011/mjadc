'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { PeopleDirectory } from '@/components/ui/PeopleDirectory'
import { PageContainer } from '@/components/ui/PageContainer'

interface StaffMember {
  id: number
  name: string
  name_bangla?: string
  designation: string
  subject: string
  mobile: string
  photo_path: string | null
  pds_id: string | null
  mpo_index: string | null
  date_of_birth: string | null
}

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    api.get<{ data: StaffMember[] }>('/staff-list').then((res) => {
      setStaff(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PageContainer>
      <Link href="/administration" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Administration
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Staff List</h1>
      <PeopleDirectory people={staff} showEmail={false} emptyText="No staff listed." />
    </PageContainer>
  )
}
