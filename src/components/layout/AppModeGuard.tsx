'use client'

// Session 116: in the mobile app build only — keeps the user inside the login + panels (never the
// public website) and switches downloads/printing to the Android bridge. Renders nothing.

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { APP_LOGIN, APP_MODE, appPathAllowed, installNativeBridge } from '@/lib/appMode'

export function AppModeGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (APP_MODE) installNativeBridge()
  }, [])

  useEffect(() => {
    if (!APP_MODE || !pathname) return
    if (!appPathAllowed(pathname)) router.replace(APP_LOGIN)
  }, [pathname, router])

  return null
}
