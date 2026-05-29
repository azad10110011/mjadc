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
  const [nameBangla, setNameBangla] = useState('')
  const [designation, setDesignation] = useState('')
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

  useEffect(() => {
    api.get('/principal/staff').then((r: any) => setStaff(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile) return
    setSubmitting(true)
    try {
      await api.post('/principal/staff', {
        name, designation, subject: subject || undefined,
        joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
        name_bangla: nameBangla || undefined,
        first_mpo_date: firstMpoDate || undefined,
        nid_number: nidNumber || undefined,
        whatsapp_number: whatsappNumber || undefined,
        present_address: presentAddress || undefined,
        permanent_address: permanentAddress || undefined,
      })
      alert('Staff added successfully')
      setName(''); setNameBangla(''); setDesignation(''); setSubject(''); setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress('')
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
            <Input label="Name (English)" placeholder="Full name in English" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Name (Bangla)" placeholder="পূর্ণ নাম বাংলায়" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} />
            <Select label="Designation" options={staffDesignations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={subjects} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select (optional)" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            <Input label="1st MPO Date" type="date" value={firstMpoDate} onChange={(e) => setFirstMpoDate(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Select label="Gender" options={genders} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="NID Number" placeholder="National ID number" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="WhatsApp Number" placeholder="01XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Present Address" placeholder="Present address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
            <Input label="Permanent Address" placeholder="Permanent address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
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
