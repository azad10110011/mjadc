'use client'

import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { Upload, FileText, ClipboardList, Download } from 'lucide-react'
import Link from 'next/link'

export default function TeacherDashboardPage() {
  return (
    <PanelLayout role="teacher" title="Teacher Dashboard">
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))' }}>
        {[
          { label: 'Upload Result', href: '/p_R2t9b/upload-result', icon: Upload, color: 'text-blue-600 bg-blue-100' },
          { label: 'Update Result', href: '/p_R2t9b/update-result', icon: FileText, color: 'text-green-600 bg-green-100' },
          { label: 'Leave Management', href: '/p_R2t9b/leave-management', icon: ClipboardList, color: 'text-purple-600 bg-purple-100' },
          { label: 'Form Download', href: '/p_R2t9b/form-download', icon: Download, color: 'text-orange-600 bg-orange-100' },
        ].map((item) => (
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
