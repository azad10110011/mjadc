'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * True on dashboard (panel) routes: /p_xxxx/... — except the login page (Session 77).
 * Decided from the route, so the statically exported HTML never flashes the public chrome.
 */
export function useIsPanelRoute(): boolean {
  const path = usePathname() || ''
  return /^\/p_[A-Za-z0-9]+(\/|$)/.test(path) && !/\/login\/?$/.test(path)
}

/** Renders the public banner / top menu / footer only on public pages; panels get the full screen. */
export function PublicOnly({ children }: { children: ReactNode }) {
  return useIsPanelRoute() ? null : <>{children}</>
}
