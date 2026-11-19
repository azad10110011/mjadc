'use client'

// Search + filters for the All Students lists (Admin and Administration panels) — Session 120.
// Filtering is done in the browser on the list already loaded, so it is instant.
// Choices for Group / Session come from the students themselves, so they always match stored values.

import { Search, X } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StudentFilterState {
  q: string
  cls: string
  group: string
  gender: string
  session: string
}

export const EMPTY_STUDENT_FILTERS: StudentFilterState = { q: '', cls: '', group: '', gender: '', session: '' }

export function studentFiltersActive(f: StudentFilterState): boolean {
  return !!(f.q.trim() || f.cls || f.group || f.gender || f.session)
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()

/** Apply the search box + dropdowns to a student list. */
export function filterStudents<T extends Record<string, any>>(list: T[], f: StudentFilterState): T[] {
  const q = norm(f.q)
  return list.filter((s) => {
    if (q) {
      const hay = [s.student_id, s.name, s.mobile, s.parent_mobile, s.father_name, s.class_roll].map(norm)
      if (!hay.some((h) => h.includes(q))) return false
    }
    if (f.cls && s.class !== f.cls) return false
    if (f.group && norm(s.student_group) !== norm(f.group)) return false
    if (f.gender && norm(s.gender) !== norm(f.gender)) return false
    if (f.session && String(s.academic_session ?? '') !== f.session) return false
    return true
  })
}

function distinct(list: Record<string, any>[], key: string): string[] {
  const seen = new Map<string, string>()
  for (const s of list) {
    const v = String(s[key] ?? '').trim()
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

interface Props {
  students: Record<string, any>[]
  value: StudentFilterState
  onChange: (v: StudentFilterState) => void
  shown: number
  /** class list for the Class dropdown (value/label) */
  classes: { value: string; label: string }[]
  /** hide the Class dropdown (e.g. the page is already limited to one class via ?class=) */
  hideClass?: boolean
}

const selectCls = 'h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

export function StudentFilters({ students, value, onChange, shown, classes, hideClass }: Props) {
  const set = (patch: Partial<StudentFilterState>) => onChange({ ...value, ...patch })
  const groups = distinct(students, 'student_group')
  const sessions = distinct(students, 'academic_session')
  const genders = distinct(students, 'gender')
  const active = studentFiltersActive(value)

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search ID, name, mobile, father, roll"
            aria-label="Search students"
            className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {!hideClass && (
          <select aria-label="Class" value={value.cls} onChange={(e) => set({ cls: e.target.value })} className={selectCls}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
        <select aria-label="Group" value={value.group} onChange={(e) => set({ group: e.target.value })} className={selectCls}>
          <option value="">All groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select aria-label="Gender" value={value.gender} onChange={(e) => set({ gender: e.target.value })} className={selectCls}>
          <option value="">All genders</option>
          {genders.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
        </select>
        {sessions.length > 0 && (
          <select aria-label="Session" value={value.session} onChange={(e) => set({ session: e.target.value })} className={selectCls}>
            <option value="">All sessions</option>
            {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {active && (
          <button type="button" onClick={() => onChange(EMPTY_STUDENT_FILTERS)}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500" aria-live="polite">
        Showing <b className="text-gray-800">{shown}</b> of {students.length} student{students.length === 1 ? '' : 's'}
        {active && ' · drag-to-reorder is paused while filtering'}
      </p>
    </div>
  )
}
