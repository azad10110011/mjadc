// Shared ID card model + rendering, used by the designer (interactive) and the print output (HTML string),
// so what Admin designs is exactly what prints. Positions/sizes are in millimetres; font sizes in points.

export type ElType = 'field' | 'text' | 'photo' | 'qr' | 'image' | 'box' | 'line'

export interface CardElement {
  id: string
  type: ElType
  x: number; y: number; w: number; h: number; z: number
  fontSize?: number; bold?: boolean; italic?: boolean
  color?: string; align?: 'left' | 'center' | 'right'
  bg?: string; border?: string; radius?: number
  field?: string; label?: string; text?: string; src?: 'logo' | 'signature'
}

export interface CardTemplate {
  width_mm: number
  height_mm: number
  background: string
  elements: CardElement[]
}

export interface CardAssets {
  logo?: string
  signature?: string
  uploadBase: string
}

export type Person = Record<string, unknown>

const PT_TO_MM = 0.3528

function s(v: unknown): string {
  return v === null || v === undefined ? '' : String(v)
}

export function niceDate(v: unknown): string {
  const str = s(v)
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function resolveField(person: Person, key: string, audience: string): string {
  switch (key) {
    case 'college_name':
      return 'Miah Jinnah Alam Degree College'
    case 'college_address':
      return 'Garaganj, Shailkupa, Jhenaidah'
    case 'valid': {
      const y = new Date().getFullYear()
      return `${y}-${y + 1}`
    }
    case 'expire_date':
      return niceDate(person.expire_date)
    case 'emergency':
      return audience === 'students'
        ? s(person.parent_mobile || person.mobile || '-')
        : s(person.mobile || person.emergency_contact || '-')
    case 'full_class':
      return (
        s(person.class) +
        (person.student_group ? ` (${s(person.student_group)})` : '') +
        (person.section ? ` | ${s(person.section)}` : '')
      )
    default:
      return s(person[key])
  }
}

function esc(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c))
}

// Replace {Field} placeholders in a label / text with the person's values. {Designation} → designation,
// {Student ID} → student_id (case-insensitive, spaces become underscores). Unknown tokens become empty.
export function renderTemplate(str: string, person: Person, audience: string): string {
  return str.replace(/\{([^{}]+)\}/g, (_, raw) => resolveField(person, String(raw).trim().toLowerCase().replace(/\s+/g, '_'), audience))
}

/** True if the text uses at least one {placeholder}. */
export function hasPlaceholder(str: string | undefined): boolean {
  return !!str && /\{[^{}]+\}/.test(str)
}

export function photoUrlOf(person: Person, uploadBase: string): string | null {
  const p = person.photo_path
  if (!p) return null
  return `${uploadBase}/${s(p).replace(/^\/+/, '')}`
}

// Content HTML for one element (no positioning — the wrapper handles position/appearance).
export function elementInnerHtml(
  el: CardElement,
  person: Person,
  audience: string,
  assets: CardAssets,
  qrDataUrl: string,
): string {
  switch (el.type) {
    case 'field': {
      const label = el.label || ''
      // A label with {placeholders} is a full template (no separate value, no auto colon).
      if (hasPlaceholder(label)) return esc(renderTemplate(label, person, audience))
      const val = resolveField(person, el.field || '', audience)
      // Label is shown exactly as typed (colon only if the admin typed one), then the value.
      if (!label) return esc(val)
      return esc(`${label} ${val}`.trim())
    }
    case 'text':
      return esc(renderTemplate(el.text || '', person, audience))
    case 'photo': {
      const url = photoUrlOf(person, assets.uploadBase)
      return url
        ? `<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" crossorigin="anonymous"/>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#9ca3af;font-weight:700">PHOTO</div>`
    }
    case 'qr':
      return qrDataUrl
        ? `<img src="${qrDataUrl}" style="width:100%;height:100%;object-fit:contain;display:block"/>`
        : `<div style="width:100%;height:100%;background:#f3f4f6"></div>`
    case 'image': {
      const url = el.src === 'signature' ? assets.signature : assets.logo
      return url
        ? `<img src="${url}" style="width:100%;height:100%;object-fit:contain;display:block" crossorigin="anonymous"/>`
        : ''
    }
    default:
      return ''
  }
}

// Position/appearance CSS for one element, as a {prop:value} map. mode 'print' → mm units; 'screen' → px.
export function elementBoxCss(el: CardElement, mode: 'print' | 'screen', pxPerMm: number): Record<string, string> {
  const u = mode === 'print' ? (n: number) => `${n}mm` : (n: number) => `${n * pxPerMm}px`
  const css: Record<string, string> = {
    position: 'absolute',
    left: u(el.x),
    top: u(el.y),
    width: u(el.w),
    height: u(el.h),
    'z-index': String(el.z ?? 1),
    overflow: 'hidden',
    'box-sizing': 'border-box',
    display: 'flex',
    'flex-direction': 'column',
    'justify-content': 'center',
    'line-height': '1.15',
  }
  const fs = el.fontSize || 8
  css['font-size'] = mode === 'print' ? `${fs}pt` : `${fs * PT_TO_MM * pxPerMm}px`
  css['text-align'] = el.align || 'left'
  css['align-items'] = el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'
  if (el.color) css['color'] = el.color
  if (el.bold) css['font-weight'] = '700'
  if (el.italic) css['font-style'] = 'italic'
  if (el.bg) css['background'] = el.bg
  if (el.border) css['border'] = `${mode === 'print' ? '0.3mm' : `${Math.max(1, 0.3 * pxPerMm)}px`} solid ${el.border}`
  if (el.radius) css['border-radius'] = u(el.radius)
  if (el.type === 'line') {
    css['background'] = el.color || '#000000'
    css['height'] = u(Math.max(el.h, 0.3))
  }
  return css
}

export function cssText(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

// One full card as positioned HTML (used by print and the non-interactive preview).
export function cardHtml(
  tpl: CardTemplate,
  person: Person,
  audience: string,
  assets: CardAssets,
  qrDataUrl: string,
  mode: 'print' | 'screen',
  pxPerMm: number,
): string {
  const size =
    mode === 'print'
      ? `width:${tpl.width_mm}mm;height:${tpl.height_mm}mm`
      : `width:${tpl.width_mm * pxPerMm}px;height:${tpl.height_mm * pxPerMm}px`
  const els = [...tpl.elements]
    .sort((a, b) => (a.z ?? 1) - (b.z ?? 1))
    .map(
      (el) =>
        `<div style="${cssText(elementBoxCss(el, mode, pxPerMm))}">${elementInnerHtml(el, person, audience, assets, qrDataUrl)}</div>`,
    )
    .join('')
  return `<div style="position:relative;${size};background:${tpl.background || '#fff'};overflow:hidden;border:0.2mm solid #e5e7eb">${els}</div>`
}

// Full printable document for many people (QR data URLs keyed by person id).
export function buildPrintDoc(
  title: string,
  tpl: CardTemplate,
  people: Person[],
  audience: string,
  assets: CardAssets,
  qrByPersonId: Record<string, string>,
): string {
  const cards = people
    .map((p) => cardHtml(tpl, p, audience, assets, String(qrByPersonId[String(p.id)] || ''), 'print', 1))
    .join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 8mm; size: auto; }
  body { margin:0; font-family: Arial, Helvetica, sans-serif; }
  .sheet { display:flex; flex-wrap:wrap; gap:5mm; align-content:flex-start; }
  .sheet > div { page-break-inside: avoid; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="sheet">${cards}</div>
<script>
  var imgs = document.querySelectorAll('img'), n = imgs.length, c = 0, done = false;
  function go(){ if(!done){done=true; window.print(); setTimeout(function(){window.close();},800);} }
  function chk(){ if(++c>=n) go(); }
  if(n===0) go(); else { for(var i=0;i<n;i++){ imgs[i].complete ? chk() : (imgs[i].onload=chk, imgs[i].onerror=chk); } }
  setTimeout(function(){ if(!done) go(); }, 8000);
<\/script>
</body></html>`
}

export function verifyUrlFor(site: string, audience: string, id: number, token: string): string {
  return `${site.replace(/\/+$/, '')}/verify/id/?type=${audience}&id=${id}&t=${encodeURIComponent(token)}`
}
