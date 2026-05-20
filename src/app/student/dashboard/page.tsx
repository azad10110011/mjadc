'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { GraduationCap, DollarSign } from 'lucide-react'
import { api } from '@/lib/api'

interface DashboardData {
  student: { name: string; class: string; student_id: string }
  last_result: { exam_name: string; gpa: string } | null
  total_due: number
  total_paid: number
  outstanding: number
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    api.get<{ data: DashboardData }>('/student/dashboard').then((res) => {
      setData(res.data)
    }).catch(() => {})
  }, [])

  return (
    <PanelLayout role="student" title="Student Dashboard">
      <div className="mb-6 grid gap-4 text-sm">
        <p><span className="text-gray-500">Name:</span> <span className="font-medium">{data?.student?.name || '--'}</span></p>
        <p><span className="text-gray-500">Student ID:</span> <span className="font-medium">{data?.student?.student_id || '--'}</span></p>
        <p><span className="text-gray-500">Class:</span> <span className="font-medium">{data?.student?.class || '--'}</span></p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Exam GPA</p>
              <p className="text-2xl font-bold text-gray-900">{data?.last_result?.gpa || '--'}</p>
              {data?.last_result && <p className="text-xs text-gray-400">{data.last_result.exam_name}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900">{data ? `৳${data.outstanding}` : '--'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
