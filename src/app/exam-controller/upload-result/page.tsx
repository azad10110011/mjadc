'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, calculateGradeFromParts, type StudentClass, type SubjectPart } from '@/types'
import { api } from '@/lib/api'

export default function ExamControllerUploadResultPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [partConfigs, setPartConfigs] = useState<SubjectPart[]>([])
  const [examSubjects, setExamSubjects] = useState<string[]>([])

  useEffect(() => {
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

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []

  const getColumns = () => {
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

  const handleLoad = async () => {
    if (!year || !cls || !examName || !subject) return
    setLoading(true)
    try {
      const res: any = await api.get(`/teacher/results/load-students?year=${year}&class=${cls}&exam_name=${encodeURIComponent(examName)}&subject=${encodeURIComponent(subject)}`)
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
        const gradeInfo = calculateGradeFromParts(partsData, configs, absentIn)
        const total = configs.reduce((sum, p) => sum + (partsData[p.part_name] ?? 0), 0)
        return { ...s, sl: i + 1, partsData: { ...partsData }, absentIn: [...absentIn], grade: gradeInfo.grade, gpa: gradeInfo.points, total }
      }))
      setLoaded(true)
    } catch {
      setStudents([])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const marks = students.map((s) => ({
        student_id: s.student_id,
        parts_data: s.partsData || {},
        absent_in: s.absentIn || [],
      }))
      await api.post('/exam-controller/results/upload', {
        year, class: cls, exam_name: examName, subject, marks,
      })
      alert('Results uploaded successfully')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateMark = (idx: number, partName: string, value: string) => {
    setStudents((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], partsData: { ...updated[idx].partsData, [partName]: Number(value) || 0 } }
      const parts = updated[idx].partsData
      const gradeInfo = calculateGradeFromParts(parts, partConfigs, updated[idx].absent_in || [])
      updated[idx].total = partConfigs.reduce((sum, p) => sum + (parts[p.part_name] ?? 0), 0)
      updated[idx].grade = gradeInfo.grade
      updated[idx].gpa = gradeInfo.points
      return updated
    })
  }

  const tableData = students.map((s, i) => {
    const row: any = {
      sl: s.sl,
      student_id: s.student_id,
      name: s.name,
    }
    partConfigs.forEach((p) => {
      const fullMark = p.full_mark
      row[p.part_name] = (
        <input
          type="number"
          className="w-16 rounded border px-1 py-0.5 text-sm"
          value={s.partsData?.[p.part_name] ?? 0}
          min={0}
          max={fullMark}
          onChange={(e) => updateMark(i, p.part_name, String(Math.min(fullMark, Math.max(0, Number(e.target.value) || 0))))}
        />
      )
    })
    row.total = s.total
    row.grade = <span className={`text-sm font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>{s.grade}</span>
    row.gpa = s.grade === 'Absent' ? 'Absent' : s.gpa
    return row
  })

  return (
    <PanelLayout role="exam_controller" title="Upload Result">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Subject" options={examSubjects.map((s) => ({ value: s, label: s }))} value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder="Select Subject" />
          </div>
          <Button onClick={handleLoad} disabled={!year || !cls || !examName || !subject || loading}>
            {loading ? 'Loading...' : 'Load Students'}
          </Button>
        </CardContent>
      </Card>

      {loaded && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={getColumns()} data={tableData} emptyMessage="No results found for these filters" />
            <Button className="mt-4" onClick={handleSave} disabled={saving || students.length === 0}>
              {saving ? 'Saving...' : 'Save Results'}
            </Button>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
