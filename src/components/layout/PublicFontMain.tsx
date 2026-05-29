'use client'

import { ReactNode } from 'react'

export function PublicFontMain({ children }: { children: ReactNode }) {
  return <main className="flex-1">{children}</main>
}
