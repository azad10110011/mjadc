'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import {
  CreditCard, Download, Search, Loader2, Trash2, Copy, ArrowUp, ArrowDown, RotateCcw, Save,
} from 'lucide-react'
import {
  CardTemplate, CardElement, CardAssets, Person,
  elementInnerHtml, elementBoxCss, buildPrintDoc, verifyUrlFor, niceDate,
} from '@/lib/idcard'
import { StudentFilters, filterStudents, EMPTY_STUDENT_FILTERS, StudentFilterState } from '@/components/students/StudentFilters'

type Audience = 'students' | 'teachers' | 'staff'
const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'staff', label: 'Staff' },
]
interface FieldKey { key: string; label: string }
interface PersonRow { id: number; name: string; sub: string; custom?: boolean }

const inputCls = 'h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

function siteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL
  if (env) return env.replace(/\/+$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.mjadc.ac.bd'
}

async function loadAssets(): Promise<CardAssets> {
  const assets: CardAssets = { uploadBase: UPLOAD_BASE }
  try {
    const res: any = await api.get('/admin/settings')
    const arr = res.data || []
    const logo = arr.find((s: any) => s.setting_key === 'college_logo')
    const sig = arr.find((s: any) => s.setting_key === 'principal_signature')
    if (logo?.setting_value) assets.logo = `${UPLOAD_BASE}/${String(logo.setting_value).replace(/^\/+/, '')}`
    if (sig?.setting_value) assets.signature = `${UPLOAD_BASE}/${String(sig.setting_value).replace(/^\/+/, '')}`
  } catch {}
  return assets
}

async function qrFor(person: Person, audience: Audience): Promise<string> {
  const token = String(person.verify_token || '')
  const id = Number(person.id || 0)
  if (!token || !id) return ''
  try {
    return await QRCode.toDataURL(verifyUrlFor(siteBase(), audience, id, token), { width: 240, margin: 0 })
  } catch {
    return ''
  }
}

// ---------------- Designer ----------------

function Designer() {
  const [audience, setAudience] = useState<Audience>('students')
  const [tpl, setTpl] = useState<CardTemplate | null>(null)
  const [fields, setFields] = useState<FieldKey[]>([])
  const [sample, setSample] = useState<Person>({})
  const [assets, setAssets] = useState<CardAssets>({ uploadBase: UPLOAD_BASE })
  const [qr, setQr] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [addKind, setAddKind] = useState('')
  const [people, setPeople] = useState<PersonRow[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [pickSel, setPickSel] = useState<Set<number>>(new Set())
  const [personQuery, setPersonQuery] = useState('')

  const canvasRef = useRef<HTMLDivElement>(null)
  const drag = useRef<null | { mode: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; id: string }>(null)

  useEffect(() => {
    let alive = true
    setPeopleLoading(true)
    api.get(`/admin/id-cards?type=${audience}`)
      .then((r: any) => { if (alive) setPeople((r.data || []).map((p: any) => ({ id: Number(p.id), name: String(p.name || ''), sub: String(p.student_id || p.designation || '') }))) })
      .catch(() => { if (alive) setPeople([]) })
      .finally(() => { if (alive) setPeopleLoading(false) })
    return () => { alive = false }
  }, [audience])

  // Which people already have a personal design (custom_ids comes back with the template).
  useEffect(() => {
    if (!tpl) return
    const ids: number[] = (tpl as any).custom_ids || []
    setPeople((prev) => prev.map((p) => ({ ...p, custom: ids.includes(p.id) })))
  }, [tpl])

  // Load a template + its field list + sample when the audience changes. State is reset in the
  // audience <select> handler (not here) to avoid synchronous setState inside the effect.
  useEffect(() => {
    let alive = true
    api.get(`/admin/card-templates?audience=${audience}`)
      .then((r: any) => {
        if (!alive) return
        setTpl(r.data.template)
        setFields(r.data.fields || [])
        setSample(r.data.sample || {})
      })
      .catch((e: unknown) => alive && setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' }))
    return () => { alive = false }
  }, [audience])

  const changeAudience = (a: Audience) => {
    setTpl(null); setSelectedId(null); setDirty(false); setMsg(null); setPickSel(new Set()); setPersonQuery('')
    setAudience(a)
  }

  useEffect(() => { loadAssets().then(setAssets) }, [])
  useEffect(() => { if (sample && sample.id !== undefined) qrFor(sample, audience).then(setQr) }, [sample, audience])

  // Fit the card into roughly a 340px-wide canvas.
  const pxPerMm = useMemo(() => (tpl ? Math.min(6, 340 / tpl.width_mm) : 4), [tpl])

  const selected = tpl?.elements.find((e) => e.id === selectedId) || null

  // Resize handles for the selected element (computed, not inside render as an IIFE).
  const handles = useMemo(() => {
    if (!selected || !tpl) return [] as { m: string; cx: number; cy: number; cur: string }[]
    const b = elementBoxCss(selected, 'screen', pxPerMm)
    const left = parseFloat(b.left), top = parseFloat(b.top), w = parseFloat(b.width), h = parseFloat(b.height)
    return [
      { m: 'nw', cx: left, cy: top, cur: 'nwse-resize' },
      { m: 'ne', cx: left + w, cy: top, cur: 'nesw-resize' },
      { m: 'sw', cx: left, cy: top + h, cur: 'nesw-resize' },
      { m: 'se', cx: left + w, cy: top + h, cur: 'nwse-resize' },
    ]
  }, [selected, tpl, pxPerMm])

  const patchEl = useCallback((id: string, patch: Partial<CardElement>) => {
    setTpl((t) => (t ? { ...t, elements: t.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : t))
    setDirty(true)
  }, [])

  const onPointerDown = (e: React.PointerEvent, el: CardElement, mode: string) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(el.id)
    drag.current = { mode, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, id: el.id }
    canvasRef.current?.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !tpl) return
    const dx = (e.clientX - d.sx) / pxPerMm
    const dy = (e.clientY - d.sy) / pxPerMm
    const r = (n: number) => Math.round(n * 100) / 100
    let { ox: x, oy: y, ow: w, oh: h } = d
    if (d.mode === 'move') { x = d.ox + dx; y = d.oy + dy }
    if (d.mode.includes('e')) w = d.ow + dx
    if (d.mode.includes('s')) h = d.oh + dy
    if (d.mode.includes('w')) { x = d.ox + dx; w = d.ow - dx }
    if (d.mode.includes('n')) { y = d.oy + dy; h = d.oh - dy }
    w = Math.max(1, w); h = Math.max(0.3, h)
    patchEl(d.id, { x: r(x), y: r(y), w: r(w), h: r(h) })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null
    canvasRef.current?.releasePointerCapture?.(e.pointerId)
  }

  const addElement = (kind: string) => {
    if (!tpl || !kind) return
    const id = 'e' + Math.random().toString(36).slice(2, 8)
    const cx = Math.max(0, tpl.width_mm / 2 - 10)
    const cy = Math.max(0, tpl.height_mm / 2 - 3)
    const z = Math.max(1, ...tpl.elements.map((e) => e.z || 1)) + 1
    let el: CardElement
    if (kind === '__text') el = { id, type: 'text', text: 'Text', x: cx, y: cy, w: 24, h: 6, z, fontSize: 8, color: '#374151', align: 'left' }
    else if (kind === '__photo') el = { id, type: 'photo', x: cx, y: cy, w: 16, h: 20, z, border: '#d1d5db' }
    else if (kind === '__qr') el = { id, type: 'qr', x: cx, y: cy, w: 13, h: 13, z }
    else if (kind === '__logo') el = { id, type: 'image', src: 'logo', x: cx, y: cy, w: 16, h: 16, z }
    else if (kind === '__sig') el = { id, type: 'image', src: 'signature', x: cx, y: cy, w: 20, h: 8, z }
    else if (kind === '__box') el = { id, type: 'box', x: cx, y: cy, w: 24, h: 12, z: 1, bg: '#eef2ff' }
    else if (kind === '__line') el = { id, type: 'line', x: cx, y: cy, w: 30, h: 0.5, z, color: '#9ca3af' }
    else {
      const f = fields.find((x) => x.key === kind)
      el = { id, type: 'field', field: kind, label: f?.label || '', x: cx, y: cy, w: 30, h: 5, z, fontSize: 8, color: '#374151', align: 'left' }
    }
    setTpl({ ...tpl, elements: [...tpl.elements, el] })
    setSelectedId(id)
    setDirty(true)
    setAddKind('')
  }

  const removeEl = (id: string) => { setTpl((t) => (t ? { ...t, elements: t.elements.filter((e) => e.id !== id) } : t)); setSelectedId(null); setDirty(true) }
  const dupEl = (el: CardElement) => {
    const id = 'e' + Math.random().toString(36).slice(2, 8)
    setTpl((t) => (t ? { ...t, elements: [...t.elements, { ...el, id, x: el.x + 2, y: el.y + 2 }] } : t))
    setSelectedId(id); setDirty(true)
  }
  const bump = (el: CardElement, dir: 1 | -1) => patchEl(el.id, { z: Math.max(0, (el.z || 1) + dir) })

  // Save scope: no checkbox selection -> everyone of this audience; selection -> only those people.
  const save = async () => {
    if (!tpl) return
    const ids = [...pickSel]
    if (ids.length && !confirm(`Save this design only for the ${ids.length} selected person(s)? Everyone else keeps the current design.`)) return
    setSaving(true); setMsg(null)
    try {
      await api.put('/admin/card-templates', { audience, ids, ...tpl })
      setDirty(false)
      setMsg(ids.length
        ? { ok: true, text: `Design saved only for the selected ${ids.length} person(s). Other people keep the general design.` }
        : { ok: true, text: 'ID card design saved for all. It is used for printing and for the QR verification.' })
      // Refresh the "custom" badges after a per-person save.
      const r: any = await api.get(`/admin/card-templates?audience=${audience}`)
      const cids: number[] = r.data.custom_ids || []
      setPeople((prev) => prev.map((p) => ({ ...p, custom: cids.includes(p.id) })))
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }
  const reset = async () => {
    const ids = [...pickSel]
    const q = ids.length
      ? `Remove the personal design of the ${ids.length} selected person(s)? They will use the general design.`
      : 'Reset this card to the default design? The general design and every personal design will be removed.'
    if (!confirm(q)) return
    setSaving(true); setMsg(null)
    try {
      const r: any = await api.post('/admin/card-templates/reset', { audience, ids })
      setTpl(r.data.template); setSelectedId(null); setDirty(false)
      const cids: number[] = r.data.custom_ids || []
      setPeople((prev) => prev.map((p) => ({ ...p, custom: cids.includes(p.id) })))
      setMsg({ ok: true, text: ids.length ? 'Removed the personal design of the selected people.' : 'Reset to the default design.' })
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Reset failed' })
    } finally { setSaving(false) }
  }
  // Open a person's own design (falls back to the general one if they have none) and mark it selected.
  const loadPersonDesign = async (p: PersonRow) => {
    setSaving(true); setMsg(null)
    try {
      const r: any = await api.get(`/admin/card-templates?audience=${audience}&person_id=${p.id}`)
      setTpl(r.data.template); setSample(r.data.sample || {}); setSelectedId(null); setDirty(false)
      setMsg({ ok: true, text: p.custom ? `Editing the personal design of ${p.name}.` : `${p.name} has no personal design — showing the general one. Save with them ticked to give them their own.` })
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' })
    } finally { setSaving(false) }
  }

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q))
  }, [people, personQuery])
  const allPicked = filteredPeople.length > 0 && filteredPeople.every((p) => pickSel.has(p.id))
  const togglePick = (id: number) => setPickSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      {/* Canvas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={audience} onChange={(e) => changeAudience(e.target.value as Audience)} className={inputCls} aria-label="Card for">
            {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <select value={addKind} onChange={(e) => addElement(e.target.value)} className={inputCls} aria-label="Add item">
            <option value="">+ Add item…</option>
            <optgroup label="Fields">
              {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </optgroup>
            <optgroup label="Other">
              <option value="__text">Fixed text</option>
              <option value="__photo">Photo</option>
              <option value="__qr">QR code</option>
              <option value="__logo">College logo</option>
              <option value="__sig">Signature</option>
              <option value="__box">Box / background</option>
              <option value="__line">Line</option>
            </optgroup>
          </select>
          <Button size="sm" onClick={save} disabled={!tpl || saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pickSel.size ? `Save for selected (${pickSel.size})` : 'Save for all'}
          </Button>
          <Button size="sm" variant="outline" onClick={reset} disabled={!tpl || saving}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

        {!tpl ? (
          <div className="flex h-80 w-80 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">Loading…</div>
        ) : (
          <div
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerDown={() => setSelectedId(null)}
            className="relative touch-none select-none rounded-lg border border-gray-300 shadow-inner"
            style={{ width: tpl.width_mm * pxPerMm, height: tpl.height_mm * pxPerMm, background: tpl.background }}
          >
            {[...tpl.elements].sort((a, b) => (a.z || 1) - (b.z || 1)).map((el) => {
              const isSel = el.id === selectedId
              const style = elementBoxCss(el, 'screen', pxPerMm)
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => onPointerDown(e, el, 'move')}
                  style={{ ...(Object.fromEntries(Object.entries(style).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])) as any), cursor: 'move', outline: isSel ? '2px solid #2563eb' : '1px dashed rgba(37,99,235,0.25)' }}
                  dangerouslySetInnerHTML={{ __html: elementInnerHtml(el, sample, audience, assets, qr) }}
                />
              )
            })}
            {/* resize handles for the selected element */}
            {selected && handles.map((c) => (
              <div
                key={c.m}
                onPointerDown={(e) => onPointerDown(e, selected, c.m)}
                style={{ position: 'absolute', left: c.cx - 6, top: c.cy - 6, width: 12, height: 12, borderRadius: 3, background: '#fff', border: '2px solid #2563eb', zIndex: 999, cursor: c.cur, touchAction: 'none' }}
              />
            ))}
          </div>
        )}
        <p className="max-w-80 text-xs text-gray-500">Drag an item to move it, drag a blue corner to resize. Tap an empty area to deselect. The QR on the card opens a public page that verifies the card.</p>

        {/* Save scope: tick people to give them their own design; leave empty to save for everyone. */}
        <div className="w-80 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">Save for specific {audience}</span>
            <button type="button" className="text-xs text-blue-600 underline" onClick={() => setPickSel(allPicked ? new Set() : new Set(filteredPeople.map((p) => p.id)))}>
              {allPicked ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <p className="px-3 pt-2 text-[11px] text-gray-500">Tick one or more people and press Save — only they get this design. Leave unticked to save for all.</p>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder={`Search ${audience}…`} className={`${inputCls} w-full pl-9`} />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {peopleLoading ? <div className="p-4 text-center text-xs text-gray-500">Loading…</div>
              : filteredPeople.length === 0 ? <div className="p-4 text-center text-xs text-gray-500">No records</div>
              : filteredPeople.map((p) => (
                <div key={p.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-blue-50" onClick={() => togglePick(p.id)}>
                  <input type="checkbox" checked={pickSel.has(p.id)} onChange={() => togglePick(p.id)} onClick={(e) => e.stopPropagation()} />
                  <span className="flex-1 truncate text-sm text-gray-800">
                    {p.name}
                    {p.custom && <span className="ml-1 rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-700">own design</span>}
                  </span>
                  <span className="text-xs text-gray-500">{p.sub}</span>
                  <button type="button" className="text-[11px] text-blue-600 underline" onClick={(e) => { e.stopPropagation(); loadPersonDesign(p) }} title="Load this person's design in the canvas">edit</button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div>
        {selected ? (
          <ElementProps el={selected} fields={fields} onChange={(patch) => patchEl(selected.id, patch)}
            onDelete={() => removeEl(selected.id)} onDup={() => dupEl(selected)} onBump={(d) => bump(selected, d)} />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            Select an item on the card to edit it, or use <b>+ Add item</b> to add one.
            {tpl && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">Card width (mm)
                  <input type="number" min={20} max={300} value={tpl.width_mm} onChange={(e) => { setTpl({ ...tpl, width_mm: Number(e.target.value) || tpl.width_mm }); setDirty(true) }} className={`${inputCls} mt-1 w-full`} />
                </label>
                <label className="text-xs text-gray-600">Card height (mm)
                  <input type="number" min={20} max={300} value={tpl.height_mm} onChange={(e) => { setTpl({ ...tpl, height_mm: Number(e.target.value) || tpl.height_mm }); setDirty(true) }} className={`${inputCls} mt-1 w-full`} />
                </label>
                <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600">Background
                  <input type="color" value={tpl.background} onChange={(e) => { setTpl({ ...tpl, background: e.target.value }); setDirty(true) }} className="h-8 w-14 rounded border border-gray-300" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PlaceholderHint({ fields }: { fields: FieldKey[] }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-1.5 text-[11px] leading-relaxed text-gray-500">
      Shown exactly as typed — add <b>:</b> yourself if you want one. Insert values with <code className="rounded bg-gray-200 px-1">{'{field}'}</code>, e.g.{' '}
      <code className="rounded bg-gray-200 px-1">{'Designation: {designation} ({subject})'}</code>.
      <div className="mt-1">Available: {fields.map((f) => <span key={f.key} className="mr-1 whitespace-nowrap font-mono text-gray-600">{`{${f.key}}`}</span>)}</div>
    </div>
  )
}

function ElementProps({ el, fields, onChange, onDelete, onDup, onBump }: {
  el: CardElement; fields: FieldKey[]; onChange: (p: Partial<CardElement>) => void
  onDelete: () => void; onDup: () => void; onBump: (d: 1 | -1) => void
}) {
  const num = (k: keyof CardElement) => (
    <input type="number" step={0.5} value={(el[k] as number) ?? 0} onChange={(e) => onChange({ [k]: Number(e.target.value) } as any)} className={`${inputCls} w-full`} />
  )
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold capitalize text-gray-800">{el.type} item</h4>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onBump(1)} title="Bring forward"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onBump(-1)} title="Send back"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onDup} title="Duplicate"><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Remove"><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      </div>

      {el.type === 'field' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-gray-600">Value from
              <select value={el.field || ''} onChange={(e) => onChange({ field: e.target.value })} className={`${inputCls} mt-1 w-full`}>
                {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
            <label className="block text-xs text-gray-600">Label (optional)
              <input value={el.label ?? ''} maxLength={120} onChange={(e) => onChange({ label: e.target.value })} placeholder={'e.g. ID:   or   {designation} ({subject})'} className={`${inputCls} mt-1 w-full`} />
            </label>
          </div>
          <PlaceholderHint fields={fields} />
        </>
      )}
      {el.type === 'text' && (
        <>
          <label className="block text-xs text-gray-600">Text
            <input value={el.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder={'Any text, e.g. {name} — {full_class}'} className={`${inputCls} mt-1 w-full`} />
          </label>
          <PlaceholderHint fields={fields} />
        </>
      )}
      {el.type === 'image' && (
        <label className="block text-xs text-gray-600">Image
          <select value={el.src || 'logo'} onChange={(e) => onChange({ src: e.target.value as 'logo' | 'signature' })} className={`${inputCls} mt-1 w-full`}>
            <option value="logo">College logo</option>
            <option value="signature">Principal signature</option>
          </select>
        </label>
      )}

      {(el.type === 'field' || el.type === 'text') && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-600">Font size (pt){num('fontSize')}</label>
          <label className="text-xs text-gray-600">Align
            <select value={el.align || 'left'} onChange={(e) => onChange({ align: e.target.value as any })} className={`${inputCls} mt-1 w-full`}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={!!el.bold} onChange={(e) => onChange({ bold: e.target.checked })} /> Bold</label>
          <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={!!el.italic} onChange={(e) => onChange({ italic: e.target.checked })} /> Italic</label>
          <label className="flex items-center gap-2 text-xs text-gray-600">Text color<input type="color" value={el.color || '#374151'} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-10 rounded border border-gray-300" /></label>
        </div>
      )}

      {(el.type === 'box' || el.type === 'photo' || el.type === 'field' || el.type === 'text') && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">Fill
            <input type="color" value={el.bg || '#ffffff'} onChange={(e) => onChange({ bg: e.target.value })} className="h-7 w-10 rounded border border-gray-300" />
            {el.bg && <button type="button" className="text-xs text-blue-600 underline" onClick={() => onChange({ bg: undefined })}>none</button>}
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">Border
            <input type="color" value={el.border || '#d1d5db'} onChange={(e) => onChange({ border: e.target.value })} className="h-7 w-10 rounded border border-gray-300" />
            {el.border && <button type="button" className="text-xs text-blue-600 underline" onClick={() => onChange({ border: undefined })}>none</button>}
          </label>
        </div>
      )}
      {el.type === 'line' && (
        <label className="flex items-center gap-2 text-xs text-gray-600">Color<input type="color" value={el.color || '#9ca3af'} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-10 rounded border border-gray-300" /></label>
      )}

      <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-2">
        <label className="text-xs text-gray-600">X (mm){num('x')}</label>
        <label className="text-xs text-gray-600">Y (mm){num('y')}</label>
        <label className="text-xs text-gray-600">W (mm){num('w')}</label>
        <label className="text-xs text-gray-600">H (mm){num('h')}</label>
      </div>
    </div>
  )
}

// ---------------- Print ----------------

function Printer() {
  const [type, setType] = useState<Audience>('students')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [sf, setSf] = useState<StudentFilterState>(EMPTY_STUDENT_FILTERS)

  // Fetch when the type changes. Resets happen in the type <select> handler (changeType) to avoid
  // synchronous setState inside the effect.
  useEffect(() => {
    let alive = true
    api.get(`/admin/id-cards?type=${type}`)
      .then((r: any) => { if (alive) { setPeople(r.data || []); setLoading(false) } })
      .catch(() => { if (alive) { setPeople([]); setLoading(false) } })
    return () => { alive = false }
  }, [type])

  const changeType = (t: Audience) => {
    setLoading(true); setSelected(new Set()); setSearch(''); setSf(EMPTY_STUDENT_FILTERS)
    setType(t)
  }

  const classes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of people) { const v = String(p.class ?? '').trim(); if (v) seen.set(v, v) }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((c) => ({ value: c, label: c }))
  }, [people])

  const filtered = useMemo(() => (
    type === 'students'
      ? filterStudents(people, sf)
      : people.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
  ), [type, people, sf, search])

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(Number(p.id)))
  const toggle = (id: number) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => Number(p.id))))

  const printSelected = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    try {
      const chosen = people.filter((p) => selected.has(Number(p.id)))
      const [tplRes, assets] = await Promise.all([
        api.get(`/admin/card-templates?audience=${type}&ids=${chosen.map((p) => Number(p.id)).join(',')}`) as Promise<any>,
        loadAssets(),
      ])
      const tpl: CardTemplate = tplRes.data.template
      const personTemplates: Record<string, CardTemplate> = tplRes.data.person_templates || {}
      const qrMap: Record<string, string> = {}
      for (const p of chosen) qrMap[String(p.id)] = await qrFor(p, type)
      // People with their own saved design print with it; everyone else with the general template.
      const customPeople = chosen.filter((p) => personTemplates[String(p.id)])
      const generalPeople = chosen.filter((p) => !personTemplates[String(p.id)])
      const doc = [
        generalPeople.length ? buildPrintDoc(`${type} ID Cards`, tpl, generalPeople, type, assets, qrMap) : '',
        ...customPeople.map((p) => buildPrintDoc(`${type} ID Cards`, personTemplates[String(p.id)], [p], type, assets, qrMap)),
      ].filter(Boolean)
      const win = window.open('', '_blank')
      if (!win) { alert('Popup blocked. Please allow popups for this site.'); return }
      win.document.write(doc.join('<div style="page-break-after:always"></div>'))
      win.document.close()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate cards')
    } finally { setGenerating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select value={type} onChange={(e) => changeType(e.target.value as Audience)} className={inputCls}>
            {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        {type !== 'students' && (
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, designation, mobile…" className={`${inputCls} w-full pl-9`} />
            </div>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll}>{allSelected ? 'Deselect all' : `Select all (${filtered.length})`}</Button>
          <Button size="sm" disabled={selected.size === 0 || generating} onClick={printSelected}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Print / PDF ({selected.size})
          </Button>
        </div>
      </div>

      {type === 'students' && !loading && (
        <StudentFilters students={people} value={sf} onChange={setSf} shown={filtered.length} classes={classes} reorderNote={false} />
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
          : filtered.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No records found</div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">{type === 'students' ? 'ID' : 'Designation'}</th>
                  <th className="px-3 py-2">{type === 'students' ? 'Class' : 'Mobile'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={Number(p.id)} className={`cursor-pointer hover:bg-blue-50 ${selected.has(Number(p.id)) ? 'bg-blue-50' : ''}`} onClick={() => toggle(Number(p.id))}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(Number(p.id))} onChange={() => toggle(Number(p.id))} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="px-3 py-2 font-medium text-gray-900">{String(p.name)}</td>
                    <td className="px-3 py-2 text-gray-600">{String(p.student_id || p.designation || '-')}</td>
                    <td className="px-3 py-2 text-gray-600">{type === 'students' ? `${p.class || ''}${p.section ? `(${p.section})` : ''}` : String(p.mobile || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}

// ---------------- Expiry ----------------

function Expiry() {
  const [audience, setAudience] = useState<Audience>('students')
  const [def, setDef] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [date, setDate] = useState('')
  const [search, setSearch] = useState('')
  const [sf, setSf] = useState<StudentFilterState>(EMPTY_STUDENT_FILTERS)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    api.get(`/admin/card-expiry?audience=${audience}`).then((r: any) => { if (alive) setDef(r.data.default || '') }).catch(() => {})
    api.get(`/admin/id-cards?type=${audience}`)
      .then((r: any) => { if (alive) { setPeople(r.data || []); setLoading(false) } })
      .catch(() => { if (alive) { setPeople([]); setLoading(false) } })
    return () => { alive = false }
  }, [audience, reloadKey])

  const changeAudience = (a: Audience) => { setLoading(true); setSel(new Set()); setSearch(''); setSf(EMPTY_STUDENT_FILTERS); setMsg(null); setAudience(a) }

  const classes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of people) { const v = String(p.class ?? '').trim(); if (v) seen.set(v, v) }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((c) => ({ value: c, label: c }))
  }, [people])

  const filtered = useMemo(() => (
    audience === 'students' ? filterStudents(people, sf)
      : people.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
  ), [audience, people, sf, search])

  const allSel = filtered.length > 0 && filtered.every((p) => sel.has(Number(p.id)))
  const toggle = (id: number) => setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const saveDefault = async () => {
    setBusy(true); setMsg(null)
    try {
      await api.put('/admin/card-expiry/default', { audience, expire_date: def || null })
      setMsg({ ok: true, text: def ? `Default expiry set to ${niceDate(def)} for all ${audience}.` : `Removed the default expiry for all ${audience}.` })
      setReloadKey((k) => k + 1)
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }
  const applyPeople = async (clear: boolean) => {
    if (!sel.size) return
    if (!clear && !date) { setMsg({ ok: false, text: 'Pick a date first.' }); return }
    setBusy(true); setMsg(null)
    try {
      const r: any = await api.put('/admin/card-expiry/people', { audience, ids: [...sel], expire_date: clear ? null : date })
      setMsg({ ok: true, text: r.message })
      setSel(new Set()); setReloadKey((k) => k + 1)
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={audience} onChange={(e) => changeAudience(e.target.value as Audience)} className={inputCls} aria-label="Card for">
          {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
      </div>

      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="mb-1 text-sm font-semibold text-gray-800">Expiry for all {audience}</h4>
        <p className="mb-3 text-xs text-gray-500">This &quot;valid till&quot; date applies to everyone, unless a person has their own date below.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={def} onChange={(e) => setDef(e.target.value)} className={inputCls} aria-label="Default expiry date" />
          <Button size="sm" onClick={saveDefault} disabled={busy}>Save for all</Button>
          {def && <Button size="sm" variant="ghost" onClick={() => { setDef(''); }}>Clear</Button>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="mb-1 text-sm font-semibold text-gray-800">Expiry for specific people</h4>
        <p className="mb-3 text-xs text-gray-500">Select one or more people, pick a date, and apply. Their date overrides the default. &quot;Remove&quot; puts them back on the default.</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} aria-label="Expiry date for selected" />
          <Button size="sm" onClick={() => applyPeople(false)} disabled={busy || !sel.size || !date}>Set for selected ({sel.size})</Button>
          <Button size="sm" variant="outline" onClick={() => applyPeople(true)} disabled={busy || !sel.size}>Remove expiry for selected</Button>
        </div>

        {audience === 'students' ? (
          !loading && <StudentFilters students={people} value={sf} onChange={setSf} shown={filtered.length} classes={classes} reorderNote={false} />
        ) : (
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, designation…" className={`${inputCls} w-full pl-9`} />
          </div>
        )}

        <div className="max-h-[460px] overflow-auto rounded-lg border border-gray-200">
          {loading ? <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
            : filtered.length === 0 ? <div className="p-6 text-center text-sm text-gray-500">No records</div>
            : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-10 px-3 py-2"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(filtered.map((p) => Number(p.id))))} /></th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">{audience === 'students' ? 'ID' : 'Designation'}</th>
                    <th className="px-3 py-2">Valid till</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={Number(p.id)} className={`cursor-pointer hover:bg-blue-50 ${sel.has(Number(p.id)) ? 'bg-blue-50' : ''}`} onClick={() => toggle(Number(p.id))}>
                      <td className="px-3 py-2"><input type="checkbox" checked={sel.has(Number(p.id))} onChange={() => toggle(Number(p.id))} onClick={(e) => e.stopPropagation()} /></td>
                      <td className="px-3 py-2 font-medium text-gray-900">{String(p.name)}</td>
                      <td className="px-3 py-2 text-gray-600">{String(p.student_id || p.designation || '-')}</td>
                      <td className="px-3 py-2 text-gray-700">{p.expire_date ? niceDate(p.expire_date) : <span className="text-gray-400">No expiry</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  )
}

export default function IdCardsPage() {
  const [tab, setTab] = useState<'design' | 'print' | 'expiry'>('print')
  return (
    <PanelLayout role="admin" title="ID Cards">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">ID Cards</h1>
        </div>
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium">
          <button onClick={() => setTab('print')} className={`rounded-md px-4 py-1.5 ${tab === 'print' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Print cards</button>
          <button onClick={() => setTab('design')} className={`rounded-md px-4 py-1.5 ${tab === 'design' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Design</button>
          <button onClick={() => setTab('expiry')} className={`rounded-md px-4 py-1.5 ${tab === 'expiry' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Expiry date</button>
        </div>
        <Card>
          <CardContent className="p-5">
            {tab === 'print' ? <Printer /> : tab === 'design' ? <Designer /> : <Expiry />}
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
