'use client'

// Exams & Groups (Session 88): admin manages the exam names per class, creates / deletes exams for a
// year, and adds / removes student groups (with the Student ID group digit). Every exam / group
// dropdown on the site reads these lists.

import { useCallback, useEffect, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { refreshCatalog, setCatalog, useCatalog, type CatalogGroup } from '@/lib/catalog'
import { Plus, Trash2, X, CalendarPlus, Users, ListOrdered } from 'lucide-react'

const CLASSES = ['11th', '12th']
type Msg = { ok: boolean; text: string } | null
type ExamRow = { id: number; year: number; class: string; exam_name: string }

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
const inputCls = 'min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function ExamsGroupsPage() {
  const catalog = useCatalog()
  const thisYear = new Date().getFullYear()
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  // exam names
  const [nameInput, setNameInput] = useState<Record<string, string>>({ '11th': '', '12th': '' })

  // exams of a year
  const [year, setYear] = useState(String(thisYear))
  const [exams, setExams] = useState<ExamRow[]>([])
  const [examCls, setExamCls] = useState('11th')
  const [examName, setExamName] = useState('')

  // groups
  const [groupName, setGroupName] = useState('')
  const [groupCode, setGroupCode] = useState('')

  const loadExams = useCallback(async (y: string) => {
    try {
      const res = await api.get<{ data: ExamRow[] }>(`/admin/exams?year=${y}`)
      setExams(res.data || [])
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Failed to load exams') })
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void loadExams(year), 0)
    return () => clearTimeout(t)
  }, [year, loadExams])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'Request failed') })
    } finally {
      setBusy(false)
    }
  }

  const saveNames = (cls: string, names: string[]) =>
    run(async () => {
      const res = await api.put<{ data: Record<string, string[]>; message: string }>('/admin/catalog/exam-names', { class: cls, names })
      setCatalog({ exam_names: res.data })
      return res.message || 'Saved'
    })

  const addName = (cls: string) => {
    const n = (nameInput[cls] || '').trim().replace(/\s+/g, ' ')
    if (!n) return
    const list = catalog.exam_names[cls] || []
    if (list.some((x) => x.toLowerCase() === n.toLowerCase())) { setMsg({ ok: false, text: `"${n}" is already in the ${cls} list` }); return }
    setNameInput((p) => ({ ...p, [cls]: '' }))
    void saveNames(cls, [...list, n])
  }

  const removeName = (cls: string, n: string) => {
    if (!confirm(`Remove "${n}" from the ${cls} exam list?`)) return
    void saveNames(cls, (catalog.exam_names[cls] || []).filter((x) => x !== n))
  }

  const createExam = () =>
    run(async () => {
      const name = examName.trim().replace(/\s+/g, ' ')
      const res = await api.post<{ message: string }>('/admin/exams', { year, class: examCls, exam_name: name })
      setExamName('')
      await Promise.all([loadExams(year), refreshCatalog()])
      return res.message || 'Exam created'
    })

  const deleteExam = (e: ExamRow) => {
    if (!confirm(`Delete exam "${e.exam_name} ${e.year} (${e.class})"?`)) return
    void run(async () => {
      const res = await api.delete<{ message: string }>(`/admin/exams/${e.id}`)
      await loadExams(year)
      return res.message || 'Exam deleted'
    })
  }

  const usedCodes = new Set(catalog.groups.map((g) => g.code))
  const freeCodes = Array.from({ length: 10 }, (_, i) => String(i)).filter((c) => !usedCodes.has(c))

  const addGroup = () =>
    run(async () => {
      const res = await api.post<{ data: CatalogGroup[]; message: string }>('/admin/catalog/groups', { name: groupName.trim(), code: groupCode })
      setCatalog({ groups: res.data })
      setGroupName('')
      setGroupCode('')
      return res.message || 'Group added'
    })

  const removeGroup = (g: CatalogGroup) => {
    if (!confirm(`Remove group "${g.name}"?`)) return
    void run(async () => {
      const res = await api.delete<{ data: CatalogGroup[]; message: string }>(`/admin/catalog/groups?name=${encodeURIComponent(g.name)}`)
      setCatalog({ groups: res.data })
      return res.message || 'Group removed'
    })
  }

  const years = Array.from({ length: 13 }, (_, i) => String(thisYear - 2 + i))

  return (
    <PanelLayout role="admin" title="Exams & Groups">
      <div className="mx-auto max-w-5xl space-y-4">
        {msg && (
          <div role="status" className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ---------- Exam names ---------- */}
        <Card>
          <CardContent>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900"><ListOrdered className="h-5 w-5 text-blue-600" /> Exam Names</h2>
            <p className="mb-4 text-sm text-gray-500">These names appear in every Exam dropdown (results, routine, admit card, fee set…). A name already used by an exam cannot be removed.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {CLASSES.map((cls) => (
                <div key={cls} className="rounded-xl border border-gray-200 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">Class {cls}</h3>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(catalog.exam_names[cls] || []).map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1 text-sm text-blue-900">
                        {n}
                        <button onClick={() => removeName(cls, n)} disabled={busy} aria-label={`Remove ${n}`}
                          className="rounded-full p-0.5 text-blue-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {(catalog.exam_names[cls] || []).length === 0 && <span className="text-sm text-gray-400">No exam names</span>}
                  </div>
                  <div className="flex gap-2">
                    <input value={nameInput[cls] || ''} maxLength={50} placeholder="New exam name"
                      onChange={(e) => setNameInput((p) => ({ ...p, [cls]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addName(cls) }}
                      className={`${inputCls} flex-1`} aria-label={`New exam name for ${cls}`} />
                    <Button onClick={() => addName(cls)} disabled={busy || !(nameInput[cls] || '').trim()}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ---------- Exams of a year ---------- */}
        <Card>
          <CardContent>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900"><CalendarPlus className="h-5 w-5 text-blue-600" /> Exams by Year</h2>
            <p className="mb-4 text-sm text-gray-500">Create an exam for a year so it can get a fee, paper selection and routine before any result is uploaded. An exam with results, routine days or fee payments cannot be deleted.</p>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputCls} w-full sm:w-28`}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Class</span>
                <select value={examCls} onChange={(e) => setExamCls(e.target.value)} className={`${inputCls} w-full sm:w-28`}>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block font-medium text-gray-700">Exam name</span>
                <input list={`exam-names-${examCls}`} value={examName} maxLength={50} placeholder="Choose or type a new name"
                  onChange={(e) => setExamName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && examName.trim()) void createExam() }}
                  className={`${inputCls} w-full`} />
                <datalist id={`exam-names-${examCls}`}>
                  {(catalog.exam_names[examCls] || []).map((n) => <option key={n} value={n} />)}
                </datalist>
              </label>
              <Button onClick={createExam} disabled={busy || !examName.trim()}><Plus className="mr-1 h-4 w-4" /> Create Exam</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {CLASSES.map((cls) => {
                const list = exams.filter((e) => e.class === cls)
                return (
                  <div key={cls} className="rounded-xl border border-gray-200">
                    <h3 className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Class {cls} · {year}</h3>
                    {list.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-400">No exams created for {year}</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {list.map((e) => (
                          <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-medium text-gray-900">{e.exam_name}</span>
                            <button onClick={() => deleteExam(e)} disabled={busy} aria-label={`Delete ${e.exam_name}`}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ---------- Groups ---------- */}
        <Card>
          <CardContent>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900"><Users className="h-5 w-5 text-blue-600" /> Student Groups</h2>
            <p className="mb-4 text-sm text-gray-500">
              The ID digit is the group digit inside a Student ID (e.g. 26<b>1</b>005 = Science, roll 5). A group used by any student, subject or teacher cannot be removed.
            </p>
            <div className="mb-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr><th className="px-3 py-2">Group</th><th className="px-3 py-2">ID digit</th><th className="px-3 py-2 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {catalog.groups.map((g) => (
                    <tr key={g.name}>
                      <td className="px-3 py-2 font-medium text-gray-900">{g.name}</td>
                      <td className="px-3 py-2 font-mono">{g.code}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeGroup(g)} disabled={busy} aria-label={`Remove ${g.name}`}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block font-medium text-gray-700">New group name</span>
                <input value={groupName} maxLength={50} placeholder="e.g. Vocational" onChange={(e) => setGroupName(e.target.value)} className={`${inputCls} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">ID digit</span>
                <select value={groupCode} onChange={(e) => setGroupCode(e.target.value)} className={`${inputCls} w-full sm:w-28`}>
                  <option value="">Select</option>
                  {freeCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <Button onClick={addGroup} disabled={busy || !groupName.trim() || !groupCode}><Plus className="mr-1 h-4 w-4" /> Add Group</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
