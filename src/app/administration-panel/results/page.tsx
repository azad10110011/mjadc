'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'

export default function AdminResultsPage() {
  const [results, setResults] = useState<any[]>([])
  const [filterExamName, setFilterExamName] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [resultSubjects, setResultSubjects] = useState<string[]>([])

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = filterClass ? EXAM_NAMES[filterClass as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const subjectOptions = resultSubjects.map((s) => ({ value: s, label: s }))

  const fetchResults = () => {
    const params = new URLSearchParams()
    if (filterExamName) params.set('exam_name', filterExamName)
    if (filterClass) params.set('class', filterClass)
    if (filterYear) params.set('year', filterYear)
    if (filterSubject) params.set('subject', filterSubject)
    api.get<any>(`/admin-panel/results?${params}`)
      .then((res) => setResults(res.data || []))
      .catch(() => setResults([]))
  }

  useEffect(() => {
    fetchResults()
    api.get<{ status: number; data: string[] }>('/result-subjects')
      .then((res) => setResultSubjects(res.data))
      .catch(() => {})
  }, [])

  const listColumns = [
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
    { key: 'status', label: 'Status' },
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
      student_id: r.student_id,
      student_name: r.student_name,
      exam_name: r.exam_name,
      class: r.class,
      year: r.year,
      subject: r.subject,
      marks: <span className="text-xs">{marksStr}</span>,
      total: r.total ?? '-',
      grade: r.grade || '-',
      gpa: r.gpa ?? '-',
      status: r.status || '-',
    }
  })

  return (
    <PanelLayout role="administration" title="Results">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">View Results</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Select label="Exam Name" options={[...new Set(Object.values(EXAM_NAMES).flat())].map((e) => ({ value: e, label: e }))} placeholder="All" value={filterExamName} onChange={(e) => setFilterExamName(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} placeholder="All" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} />
            <Select label="Year" options={years} placeholder="All" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
            <Select label="Subject" options={subjectOptions} placeholder="All" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} />
          </div>
          <Button onClick={fetchResults}>Filter</Button>
          <DataTable columns={listColumns} data={listRows} emptyMessage="No results found" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
