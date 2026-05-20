'use client'

interface PhotoWithPreviewProps {
  src: string
  alt: string
  className?: string
}

export function PhotoWithPreview({ src, alt, className = '' }: PhotoWithPreviewProps) {
  return (
    <div className="group relative inline-block">
      <img src={src} alt={alt} className={`${className} cursor-pointer`} />
      <div className="pointer-events-none invisible fixed inset-0 z-50 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <div className="absolute inset-0 bg-black/30" />
        <img
          src={src}
          alt={alt}
          className="relative h-auto max-h-[60vh] w-auto max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
