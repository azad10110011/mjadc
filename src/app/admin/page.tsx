'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

export default function AdminDashboardPage() {
  const [noticeCount, setNoticeCount] = useState('0')
  const [userCount, setUserCount] = useState('0')

  useEffect(() => {
    api.get<{ status: number; data: unknown[] }>('/admin/notices')
      .then((res) => setNoticeCount(String(res.data.length)))
      .catch(() => {})
    api.get<{ status: number; data: unknown[] }>('/admin/users')
      .then((res) => setUserCount(String(res.data.length)))
      .catch(() => {})
  }, [])

  return (
    <PanelLayout role="admin" title="Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Published Notices', value: noticeCount, color: 'text-blue-600' },
          { label: 'Pending Approvals', value: '0', color: 'text-yellow-600' },
          { label: 'Registered Users', value: userCount, color: 'text-green-600' },
          { label: 'Last 30 Days Visitors', value: '0', color: 'text-purple-600' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelLayout>
  )
}
