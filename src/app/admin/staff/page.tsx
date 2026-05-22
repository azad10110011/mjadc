'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { UserPlus } from 'lucide-react'

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

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [subject, setSubject] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null); setName(''); setDesignation(''); setSubject('')
    setJoiningDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setEmail(''); setPhotoFile(null); setExistingPhotoPath(null)
  }

  const fetchStaff = () => {
    api.get('/admin/teachers-staff/staff').then((r: any) => setStaff(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchStaff() }, [])

  const uploadPhoto = async (): Promise<string> => {
    const formData = new FormData()
    formData.append('file', photoFile!)
    formData.append('directory', 'profiles')
    const res: any = await api.upload('/admin/media/upload', formData)
    if (!res.data?.path) throw new Error('Upload succeeded but no path returned')
    return res.data.path
  }

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile) return
    setSubmitting(true)
    try {
      const photoPath = photoFile ? await uploadPhoto() : existingPhotoPath
      if (editingId) {
        await api.put(`/admin/teachers-staff/staff/${editingId}`, {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Staff updated successfully')
      } else {
        await api.post('/admin/teachers-staff/staff', {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Staff added successfully')
      }
      resetForm()
      const r: any = await api.get('/admin/teachers-staff/staff')
      setStaff(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save staff')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (s: any) => {
    setEditingId(s.id); setName(s.name); setDesignation(s.designation)
    setSubject(s.subject || ''); setJoiningDate(s.joining_date || '')
    setDateOfBirth(s.date_of_birth || ''); setGender(s.gender || ''); setMobile(s.mobile || ''); setEmail(s.email || '')
    setExistingPhotoPath(s.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this staff?')) return
    api.delete(`/admin/teachers-staff/staff/${id}`)
      .then(() => fetchStaff())
      .catch(() => {})
  }

  const handleFreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/freeze`, {})
      .then(() => fetchStaff())
      .catch(() => {})
  }

  const handleUnfreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/unfreeze`, {})
      .then(() => fetchStaff())
      .catch(() => {})
  }

  const columns = [
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = staff.map((s) => ({
    ...s,
    photo: s.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    status: <Badge variant={s.user_status === 'frozen' ? 'danger' : 'success'}>{s.user_status || 'active'}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>Edit</Button>
        {s.user_id && (s.user_status === 'frozen'
          ? <Button variant="secondary" size="sm" onClick={() => handleUnfreeze(s.user_id)}>Unfreeze</Button>
          : <Button variant="secondary" size="sm" onClick={() => handleFreeze(s.user_id)}>Freeze</Button>
        )}
        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Add New Staff">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Staff Information</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Select label="Designation" options={staffDesignations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={subjects} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select (optional)" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Staff'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Existing Staff</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No staff added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
