'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, SUBJECTS, calculateGrade, type StudentClass } from '@/types'
import { api } from '@/lib/api'

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([])
  const [filterExamName, setFilterExamName] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [userMap, setUserMap] = useState<Record<number, string>>({})

  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const subjectOptions = SUBJECTS.map((s) => ({ value: s, label: s }))

  const fetchResults = () => {
    const params = new URLSearchParams()
    if (filterExamName) params.set('exam_name', filterExamName)
    if (filterClass) params.set('class', filterClass)
    if (filterYear) params.set('year', filterYear)
    if (filterSubject) params.set('subject', filterSubject)
    api.get<any>(`/admin/results?${params}`)
      .then((res) => setResults(res.data || []))
      .catch(() => setResults([]))
  }

  useEffect(() => {
    fetchResults()
    api.get<{ status: number; data: { id: number; name: string }[] }>('/admin/users')
      .then((res) => {
        const map: Record<number, string> = {}
        res.data.forEach((u) => { map[u.id] = u.name })
        setUserMap(map)
      })
      .catch(() => {})
  }, [])

  const handleLoad = async () => {
    if (!year || !cls || !examName || !subject) return
    setLoading(true)
    try {
      const res: any = await api.get(
        `/admin/results/upload-data?year=${year}&class=${cls}&exam_name=${encodeURIComponent(examName)}&subject=${encodeURIComponent(subject)}`
      )
      const data = res.data || []
      setStudents(data.map((s: any, i: number) => ({
        ...s,
        sl: i + 1,
        mcq: s.mcq ?? '',
        cq: s.cq ?? '',
        practical: s.practical ?? '',
        total: s.total ?? 0,
        grade: s.grade ?? '',
        gpa: s.gpa ?? '',
      })))
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const updateMark = (idx: number, field: string, value: string) => {
    setStudents((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      const mcq = Number(updated[idx].mcq) || 0
      const cq = Number(updated[idx].cq) || 0
      const practical = Number(updated[idx].practical) || 0
      const total = mcq + cq + practical
      const { grade, points } = calculateGrade(total)
      updated[idx].total = total
      updated[idx].grade = grade
      updated[idx].gpa = points
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const marks = students
        .filter((s) => Number(s.mcq) || Number(s.cq) || Number(s.practical))
        .map((s) => ({
          student_id: s.student_id,
          mcq: Number(s.mcq) || 0,
          cq: Number(s.cq) || 0,
          practical: Number(s.practical) || 0,
        }))
      if (marks.length === 0) { alert('No marks to save'); return }
      await api.post('/admin/results/upload', {
        year, class: cls, exam_name: examName, subject, marks,
      })
      alert('Results saved successfully')
      handleLoad()
      fetchResults()
    } catch (e: any) {
      alert(e.message || 'Failed to save results')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!year || !cls || !examName || !subject) return
    if (!confirm(`Delete ALL results for ${examName} ${cls} ${year} - ${subject}?`)) return
    try {
      await api.delete(
        `/admin/results/bulk?exam_name=${encodeURIComponent(examName)}&class=${cls}&year=${year}&subject=${encodeURIComponent(subject)}`
      )
      alert('Results deleted')
      setStudents((prev) => prev.map((s) => ({ ...s, mcq: '', cq: '', practical: '', total: 0, grade: '', gpa: '' })))
      fetchResults()
    } catch (e: any) {
      alert(e.message || 'Failed to delete results')
    }
  }

  const handleDeleteOne = (id: number) => {
    if (!confirm('Delete this result?')) return
    api.delete(`/admin/results/${id}`)
      .then(() => fetchResults())
      .catch(() => {})
  }

  const uploadColumns = [
    { key: 'sl', label: 'SL No' },
    { key: 'student_id', label: 'Roll' },
    { key: 'name', label: 'Name' },
    { key: 'mcq', label: 'MCQ' },
    { key: 'cq', label: 'CQ' },
    { key: 'practical', label: 'Practical' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  const uploadRows = students.map((s, i) => ({
    ...s,
    mcq: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.mcq} onChange={(e) => updateMark(i, 'mcq', e.target.value)} />,
    cq: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.cq} onChange={(e) => updateMark(i, 'cq', e.target.value)} />,
    practical: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.practical} onChange={(e) => updateMark(i, 'practical', e.target.value)} />,
  }))

  const listColumns = [
    { key: 'id', label: 'ID' },
    { key: 'student_id', label: 'Roll' },
    { key: 'student_name', label: 'Name' },
    { key: 'exam_name', label: 'Exam' },
    { key: 'class', label: 'Class' },
    { key: 'year', label: 'Year' },
    { key: 'subject', label: 'Subject' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
    { key: 'uploaded_by', label: 'Uploaded By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const listRows = results.map((r) => ({
    ...r,
    uploaded_by: r.uploaded_by ? (userMap[r.uploaded_by] || `User #${r.uploaded_by}`) : '-',
    approved_by: r.approved_by ? (userMap[r.approved_by] || `User #${r.approved_by}`) : '-',
    actions: <div className="flex gap-1">
      <Button variant="secondary" size="sm" onClick={() => {
        setYear(r.year); setCls(r.class); setExamName(r.exam_name); setSubject(r.subject);
        setFilterYear(r.year); setFilterClass(r.class); setFilterExamName(r.exam_name); setFilterSubject(r.subject);
        setTimeout(() => {
          const loadBtn = document.querySelector('[data-load-btn]') as HTMLButtonElement
          if (loadBtn) { loadBtn.scrollIntoView({ behavior: 'smooth' }); loadBtn.click() }
        }, 100)
      }}>Edit</Button>
      <Button variant="danger" size="sm" onClick={() => handleDeleteOne(r.id)}>Delete</Button>
    </div>,
  }))

  return (
    <PanelLayout role="admin" title="Result Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Upload / Update Results</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Subject" options={subjectOptions} value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder="Select Subject" />
          </div>
          <div className="flex gap-2">
            <Button data-load-btn onClick={handleLoad} disabled={!year || !cls || !examName || !subject || loading}>
              {loading ? 'Loading...' : 'Load Students'}
            </Button>
            {students.length > 0 && (
              <>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Results'}
                </Button>
                <Button variant="danger" onClick={handleDeleteAll}>
                  Delete All Results
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <DataTable columns={uploadColumns} data={uploadRows} emptyMessage="No students loaded" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Existing Results</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Select label="Exam Name" options={[]} placeholder="All" value={filterExamName} onChange={(e) => setFilterExamName(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} placeholder="All" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} />
            <Select label="Year" options={years} placeholder="All" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
            <Select label="Subject" options={subjectOptions} placeholder="All" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} />
          </div>
          <Button onClick={fetchResults}>Filter</Button>
          <DataTable columns={listColumns} data={listRows} emptyMessage="No results" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
