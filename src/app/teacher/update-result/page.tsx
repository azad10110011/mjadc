'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, SUBJECTS, type StudentClass } from '@/types'
import { api } from '@/lib/api'

function parseJwtPayload(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
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
  const [availableSubjects, setAvailableSubjects] = useState(SUBJECTS)
  const [isExamController, setIsExamController] = useState(false)

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
          setAvailableSubjects(currentUser.subjects && currentUser.subjects.length > 0 ? currentUser.subjects : [])
        }
      })
      .catch(() => {})
  }, [])

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []

  const columns = [
    { key: 'sl', label: 'SL No' },
    { key: 'student_id', label: 'Roll' },
    { key: 'name', label: 'Name' },
    { key: 'mcq', label: 'MCQ' },
    { key: 'cq', label: 'CQ' },
    { key: 'practical', label: 'Practical' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
    { key: 'actions', label: 'Actions' },
  ]

  const handleLoad = async () => {
    if (!year || !cls || !examName || !subject) return
    setLoading(true)
    try {
      const res: any = await api.get(`/teacher/results?year=${year}&class=${cls}&exam_name=${encodeURIComponent(examName)}&subject=${encodeURIComponent(subject)}`)
      const data = res.data || []
      setStudents(data.map((s: any, i: number) => ({ ...s, sl: i + 1 })))
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
    try {
      for (const s of students) {
        if (!s.id) continue
        await api.put('/teacher/results/update', {
          result_id: s.id,
          mcq: Number(s.mcq) || 0,
          cq: Number(s.cq) || 0,
          practical: Number(s.practical) || 0,
        })
      }
      alert('Results updated successfully')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateMark = (idx: number, field: string, value: string) => {
    setStudents((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      const mcq = Number(updated[idx].mcq) || 0
      const cq = Number(updated[idx].cq) || 0
      const practical = Number(updated[idx].practical) || 0
      updated[idx].total = mcq + cq + practical
      return updated
    })
  }

  const tableData = students.map((s, i) => ({
    ...s,
    mcq: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.mcq} onChange={(e) => updateMark(i, 'mcq', e.target.value)} />,
    cq: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.cq} onChange={(e) => updateMark(i, 'cq', e.target.value)} />,
    practical: <input type="number" className="w-16 rounded border px-1 py-0.5 text-sm" value={s.practical} onChange={(e) => updateMark(i, 'practical', e.target.value)} />,
    actions: <Button size="sm" onClick={() => handleUpdateOne(s)}>Update</Button>,
  }))

  const handleUpdateOne = async (s: any) => {
    if (!s.id) return
    try {
      await api.put('/teacher/results/update', {
        result_id: s.id,
        mcq: Number(s.mcq) || 0,
        cq: Number(s.cq) || 0,
        practical: Number(s.practical) || 0,
      })
      alert('Result updated')
    } catch (e: any) {
      alert(e.message)
    }
  }

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
              value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Select Class" />
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
            <DataTable columns={columns} data={tableData} emptyMessage="No saved results found" />
            {students.length > 0 && (
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
