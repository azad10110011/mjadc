'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { SUBJECTS } from '@/types'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { UserPlus } from 'lucide-react'

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

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([])
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

  const fetchTeachers = () => {
    api.get('/admin/teachers-staff/teachers').then((r: any) => setTeachers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchTeachers() }, [])

  const uploadPhoto = async (): Promise<string> => {
    const formData = new FormData()
    formData.append('file', photoFile!)
    formData.append('directory', 'profiles')
    const res: any = await api.upload('/admin/media/upload', formData)
    if (!res.data?.path) throw new Error('Upload succeeded but no path returned')
    return res.data.path
  }

  const handleSubmit = async () => {
    if (!name || !designation || !gender || !joiningDate || !mobile || !email) return
    setSubmitting(true)
    try {
      const photoPath = photoFile ? await uploadPhoto() : existingPhotoPath
      if (editingId) {
        await api.put(`/admin/teachers-staff/teacher/${editingId}`, {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Teacher updated successfully')
      } else {
        await api.post('/admin/teachers-staff/teacher', {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Teacher added successfully')
      }
      resetForm()
      const r: any = await api.get('/admin/teachers-staff/teachers')
      setTeachers(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save teacher')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id); setName(t.name); setDesignation(t.designation)
    setSubject(t.subject || ''); setJoiningDate(t.joining_date || '')
    setDateOfBirth(t.date_of_birth || ''); setGender(t.gender || ''); setMobile(t.mobile || ''); setEmail(t.email || '')
    setExistingPhotoPath(t.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this teacher?')) return
    api.delete(`/admin/teachers-staff/teacher/${id}`)
      .then(() => fetchTeachers())
      .catch(() => {})
  }

  const handleFreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/freeze`, {})
      .then(() => fetchTeachers())
      .catch(() => {})
  }

  const handleUnfreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/unfreeze`, {})
      .then(() => fetchTeachers())
      .catch(() => {})
  }

  const columns = [
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'subject', label: 'Subject' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = teachers.map((t) => ({
    ...t,
    photo: t.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${t.photo_path}`} alt={t.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    status: <Badge variant={t.user_status === 'frozen' ? 'danger' : 'success'}>{t.user_status || 'active'}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(t)}>Edit</Button>
        {t.user_id && (t.user_status === 'frozen'
          ? <Button variant="secondary" size="sm" onClick={() => handleUnfreeze(t.user_id)}>Unfreeze</Button>
          : <Button variant="secondary" size="sm" onClick={() => handleFreeze(t.user_id)}>Freeze</Button>
        )}
        <Button variant="danger" size="sm" onClick={() => handleDelete(t.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Add New Teacher">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Teacher' : 'Teacher Information'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Select label="Designation" options={designations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={SUBJECTS.map((s) => ({ value: s, label: s }))} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            <Input label="E-mail" type="email" placeholder="teacher@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Teacher' : 'Add Teacher'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Existing Teachers</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No teachers added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
