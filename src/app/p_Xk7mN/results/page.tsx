'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, calculateGradeFromParts, type StudentClass, type SubjectPart } from '@/types'
import { api } from '@/lib/api'
import { exportToExcel, exportToPDF } from '@/lib/export'

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
  const [partConfigs, setPartConfigs] = useState<SubjectPart[]>([])
  const [examSubjects, setExamSubjects] = useState<string[]>([])

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const subjectOptions = examSubjects.map((s) => ({ value: s, label: s }))

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
    api.get<{ status: number; data: { name: string; papers: { name: string }[] }[] }>('/admin/subjects/tree')
      .then((res) => {
        const list: string[] = []
        for (const group of res.data) {
          if (group.papers.length > 0) {
            for (const paper of group.papers) list.push(paper.name)
          } else {
            list.push(group.name)
          }
        }
        setExamSubjects(list)
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
      const configs: SubjectPart[] = res.data?.part_configs || []
      setPartConfigs(configs)
      const data = res.data?.students || []
      setStudents(data.map((s: any, i: number) => {
        const absentIn: string[] = [...(s.absent_in || [])]
        const rawParts: Record<string, number> = s.parts_data || {}
        const partsData: Record<string, number> = {}
        configs.forEach((p) => {
          const val = rawParts[p.part_name] !== undefined ? Number(rawParts[p.part_name]) : (Number(s[p.part_name]) || 0)
          partsData[p.part_name] = val
          if (val > 0 && absentIn.includes(p.part_name)) {
            const idx = absentIn.indexOf(p.part_name)
            if (idx !== -1) absentIn.splice(idx, 1)
          }
        })
        const total = configs.reduce((sum, p) => sum + (partsData[p.part_name] ?? 0), 0)
        const gradeInfo = calculateGradeFromParts(partsData, configs, absentIn)
        return {
          ...s,
          absent_in: absentIn,
          sl: i + 1,
          partsData,
          total,
          grade: gradeInfo.grade,
          gpa: gradeInfo.points,
        }
      }))
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const updateMark = (idx: number, partName: string, value: string) => {
    setStudents((prev) => {
      const updated = [...prev]
      const s = { ...updated[idx] }
      s.absent_in = s.absent_in || []
      s.partsData = { ...s.partsData, [partName]: Number(value) || 0 }
      if (s.absent_in.includes(partName)) {
        s.absent_in = s.absent_in.filter((f: string) => f !== partName)
      }
      const gradeInfo = calculateGradeFromParts(s.partsData, partConfigs, s.absent_in)
      s.total = partConfigs.reduce((sum, p) => sum + (s.partsData[p.part_name] ?? 0), 0)
      s.grade = gradeInfo.grade
      s.gpa = gradeInfo.points
      updated[idx] = s
      return updated
    })
  }

  const toggleAbsent = (idx: number, partName: string) => {
    setStudents((prev) => {
      const updated = [...prev]
      const s = { ...updated[idx] }
      s.partsData = { ...s.partsData }
      s.absent_in = [...(s.absent_in || [])]
      if (s.absent_in.includes(partName)) {
        s.absent_in = s.absent_in.filter((f: string) => f !== partName)
        s.partsData[partName] = 0
      } else {
        s.absent_in = [...s.absent_in, partName]
        s.partsData[partName] = 0
      }
      const gradeInfo = calculateGradeFromParts(s.partsData, partConfigs, s.absent_in)
      s.total = partConfigs.reduce((sum, p) => sum + (s.partsData[p.part_name] ?? 0), 0)
      s.grade = gradeInfo.grade
      s.gpa = gradeInfo.points
      updated[idx] = s
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const marks = students
        .filter((s) => (Object.values(s.partsData) as number[]).some((v) => Number(v) > 0))
        .map((s) => ({
          student_id: s.student_id,
          parts_data: s.partsData,
          absent_in: s.absent_in || [],
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
      setStudents([])
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

  const getUploadColumns = () => {
    const cols = [
      { key: 'sl', label: 'SL No' },
      { key: 'student_id', label: 'Roll' },
      { key: 'name', label: 'Name' },
    ]
    partConfigs.forEach((p) => {
      cols.push({ key: p.part_name, label: p.part_name.toUpperCase() })
    })
    cols.push(
      { key: 'total', label: 'Total' },
      { key: 'grade', label: 'Grade' },
      { key: 'gpa', label: 'GPA' },
    )
    return cols
  }

  const uploadRows = students.map((s, i) => {
    const row: any = { sl: s.sl, student_id: s.student_id, name: s.name }
    partConfigs.forEach((p) => {
      const config = p
      const val = s.partsData?.[p.part_name] ?? 0
      const absent = s.absent_in?.includes(p.part_name) ?? false
      const isRed = absent || val < config.pass_mark || val > config.full_mark
      row[p.part_name] = (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={`w-14 rounded border px-1 py-0.5 text-sm ${isRed ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
            value={val}
            disabled={absent}
            min={0}
            max={config.full_mark}
            onChange={(e) => updateMark(i, p.part_name, String(Math.min(config.full_mark, Math.max(0, Number(e.target.value) || 0))))}
          />
          <label className="flex items-center gap-0.5 text-xs whitespace-nowrap">
            <input type="checkbox" checked={absent} onChange={() => toggleAbsent(i, p.part_name)} />
            Absent
          </label>
        </div>
      )
    })
    row.total = s.total
    row.grade = <span className={`text-sm font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>{s.grade}</span>
    row.gpa = s.grade === 'Absent' ? 'Absent' : Number(s.gpa).toFixed(2)
    return row
  })

  const listColumns = [
    { key: 'id', label: 'ID' },
    { key: 'student_id', label: 'Roll' },
    { key: 'student_name', label: 'Name' },
    { key: 'exam_name', label: 'Exam' },
    { key: 'class', label: 'Class' },
    { key: 'year', label: 'Year' },
    { key: 'subject', label: 'Subject' },
    { key: 'marks', label: 'Marks' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
    { key: 'uploaded_by', label: 'Uploaded By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const listRows = results.map((r) => {
    let marksStr = ''
    if (r.parts_data) {
      marksStr = Object.entries(r.parts_data)
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join(', ')
    } else {
      const parts = []
      if (r.mcq != null) parts.push(`MCQ: ${r.mcq}`)
      if (r.cq != null) parts.push(`CQ: ${r.cq}`)
      if (r.practical != null) parts.push(`Practical: ${r.practical}`)
      marksStr = parts.join(', ')
    }
    return {
      ...r,
      marks: <span className="text-xs">{marksStr}</span>,
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
    }
  })

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
            <DataTable key={`upload-${subject}`} columns={getUploadColumns()} data={uploadRows} emptyMessage="No students loaded" />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => {
                const cols = getUploadColumns().map(c => ({ key: c.key, label: c.label }))
                const data = uploadRows.map(r => {
                  const row: any = { sl: r.sl, student_id: r.student_id, name: r.name, total: r.total, grade: r.grade, gpa: r.gpa }
                  partConfigs.forEach((p) => { row[p.part_name] = r[p.part_name] })
                  return row
                })
                exportToExcel(data, cols, `marks_${cls}_${examName}_${subject}_${year}`)
              }}>
                Download Excel
              </Button>
              <Button variant="secondary" onClick={() => {
                const cols = getUploadColumns().map(c => ({ key: c.key, label: c.label }))
                const data = uploadRows.map(r => {
                  const row: any = { sl: r.sl, student_id: r.student_id, name: r.name, total: r.total, grade: r.grade, gpa: r.gpa }
                  partConfigs.forEach((p) => { row[p.part_name] = r[p.part_name] })
                  return row
                })
                exportToPDF(data, cols, `Mark Sheet - ${examName} ${cls} ${year} - ${subject}`, `marks_${cls}_${examName}_${subject}_${year}`)
              }}>
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Existing Results</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Select label="Exam Name" options={[...new Set(Object.values(EXAM_NAMES).flat())].map((e) => ({ value: e, label: e }))} placeholder="All" value={filterExamName} onChange={(e) => setFilterExamName(e.target.value)} />
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
