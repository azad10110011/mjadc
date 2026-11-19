'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { QuickAccessGrid } from '@/components/quickAccess/QuickAccessGrid'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { canSeeLink } from '@/lib/permissions'

export default function AdministrationDashboardPage() {
  const { user } = useAuth() // Session 101: only features this user has
  const [noticeCount, setNoticeCount] = useState('0')
  const [syllabusCount, setSyllabusCount] = useState('0')
  const [routineCount, setRoutineCount] = useState('0')
  const [studentCount, setStudentCount] = useState('0')

  useEffect(() => {
    if (!user) return
    const on = (href: string) => canSeeLink(user, href)
    if (on('/p_F7c2j/notices')) api.get('/admin-panel/notices').then((r: any) => setNoticeCount(String(r.data?.length || 0))).catch(() => {})
    if (on('/p_F7c2j/syllabus')) api.get('/admin-panel/syllabus').then((r: any) => setSyllabusCount(String(r.data?.length || 0))).catch(() => {})
    if (on('/p_F7c2j/routine')) api.get('/admin-panel/routines').then((r: any) => setRoutineCount(String(r.data?.length || 0))).catch(() => {})
    if (on('/p_F7c2j/students')) api.get('/admin-panel/students').then((r: any) => setStudentCount(String(r.data?.length || 0))).catch(() => {})
  }, [user])

  const statCards = [
    { label: 'Notices', value: noticeCount, color: 'text-blue-600 bg-blue-100', href: '/p_F7c2j/notices' },
    { label: 'Syllabus', value: syllabusCount, color: 'text-green-600 bg-green-100', href: '/p_F7c2j/syllabus' },
    { label: 'Routines', value: routineCount, color: 'text-purple-600 bg-purple-100', href: '/p_F7c2j/routine' },
    { label: 'Students', value: studentCount, color: 'text-cyan-600 bg-cyan-100', href: '/p_F7c2j/students' },
  ].filter((c) => canSeeLink(user, c.href))


  return (
    <PanelLayout role="administration" title="Administration Panel">
      <ProfileCard />
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
      <QuickAccessGrid panel="administration" />
    </PanelLayout>
  )
}
