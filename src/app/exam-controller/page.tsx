'use client'

import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { Upload, CheckSquare } from 'lucide-react'
import Link from 'next/link'

export default function ExamControllerDashboardPage() {
  return (
    <PanelLayout role="exam_controller" title="Exam Controller Dashboard">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Upload Result', href: '/exam-controller/upload-result', icon: Upload, color: 'text-blue-600 bg-blue-100' },
          { label: 'Approve Result', href: '/exam-controller/approve-result', icon: CheckSquare, color: 'text-green-600 bg-green-100' },
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
    </PanelLayout>
  )
}
