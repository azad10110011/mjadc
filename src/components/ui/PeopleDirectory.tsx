'use client'

// Public Teacher's List / Staff List (Session 77).
// md+ screens: the original table. Phones: one card per person (photo, name, designation and subject
// first; tap-to-call / tap-to-email), instead of a 10-column table squeezed to 390px.
// A search box filters by name (English/Bangla), designation, subject or mobile.

import { useMemo, useState } from 'react'
import { Search, Phone, Mail } from 'lucide-react'
import { UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'

export interface Person {
  id: number
  name: string
  name_bangla?: string
  designation: string
  subject?: string
  email?: string
  mobile: string
  photo_path: string | null
  pds_id: string | null
  mpo_index: string | null
  date_of_birth: string | null
}

const dob = (d: string | null) => (d ? d.split('-').reverse().join('/') : '-')

export function PeopleDirectory({ people, showEmail, emptyText }: { people: Person[]; showEmail: boolean; emptyText: string }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return people
    return people.filter((p) =>
      [p.name, p.name_bangla, p.designation, p.subject, p.mobile].some((v) => (v || '').toLowerCase().includes(s)))
  }, [people, q])

  const photo = (p: Person, size: string) => p.photo_path
    ? <PhotoWithPreview src={`${UPLOAD_BASE}/${p.photo_path}`} alt={p.name} className={`${size} rounded-full object-cover`} />
    : <div className={`${size} rounded-full bg-gray-200`} aria-hidden />

  const headers = ['SL No', 'PDS ID', 'MPO Index', 'Name', 'Designation', 'Subject', ...(showEmail ? ['E-mail'] : []), 'Mobile', 'Date of Birth', 'Picture']

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search"
          placeholder="Search name, designation or subject"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <p className="text-sm text-gray-500">{list.length} of {people.length}</p>

      {/* Phones: cards */}
      <ul className="space-y-3 md:hidden">
        {list.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="shrink-0">{photo(p, 'h-16 w-16')}</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug text-gray-900">{p.name}</p>
              {p.name_bangla && <p className="text-xs text-gray-500">{p.name_bangla}</p>}
              <p className="mt-0.5 text-sm text-blue-800">{p.designation}{p.subject ? ` · ${p.subject}` : ''}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {p.mobile && <a href={`tel:${p.mobile}`} className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-700"><Phone className="h-3.5 w-3.5" />{p.mobile}</a>}
                {showEmail && p.email && <a href={`mailto:${p.email}`} className="inline-flex min-w-0 items-center gap-1 break-all text-gray-700 hover:text-blue-700"><Mail className="h-3.5 w-3.5 shrink-0" />{p.email}</a>}
              </div>
              {(p.pds_id || p.mpo_index) && (
                <p className="mt-1 text-xs text-gray-400">{p.pds_id ? `PDS ${p.pds_id}` : ''}{p.pds_id && p.mpo_index ? ' · ' : ''}{p.mpo_index ? `MPO ${p.mpo_index}` : ''}</p>
              )}
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">{people.length ? 'No match' : emptyText}</li>}
      </ul>

      {/* Tablet / desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{headers.map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {list.map((p, i) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.pds_id || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.mpo_index || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {p.name}
                  {p.name_bangla && <span className="block text-xs text-gray-500">({p.name_bangla})</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.subject || '-'}</td>
                {showEmail && <td className="px-4 py-3 text-sm text-gray-700">{p.email}</td>}
                <td className="px-4 py-3 text-sm text-gray-700">{p.mobile}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{dob(p.date_of_birth)}</td>
                <td className="px-4 py-3">{photo(p, 'h-10 w-10')}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-gray-500">{people.length ? 'No match' : emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
