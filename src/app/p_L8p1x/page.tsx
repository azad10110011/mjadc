'use client'

import { PanelLayout } from '@/components/layout'
import { QuickAccessGrid } from '@/components/quickAccess/QuickAccessGrid'

// Staff dashboard (Session 110): Quick Access shortcuts set by the admin (default: Leave Management).
export default function StaffDashboardPage() {
  return (
    <PanelLayout role="staff" title="Staff Dashboard">
      <QuickAccessGrid panel="staff" />
    </PanelLayout>
  )
}
