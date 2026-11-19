'use client'

import { PageWidthProvider } from '@/contexts/PageWidthContext'
import { PublicFontProvider } from '@/contexts/PublicFontContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppModeGuard } from '@/components/layout/AppModeGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppModeGuard />
      <PageWidthProvider>
        <PublicFontProvider>
          {children}
        </PublicFontProvider>
      </PageWidthProvider>
    </AuthProvider>
  )
}
