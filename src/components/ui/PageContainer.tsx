'use client'

import { ReactNode } from 'react'
import { usePageWidth } from '@/contexts/PageWidthContext'

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { pageWidth } = usePageWidth()

  return (
    <div className={`mx-auto px-4 py-12 ${className}`} style={{ width: `${pageWidth}%` }}>
      {children}
    </div>
  )
}
