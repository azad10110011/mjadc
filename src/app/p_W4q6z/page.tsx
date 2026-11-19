'use client'

import { PanelLayout } from '@/components/layout'
import { QuickAccessGrid } from '@/components/quickAccess/QuickAccessGrid'
import { ProfileCard } from '@/components/profile/ProfileCard'

// Session 110: the shortcuts come from Admin › Users › Dashboard Quick Access (panel default or per-user list),
// filtered by the user's permissions.
export default function PrincipalDashboardPage() {
  return (
    <PanelLayout role="principal" title="Principal Dashboard">
      <ProfileCard />
      <QuickAccessGrid panel="principal" />
    </PanelLayout>
  )
}
