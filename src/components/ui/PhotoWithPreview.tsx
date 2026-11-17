'use client'

import { useState } from 'react'

interface PhotoWithPreviewProps {
  src: string
  alt: string
  className?: string
}

/** Photo with a hover preview. If the image fails to load, shows the person's initials instead of a
 *  broken-image icon with the alt text spilling out (Session 77). */
export function PhotoWithPreview({ src, alt, className = '' }: PhotoWithPreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (failedSrc === src) {
    const initials = alt.replace(/^(md\.?|mst\.?|mrs\.?|mr\.?|dr\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    return (
      <div role="img" aria-label={alt} title={alt}
        className={`${className} flex items-center justify-center bg-blue-100 text-sm font-semibold text-blue-800`}>
        {initials || '?'}
      </div>
    )
  }

  return (
    <div className="group relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`${className} cursor-pointer`} onError={() => setFailedSrc(src)} />
      <div className="pointer-events-none invisible fixed inset-0 z-50 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="absolute inset-0 bg-black/30" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="relative h-auto max-h-[60vh] w-auto max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
