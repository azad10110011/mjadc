'use client'

import { ReactNode, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { usePageWidth } from '@/contexts/PageWidthContext'
import { usePublicFont } from '@/contexts/PublicFontContext'

const FONT_SIZE_MAP: Record<string, string> = {
  'text-xs': '0.75rem',
  'text-sm': '0.875rem',
  'text-base': '1rem',
  'text-lg': '1.125rem',
  'text-xl': '1.25rem',
  'text-2xl': '1.5rem',
}

const FONT_WEIGHT_MAP: Record<string, string> = {
  'font-normal': '400',
  'font-medium': '500',
  'font-semibold': '600',
  'font-bold': '700',
}

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { pageWidth } = usePageWidth()
  const pathname = usePathname()
  const { getFontForPath } = usePublicFont()
  const fontClasses = getFontForPath(pathname)
  const parts = fontClasses.split(' ')

  const fontSizeClass = parts.find((c) => FONT_SIZE_MAP[c])
  const fontWeightClass = parts.find((c) => FONT_WEIGHT_MAP[c])
  const fontSize = fontSizeClass ? FONT_SIZE_MAP[fontSizeClass] : ''
  const fontWeight = fontWeightClass ? FONT_WEIGHT_MAP[fontWeightClass] : ''

  const uid = useMemo(() => `pc-${pathname.replace(/[/]/g, '_')}`, [pathname])

  useEffect(() => {
    const styleId = `pfc-${uid}`
    const existing = document.getElementById(styleId)
    if (existing) existing.remove()

    if (fontSize || fontWeight) {
      const style = document.createElement('style')
      style.id = styleId
      // Session 77: applies to body text only — headings (and their contents) keep their own sizes.
      // Before, "* { font-size: … !important }" shrank every page title to body-text size.
      style.textContent = `
        .${uid},
        .${uid} *:not(h1, h2, h3, h4, h1 *, h2 *, h3 *, h4 *) {
          ${fontSize ? `font-size: ${fontSize} !important;` : ''}
          ${fontWeight ? `font-weight: ${fontWeight} !important;` : ''}
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      const s = document.getElementById(styleId)
      if (s) s.remove()
    }
  }, [fontSize, fontWeight, uid])

  return (
    <div className={`mx-auto px-4 py-8 md:py-12 ${fontClasses} ${uid} ${className}`} style={{ width: `${pageWidth}%` }}>
      {children}
    </div>
  )
}
