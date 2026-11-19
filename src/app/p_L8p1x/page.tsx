'use client'

import { PanelLayout } from '@/components/layout'
import { QuickAccessGrid } from '@/components/quickAccess/QuickAccessGrid'
import { ProfileCard } from '@/components/profile/ProfileCard'

// Staff dashboard (Session 110): Quick Access shortcuts set by the admin (default: Leave Management).
export default function StaffDashboardPage() {
  return (
    <PanelLayout role="staff" title="Staff Dashboard">
      <ProfileCard />
      <QuickAccessGrid panel="staff" />
    </PanelLayout>
  )
}
