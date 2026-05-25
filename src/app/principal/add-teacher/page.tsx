'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

const designations = [
  { value: 'Principal', label: 'Principal' },
  { value: 'Vice-Principal', label: 'Vice-Principal' },
  { value: 'Assistant Professor', label: 'Assistant Professor' },
  { value: 'Lecturer', label: 'Lecturer' },
  { value: 'Library Lecturer', label: 'Library Lecturer' },
  { value: 'Demonstrator', label: 'Demonstrator' },
  { value: 'Physical Teacher', label: 'Physical Teacher' },
  { value: 'Assistant Teacher', label: 'Assistant Teacher' },
]

export default function PrincipalAddTeacherPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])

  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [subject, setSubject] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.get<{ status: number; data: string[] }>('/subjects')
      .then((res) => setPublicSubjects(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/principal/teachers').then((r: any) => setTeachers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile || !email) return
    setSubmitting(true)
    try {
      await api.post('/principal/teachers', {
        name, designation, subject: subject || undefined,
        joining_date: joiningDate, gender, mobile, email,
      })
      alert('Teacher added successfully')
      setName(''); setDesignation(''); setSubject(''); setJoiningDate(''); setGender(''); setMobile(''); setEmail('')
      const r: any = await api.get('/principal/teachers')
      setTeachers(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const teacherColumns = [
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'subject', label: 'Subject' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
  ]

  return (
    <PanelLayout role="principal" title="Add New Teacher">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <h3 className="font-semibold text-gray-900">Teacher Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Select label="Designation" options={designations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={publicSubjects.map((s) => ({ value: s, label: s }))} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="E-mail" type="email" placeholder="teacher@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Teacher'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Existing Teachers</h3>
          <DataTable columns={teacherColumns} data={teachers} loading={loading} emptyMessage="No teachers added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
