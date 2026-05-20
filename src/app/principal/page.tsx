'use client'

import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { UserPlus, CheckSquare, DollarSign, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default function PrincipalDashboardPage() {
  return (
    <PanelLayout role="principal" title="Principal Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Add Teacher', href: '/principal/add-teacher', icon: UserPlus, color: 'text-blue-600 bg-blue-100' },
          { label: 'Add Staff', href: '/principal/add-staff', icon: UserPlus, color: 'text-green-600 bg-green-100' },
          { label: 'Result Publish', href: '/principal/result-publish', icon: CheckSquare, color: 'text-purple-600 bg-purple-100' },
          { label: 'Tuition Fee', href: '/principal/tuition-fee', icon: DollarSign, color: 'text-orange-600 bg-orange-100' },
          { label: 'Leave Management', href: '/principal/leave-management', icon: ClipboardList, color: 'text-red-600 bg-red-100' },
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
