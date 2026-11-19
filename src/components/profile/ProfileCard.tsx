'use client'

// Dashboard profile card (Session 122): photo, name, designation, mobile, joining date, experience,
// retired date — whichever admin has switched on for this user. The user can change their DASHBOARD
// picture (camera or gallery in the app); the public website photo is not affected.

import { useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, RotateCcw, UserRound } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import { APP_MODE } from '@/lib/appMode'
import { compressImage } from '@/lib/imageCompress'

interface Card {
  fields: Record<string, boolean>
  values: {
    photo: string | null; has_custom_photo: boolean; name: string; designation: string | null; mobile: string | null
    subject: string | null; mpo_index: string | null; pds_id: string | null
    /** items admin added (Session 125) */
    extras?: { key: string; label: string; value: string | null }[]
    joining_date: string | null; experience: string | null; retired_date: string | null; is_student: boolean
  }
}

function niceDate(v: string | null): string | null {
  if (!v) return null
  if (/^\d{4}$/.test(v)) return v
  const d = new Date(v + 'T00:00:00')
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProfileCard() {
  const [card, setCard] = useState<Card | null>(null)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [msg, setMsg] = useState('')
  const [broken, setBroken] = useState('') // photo URL that failed to load → show the placeholder
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const load = () => api.get<{ data: Card }>('/profile-card').then((r) => setCard(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const upload = async (file: File | undefined) => {
    setMenu(false)
    if (!file) return
    setBusy(true); setMsg('')
    try {
      const small = await compressImage(file, 800, 0.88)
      const fd = new FormData()
      fd.append('photo', small)
      await api.upload('/profile-card/photo', fd)
      await load()
      setMsg('Dashboard picture updated')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Could not upload the picture')
    } finally {
      setBusy(false)
      if (camRef.current) camRef.current.value = ''
      if (galRef.current) galRef.current.value = ''
    }
  }

  const useDefault = async () => {
    setMenu(false); setBusy(true); setMsg('')
    try { await api.delete('/profile-card/photo'); await load(); setMsg('Using your default picture') }
    catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Could not change the picture') }
    finally { setBusy(false) }
  }

  if (!card) return null
  const { fields: f, values: v } = card
  const rows: [string, string | null][] = [
    ['Mobile', f.mobile ? v.mobile : null],
    [v.is_student ? 'Joining Year' : 'Joining Date', f.joining_date ? niceDate(v.joining_date) : null],
    ['Experience', f.experience ? v.experience : null],
    ['Retired Date', f.retired_date ? niceDate(v.retired_date) : null],
    ['Index', f.mpo_index ? v.mpo_index : null],
    ['PDS ID', f.pds_id ? v.pds_id : null],
    ...(v.extras || []).map((x): [string, string | null] => [x.label, f[x.key] ? (/^\d{4}-\d{2}-\d{2}$/.test(x.value || '') ? niceDate(x.value) : x.value) : null]),
  ]
  const shown = rows.filter(([, val]) => val)

  return (
    <section aria-label="My profile" className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {f.photo && (
          <div className="relative shrink-0">
            {v.photo && broken !== v.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${UPLOAD_BASE}/${v.photo.replace(/^\/+/, '')}`} alt={v.name} onError={() => setBroken(v.photo || '')}
                className="h-24 w-24 rounded-full border-4 border-blue-100 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-100 bg-gray-100">
                <UserRound className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <button type="button" onClick={() => setMenu((m) => !m)} disabled={busy} aria-label="Change dashboard picture"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white shadow ring-2 ring-white disabled:opacity-60">
              <Camera className="h-4 w-4" />
            </button>
            {menu && (
              <div className="absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 overflow-hidden rounded-lg border border-gray-200 bg-white text-left text-sm shadow-lg sm:left-0 sm:translate-x-0">
                {APP_MODE && (
                  <button type="button" onClick={() => camRef.current?.click()} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-gray-50">
                    <Camera className="h-4 w-4 text-gray-500" /> Take a photo
                  </button>
                )}
                <button type="button" onClick={() => galRef.current?.click()} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-gray-50">
                  <ImageIcon className="h-4 w-4 text-gray-500" /> {APP_MODE ? 'Choose from gallery' : 'Upload a picture'}
                </button>
                {v.has_custom_photo && (
                  <button type="button" onClick={useDefault} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-gray-50">
                    <RotateCcw className="h-4 w-4 text-gray-500" /> Use default picture
                  </button>
                )}
              </div>
            )}
            <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {f.name && <h2 className="text-xl font-bold text-gray-900">{v.name}</h2>}
          {f.designation && v.designation && <p className="text-sm font-medium text-blue-700">{v.designation}</p>}
          {f.subject && v.subject && <p className="text-sm text-gray-600">Subject: <span className="font-medium text-gray-800">{v.subject}</span></p>}
          {shown.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shown.map(([k, val]) => (
                <div key={k} className="rounded-lg bg-gray-50 px-3 py-2">
                  <dt className="text-xs text-gray-500">{k}</dt>
                  <dd className="text-sm font-semibold text-gray-900">{val}</dd>
                </div>
              ))}
            </dl>
          )}
          {busy && <p className="mt-2 text-xs text-gray-500">Uploading…</p>}
          {msg && !busy && <p className="mt-2 text-xs text-green-700">{msg}</p>}
        </div>
      </div>
    </section>
  )
}
