'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { EXAM_NAMES, calculateGradeFromParts, type StudentClass, type SubjectPart } from '@/types'
import { api } from '@/lib/api'
import { Lock } from 'lucide-react'

function MarkCell({ value, absent, min, max, locked, onChange, onAbsentChange }: {
  value: number; absent: boolean; min: number; max: number; locked: boolean
  onChange: (v: number) => void; onAbsentChange: () => void
}) {
  if (locked) {
    const isRed = absent || value < min || value > max
    return <span className={`text-sm ${isRed ? 'font-medium text-red-600' : ''}`}>{absent ? 'Absent' : value}</span>
  }
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
        <input type="checkbox" checked={absent} onChange={onAbsentChange} />
        Absent
      </label>
    </div>
  )
}

export default function TeacherUpdateResultPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [isExamController, setIsExamController] = useState(false)
  const [partConfigs, setPartConfigs] = useState<SubjectPart[]>([])

  useEffect(() => {
    api.get<{ status: number; data: any }>('/teacher/profile')
      .then((res) => {
        const currentUser = res.data
        if (!currentUser) return
        const roles: string[] = currentUser.roles || []
        setIsExamController(roles.includes('exam_controller'))
        if (roles.includes('teacher') && !roles.includes('exam_controller')) {
          if (currentUser.result_subjects && currentUser.result_subjects.length > 0) {
            setAvailableSubjects(currentUser.result_subjects)
          }
          return
        }
        // exam_controller (with or without teacher): show all subjects
        api.get<{ status: number; data: { name: string; papers: { name: string }[] }[] }>('/admin/subjects/tree')
          .then((tree) => {
            const list: string[] = []
            for (const group of tree.data) {
              if (group.papers.length > 0) {
                for (const paper of group.papers) list.push(paper.name)
              } else {
                list.push(group.name)
              }
            }
            setAvailableSubjects(list)
          })
          .catch(() => {})
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
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions' },
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

  const handleUpdateAll = async () => {
    setSaving(true)
    let updated = 0
    let errors = 0
    for (const s of students) {
      if (!s.result_id) continue
      if (s.locked) { errors++; continue }
      try {
        await api.put('/teacher/results/update', {
          result_id: s.result_id,
          parts_data: s.partsData || {},
          absent_in: s.absentIn || [],
        })
        updated++
      } catch {
        errors++
      }
    }
    if (updated > 0) alert(`${updated} result(s) updated successfully`)
    if (errors > 0) alert(`${errors} result(s) could not be updated (locked or error)`)
    setSaving(false)
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

  const isLocked = (s: any) => s.status === 'approved' || s.status === 'published'

  const tableData = students.map((s, i) => {
    const locked = isLocked(s)
    const noResult = !s.result_id
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
          locked={locked || noResult}
          onChange={(v) => updateMark(i, p.part_name, v)}
          onAbsentChange={() => toggleAbsent(i, p.part_name)}
        />
      )
    })
    row.total = <span className={`text-sm font-medium ${s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.total}</span>
    row.grade = <span className={`text-sm font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>{s.grade}</span>
    row.gpa = <span className={`text-sm font-medium ${s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade === 'Absent' ? 'Absent' : s.gpa}</span>
    row.status = noResult ? <Badge variant="default">Not saved</Badge> : <Badge variant={locked ? 'danger' : 'success'}>{s.status}</Badge>
    row.actions = noResult
      ? <span className="text-xs text-gray-400">Upload marks first</span>
      : locked
        ? <span className="flex items-center gap-1 text-xs text-gray-400"><Lock className="h-3 w-3" /> Locked</span>
        : <Button size="sm" onClick={async () => {
            if (!s.result_id) return
            try {
              await api.put('/teacher/results/update', {
                result_id: s.result_id,
                parts_data: s.partsData || {},
                absent_in: s.absentIn || [],
              })
              alert('Result updated')
            } catch (e: any) {
              alert(e.message)
            }
          }}>Update</Button>
    return row
  })

  return (
    <PanelLayout role="teacher" title="Update Result">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          {isExamController && (
            <p className="text-xs text-blue-600">Exam Controller: You can update marks for all subjects.</p>
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
          <Button onClick={handleLoad} disabled={!year || !cls || !examName || !subject || loading}>
            {loading ? 'Loading...' : 'Load Saved Results'}
          </Button>
        </CardContent>
      </Card>

      {loaded && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={getColumns()} data={tableData} emptyMessage="No saved results found" />
            {students.filter((s) => !isLocked(s)).length > 0 && (
              <Button className="mt-4" onClick={handleUpdateAll} disabled={saving}>
                {saving ? 'Updating...' : 'Update All'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
