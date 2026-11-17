'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge, Modal } from '@/components/ui'
import { PanelTaskPicker, loadDisabledTasks } from '@/components/users/PanelTaskPicker'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { exportToExcel, exportToPDF, type ExportColumn } from '@/lib/export'
import type { Column } from '@/components/ui/DataTable'
import { UserPlus, ArrowUp, ArrowDown, Copy, Search } from 'lucide-react'

const calculateRetirement = (dob: string | null | undefined) => {
  if (!dob) return null
  const birth = new Date(dob)
  const retired = new Date(birth.getFullYear() + 60, birth.getMonth(), birth.getDate() - 1)
  const now = new Date()
  if (retired <= now) return { remaining: 'Retired', retiredDate: retired.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  let years = retired.getFullYear() - now.getFullYear()
  let months = retired.getMonth() - now.getMonth()
  let days = retired.getDate() - now.getDate()
  if (days < 0) { months--; const prev = new Date(retired.getFullYear(), retired.getMonth(), 0); days += prev.getDate() }
  if (months < 0) { years--; months += 12 }
  return { remaining: `${years}y ${months}m ${days}d`, retiredDate: retired.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
}

const AVAILABLE_ROLES = [
  { value: 'administration', label: 'Administration' },
  { value: 'staff', label: 'Staff' },
  { value: 'exam_controller', label: 'Exam Controller' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
]

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
  { value: 'Accountant', label: 'Accountant' },
  { value: 'Office Assistant cum Accounts Assistant', label: 'Office Assistant cum Accounts Assistant' },
  { value: 'Office Assistant cum Computer Operator', label: 'Office Assistant cum Computer Operator' },
  { value: 'Office Assistant', label: 'Office Assistant' },
  { value: 'Night Guard', label: 'Night Guard' },
]

const BLOOD_GROUPS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
]

export default function StaffAdmin({ mode }: { mode: 'list' | 'add' }) {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const showForm = mode === 'add' || editingId !== null
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
  const [password, setPassword] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['administration'])
  const [disabledTasks, setDisabledTasks] = useState<string[]>([]) // Session 102: unticked panel tasks
  const [otherRoles, setOtherRoles] = useState<string[]>([]) // roles this form does not manage (e.g. admin)
  const [pdsId, setPdsId] = useState('')
  const [mpoIndex, setMpoIndex] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [viewingStaff, setViewingStaff] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState('')

  const copySingle = (val: string, field: string) => {
    if (!val || val === '-') return
    navigator.clipboard.writeText(val)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 1500)
  }

  const copyStaffText = (s: any) => {
    const r = calculateRetirement(s.date_of_birth)
    const lines = [
      `Name: ${s.name}`,
      s.name_bangla && `Name (Bangla): ${s.name_bangla}`,
      `Designation: ${s.designation}${s.subject ? ` (${s.subject})` : ''}`,
      `Gender: ${s.gender}`,
      `Mobile: ${s.mobile}`,
      `Email: ${s.email || '-'}`,
      `WhatsApp: ${s.whatsapp_number || '-'}`,
      `PDS ID: ${s.pds_id || '-'}`,
      `MPO Index: ${s.mpo_index || '-'}`,
      `NID Number: ${s.nid_number || '-'}`,
      `Joining Date: ${s.joining_date || '-'}`,
      `1st MPO Date: ${s.first_mpo_date || '-'}`,
      `Experience: ${s.experience || '-'}`,
      `Date of Birth: ${s.date_of_birth || '-'}`,
      r ? `Remaining Job Time: ${r.remaining}` : null,
      r ? `Retired Date: ${r.retiredDate}` : null,
      `Present Address: ${s.present_address || '-'}`,
      `Permanent Address: ${s.permanent_address || '-'}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const resetForm = () => {
    setEditingId(null); setName(''); setNameBangla(''); setDesignation(''); setSubject('')
    setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress(''); setPassword(''); setSelectedRoles(['administration']); setDisabledTasks([]); setOtherRoles([]); setPdsId(''); setMpoIndex(''); setBloodGroup(''); setEmergencyContact(''); setPhotoFile(null); setExistingPhotoPath(null)
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
        pds_id: pdsId || undefined,
        mpo_index: mpoIndex || undefined,
        blood_group: bloodGroup || undefined,
        emergency_contact: emergencyContact || undefined,
      }
      const payload: Record<string, any> = {
        name, designation, subject: subject || undefined,
        joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email: email || undefined,
        roles: selectedRoles,
        disabled_features: otherRoles.includes('admin') ? [] : disabledTasks,
        ...extraFields,
        ...(photoPath && { photo_path: photoPath }),
      }
      if (password) payload.password = password
      if (editingId) {
        await api.put(`/admin/teachers-staff/staff/${editingId}`, payload)
        alert('Staff updated successfully')
      } else {
        await api.post('/admin/teachers-staff/staff', payload)
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
    setPdsId(s.pds_id || ''); setMpoIndex(s.mpo_index || '')
    setBloodGroup(s.blood_group || ''); setEmergencyContact(s.emergency_contact || '')
    setExistingPhotoPath(s.photo_path || null); setPhotoFile(null); setPassword('')
    {
      // Session 102: load the user's real roles (was always reset to 'administration', and saving then dropped the others)
      const all = String(s.roles || '').split(',').filter(Boolean)
      const managed = AVAILABLE_ROLES.map((r) => r.value)
      setSelectedRoles(all.filter((r) => managed.includes(r)).length ? all.filter((r) => managed.includes(r)) : ['administration'])
      setOtherRoles(all.filter((r) => !managed.includes(r)))
      setDisabledTasks([])
      if (s.user_id) void loadDisabledTasks(Number(s.user_id)).then(setDisabledTasks)
    }
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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{s.name}</h3>
              <button onClick={() => copyStaffText(s)} className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            {s.name_bangla && <p className="text-sm text-gray-500">{s.name_bangla}</p>}
            <p className="text-sm text-gray-600">{s.designation}{s.subject ? ` (${s.subject})` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500">Gender</span><p className="text-gray-900 capitalize">{s.gender}</p></div>
          <div><span className="font-medium text-gray-500">Mobile</span><p className="text-gray-900">{s.mobile}{s.mobile && s.mobile !== '-' ? <button onClick={() => copySingle(s.mobile, 'm')} className="ml-1.5 inline align-middle text-blue-400 hover:text-blue-600">{copiedField === 'm' ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="inline h-3 w-3" />}</button> : null}</p></div>
          <div><span className="font-medium text-gray-500">Email</span><p className="text-gray-900">{s.email || '-'}</p></div>
          <div><span className="font-medium text-gray-500">WhatsApp</span><p className="text-gray-900">{s.whatsapp_number || '-'}{s.whatsapp_number && s.whatsapp_number !== '-' ? <button onClick={() => copySingle(s.whatsapp_number, 'w')} className="ml-1.5 inline align-middle text-blue-400 hover:text-blue-600">{copiedField === 'w' ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="inline h-3 w-3" />}</button> : null}</p></div>
          <div><span className="font-medium text-gray-500">PDS ID</span><p className="text-gray-900">{s.pds_id || '-'}</p></div>
          <div><span className="font-medium text-gray-500">MPO Index</span><p className="text-gray-900">{s.mpo_index || '-'}</p></div>
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

  const defaultColumns = [
    { key: 'sl', label: 'SL' },
    { key: 'pds_id', label: 'PDS ID' },
    { key: 'mpo_index', label: 'MPO Index' },
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'date_of_birth', label: 'DOB' },
    { key: 'joining_date', label: 'Joining Date' },
    { key: 'experience', label: 'Experience' },
    { key: 'remaining_job_time', label: 'Remaining Job Time' },
    { key: 'retired_date', label: 'Retired Date' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]
  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return defaultColumns
    const saved = localStorage.getItem('admin_staff_columns')
    return saved ? JSON.parse(saved) : defaultColumns
  })

  const handleColumnReorder = useCallback((next: Column[]) => {
    setColumns(next as typeof defaultColumns)
    localStorage.setItem('admin_staff_columns', JSON.stringify(next))
  }, [])

  const [search, setSearch] = useState('')

  const handleRowReorder = useCallback(async (reordered: Record<string, unknown>[]) => {
    const ids = reordered.map((r: any) => r.id)
    setStaff(reordered as any[])
    try {
      await api.post('/admin/teachers-staff/staff/reorder', { ids })
    } catch { /* ignore */ }
  }, [])

  const sq = search.trim().toLowerCase()
  const shown = sq
    ? staff.filter((x) => [x.name, x.name_bangla, x.designation, x.subject, x.group, x.mobile, x.whatsapp_number, x.email, x.pds_id, x.mpo_index]
        .some((v) => v && String(v).toLowerCase().includes(sq)))
    : staff

  const rows = shown.map((s, i) => ({
    ...s,
    sl: i + 1,
    photo: s.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    joining_date: s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
    date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
    whatsapp_number: s.whatsapp_number || '-',
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
    <PanelLayout role="admin" title={mode === 'add' ? 'Add New Staff' : editingId ? 'Edit Staff' : 'Staff'}>
      {showForm && (
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
              <Select label="Blood Group" options={BLOOD_GROUPS} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="Select" />
              <Input label="Emergency Contact" placeholder="01XXXXXXXXX" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
              <Input label="Password" type="password" placeholder={editingId ? 'Leave blank to keep current' : 'Default: password123'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">User Roles</label>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_ROLES.map((r) => (
                    <label key={r.value} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={selectedRoles.includes(r.value)} onChange={(e) => {
                        setSelectedRoles(e.target.checked ? [...selectedRoles, r.value] : selectedRoles.filter((v) => v !== r.value))
                      }} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>
              <Input label="Present Address" placeholder="Present address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
              <Input label="Permanent Address" placeholder="Permanent address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
            <Input label="PDS ID" placeholder="PDS ID" value={pdsId} onChange={(e) => setPdsId(e.target.value)} />
            <Input label="MPO Index" placeholder="MPO Index" value={mpoIndex} onChange={(e) => setMpoIndex(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <PanelTaskPicker roles={Array.from(new Set([...otherRoles, ...selectedRoles]))} disabled={disabledTasks} onChange={setDisabledTasks} />
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Staff' : 'Add Staff'}
          </Button>
        </CardContent>
      </Card>
      )}

      {mode === 'list' && (<>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Existing Staff <span className="text-sm font-normal text-gray-500">({sq ? `${shown.length} of ${staff.length}` : staff.length})</span></h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'pds_id', label: 'PDS ID' }, { key: 'mpo_index', label: 'MPO Index' },
                  { key: 'name', label: 'Name' }, { key: 'name_bangla', label: 'Name (Bangla)' },
                  { key: 'designation', label: 'Designation' }, { key: 'date_of_birth', label: 'DOB' },
                  { key: 'joining_date', label: 'Joining' }, { key: 'first_mpo_date', label: '1st MPO' },
                  { key: 'experience', label: 'Experience' }, { key: 'gender', label: 'Gender' },
                  { key: 'mobile', label: 'Mobile' }, { key: 'whatsapp_number', label: 'WhatsApp' },
                  { key: 'email', label: 'Email' }, { key: 'nid_number', label: 'NID' },
                  { key: 'present_address', label: 'Present Address' },
                  { key: 'permanent_address', label: 'Permanent Address' },
                ]
                exportToExcel(staff, cols, 'Staff')
              }}>Excel</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'pds_id', label: 'PDS ID' }, { key: 'mpo_index', label: 'MPO Index' },
                  { key: 'name', label: 'Name' }, { key: 'name_bangla', label: 'Name (Bangla)' },
                  { key: 'designation', label: 'Designation' }, { key: 'date_of_birth', label: 'DOB' },
                  { key: 'joining_date', label: 'Joining' }, { key: 'first_mpo_date', label: '1st MPO' },
                  { key: 'experience', label: 'Experience' }, { key: 'gender', label: 'Gender' },
                  { key: 'mobile', label: 'Mobile' }, { key: 'whatsapp_number', label: 'WhatsApp' },
                  { key: 'email', label: 'Email' }, { key: 'nid_number', label: 'NID' },
                  { key: 'present_address', label: 'Present Address' },
                  { key: 'permanent_address', label: 'Permanent Address' },
                ]
                exportToPDF(staff, cols, 'Staff List', 'Staff')
              }}>PDF</Button>
            </div>
          </div>
          <div className="relative mb-4 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search staff"
              placeholder="Search by name, designation, subject, mobile, email, PDS ID"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          {sq && <p className="mb-2 text-xs text-gray-500">Drag-to-reorder is off while searching.</p>}
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage={sq ? 'No staff match this search' : 'No staff added yet'} rowKey="id" onColumnReorder={handleColumnReorder} onRowReorder={sq ? undefined : handleRowReorder} stickyScrollbar />
        </CardContent>
      </Card>

      <Modal open={!!viewingStaff} onClose={() => setViewingStaff(null)} title="Staff Details">
        {viewingStaff && viewDetail(viewingStaff)}
      </Modal>
      </>)}
    </PanelLayout>
  )
}
