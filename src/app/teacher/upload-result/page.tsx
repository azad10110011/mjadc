'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, calculateGradeFromParts, type StudentClass, type SubjectPart } from '@/types'
import { api } from '@/lib/api'

function parseJwtPayload(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function MarkCell({ value, absent, min, max, onChange, onAbsentChange }: {
  value: number; absent: boolean; min: number; max: number
  onChange: (v: number) => void; onAbsentChange: (v: boolean) => void
}) {
  const isRed = absent || value < min || value > max
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        className={`w-14 rounded border px-1 py-0.5 text-sm ${isRed ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
        value={value}
        disabled={absent}
        min={0}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
      />
      <label className="flex items-center gap-0.5 text-xs whitespace-nowrap">
        <input type="checkbox" checked={absent} onChange={(e) => onAbsentChange(e.target.checked)} />
        Absent
      </label>
    </div>
  )
}

export default function TeacherUploadResultPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')
  const [showGrid, setShowGrid] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [isExamController, setIsExamController] = useState(false)
  const [partConfigs, setPartConfigs] = useState<SubjectPart[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const payload = parseJwtPayload(token)
    if (!payload) return
    api.get<{ status: number; data: any[] }>('/admin/users')
      .then((res) => {
        const currentUser = res.data.find((u: any) => u.email === payload.email || u.id === payload.sub)
        if (!currentUser) return
        const roles: string[] = currentUser.roles || []
        setIsExamController(roles.includes('exam_controller'))
        if (roles.includes('teacher') && !roles.includes('exam_controller')) {
          setAvailableSubjects(currentUser.result_subjects && currentUser.result_subjects.length > 0 ? currentUser.result_subjects : [])
        }
      })
      .catch(() => {})
    if (!localStorage.getItem('token')) return
    api.get<{ status: number; data: string[] }>('/result-subjects')
      .then((res) => {
        const payload = parseJwtPayload(localStorage.getItem('token')!)
        if (payload) {
          setAvailableSubjects(res.data)
        }
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
      { key: 'gpa', label: 'Grade Point' },
    )
    return cols
  }

  const handleLoadStudents = async () => {
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
      setShowGrid(true)
    } catch {
      setStudents([])
      setShowGrid(true)
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
      await api.post('/teacher/results/upload', {
        year, class: cls, exam_name: examName, subject, marks,
      })
      alert('Results saved successfully')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateMark = (idx: number, partName: string, value: number) => {
    setStudents((prev) => {
      const updated = [...prev]
      const s = { ...updated[idx] }
      s.partsData = { ...s.partsData, [partName]: value }
      if (s.absentIn.includes(partName)) {
        s.absentIn = s.absentIn.filter((f: string) => f !== partName)
      }
      const gradeInfo = calculateGradeFromParts(s.partsData, partConfigs, s.absentIn)
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
      if (s.absentIn.includes(partName)) {
        s.absentIn = s.absentIn.filter((f: string) => f !== partName)
        s.partsData[partName] = 0
      } else {
        s.absentIn = [...s.absentIn, partName]
        s.partsData[partName] = 0
      }
      const gradeInfo = calculateGradeFromParts(s.partsData, partConfigs, s.absentIn)
      s.total = partConfigs.reduce((sum, p) => sum + (s.partsData[p.part_name] ?? 0), 0)
      s.grade = gradeInfo.grade
      s.gpa = gradeInfo.points
      updated[idx] = s
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
      const config = p
      row[p.part_name] = (
        <MarkCell
          value={s.partsData?.[p.part_name] ?? 0}
          absent={s.absentIn.includes(p.part_name)}
          min={config.pass_mark}
          max={config.full_mark}
          onChange={(v) => updateMark(i, p.part_name, v)}
          onAbsentChange={() => toggleAbsent(i, p.part_name)}
        />
      )
    })
    row.total = <span className={`text-sm font-medium ${s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.total}</span>
    row.grade = <span className={`text-sm font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>{s.grade}</span>
    row.gpa = <span className={`text-sm font-medium ${s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade === 'Absent' ? 'Absent' : s.gpa}</span>
    return row
  })

  return (
    <PanelLayout role="teacher" title="Upload Result">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          {isExamController && (
            <p className="text-xs text-blue-600">Exam Controller: You can upload marks for all subjects.</p>
          )}
          {!isExamController && availableSubjects.length === 0 && (
            <p className="text-xs text-amber-600">No subjects assigned. Contact admin to assign subjects.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Subject" options={availableSubjects.map((s) => ({ value: s, label: s }))} value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder={availableSubjects.length === 0 ? 'No subjects' : 'Select Subject'} disabled={availableSubjects.length === 0} />
          </div>
          <Button onClick={handleLoadStudents} disabled={!year || !cls || !examName || !subject || loading}>
            {loading ? 'Loading...' : 'Load Students'}
          </Button>
        </CardContent>
      </Card>

      {showGrid && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={getColumns()} data={tableData} emptyMessage="No students found for these filters" />
            <Button className="mt-4" onClick={handleSave} disabled={saving || students.length === 0}>
              {saving ? 'Saving...' : 'Save Results'}
            </Button>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
