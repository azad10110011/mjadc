'use client'

import { PageWidthProvider } from '@/contexts/PageWidthContext'
import { PublicFontProvider } from '@/contexts/PublicFontContext'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PageWidthProvider>
        <PublicFontProvider>
          {children}
        </PublicFontProvider>
      </PageWidthProvider>
    </AuthProvider>
  )
}
