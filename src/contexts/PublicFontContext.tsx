'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

interface PageFontSetting {
  fontSize: string
  fontStyle: string
}

type PageFontSettings = Record<string, PageFontSetting>

interface PublicFontContextValue {
  getFontForPath: (pathname: string) => string
}

const PublicFontContext = createContext<PublicFontContextValue>({
  getFontForPath: () => '',
})

export function PublicFontProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PageFontSettings>({})

  useEffect(() => {
    api.get<{ status: number; data: { setting_value: string } }>('/settings/page_font_settings')
      .then((res) => {
        if (res.data?.setting_value) {
          try { setSettings(JSON.parse(res.data.setting_value)) }
          catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  const getFontForPath = (pathname: string): string => {
    const setting = settings[pathname]
    if (setting) return `${setting.fontSize} ${setting.fontStyle}`
    const parent = pathname.substring(0, pathname.lastIndexOf('/'))
    if (parent && settings[parent]) return `${settings[parent].fontSize} ${settings[parent].fontStyle}`
    return ''
  }

  return (
    <PublicFontContext.Provider value={{ getFontForPath }}>
      {children}
    </PublicFontContext.Provider>
  )
}

export function usePublicFont() {
  return useContext(PublicFontContext)
}
