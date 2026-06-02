'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge, Modal } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { UserPlus, ArrowUp, ArrowDown } from 'lucide-react'

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
  const [viewingStaff, setViewingStaff] = useState<any | null>(null)

  const resetForm = () => {
    setEditingId(null); setName(''); setNameBangla(''); setDesignation(''); setSubject('')
    setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress(''); setPhotoFile(null); setExistingPhotoPath(null)
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
      const extraFields = {
        name_bangla: nameBangla || undefined,
        first_mpo_date: firstMpoDate || undefined,
        nid_number: nidNumber || undefined,
        whatsapp_number: whatsappNumber || undefined,
        present_address: presentAddress || undefined,
        permanent_address: permanentAddress || undefined,
      }
      if (editingId) {
        await api.put(`/admin/teachers-staff/staff/${editingId}`, {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
          ...extraFields,
          ...(photoPath && { photo_path: photoPath }),
        })
        alert('Staff updated successfully')
      } else {
        await api.post('/admin/teachers-staff/staff', {
          name, designation, subject: subject || undefined,
          joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
          ...extraFields,
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
    setEditingId(s.id); setName(s.name); setNameBangla(s.name_bangla || '')
    setDesignation(s.designation)
    setSubject(s.subject || ''); setJoiningDate(s.joining_date || ''); setFirstMpoDate(s.first_mpo_date || '')
    setDateOfBirth(s.date_of_birth || ''); setGender(s.gender || ''); setMobile(s.mobile || ''); setWhatsappNumber(s.whatsapp_number || ''); setNidNumber(s.nid_number || ''); setEmail(s.email || ''); setPresentAddress(s.present_address || ''); setPermanentAddress(s.permanent_address || '')
    setExistingPhotoPath(s.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this staff?')) return
    api.delete(`/admin/teachers-staff/staff/${id}`)
      .then(() => fetchStaff())
      .catch(() => {})
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/teachers-staff/staff/${id}/move-up`, {})
      .then(() => fetchStaff())
      .catch(() => alert('Already at top'))
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/teachers-staff/staff/${id}/move-down`, {})
      .then(() => fetchStaff())
      .catch(() => alert('Already at bottom'))
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

  const viewDetail = (s: any) => {
    const retirement = calculateRetirement(s.date_of_birth)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {s.photo_path ? (
            <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-200" />
          )}
          <div>
            <h3 className="text-xl font-semibold">{s.name}</h3>
            {s.name_bangla && <p className="text-sm text-gray-500">{s.name_bangla}</p>}
            <p className="text-sm text-gray-600">{s.designation}{s.subject ? ` (${s.subject})` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500">Gender</span><p className="text-gray-900 capitalize">{s.gender}</p></div>
          <div><span className="font-medium text-gray-500">Mobile</span><p className="text-gray-900">{s.mobile}</p></div>
          <div><span className="font-medium text-gray-500">Email</span><p className="text-gray-900">{s.email || '-'}</p></div>
          <div><span className="font-medium text-gray-500">WhatsApp</span><p className="text-gray-900">{s.whatsapp_number || '-'}</p></div>
          <div><span className="font-medium text-gray-500">NID Number</span><p className="text-gray-900">{s.nid_number || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Joining Date</span><p className="text-gray-900">{s.joining_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">1st MPO Date</span><p className="text-gray-900">{s.first_mpo_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Experience</span><p className="text-gray-900">{s.experience || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Date of Birth</span><p className="text-gray-900">{s.date_of_birth || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Remaining Job Time</span><p className="text-gray-900">{retirement ? retirement.remaining : '-'}</p></div>
          <div><span className="font-medium text-gray-500">Retired Date</span><p className="text-gray-900">{retirement ? retirement.retiredDate : '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Present Address</span><p className="text-gray-900">{s.present_address || '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Permanent Address</span><p className="text-gray-900">{s.permanent_address || '-'}</p></div>
        </div>
      </div>
    )
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'experience', label: 'Experience' },
    { key: 'remaining_job_time', label: 'Remaining Job Time' },
    { key: 'retired_date', label: 'Retired Date' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = staff.map((s, i) => ({
    ...s,
    sl: i + 1,
    photo: s.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    experience: s.experience || '-',
    remaining_job_time: (calculateRetirement(s.date_of_birth) || {}).remaining || '-',
    retired_date: (calculateRetirement(s.date_of_birth) || {}).retiredDate || '-',
    status: <Badge variant={s.user_status === 'frozen' ? 'danger' : 'success'}>{s.user_status || 'active'}</Badge>,
    actions: (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleMoveUp(s.id)} disabled={i === 0} title="Move up">
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleMoveDown(s.id)} disabled={i === staff.length - 1} title="Move down">
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setViewingStaff(s)}>View</Button>
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
            <Input label="Name (English)" placeholder="Full name in English" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Name (Bangla)" placeholder="পূর্ণ নাম বাংলায়" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} />
            <Select label="Designation" options={staffDesignations} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Select" />
            <Select label="Subject" options={subjects} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Select (optional)" />
            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
            <Input label="1st MPO Date" type="date" value={firstMpoDate} onChange={(e) => setFirstMpoDate(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
            <Input label="NID Number" placeholder="National ID number" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            <Input label="WhatsApp Number" placeholder="01XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Present Address" placeholder="Present address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
            <Input label="Permanent Address" placeholder="Permanent address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
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

      <Modal open={!!viewingStaff} onClose={() => setViewingStaff(null)} title="Staff Details">
        {viewingStaff && viewDetail(viewingStaff)}
      </Modal>
    </PanelLayout>
  )
}
