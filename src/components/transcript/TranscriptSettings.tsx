'use client'

// Admin → Transcript → "Transcript Settings" (Session 84).
// Choose the student information shown (built-in + custom entry fields, in order), which blocks appear,
// and the watermark logo brightness / size with sliders — all with a live, scaled preview of the sheet.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { ArrowUp, ArrowDown, X, Plus, Settings2, ChevronDown, RotateCcw, Save, Undo2, Move, Crosshair } from 'lucide-react'
import { TranscriptSheet, type TranscriptData } from './TranscriptGenerator'
import { BUILTIN_FIELDS, DEFAULT_TRANSCRIPT_CONFIG, fieldLabel, normalizeConfig, saveTranscriptConfig, type TranscriptConfig } from './transcriptConfig'

const SAMPLE: TranscriptData = {
  student_id: '273005', name: 'Sample Student', father_name: 'Father Name', mother_name: 'Mother Name',
  date_of_birth: '2008-01-15', registration_no: '', photo_path: null, class: '12th', group: 'Humanities',
  exam_name: 'Pre-Test', year: String(new Date().getFullYear()), academic_session: '2025-26', hsc_batch: '2027', class_roll: '5',
  custom: { Session: '2025-26' }, student_type: 'Regular', published_at: null, overall_gpa: 4.25, overall_grade: 'A',
  gpa_without_optional: 4.0, optional_gp_above_2: 1.5, total_subjects: 4, position: 12,
  subjects: [
    { subject: 'Bangla-2', code: '102', parts: { cq: 52, mcq: 21, practical: null }, total: 73, grade: 'A', gpa: 4 },
    { subject: 'English-2', code: '108', parts: { cq: 68, mcq: null, practical: null }, total: 68, grade: 'A-', gpa: 3.5 },
    { subject: 'Information and Communications Technology', code: '275', parts: { cq: 40, mcq: 20, practical: 22 }, total: 82, grade: 'A+', gpa: 5 },
    { subject: 'Psychology-2', code: '124', parts: { cq: 45, mcq: 20, practical: 21 }, total: 86, grade: 'A+', gpa: 5, is_optional: true },
  ],
}

const SHOW_LABELS: [keyof TranscriptConfig['show'], string][] = [
  ['photo', 'Student photo'], ['qr', 'QR code'], ['grading', 'Grading System table'], ['summary', 'GPA / Grade row'], ['position', 'Position'],
]

interface Props { config: TranscriptConfig; logoSrc: string; sample?: TranscriptData; onSaved: () => void }

export function TranscriptSettings({ config, logoSrc, sample, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<TranscriptConfig>(config)
  const [customLabels, setCustomLabels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // follow the saved config when it (re)loads, unless the admin is editing
  const savedJson = JSON.stringify(config)
  const [baseJson, setBaseJson] = useState(savedJson)
  if (savedJson !== baseJson) { setBaseJson(savedJson); setDraft(config) }
  const dirty = JSON.stringify(draft) !== savedJson

  useEffect(() => {
    if (!open || customLabels.length) return
    api.get<{ data: { label: string; is_builtin: boolean | number }[] }>('/admin/custom-fields?target=student')
      .then((r) => setCustomLabels((r.data || []).filter((f) => !Number(f.is_builtin)).map((f) => f.label)))
      .catch(() => {})
  }, [open, customLabels.length])

  const available = useMemo(() => [
    ...BUILTIN_FIELDS.map((f) => f.key),
    ...customLabels.map((l) => `custom:${l}`),
  ].filter((k) => !draft.fields.includes(k)), [customLabels, draft.fields])

  const setFields = (fields: string[]) => setDraft({ ...draft, fields })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= draft.fields.length) return
    const f = [...draft.fields]; [f[i], f[j]] = [f[j], f[i]]; setFields(f)
  }

  const save = async () => {
    setBusy(true); setMsg(null)
    try { await saveTranscriptConfig(draft); onSaved(); setMsg({ ok: true, text: 'Transcript settings saved — they apply to every transcript.' }) }
    catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`

  // ---- drag the watermark in the preview (Session 85) ----
  // Positions are % of the transcript frame, so they print the same at any scale.
  const previewRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const c = previewRef.current, f = c?.querySelector('.frame')
      if (!c || !f) return
      const cr = c.getBoundingClientRect(), fr = f.getBoundingClientRect()
      setBox({ left: fr.left - cr.left, top: fr.top - cr.top, width: fr.width, height: fr.height })
    }
    measure()
    const t = setTimeout(measure, 300) // after fonts / photo settle
    return () => clearTimeout(t)
  }, [open, draft.fields, draft.show, sample])
  const placeAt = (clientX: number, clientY: number) => {
    const f = previewRef.current?.querySelector('.frame')
    if (!f) return
    const r = f.getBoundingClientRect()
    const x = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
    const y = Math.round(Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)))
    setDraft((d) => ({ ...d, watermark: { ...d.watermark, x, y } }))
  }
  const nudge = (dx: number, dy: number) => setDraft((d) => ({ ...d, watermark: { ...d.watermark,
    x: Math.min(100, Math.max(0, d.watermark.x + dx)), y: Math.min(100, Math.max(0, d.watermark.y + dy)) } }))

  return (
    <Card className="no-print mb-6">
      <CardContent className="pt-5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex w-full items-center gap-2 text-left font-semibold text-gray-900">
          <Settings2 className="h-5 w-5 text-blue-700" /> Transcript Settings
          <span className="text-sm font-normal text-gray-500">— information shown, blocks, watermark</span>
          {dirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">unsaved</span>}
          <ChevronDown className={`ml-auto h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_auto]">
            <div className="space-y-5">
              {/* ---- information ---- */}
              <section>
                <h4 className="mb-2 text-sm font-semibold text-gray-800">Student information on the transcript <span className="font-normal text-gray-500">(in this order)</span></h4>
                <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {draft.fields.map((k, i) => (
                    <li key={k} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                      <span className="flex-1">{fieldLabel(k)}{k.startsWith('custom:') && <span className="ml-1.5 rounded bg-purple-100 px-1 text-[10px] font-medium text-purple-800">custom field</span>}</span>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${fieldLabel(k)} up`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === draft.fields.length - 1} aria-label={`Move ${fieldLabel(k)} down`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setFields(draft.fields.filter((x) => x !== k))} aria-label={`Remove ${fieldLabel(k)}`} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                  {draft.fields.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">No information selected.</li>}
                </ol>
                {available.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {available.map((k) => (
                      <button key={k} type="button" onClick={() => setFields([...draft.fields, k])}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-blue-50 ${k.startsWith('custom:') ? 'border-purple-200 text-purple-800' : 'border-gray-300 text-gray-700'}`}>
                        <Plus className="h-3 w-3" /> {fieldLabel(k)}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-500">Academic Session comes from the custom field “Session”. HSC Batch is the batch year.</p>
              </section>

              {/* ---- blocks ---- */}
              <section>
                <h4 className="mb-2 text-sm font-semibold text-gray-800">Show on the transcript</h4>
                <div className="flex flex-wrap gap-2">
                  {SHOW_LABELS.map(([k, label]) => (
                    <label key={k} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                      <input type="checkbox" checked={draft.show[k]} onChange={(e) => setDraft({ ...draft, show: { ...draft.show, [k]: e.target.checked } })} /> {label}
                    </label>
                  ))}
                </div>
              </section>

              {/* ---- watermark ---- */}
              <section className="rounded-lg border border-gray-200 p-3">
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Watermark logo</h4>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-4">
                    <label className="block text-sm">
                      <span className="flex justify-between text-gray-700"><span>Brightness</span><b>{draft.watermark.opacity === 0 ? 'Hidden' : pct(draft.watermark.opacity)}</b></span>
                      <input type="range" min={0} max={0.5} step={0.01} value={draft.watermark.opacity} aria-label="Watermark brightness"
                        onChange={(e) => setDraft({ ...draft, watermark: { ...draft.watermark, opacity: Number(e.target.value) } })} className="mt-1 w-full accent-blue-700" />
                      <span className="flex justify-between text-[10px] text-gray-400"><span>Hidden</span><span>Light</span><span>Strong</span></span>
                    </label>
                    <label className="block text-sm">
                      <span className="flex justify-between text-gray-700"><span>Size</span><b>{draft.watermark.size}% of page width</b></span>
                      <input type="range" min={20} max={100} step={1} value={draft.watermark.size} aria-label="Watermark size"
                        onChange={(e) => setDraft({ ...draft, watermark: { ...draft.watermark, size: Number(e.target.value) } })} className="mt-1 w-full accent-blue-700" />
                      <span className="flex justify-between text-[10px] text-gray-400"><span>Small</span><span>Large</span></span>
                    </label>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    <Move className="h-4 w-4" /> <b>Position:</b> drag the logo in the preview (or click where it should go) —
                    {' '}centre at {draft.watermark.x}% across, {draft.watermark.y}% down
                    <Button type="button" size="sm" variant="secondary" className="ml-auto"
                      onClick={() => setDraft({ ...draft, watermark: { ...draft.watermark, x: 50, y: 55 } })}><Crosshair className="mr-1 h-3.5 w-3.5" /> Center</Button>
                  </div>
                  {/* swatch: the logo at the chosen brightness */}
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white" title="Brightness preview">
                    {logoSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoSrc} alt="" className="max-h-20 max-w-20" style={{ opacity: draft.watermark.opacity }} />
                    )}
                  </div>
                </div>
              </section>

              {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={save} disabled={busy || !dirty}><Save className="mr-1 h-4 w-4" /> {busy ? 'Saving…' : dirty ? 'Save settings' : 'Saved'}</Button>
                <Button variant="secondary" onClick={() => setDraft(config)} disabled={!dirty}><Undo2 className="mr-1 h-4 w-4" /> Undo changes</Button>
                <Button variant="ghost" onClick={() => setDraft(normalizeConfig(DEFAULT_TRANSCRIPT_CONFIG))}><RotateCcw className="mr-1 h-4 w-4" /> Reset to default</Button>
              </div>
            </div>

            {/* ---- live preview (A4 at 50 %) ---- */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview{sample ? '' : ' (sample data)'}</p>
              <div ref={previewRef} className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ width: '105mm', height: '148.5mm' }}>
                <div style={{ width: '210mm', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  <TranscriptSheet t={sample || SAMPLE} logoSrc={logoSrc} config={draft} qr={draft.show.qr ? PREVIEW_QR : undefined} />
                </div>
                {/* drag layer: press anywhere to move the logo centre there, drag to fine-tune;
                    arrow keys nudge it 1 % (Shift = 5 %) */}
                <div
                  role="slider" tabIndex={0} aria-label="Watermark position — drag, click, or use arrow keys"
                  aria-valuenow={draft.watermark.x} aria-valuemin={0} aria-valuemax={100}
                  aria-valuetext={`${draft.watermark.x}% across, ${draft.watermark.y}% down`}
                  className="absolute inset-0 cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); placeAt(e.clientX, e.clientY) }}
                  onPointerMove={(e) => { if (dragging.current) placeAt(e.clientX, e.clientY) }}
                  onPointerUp={() => { dragging.current = false }}
                  onPointerCancel={() => { dragging.current = false }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 5 : 1
                    const k: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
                    if (k[e.key]) { e.preventDefault(); nudge(...k[e.key]) }
                  }}
                >
                  {box && draft.watermark.opacity > 0 && (
                    <div className="pointer-events-none absolute rounded-full border-2 border-dashed border-blue-500/80"
                      style={{
                        width: (box.width * draft.watermark.size) / 100, height: (box.width * draft.watermark.size) / 100,
                        left: box.left + (box.width * draft.watermark.x) / 100, top: box.top + (box.height * draft.watermark.y) / 100,
                        transform: 'translate(-50%, -50%)',
                      }}>
                      <span className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow"><Move className="h-3.5 w-3.5" /></span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-1 text-center text-[11px] text-gray-500">Drag the logo · or click where it should go · arrow keys nudge</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// small grey placeholder square for the QR in the preview (real QR is generated with the transcript)
const PREVIEW_QR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"/><path d="M0 0h4v4H0zM6 0h4v4H6zM0 6h4v4H0zM5 5h1v1H5zM7 6h1v3H7zM9 5h1v2H9z" fill="#111"/></svg>')
