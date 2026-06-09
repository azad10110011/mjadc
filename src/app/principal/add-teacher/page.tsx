'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

const designations = [
  { value: 'Principal', label: 'Principal' },
  { value: 'Principal (Acting)', label: 'Principal (Acting)' },
  { value: 'Vice-Principal', label: 'Vice-Principal' },
  { value: 'Assistant Professor', label: 'Assistant Professor' },
  { value: 'Lecturer', label: 'Lecturer' },
  { value: 'Library Lecturer', label: 'Library Lecturer' },
  { value: 'Demonstrator', label: 'Demonstrator' },
  { value: 'Physical Teacher', label: 'Physical Teacher' },
  { value: 'Assistant Teacher', label: 'Assistant Teacher' },
]

const TEACHER_GROUPS = [
  { value: '', label: 'None' },
  { value: 'Science', label: 'Science' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Humanities', label: 'Humanities' },
  { value: 'General', label: 'General' },
  { value: 'BMT', label: 'BMT' },
]

export default function PrincipalAddTeacherPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([])

  const [name, setName] = useState('')
  const [nameBangla, setNameBangla] = useState('')
  const [designation, setDesignation] = useState('')
  const [teacherGroup, setTeacherGroup] = useState('')
  const [subject, setSubject] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [firstMpoDate, setFirstMpoDate] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [nidNumber, setNidNumber] = useState('')
  const [email, setEmail] = useState('')
  const [presentAddress, setPresentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [pdsId, setPdsId] = useState('')
  const [mpoIndex, setMpoIndex] = useState('')

  const fetchSubjects = useCallback((group: string) => {
    const query = group ? `/subjects?group=${encodeURIComponent(group)}` : '/subjects'
    api.get<{ status: number; data: string[] }>(query)
      .then((res) => setFilteredSubjects(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ status: number; data: string[] }>('/subjects')
      .then((res) => {
        setPublicSubjects(res.data)
        setFilteredSubjects(res.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchSubjects(teacherGroup)
  }, [teacherGroup, fetchSubjects])

  useEffect(() => {
    api.get('/principal/teachers').then((r: any) => setTeachers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile || !email) return
    setSubmitting(true)
    try {
      await api.post('/principal/teachers', {
        name, designation, subject: subject || undefined,
        group: teacherGroup || undefined,
        joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
        name_bangla: nameBangla || undefined,
        first_mpo_date: firstMpoDate || undefined,
        nid_number: nidNumber || undefined,
        whatsapp_number: whatsappNumber || undefined,
        present_address: presentAddress || undefined,
        permanent_address: permanentAddress || undefined,
        pds_id: pdsId || undefined,
        mpo_index: mpoIndex || undefined,
      })
      alert('Teacher added successfully')
      setName(''); setNameBangla(''); setDesignation(''); setTeacherGroup(''); setSubject(''); setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress(''); setPdsId(''); setMpoIndex('')
      const r: any = await api.get('/principal/teachers')
      setTeachers(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const teacherColumns = [
    { key: 'pds_id', label: 'PDS ID' },
    { key: 'mpo_index', label: 'MPO Index' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'subject', label: 'Subject' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
  ]

  return (
    <PanelLayout role="principal" title="Add New Teacher">
      <div className="mx-auto w-full" style={{ maxWidth: '90vw' }}>
        <Card className="mb-6">
          <CardContent className="space-y-6 pt-6">
            <h3 className="font-semibold text-gray-900">Teacher Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name (English)" placeholder="Full name in English" required value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Name (Bangla)" placeholder="পূর্ণ নাম বাংলায়" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} />
              <Select label="Designation" options={designations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
              <Select label="Group" options={TEACHER_GROUPS} value={teacherGroup} onChange={(e) => setTeacherGroup(e.target.value)} placeholder="Select Group" />
              <Select label="Subject" options={(teacherGroup ? filteredSubjects : publicSubjects).map((s) => ({ value: s, label: s }))} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select" />
              <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              <Input label="1st MPO Date" type="date" value={firstMpoDate} onChange={(e) => setFirstMpoDate(e.target.value)} />
              <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
              <Input label="NID Number" placeholder="National ID number" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
              <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              <Input label="WhatsApp Number" placeholder="01XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
              <Input label="E-mail" type="email" placeholder="teacher@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Present Address" placeholder="Present address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
              <Input label="Permanent Address" placeholder="Permanent address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
              <Input label="PDS ID" placeholder="PDS ID" value={pdsId} onChange={(e) => setPdsId(e.target.value)} />
              <Input label="MPO Index" placeholder="MPO Index" value={mpoIndex} onChange={(e) => setMpoIndex(e.target.value)} />
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
      </div>
    </PanelLayout>
  )
}
