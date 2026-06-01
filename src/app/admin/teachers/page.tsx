'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge, Modal } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { UserPlus } from 'lucide-react'

const calculateRetirement = (dob: string | null | undefined) => {
  if (!dob) return null
  const birth = new Date(dob)
  const retired = new Date(birth.getFullYear() + 60, birth.getMonth(), birth.getDate())
  const now = new Date()
  if (retired <= now) return { remaining: 'Retired', retiredDate: retired.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  let years = retired.getFullYear() - now.getFullYear()
  let months = retired.getMonth() - now.getMonth()
  let days = retired.getDate() - now.getDate()
  if (days < 0) { months--; const prev = new Date(retired.getFullYear(), retired.getMonth(), 0); days += prev.getDate() }
  if (months < 0) { years--; months += 12 }
  return { remaining: `${years}y ${months}m ${days}d`, retiredDate: retired.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
}

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
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [viewingTeacher, setViewingTeacher] = useState<any | null>(null)

  useEffect(() => {
    api.get<{ status: number; data: string[] }>('/subjects')
      .then((res) => setPublicSubjects(res.data))
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setEditingId(null); setName(''); setNameBangla(''); setDesignation(''); setSubject('')
    setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress(''); setPhotoFile(null); setExistingPhotoPath(null)
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
    if (!name || !designation || !gender || !joiningDate || !mobile) return
    setSubmitting(true)
    try {
      const photoPath = photoFile ? await uploadPhoto() : existingPhotoPath
      const extraFields = {
        name_bangla: nameBangla || undefined,
        first_mpo_date: firstMpoDate || undefined,
        nid_number: nidNumber || undefined,
        whatsapp_number: whatsappNumber || undefined,
        present_address: presentAddress || undefined,
        permanent_address: permanentAddress || undefined,
      }
      if (editingId) {
        await api.put(`/admin/teachers-staff/teacher/${editingId}`, {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
          ...extraFields,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Teacher updated successfully')
      } else {
        await api.post('/admin/teachers-staff/teacher', {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
          ...extraFields,
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
    setEditingId(t.id); setName(t.name); setNameBangla(t.name_bangla || '')
    setDesignation(t.designation)
    setSubject(t.subject || ''); setJoiningDate(t.joining_date || ''); setFirstMpoDate(t.first_mpo_date || '')
    setDateOfBirth(t.date_of_birth || ''); setGender(t.gender || ''); setMobile(t.mobile || ''); setWhatsappNumber(t.whatsapp_number || ''); setNidNumber(t.nid_number || ''); setEmail(t.email || ''); setPresentAddress(t.present_address || ''); setPermanentAddress(t.permanent_address || '')
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

  const viewDetail = (t: any) => {
    const retirement = calculateRetirement(t.date_of_birth)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {t.photo_path ? (
            <PhotoWithPreview src={`${UPLOAD_BASE}/${t.photo_path}`} alt={t.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-200" />
          )}
          <div>
            <h3 className="text-xl font-semibold">{t.name}</h3>
            {t.name_bangla && <p className="text-sm text-gray-500">{t.name_bangla}</p>}
            <p className="text-sm text-gray-600">{t.designation}{t.subject ? ` (${t.subject})` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500">Gender</span><p className="text-gray-900 capitalize">{t.gender}</p></div>
          <div><span className="font-medium text-gray-500">Mobile</span><p className="text-gray-900">{t.mobile}</p></div>
          <div><span className="font-medium text-gray-500">Email</span><p className="text-gray-900">{t.email || '-'}</p></div>
          <div><span className="font-medium text-gray-500">WhatsApp</span><p className="text-gray-900">{t.whatsapp_number || '-'}</p></div>
          <div><span className="font-medium text-gray-500">NID Number</span><p className="text-gray-900">{t.nid_number || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Joining Date</span><p className="text-gray-900">{t.joining_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">1st MPO Date</span><p className="text-gray-900">{t.first_mpo_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Date of Birth</span><p className="text-gray-900">{t.date_of_birth || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Remaining Job Time</span><p className="text-gray-900">{retirement ? retirement.remaining : '-'}</p></div>
          <div><span className="font-medium text-gray-500">Retired Date</span><p className="text-gray-900">{retirement ? retirement.retiredDate : '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Present Address</span><p className="text-gray-900">{t.present_address || '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Permanent Address</span><p className="text-gray-900">{t.permanent_address || '-'}</p></div>
        </div>
      </div>
    )
  }

  const columns = [
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'subject', label: 'Subject' },
    { key: 'remaining_job_time', label: 'Remaining Job Time' },
    { key: 'retired_date', label: 'Retired Date' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = teachers.map((t) => ({
    ...t,
    photo: t.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${t.photo_path}`} alt={t.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    remaining_job_time: (calculateRetirement(t.date_of_birth) || {}).remaining || '-',
    retired_date: (calculateRetirement(t.date_of_birth) || {}).retiredDate || '-',
    status: <Badge variant={t.user_status === 'frozen' ? 'danger' : 'success'}>{t.user_status || 'active'}</Badge>,
    actions: (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => setViewingTeacher(t)}>View</Button>
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
            <Input label="Name (English)" placeholder="Full name in English" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Name (Bangla)" placeholder="পূর্ণ নাম বাংলায়" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} />
            <Select label="Designation" options={designations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={publicSubjects.map((s) => ({ value: s, label: s }))} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
            <Input label="1st MPO Date" type="date" value={firstMpoDate} onChange={(e) => setFirstMpoDate(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="NID Number" placeholder="National ID number" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            <Input label="WhatsApp Number" placeholder="01XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
            <Input label="E-mail" type="email" placeholder="teacher@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Present Address" placeholder="Present address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
            <Input label="Permanent Address" placeholder="Permanent address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
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

      <Modal open={!!viewingTeacher} onClose={() => setViewingTeacher(null)} title="Teacher Details">
        {viewingTeacher && viewDetail(viewingTeacher)}
      </Modal>
    </PanelLayout>
  )
}
