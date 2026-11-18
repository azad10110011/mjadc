'use client'

// Ordered shortcut list editor (Session 110): used for panel defaults and per-user lists.

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import type { PanelRole } from '@/components/layout/PanelLayout'
import { panelLabel, qaAllLinks, qaLink, qaPanelHrefs, QA_PANELS } from '@/lib/quickAccess'

interface Props {
  panel: PanelRole
  value: string[]
  onChange: (v: string[]) => void
  /** extra note per item, e.g. "user can't open this" */
  note?: (href: string) => string | null
  /** limit "other panels" choices to these hrefs (e.g. pages the user has); undefined = all */
  otherAllowed?: (href: string) => boolean
  disabled?: boolean
}

export function QuickAccessEditor({ panel, value, onChange, note, otherAllowed, disabled }: Props) {
  const [pick, setPick] = useState('')
  const own = useMemo(() => qaPanelHrefs(panel), [panel])

  const groups = useMemo(() => {
    const links = qaAllLinks().filter((l) => !value.includes(l.href))
    const mine = links.filter((l) => own.has(l.href))
    const out: { label: string; items: typeof links }[] = [{ label: `${panelLabel(panel)} panel`, items: mine }]
    for (const p of QA_PANELS) {
      if (p === panel) continue
      const items = links.filter((l) => l.panel === p && !own.has(l.href) && (!otherAllowed || otherAllowed(l.href)))
      if (items.length) out.push({ label: `${panelLabel(p)} panel (only shown to users who have it)`, items })
    }
    return out.filter((g) => g.items.length)
  }, [value, own, panel, otherAllowed])

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const v = [...value];[v[i], v[j]] = [v[j], v[i]]
    onChange(v)
  }
  const add = () => {
    if (!pick || value.includes(pick)) return
    onChange([...value, pick]); setPick('')
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">No shortcuts: the Quick Access section will be hidden.</p>
      ) : (
        <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {value.map((href, i) => {
            const l = qaLink(href)
            const n = note?.(href)
            return (
              <li key={href} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-right text-xs text-gray-400">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900">{l?.label || href}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {l ? `${panelLabel(l.panel)}${l.section ? ` › ${l.section}` : ''}` : 'Unknown page'}
                    {n && <span className="ml-1 text-amber-700">· {n}</span>}
                  </span>
                </span>
                <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${l?.label || href} up`}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" disabled={disabled || i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${l?.label || href} down`}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" disabled={disabled} onClick={() => onChange(value.filter((h) => h !== href))} aria-label={`Remove ${l?.label || href}`}
                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30"><X className="h-4 w-4" /></button>
              </li>
            )
          })}
        </ol>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={disabled} aria-label="Page to add"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Choose a page to add…</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((l) => <option key={l.href} value={l.href}>{l.section ? `${l.section} › ` : ''}{l.label}</option>)}
            </optgroup>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={disabled || !pick}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>
    </div>
  )
}
