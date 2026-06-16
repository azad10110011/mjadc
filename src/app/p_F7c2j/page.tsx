'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { FileText, BookOpen, Calendar, DollarSign, Users, GraduationCap, Download } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdministrationDashboardPage() {
  const [noticeCount, setNoticeCount] = useState('0')
  const [syllabusCount, setSyllabusCount] = useState('0')
  const [routineCount, setRoutineCount] = useState('0')
  const [studentCount, setStudentCount] = useState('0')

  useEffect(() => {
    api.get('/admin-panel/notices').then((r: any) => setNoticeCount(String(r.data?.length || 0))).catch(() => {})
    api.get('/admin-panel/syllabus').then((r: any) => setSyllabusCount(String(r.data?.length || 0))).catch(() => {})
    api.get('/admin-panel/routines').then((r: any) => setRoutineCount(String(r.data?.length || 0))).catch(() => {})
    api.get('/admin-panel/students').then((r: any) => setStudentCount(String(r.data?.length || 0))).catch(() => {})
  }, [])

  const statCards = [
    { label: 'Notices', value: noticeCount, color: 'text-blue-600 bg-blue-100' },
    { label: 'Syllabus', value: syllabusCount, color: 'text-green-600 bg-green-100' },
    { label: 'Routines', value: routineCount, color: 'text-purple-600 bg-purple-100' },
    { label: 'Students', value: studentCount, color: 'text-cyan-600 bg-cyan-100' },
  ]

  const quickLinks = [
    { label: 'Notices', href: '/p_F7c2j/notices', icon: FileText, color: 'text-blue-600 bg-blue-100' },
    { label: 'Results', href: '/p_F7c2j/results', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Syllabus', href: '/p_F7c2j/syllabus', icon: BookOpen, color: 'text-green-600 bg-green-100' },
    { label: 'Routine', href: '/p_F7c2j/routine', icon: Calendar, color: 'text-purple-600 bg-purple-100' },
    { label: 'Fee Collection', href: '/p_F7c2j/fee-collection', icon: DollarSign, color: 'text-orange-600 bg-orange-100' },
    { label: 'Students', href: '/p_F7c2j/students', icon: Users, color: 'text-cyan-600 bg-cyan-100' },
    { label: 'Forms', href: '/p_F7c2j/forms', icon: Download, color: 'text-pink-600 bg-pink-100' },
  ]

  return (
    <PanelLayout role="administration" title="Administration Panel">
      <div className="overflow-x-auto pb-2 mb-6 scrollbar-thin">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))' }}>
        {statCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className={`text-3xl font-bold ${item.color.split(' ')[0]}`}>{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
      <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Access</h3>
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))' }}>
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-gray-900">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        </div>
      </div>
    </PanelLayout>
  )
}
