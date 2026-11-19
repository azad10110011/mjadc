'use client'

// Private pictures (Session 123): images that must not be public (student receipts, result sheets) are only
// served by authenticated API endpoints, so a plain <img src> can't load them — AuthImage fetches with the
// login token and shows the result. ImagePicker = "Take photo" (camera) + "Choose from gallery".

import { useEffect, useRef, useState } from 'react'
import { Camera, Download, ImageIcon, ImageOff, X } from 'lucide-react'
import { API_BASE } from '@/lib/api'
import { compressImage } from '@/lib/imageCompress'

async function fetchBlob(path: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

/** Save a private picture to the device (in the app this goes to Downloads/MJADC). */
export async function downloadPrivate(path: string, filename: string) {
  const blob = await fetchBlob(path)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function AuthImage({ path, alt, className, onClick }: { path: string; alt: string; className?: string; onClick?: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    let url: string | null = null
    fetchBlob(path)
      .then((b) => { if (!alive) return; url = URL.createObjectURL(b); setSrc(url) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [path])
  if (failed) {
    return <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className || ''}`}><ImageOff className="h-6 w-6" /></div>
  }
  if (!src) return <div className={`animate-pulse bg-gray-200 ${className || ''}`} />
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src} alt={alt} className={`object-cover ${className || ''}`} />
  return onClick ? <button type="button" onClick={onClick} className="block" aria-label={`Open ${alt}`}>{img}</button> : img
}

/** Full-screen viewer for one private picture. */
export function ImageViewer({ path, title, subtitle, filename, onClose, actions }: {
  path: string; title: string; subtitle?: string; filename: string; onClose: () => void; actions?: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label={title} onClick={onClose}>
      <div className="flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          {subtitle && <p className="truncate text-sm text-gray-300">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10"><X className="h-6 w-6" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
        <AuthImage path={path} alt={title} className="max-h-full max-w-full !object-contain" />
      </div>
      <div className="flex flex-wrap justify-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await downloadPrivate(path, filename) } finally { setBusy(false) } }}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-60">
          <Download className="h-4 w-4" /> {busy ? 'Saving…' : 'Save'}
        </button>
        {actions}
      </div>
    </div>
  )
}

/** Camera / gallery buttons. Pictures are shrunk before they are handed over. */
export function ImagePicker({ onFiles, disabled, label = 'Add picture' }: { onFiles: (files: File[]) => void; disabled?: boolean; label?: string }) {
  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)
  const [preparing, setPreparing] = useState(false)
  const take = async (list: FileList | null, input: HTMLInputElement | null) => {
    if (!list?.length) return
    setPreparing(true)
    try {
      const files = await Promise.all(Array.from(list).map((f) => compressImage(f, 1800, 0.85)))
      onFiles(files)
    } finally {
      setPreparing(false)
      if (input) input.value = ''
    }
  }
  return (
    <div className="grid grid-cols-2 gap-2" aria-label={label}>
      <button type="button" disabled={disabled || preparing} onClick={() => cam.current?.click()}
        className="flex flex-col items-center gap-1 rounded-xl bg-blue-700 px-3 py-4 text-sm font-semibold text-white disabled:opacity-60">
        <Camera className="h-6 w-6" /> Take photo
      </button>
      <button type="button" disabled={disabled || preparing} onClick={() => gal.current?.click()}
        className="flex flex-col items-center gap-1 rounded-xl border-2 border-blue-700 px-3 py-4 text-sm font-semibold text-blue-800 disabled:opacity-60">
        <ImageIcon className="h-6 w-6" /> Choose from gallery
      </button>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => take(e.target.files, e.target)} />
      <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={(e) => take(e.target.files, e.target)} />
      {preparing && <p className="col-span-2 text-center text-xs text-gray-500">Preparing picture…</p>}
    </div>
  )
}
