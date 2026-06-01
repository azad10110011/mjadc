'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

interface SubjectPart {
  id: number
  subject: string
  part_name: string
  full_mark: number
  pass_mark: number
  sort_order: number
}

export default function AdminSubjectPartsPage() {
  const [subject, setSubject] = useState('')
  const [parts, setParts] = useState<SubjectPart[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [allSubjects, setAllSubjects] = useState<string[]>([])

  useEffect(() => {
    api.get<{ status: number; data: { name: string; papers: { name: string }[] }[] }>('/admin/subjects/tree')
      .then((res) => {
        const names: string[] = []
        for (const group of res.data) {
          for (const paper of group.papers) {
            names.push(paper.name)
          }
        }
        setAllSubjects(names)
      })
      .catch(() => {})
  }, [])

  const loadParts = async () => {
    if (!subject) { setParts([]); return }
    setLoading(true)
    try {
      const res: any = await api.get(`/admin/subject-parts?subject=${encodeURIComponent(subject)}`)
      setParts(res.data || [])
    } catch {
      setParts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadParts() }, [subject])

  const handleAdd = async () => {
    const name = prompt('Enter part name (e.g., MCQ, CQ, Practical):')
    if (!name) return
    const fullMark = prompt('Enter full mark:', '50')
    if (!fullMark) return
    const passMark = prompt('Enter pass mark:', '8')
    if (!passMark) return
    try {
      await api.post('/admin/subject-parts', {
        subject,
        part_name: name,
        full_mark: Number(fullMark),
        pass_mark: Number(passMark),
        sort_order: parts.length + 1,
      })
      loadParts()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleEdit = async (part: SubjectPart) => {
    const fullMark = prompt('Full mark:', String(part.full_mark))
    if (!fullMark) return
    const passMark = prompt('Pass mark:', String(part.pass_mark))
    if (!passMark) return
    try {
      await api.put(`/admin/subject-parts/${part.id}`, {
        full_mark: Number(fullMark),
        pass_mark: Number(passMark),
      })
      loadParts()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this part?')) return
    try {
      await api.delete(`/admin/subject-parts/${id}`)
      loadParts()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleInitDefaults = async () => {
    if (!confirm('This will add default MCQ/CQ/Practical parts to all subjects that have no parts configured. Continue?')) return
    setInitializing(true)
    try {
      const res: any = await api.post('/admin/subject-parts/init-defaults', {})
      alert(`${res.data.initialized} default parts initialized`)
      if (subject) loadParts()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setInitializing(false)
    }
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'part_name', label: 'Part Name' },
    { key: 'full_mark', label: 'Full Mark' },
    { key: 'pass_mark', label: 'Pass Mark' },
    { key: 'sort_order', label: 'Order' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = parts.map((p, i) => ({
    sl: i + 1,
    part_name: p.part_name.toUpperCase(),
    full_mark: p.full_mark,
    pass_mark: p.pass_mark,
    sort_order: p.sort_order,
    actions: (
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" onClick={() => handleEdit(p)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Subject Parts Configuration">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs text-gray-500">
            Configure the mark distribution parts for each subject. For example, ICT has CQ, MCQ, and Practical, while Higher Math may only have CQ.
            A student must pass every part of a subject; otherwise, they will receive a Fail grade.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select
                label="Subject"
                options={allSubjects.map((s) => ({ value: s, label: s }))}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Select Subject"
              />
            </div>
            <Button onClick={handleAdd} disabled={!subject}>Add Part</Button>
          </div>
        </CardContent>
      </Card>

      {subject && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={columns} data={rows} emptyMessage="No parts configured. Click 'Add Part' to add one." loading={loading} />
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Initialize Default Parts</h3>
          <p className="text-xs text-gray-500 mb-3">
            Click below to add default parts (MCQ, CQ, Practical) to all subjects that don't have any parts configured yet.
          </p>
          <Button variant="secondary" onClick={handleInitDefaults} disabled={initializing}>
            {initializing ? 'Initializing...' : 'Initialize Defaults for All Subjects'}
          </Button>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
