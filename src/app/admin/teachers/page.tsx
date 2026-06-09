'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge, Modal } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { exportToExcel, exportToPDF, type ExportColumn } from '@/lib/export'
import { UserPlus, ArrowUp, ArrowDown, Copy } from 'lucide-react'

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
  { value: 'teacher', label: 'Teacher' },
  { value: 'exam_controller', label: 'Exam Controller' },
  { value: 'administration', label: 'Administration' },
  { value: 'principal', label: 'Principal' },
  { value: 'staff', label: 'Staff' },
]

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

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [nameBangla, setNameBangla] = useState('')
  const [designation, setDesignation] = useState('')
  const [teacherGroup, setTeacherGroup] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
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
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['teacher'])
  const [pdsId, setPdsId] = useState('')
  const [mpoIndex, setMpoIndex] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [viewingTeacher, setViewingTeacher] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState('')

  const copySingle = (val: string, field: string) => {
    if (!val || val === '-') return
    navigator.clipboard.writeText(val)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 1500)
  }

  const copyTeacherText = (t: any) => {
    const r = calculateRetirement(t.date_of_birth)
    const lines = [
      `Name: ${t.name}`,
      t.name_bangla && `Name (Bangla): ${t.name_bangla}`,
      `Designation: ${t.designation}${t.subject ? ` (${t.subject})` : ''}`,
      t.group && `Group: ${t.group}`,
      `Gender: ${t.gender}`,
      `Mobile: ${t.mobile}`,
      `Email: ${t.email || '-'}`,
      `WhatsApp: ${t.whatsapp_number || '-'}`,
      `PDS ID: ${t.pds_id || '-'}`,
      `MPO Index: ${t.mpo_index || '-'}`,
      `NID Number: ${t.nid_number || '-'}`,
      `Joining Date: ${t.joining_date || '-'}`,
      `1st MPO Date: ${t.first_mpo_date || '-'}`,
      `Experience: ${t.experience || '-'}`,
      `Date of Birth: ${t.date_of_birth || '-'}`,
      r ? `Remaining Job Time: ${r.remaining}` : null,
      r ? `Retired Date: ${r.retiredDate}` : null,
      `Present Address: ${t.present_address || '-'}`,
      `Permanent Address: ${t.permanent_address || '-'}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

  const resetForm = () => {
    setEditingId(null); setName(''); setNameBangla(''); setDesignation(''); setTeacherGroup(''); setSubject(''); setSelectedSubjects([])
    setJoiningDate(''); setFirstMpoDate(''); setDateOfBirth(''); setGender(''); setMobile(''); setWhatsappNumber(''); setNidNumber(''); setEmail(''); setPresentAddress(''); setPermanentAddress(''); setPassword(''); setSelectedRoles(['teacher']); setPdsId(''); setMpoIndex(''); setPhotoFile(null); setExistingPhotoPath(null)
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
        pds_id: pdsId || undefined,
        mpo_index: mpoIndex || undefined,
      }
      const payload: Record<string, any> = {
        name, designation, subject: subject || undefined,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        group: teacherGroup || undefined,
        joining_date: joiningDate, date_of_birth: dateOfBirth || undefined, gender, mobile, email,
        roles: selectedRoles,
        ...extraFields,
        ...(photoPath && { photo_path: photoPath }),
      }
      if (password) payload.password = password
      if (editingId) {
        await api.put(`/admin/teachers-staff/teacher/${editingId}`, payload)
        alert('Teacher updated successfully')
      } else {
        await api.post('/admin/teachers-staff/teacher', payload)
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
    setDesignation(t.designation); setTeacherGroup(t.group || '')
    setSubject(t.subject || '')
    setSelectedSubjects(t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? [t.subject] : []))
    setJoiningDate(t.joining_date || ''); setFirstMpoDate(t.first_mpo_date || '')
    setDateOfBirth(t.date_of_birth || ''); setGender(t.gender || ''); setMobile(t.mobile || ''); setWhatsappNumber(t.whatsapp_number || ''); setNidNumber(t.nid_number || ''); setEmail(t.email || ''); setPresentAddress(t.present_address || ''); setPermanentAddress(t.permanent_address || '')
    setPdsId(t.pds_id || ''); setMpoIndex(t.mpo_index || '')
    setExistingPhotoPath(t.photo_path || null); setPhotoFile(null); setPassword(''); setSelectedRoles(['teacher'])
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this teacher?')) return
    api.delete(`/admin/teachers-staff/teacher/${id}`)
      .then(() => fetchTeachers())
      .catch(() => {})
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/teachers-staff/teacher/${id}/move-up`, {})
      .then(() => fetchTeachers())
      .catch(() => alert('Already at top'))
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/teachers-staff/teacher/${id}/move-down`, {})
      .then(() => fetchTeachers())
      .catch(() => alert('Already at bottom'))
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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <button onClick={() => copyTeacherText(t)} className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            {t.name_bangla && <p className="text-sm text-gray-500">{t.name_bangla}</p>}
            <p className="text-sm text-gray-600">{t.designation}{t.subject ? ` (${t.subject})` : ''}</p>
            {t.group && <p className="text-xs text-gray-400">Group: {t.group}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500">Group</span><p className="text-gray-900">{t.group || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Gender</span><p className="text-gray-900 capitalize">{t.gender}</p></div>
          <div><span className="font-medium text-gray-500">Mobile</span><p className="text-gray-900">{t.mobile}{t.mobile && t.mobile !== '-' ? <button onClick={() => copySingle(t.mobile, 'm')} className="ml-1.5 inline align-middle text-blue-400 hover:text-blue-600">{copiedField === 'm' ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="inline h-3 w-3" />}</button> : null}</p></div>
          <div><span className="font-medium text-gray-500">Email</span><p className="text-gray-900">{t.email || '-'}</p></div>
          <div><span className="font-medium text-gray-500">WhatsApp</span><p className="text-gray-900">{t.whatsapp_number || '-'}{t.whatsapp_number && t.whatsapp_number !== '-' ? <button onClick={() => copySingle(t.whatsapp_number, 'w')} className="ml-1.5 inline align-middle text-blue-400 hover:text-blue-600">{copiedField === 'w' ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="inline h-3 w-3" />}</button> : null}</p></div>
          <div><span className="font-medium text-gray-500">PDS ID</span><p className="text-gray-900">{t.pds_id || '-'}</p></div>
          <div><span className="font-medium text-gray-500">MPO Index</span><p className="text-gray-900">{t.mpo_index || '-'}</p></div>
          <div><span className="font-medium text-gray-500">NID Number</span><p className="text-gray-900">{t.nid_number || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Joining Date</span><p className="text-gray-900">{t.joining_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">1st MPO Date</span><p className="text-gray-900">{t.first_mpo_date || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Experience</span><p className="text-gray-900">{t.experience || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Date of Birth</span><p className="text-gray-900">{t.date_of_birth || '-'}</p></div>
          <div><span className="font-medium text-gray-500">Remaining Job Time</span><p className="text-gray-900">{retirement ? retirement.remaining : '-'}</p></div>
          <div><span className="font-medium text-gray-500">Retired Date</span><p className="text-gray-900">{retirement ? retirement.retiredDate : '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Present Address</span><p className="text-gray-900">{t.present_address || '-'}</p></div>
          <div className="col-span-2"><span className="font-medium text-gray-500">Permanent Address</span><p className="text-gray-900">{t.permanent_address || '-'}</p></div>
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
    { key: 'group', label: 'Group' },
    { key: 'subject', label: 'Subject' },
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
    const saved = localStorage.getItem('admin_teachers_columns')
    return saved ? JSON.parse(saved) : defaultColumns
  })

  const handleColumnReorder = useCallback((next: typeof defaultColumns) => {
    setColumns(next)
    localStorage.setItem('admin_teachers_columns', JSON.stringify(next))
  }, [])

  const handleRowReorder = useCallback(async (reordered: Record<string, unknown>[]) => {
    const ids = reordered.map((r: any) => r.id)
    setTeachers(reordered as any[])
    try {
      await api.post('/admin/teachers-staff/teacher/reorder', { ids })
    } catch { /* ignore */ }
  }, [])

  const rows = teachers.map((t, i) => ({
    ...t,
    sl: i + 1,
    photo: t.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${t.photo_path}`} alt={t.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    joining_date: t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
    date_of_birth: t.date_of_birth ? new Date(t.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
    whatsapp_number: t.whatsapp_number || '-',
    experience: t.experience || '-',
    remaining_job_time: (calculateRetirement(t.date_of_birth) || {}).remaining || '-',
    retired_date: (calculateRetirement(t.date_of_birth) || {}).retiredDate || '-',
    subject: (t.subjects && t.subjects.length > 0) ? t.subjects.join(', ') : (t.subject || '-'),
    status: <Badge variant={t.user_status === 'frozen' ? 'danger' : 'success'}>{t.user_status || 'active'}</Badge>,
    actions: (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleMoveUp(t.id)} disabled={i === 0} title="Move up">
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleMoveDown(t.id)} disabled={i === teachers.length - 1} title="Move down">
        <ArrowDown className="h-4 w-4" />
      </Button>
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
              <Select label="Group" options={TEACHER_GROUPS} value={teacherGroup} onChange={(e) => setTeacherGroup(e.target.value)} placeholder="Select Group" />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subjects</label>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {(teacherGroup ? filteredSubjects : publicSubjects).map((s) => (
                    <label key={s} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100">
                      <input type="checkbox" checked={selectedSubjects.includes(s)} onChange={() => {
                        const next = selectedSubjects.includes(s)
                          ? selectedSubjects.filter((x) => x !== s)
                          : [...selectedSubjects, s]
                        setSelectedSubjects(next)
                        if (next.length > 0 && !next.includes(subject)) setSubject(next[0])
                        else if (next.length === 0) setSubject('')
                      }} /> {s}
                    </label>
                  ))}
                </div>
              </div>
              <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
              <Input label="1st MPO Date" type="date" value={firstMpoDate} onChange={(e) => setFirstMpoDate(e.target.value)} />
              <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select" />
              <Input label="NID Number" placeholder="National ID number" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} />
              <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
              <Input label="WhatsApp Number" placeholder="01XXXXXXXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
              <Input label="E-mail" type="email" placeholder="teacher@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Teacher' : 'Add Teacher'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Existing Teachers</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const cols: ExportColumn[] = [
                    { key: 'pds_id', label: 'PDS ID' }, { key: 'mpo_index', label: 'MPO Index' },
                    { key: 'name', label: 'Name' }, { key: 'name_bangla', label: 'Name (Bangla)' },
                    { key: 'designation', label: 'Designation' }, { key: 'group', label: 'Group' },
                    { key: 'subject', label: 'Subject' }, { key: 'date_of_birth', label: 'DOB' },
                    { key: 'joining_date', label: 'Joining' }, { key: 'first_mpo_date', label: '1st MPO' },
                    { key: 'experience', label: 'Experience' }, { key: 'gender', label: 'Gender' },
                    { key: 'mobile', label: 'Mobile' }, { key: 'whatsapp_number', label: 'WhatsApp' },
                    { key: 'email', label: 'Email' }, { key: 'nid_number', label: 'NID' },
                    { key: 'present_address', label: 'Present Address' },
                    { key: 'permanent_address', label: 'Permanent Address' },
                  ]
                  exportToExcel(teachers, cols, 'Teachers')
                }}>Excel</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const cols: ExportColumn[] = [
                    { key: 'pds_id', label: 'PDS ID' }, { key: 'mpo_index', label: 'MPO Index' },
                    { key: 'name', label: 'Name' }, { key: 'name_bangla', label: 'Name (Bangla)' },
                    { key: 'designation', label: 'Designation' }, { key: 'group', label: 'Group' },
                    { key: 'subject', label: 'Subject' }, { key: 'date_of_birth', label: 'DOB' },
                    { key: 'joining_date', label: 'Joining' }, { key: 'first_mpo_date', label: '1st MPO' },
                    { key: 'experience', label: 'Experience' }, { key: 'gender', label: 'Gender' },
                    { key: 'mobile', label: 'Mobile' }, { key: 'whatsapp_number', label: 'WhatsApp' },
                    { key: 'email', label: 'Email' }, { key: 'nid_number', label: 'NID' },
                    { key: 'present_address', label: 'Present Address' },
                    { key: 'permanent_address', label: 'Permanent Address' },
                  ]
                  exportToPDF(teachers, cols, 'Teachers List', 'Teachers')
                }}>PDF</Button>
              </div>
            </div>
            <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No teachers added yet" rowKey="id" onColumnReorder={handleColumnReorder} onRowReorder={handleRowReorder} />
          </CardContent>
        </Card>

        <Modal open={!!viewingTeacher} onClose={() => setViewingTeacher(null)} title="Teacher Details">
          {viewingTeacher && viewDetail(viewingTeacher)}
        </Modal>
    </PanelLayout>
  )
}
