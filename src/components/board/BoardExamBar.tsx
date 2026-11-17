'use client'

// Board exam selector shown at the top of every Board Exam Management page.

import Link from 'next/link'
import type { BoardExam } from '@/lib/boardExam'

export function BoardExamBar({ exams, examId, onChange, loaded, extra }: {
  exams: BoardExam[]; examId: number | null; onChange: (id: number) => void; loaded: boolean; extra?: React.ReactNode
}) {
  if (loaded && exams.length === 0) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        No board exam yet. <Link href="/p_Xk7mN/board/exams" className="font-semibold underline">Create one in Board Exams &amp; Venues</Link> first.
      </div>
    )
  }
  const e = exams.find((x) => x.id === examId)
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="min-w-0 flex-1 text-sm sm:max-w-sm">
        <span className="mb-1 block font-medium text-gray-700">Board exam</span>
        <select value={examId ?? ''} onChange={(ev) => onChange(Number(ev.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {exams.map((x) => <option key={x.id} value={x.id}>{x.name} {x.year}</option>)}
        </select>
      </label>
      {e && (
        <p className="text-xs text-gray-500">
          {e.venues ?? 0} venue(s) · {e.rooms ?? 0} room(s) · {e.candidates ?? 0} candidate(s) · {e.seated ?? 0} seated · {e.sessions ?? 0} session(s)
        </p>
      )}
      {extra && <div className="ml-auto flex flex-wrap gap-2">{extra}</div>}
    </div>
  )
}
