'use client'

import { PageWidthProvider } from '@/contexts/PageWidthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PageWidthProvider>
      {children}
    </PageWidthProvider>
  )
}
