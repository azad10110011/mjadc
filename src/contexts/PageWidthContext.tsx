'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

interface PageWidthContextValue {
  pageWidth: number
}

const PageWidthContext = createContext<PageWidthContextValue>({ pageWidth: 90 })

export function PageWidthProvider({ children }: { children: ReactNode }) {
  const [pageWidth, setPageWidth] = useState(90)

  useEffect(() => {
    api.get<{ status: number; data: { setting_value: string } }>('/settings/page_width')
      .then((res) => {
        const val = parseInt(res.data.setting_value, 10)
        if (val > 0 && val <= 100) setPageWidth(val)
      })
      .catch(() => {})
  }, [])

  return (
    <PageWidthContext.Provider value={{ pageWidth }}>
      {children}
    </PageWidthContext.Provider>
  )
}

export function usePageWidth() {
  return useContext(PageWidthContext)
}
