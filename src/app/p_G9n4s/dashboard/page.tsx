'use client'

// Student dashboard (Session 77): profile card, last GPA + balance, and quick links
// (My Results was not reachable from the menu before).

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { GraduationCap, DollarSign, FileText, KeyRound, ChevronRight, UserRound, CalendarCheck } from 'lucide-react'
import { api } from '@/lib/api'

interface DashboardData {
  student: { name: string; class: string; student_id: string }
  last_result: { exam_name: string; gpa: string } | null
  total_due: number
  total_paid: number
  outstanding: number
}

const LINKS = [
  { href: '/p_G9n4s/results', label: 'My Results', desc: 'Marks, GPA and position', icon: FileText, tone: 'bg-blue-100 text-blue-700' },
  { href: '/p_G9n4s/attendance', label: 'My Attendance', desc: 'Subject-wise report', icon: CalendarCheck, tone: 'bg-purple-100 text-purple-700' },
  { href: '/p_G9n4s/pay-fees', label: 'Pay Fees', desc: 'Dues and online payment', icon: DollarSign, tone: 'bg-green-100 text-green-700' },
  { href: '/change-password', label: 'Change Password', desc: 'Keep your account safe', icon: KeyRound, tone: 'bg-amber-100 text-amber-700' },
]

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ data: DashboardData }>('/student/dashboard')
      .then((res) => setData(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your dashboard'))
  }, [])

  const s = data?.student

  return (
    <PanelLayout role="student" title="Student Dashboard">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 p-5 text-white shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
            <UserRound className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm opacity-80">Welcome</p>
            <p className="truncate text-lg font-bold">{s?.name || (error ? '—' : 'Loading…')}</p>
            <p className="text-sm opacity-90">ID {s?.student_id || '--'} · Class {s?.class || '--'}</p>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Exam GPA</p>
                <p className="text-2xl font-bold text-gray-900">{data?.last_result ? Number(data.last_result.gpa).toFixed(2) : '--'}</p>
                <p className="text-xs text-gray-400">{data?.last_result ? data.last_result.exam_name : 'No published result yet'}</p>
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
                <p className={`text-2xl font-bold ${data && data.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>{data ? `৳${data.outstanding}` : '--'}</p>
                <p className="text-xs text-gray-400">{data && data.outstanding > 0 ? 'Please pay from Pay Fees' : 'No dues'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {LINKS.map(({ href, label, desc, icon: Icon, tone }) => (
              <Link key={href} href={href}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PanelLayout>
  )
}
