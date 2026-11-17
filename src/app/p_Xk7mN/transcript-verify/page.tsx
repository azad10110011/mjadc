'use client'

// Admin -> Exam Management -> Transcript QR Verify
// Turn ONLINE verification of transcript QR codes ON/OFF per student per exam.
// ON  -> scanning the transcript QR shows the verified transcript.
// OFF -> scanner sees "Please contact Exam office to online verify your Transcript."

import { useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Input, Card, CardContent } from '@/components/ui'
import { useExamNames } from '@/lib/catalog'
import { api } from '@/lib/api'
import { useGroupOptions } from '@/lib/catalog'
import { ShieldCheck, ShieldOff, Search } from 'lucide-react'

interface Row {
  id: number
  student_id: string
  name: string
  class: string
  group: string | null
  class_roll: string | null
  enabled: boolean
  enabled_at: string | null
}

const GROUPS_BEFORE = [{ value: '', label: 'All Groups' }]

const STATUS = [
  { value: '', label: 'All' },
  { value: 'on', label: 'Verify ON' },
  { value: 'off', label: 'Verify OFF' },
]

export default function TranscriptVerifyPage() {
  const GROUPS = useGroupOptions(GROUPS_BEFORE)
  const EXAM_NAMES = useExamNames()
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [group, setGroup] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls]?.map((e) => ({ value: e, label: e })) : []

  const resetList = () => { setRows([]); setSelected([]); setLoaded(false); setMsg('') }

  const load = async () => {
    if (!cls || !examName || !year) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      const q = new URLSearchParams({ year, class: cls, exam_name: examName })
      const res = await api.get<{ data: { students: Row[] } }>(`/admin/transcript-verify?${q.toString()}`)
      setRows(res.data?.students || [])
      setSelected([])
      setLoaded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
      setRows([])
      setLoaded(false)
    } finally {
      setLoading(false)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) =>
      (!group || r.group === group) &&
      (!status || (status === 'on' ? r.enabled : !r.enabled)) &&
      (!q || r.name.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q)),
    )
  }, [rows, group, status, search])

  const visibleIds = visible.map((r) => r.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
  const enabledTotal = rows.filter((r) => r.enabled).length

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleAllVisible = () =>
    setSelected((prev) =>
      allVisibleSelected ? prev.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...prev, ...visibleIds])),
    )

  const apply = async (enabled: boolean, mode: 'selected' | 'all') => {
    const scope = mode === 'all'
      ? `ALL students of ${cls}${group ? ` (${group})` : ''}`
      : `${selected.length} selected student(s)`
    if (mode === 'all' && !window.confirm(`Turn online verification ${enabled ? 'ON' : 'OFF'} for ${scope} — ${examName} ${year}?`)) return
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await api.post('/admin/transcript-verify', {
        year, class: cls, exam_name: examName, enabled,
        ...(mode === 'all' ? { all: true, ...(group && { group }) } : { student_ids: selected }),
      })
      await load() // refresh statuses first — load() clears the message line
      setMsg(`Online verification turned ${enabled ? 'ON' : 'OFF'} for ${scope}.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PanelLayout role="admin" title="Transcript QR Verify">
      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-gray-600">
            Every transcript carries a QR code. When it is scanned, only students whose online verification is
            <b className="text-green-700"> ON</b> for that exam show their verified transcript. Everyone else sees
            <i> &quot;Please contact Exam office to online verify your Transcript.&quot;</i>
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => { setYear(e.target.value); resetList() }} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName(''); resetList() }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => { setExamName(e.target.value); resetList() }}
              placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <div className="flex items-end">
              <Button variant="primary" onClick={load} disabled={loading || !cls || !examName}>
                {loading ? 'Loading...' : 'Load Students'}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
        </CardContent>
      </Card>

      {loaded && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Group" options={GROUPS} value={group} onChange={(e) => setGroup(e.target.value)} />
              <Select label="Verify Status" options={STATUS} value={status} onChange={(e) => setStatus(e.target.value)} />
              <div className="relative">
                <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or Student ID" />
                <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => apply(true, 'selected')} disabled={saving || selected.length === 0}>
                <ShieldCheck className="mr-1 h-4 w-4" /> Verify ON for Selected ({selected.length})
              </Button>
              <Button variant="secondary" onClick={() => apply(false, 'selected')} disabled={saving || selected.length === 0}>
                <ShieldOff className="mr-1 h-4 w-4" /> Verify OFF for Selected
              </Button>
              <span className="mx-1 hidden h-6 w-px bg-gray-300 sm:inline-block" />
              <Button variant="primary" onClick={() => apply(true, 'all')} disabled={saving || rows.length === 0}>
                Verify ON for All {group ? group : `${cls}`} Students
              </Button>
              <Button variant="secondary" onClick={() => apply(false, 'all')} disabled={saving || rows.length === 0}>
                Verify OFF for All {group ? group : `${cls}`}
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              {examName} {year} · {cls}: <b className="text-green-700">{enabledTotal}</b> ON ·{' '}
              <b className="text-red-700">{rows.length - enabledTotal}</b> OFF · showing {visible.length} of {rows.length}
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-900 text-left text-white">
                  <tr>
                    <th className="px-3 py-2">
                      <input type="checkbox" aria-label="Select all shown" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
                    <th className="px-3 py-2">SL</th>
                    <th className="px-3 py-2">Student ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Group</th>
                    <th className="px-3 py-2">Roll</th>
                    <th className="px-3 py-2">Online Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => (
                    <tr key={r.id} className={`cursor-pointer border-t border-gray-100 ${selected.includes(r.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => toggle(r.id)}>
                      <td className="px-3 py-2">
                        <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.includes(r.id)}
                          onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-mono">{r.student_id}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2">{r.class}</td>
                      <td className="px-3 py-2">{r.group || '-'}</td>
                      <td className="px-3 py-2">{r.class_roll || '-'}</td>
                      <td className="px-3 py-2">
                        {r.enabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
                            title={r.enabled_at ? `Since ${r.enabled_at}` : undefined}>
                            <ShieldCheck className="h-3 w-3" /> ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            <ShieldOff className="h-3 w-3" /> OFF
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No students match</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
