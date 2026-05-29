'use client'

import { PageWidthProvider } from '@/contexts/PageWidthContext'
import { PublicFontProvider } from '@/contexts/PublicFontContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PageWidthProvider>
      <PublicFontProvider>
        {children}
      </PublicFontProvider>
    </PageWidthProvider>
  )
}
