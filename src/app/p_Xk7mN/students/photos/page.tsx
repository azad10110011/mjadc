'use client'

// Student Management → Bulk Photo Upload (Session 86).
// Pick class + group, choose how file names map to students, drop all photos, check the matches,
// upload. Photos are resized in the browser (max 600×800 JPEG) before upload.
//   • "File name = Student ID"            273005.jpg → student 273005
//   • "File number − offset = Class Roll"  191.jpg with offset 190 → class roll 1 (offset auto-suggested)

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { useGroups } from '@/lib/catalog'
import { photoUrl } from '@/lib/photo'
import { Upload, ImagePlus, CheckCircle2, AlertTriangle, X } from 'lucide-react'

interface Student { id: number; student_id: string; name: string; class: string; student_group: string | null; class_roll: string | null; photo_path: string | null }
interface Item { file: File; url: string; num: number | null; studentId?: number; status: 'ready' | 'nomatch' | 'dup' | 'uploading' | 'done' | 'error'; note?: string }

const numberIn = (name: string) => {
  const m = name.replace(/\.[^.]+$/, '').match(/\d+/g)
  return m ? Number(m[m.length - 1]) : null
}

/** Shrink to max 600×800 and re-encode as JPEG (keeps uploads small and uniform). */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 600 / bmp.width, 800 / bmp.height)
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process image'))), 'image/jpeg', 0.86))
}

export default function BulkPhotoUploadPage() {
  const GROUPS = useGroups()
  const [students, setStudents] = useState<Student[]>([])
  const [cls, setCls] = useState('12th')
  const [group, setGroup] = useState('Science')
  const [mode, setMode] = useState<'roll' | 'id'>('roll')
  const [offset, setOffset] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.get<{ data: Student[] }>('/admin/students')
      .then((r) => setStudents(r.data || []))
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Could not load students'))
      .finally(() => setLoaded(true))
  }, [])

  const pool = useMemo(() => students.filter((s) => s.class === cls && (!group || s.student_group === group)), [students, cls, group])

  // auto-suggest the offset: smallest file number − smallest class roll in the pool
  const suggested = useMemo(() => {
    const nums = items.map((i) => i.num).filter((n): n is number => n !== null)
    const rolls = pool.map((s) => Number(s.class_roll)).filter((n) => Number.isFinite(n) && n > 0)
    if (!nums.length || !rolls.length) return 0
    return Math.max(0, Math.min(...nums) - Math.min(...rolls))
  }, [items, pool])
  const off = offset === '' ? suggested : Number(offset) || 0

  // match every file to a student
  const matched = useMemo(() => {
    const seen = new Map<number, number>()
    return items.map((it) => {
      if (it.status === 'done' || it.status === 'uploading' || it.status === 'error') return it
      let s: Student | undefined
      if (it.num !== null) {
        s = mode === 'id'
          ? pool.find((x) => String(x.student_id) === String(it.num))
          : pool.find((x) => Number(x.class_roll) === it.num! - off)
      }
      if (!s) return { ...it, studentId: undefined, status: 'nomatch' as const, note: it.num === null ? 'no number in file name' : mode === 'id' ? `no student ${it.num} in ${cls} ${group}` : `no class roll ${it.num - off} in ${cls} ${group}` }
      const dup = seen.has(s.id)
      seen.set(s.id, 1)
      return { ...it, studentId: s.id, status: dup ? 'dup' as const : 'ready' as const, note: dup ? 'another file already matches this student' : undefined }
    })
  }, [items, pool, mode, off, cls, group])

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const ready = matched.filter((i) => i.status === 'ready')
  const done = matched.filter((i) => i.status === 'done').length

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const files = [...list].filter((f) => f.type.startsWith('image/'))
    setItems((prev) => [
      ...prev,
      ...files.filter((f) => !prev.some((p) => p.file.name === f.name && p.file.size === f.size))
        .map((file) => ({ file, url: URL.createObjectURL(file), num: numberIn(file.name), status: 'ready' as const })),
    ].sort((a, b) => (a.num ?? 1e9) - (b.num ?? 1e9)))
  }
  const remove = (it: Item) => { URL.revokeObjectURL(it.url); setItems((p) => p.filter((x) => x !== it)) }
  const setStatus = (file: File, patch: Partial<Item>) => setItems((p) => p.map((x) => (x.file === file ? { ...x, ...patch } : x)))

  const uploadAll = async () => {
    setBusy(true)
    for (const it of ready) {
      const s = byId.get(it.studentId!)
      if (!s) continue
      setStatus(it.file, { status: 'uploading', studentId: s.id })
      try {
        const fd = new FormData()
        fd.append('photo', await shrink(it.file), `${s.student_id}.jpg`)
        const r = await api.upload<{ data: { photo_path: string } }>(`/admin/students/${s.id}/photo`, fd)
        setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, photo_path: r.data.photo_path } : x)))
        setStatus(it.file, { status: 'done', studentId: s.id, note: undefined })
      } catch (e: unknown) {
        setStatus(it.file, { status: 'error', studentId: s.id, note: e instanceof Error ? e.message : 'Upload failed' })
      }
    }
    setBusy(false)
  }

  const missing = pool.filter((s) => !matched.some((i) => i.studentId === s.id))

  return (
    <PanelLayout role="admin" title="Bulk Photo Upload">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Class" value={cls} onChange={(e) => setCls(e.target.value)} options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} />
              <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={[{ value: '', label: 'All groups' }, ...GROUPS.map((g) => ({ value: g, label: g }))]} />
              <Select label="File names are" value={mode} onChange={(e) => setMode(e.target.value as 'roll' | 'id')}
                options={[{ value: 'roll', label: 'Number − offset = Class Roll' }, { value: 'id', label: 'Student ID (e.g. 271005.jpg)' }]} />
              {mode === 'roll' && (
                <Input label={`Offset${offset === '' ? ' (auto)' : ''}`} type="number" min={0} value={offset === '' ? String(suggested) : offset}
                  onChange={(e) => setOffset(e.target.value)} />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {!loaded ? 'Loading students…' : <>{pool.length} students in {cls}{group ? ` ${group}` : ''}.
              {mode === 'roll' && <> Example: file <b>{(Math.min(...pool.map((s) => Number(s.class_roll) || 1)) || 1) + off}.jpg</b> → class roll <b>{Math.min(...pool.map((s) => Number(s.class_roll) || 1)) || 1}</b>.</>}</>}
            </p>
            {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}

            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
              <ImagePlus className="h-8 w-8 text-blue-600" />
              <span className="font-medium text-gray-800">Drop photos here, or click to choose (select all at once)</span>
              <span className="text-xs text-gray-500">JPG / PNG — resized automatically before upload</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </label>
          </CardContent>
        </Card>

        {matched.length > 0 && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto text-sm text-gray-700">
                  <b>{ready.length}</b> ready · {matched.filter((i) => i.status === 'nomatch' || i.status === 'dup').length} not matched · {done} uploaded
                </p>
                <Button variant="secondary" size="sm" onClick={() => { items.forEach((i) => URL.revokeObjectURL(i.url)); setItems([]) }} disabled={busy}>Clear</Button>
                <Button onClick={uploadAll} disabled={busy || !loaded || ready.length === 0}><Upload className="mr-1 h-4 w-4" /> {busy ? 'Uploading…' : `Upload ${ready.length} photo(s)`}</Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr><th className="px-3 py-2">New photo</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">Status</th><th className="w-10" /></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matched.map((it) => {
                      const s = it.studentId ? byId.get(it.studentId) : undefined
                      return (
                        <tr key={it.url} className={it.status === 'nomatch' || it.status === 'dup' || it.status === 'error' ? 'bg-amber-50/60' : ''}>
                          <td className="px-3 py-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={it.url} alt="" className="h-14 w-11 rounded border object-cover" /></td>
                          <td className="px-3 py-2 font-mono text-xs">{it.file.name}</td>
                          <td className="px-3 py-2">{s ? <><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.student_id} · Roll {s.class_roll || '-'} · {s.student_group}</p></> : <span className="text-amber-800">—</span>}</td>
                          <td className="px-3 py-2">{s?.photo_path ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photoUrl(s.photo_path)} alt="" className="h-14 w-11 rounded border object-cover" /> : <span className="text-xs text-gray-400">none</span>}</td>
                          <td className="px-3 py-2 text-xs">
                            {it.status === 'ready' && <span className="text-blue-700">Ready</span>}
                            {it.status === 'uploading' && <span className="text-gray-600">Uploading…</span>}
                            {it.status === 'done' && <span className="inline-flex items-center gap-1 font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> Updated</span>}
                            {(it.status === 'nomatch' || it.status === 'dup' || it.status === 'error') && <span className="inline-flex items-center gap-1 text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> {it.note}</span>}
                          </td>
                          <td className="px-2 py-2">{it.status !== 'uploading' && <button type="button" onClick={() => remove(it)} aria-label={`Remove ${it.file.name}`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><X className="h-4 w-4" /></button>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {missing.length > 0 && (
                <p className="text-xs text-gray-500">No photo chosen for: {missing.slice(0, 20).map((s) => `${s.student_id} (roll ${s.class_roll || '-'})`).join(', ')}{missing.length > 20 ? ` … +${missing.length - 20}` : ''}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PanelLayout>
  )
}
