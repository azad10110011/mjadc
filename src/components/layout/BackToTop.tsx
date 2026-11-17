'use client'

// Floating "back to top" button for long public pages (Session 77). Appears after scrolling ~600px.

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      aria-label="Back to top"
      className="no-print fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg ring-2 ring-white/70 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
