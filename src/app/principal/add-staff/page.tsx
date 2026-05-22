'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

const staffDesignations = [
  { value: 'Lab Assistant', label: 'Lab Assistant' },
  { value: '3rd Class Employee', label: '3rd Class Employee' },
  { value: '4th Class Employee', label: '4th Class Employee' },
  { value: 'Office Assistant (MLSS)', label: 'Office Assistant (MLSS)' },
]

const subjects = [
  { value: 'ICT', label: 'ICT' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
]

const genders = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export default function PrincipalAddStaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [subject, setSubject] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.get('/principal/staff').then((r: any) => setStaff(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile) return
    setSubmitting(true)
    try {
      await api.post('/principal/staff', {
        name, designation, subject: subject || undefined,
        joining_date: joiningDate, gender, mobile, email: email || undefined,
      })
      alert('Staff added successfully')
      setName(''); setDesignation(''); setSubject(''); setJoiningDate(''); setGender(''); setMobile(''); setEmail('')
      const r: any = await api.get('/principal/staff')
      setStaff(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const staffColumns = [
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
  ]

  return (
    <PanelLayout role="principal" title="Add New Staff">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <h3 className="font-semibold text-gray-900">Staff Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Select label="Designation" options={staffDesignations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={subjects} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select (optional)" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            <Select label="Gender" options={genders} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Staff'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Existing Staff</h3>
          <DataTable columns={staffColumns} data={staff} loading={loading} emptyMessage="No staff added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
