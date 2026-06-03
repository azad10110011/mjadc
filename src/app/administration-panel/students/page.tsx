'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge, PhotoWithPreview } from '@/components/ui'

import { api, UPLOAD_BASE } from '@/lib/api'

const GROUPS = [
  { value: 'Science', label: 'Science' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Humanities', label: 'Humanities' },
]

const CLASSES = [
  { value: '11th', label: '11th' },
  { value: '12th', label: '12th' },
]

const COMPULSORY_SUBJECTS = ['Bangla', 'English', 'ICT']

export default function AdminPanelStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewingStudent, setViewingStudent] = useState<any | null>(null)
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])

  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [mobile, setMobile] = useState('')
  const [parentMobile, setParentMobile] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [presentAddress, setPresentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [studentClass, setStudentClass] = useState('11th')
  const [section, setSection] = useState('')
  const [gender, setGender] = useState('male')
  const [studentGroup, setStudentGroup] = useState('')
  const [selectiveSubjects, setSelectiveSubjects] = useState<string[]>([])
  const [optionalSubject, setOptionalSubject] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [error, setError] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setStudentId(''); setName(''); setFatherName(''); setMotherName('')
    setDateOfBirth(''); setMobile(''); setParentMobile(''); setWhatsapp('')
    setPresentAddress(''); setPermanentAddress('')
    setStudentClass('11th'); setSection(''); setGender('male')
    setStudentGroup(''); setSelectiveSubjects([]); setOptionalSubject(''); setPhotoFile(null); setExistingPhotoPath(null); setError('')
  }

  const fetchStudents = () => {
    api.get<any>('/admin-panel/students')
      .then((r) => setStudents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const query = studentGroup ? `/subjects?group=${encodeURIComponent(studentGroup)}` : '/subjects'
    api.get<{ status: number; data: string[] }>(query)
      .then((res) => setPublicSubjects(res.data))
      .catch(() => {})
  }, [studentGroup])

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    if (!editingId) {
      const year = new Date().getFullYear().toString().slice(-2)
      const prefix = studentClass === '12th' ? '12' : '11'
      const pattern = year + prefix
      const matching = students
        .filter((s) => s.student_id && s.student_id.startsWith(pattern))
        .map((s) => parseInt(s.student_id.slice(-4), 10))
      const maxSeq = matching.length > 0 ? Math.max(...matching) : 0
      setStudentId(pattern + String(maxSeq + 1).padStart(4, '0'))
    }
  }, [studentClass, editingId, students])

  const handleSubmit = async () => {
    setError('')
    if (!name || !mobile) {
      setError('Name and Mobile are required')
      return
    }
    try {
      const formData = new FormData()
      formData.append('student_id', studentId)
      formData.append('name', name)
      formData.append('father_name', fatherName)
      formData.append('mother_name', motherName)
      if (dateOfBirth) formData.append('date_of_birth', dateOfBirth)
      formData.append('mobile', mobile)
      formData.append('parent_mobile', parentMobile)
      formData.append('whatsapp', whatsapp)
      formData.append('present_address', presentAddress)
      formData.append('permanent_address', permanentAddress)
      formData.append('class', studentClass)
      formData.append('section', section)
      formData.append('gender', gender)
      formData.append('student_group', studentGroup)
      formData.append('compulsory_subjects', JSON.stringify(COMPULSORY_SUBJECTS))
      formData.append('selective_subjects', JSON.stringify(selectiveSubjects))
      formData.append('optional_subject', optionalSubject)
      if (photoFile) formData.append('photo', photoFile)
      if (existingPhotoPath) formData.append('photo_path', existingPhotoPath)

      if (editingId) {
        await api.upload(`/admin-panel/students/${editingId}`, formData, 'POST')
        alert('Student updated')
      } else {
        await api.upload('/admin-panel/students', formData)
        alert('Student created. Login ID: ' + studentId + ', Password: ' + mobile)
      }
      resetForm()
      fetchStudents()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student')
    }
  }

  const handleView = (s: any) => {
    setViewingStudent(s)
  }

  const handleEdit = (s: any) => {
    setEditingId(s.id)
    setStudentId(s.student_id)
    setName(s.name)
    setFatherName(s.father_name || '')
    setMotherName(s.mother_name || '')
    setDateOfBirth(s.date_of_birth ? s.date_of_birth.slice(0, 10) : '')
    setMobile(s.mobile || '')
    setParentMobile(s.parent_mobile || '')
    setWhatsapp(s.whatsapp || '')
    setPresentAddress(s.present_address || '')
    setPermanentAddress(s.permanent_address || '')
    setStudentClass(s.class)
    setSection(s.section || '')
    setGender(s.gender)
    setStudentGroup(s.student_group || '')
    setSelectiveSubjects(Array.isArray(s.selective_subjects) ? s.selective_subjects : [])
    setOptionalSubject(s.optional_subject || '')
    setExistingPhotoPath(s.photo_path || null)
    setPhotoFile(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this student? This will also remove their user account.')) return
    try {
      await api.delete(`/admin-panel/students/${id}`)
      fetchStudents()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleFreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/freeze`, {})
      .then(() => fetchStudents())
      .catch(() => {})
  }

  const handleUnfreeze = (userId: number) => {
    api.post(`/admin/users/${userId}/unfreeze`, {})
      .then(() => fetchStudents())
      .catch(() => {})
  }

  const toggleSelectiveSubject = (s: string) => {
    setSelectiveSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const columns = [
    { key: 'photo', label: 'Photo' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'student_group', label: 'Group' },
    { key: 'user_status', label: 'Account' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = students.map((s) => ({
    photo: s.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${s.photo_path}`} alt={s.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    student_id: s.student_id,
    name: s.name,
    class: s.class,
    mobile: s.mobile,
    student_group: s.student_group || '-',
    user_status: <Badge variant={s.user_status === 'frozen' ? 'danger' : 'success'}>{s.user_status || 'active'}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleView(s)}>View</Button>
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
    <PanelLayout role="administration" title="Student Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Student' : 'Add New Student'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Student ID" value={studentId} disabled className="bg-gray-50 text-gray-500" />
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Father's Name" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            <Input label="Mother's Name" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Input label="Mobile Number *" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="Parent Mobile" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} />
            <Input label="WhatsApp Number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            <Select label="Class" options={CLASSES} value={studentClass} onChange={(e) => setStudentClass(e.target.value)} />
            <Input label="Section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" />
            <Select label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} />
            <Select label="Group" options={GROUPS} value={studentGroup} onChange={(e) => setStudentGroup(e.target.value)} placeholder="Select group" />
            <Input label="Photo" type="file" accept=".png,.jpg,.jpeg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Present Address" value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
            <Input label="Permanent Address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Compulsory Subjects (Fixed)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPULSORY_SUBJECTS.map((s) => (
                <span key={s} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Selective Subjects</label>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {publicSubjects.filter((s) => !COMPULSORY_SUBJECTS.includes(s)).map((s) => (
                <label key={s} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100">
                  <input type="checkbox" checked={selectiveSubjects.includes(s)} onChange={() => toggleSelectiveSubject(s)} /> {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Optional Subject</label>
            <select value={optionalSubject} onChange={(e) => setOptionalSubject(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">-- None --</option>
              {publicSubjects.filter((s) => !COMPULSORY_SUBJECTS.includes(s)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="primary" onClick={handleSubmit}>
            {editingId ? 'Update Student' : 'Create Student'}
          </Button>
        </CardContent>
      </Card>
      {viewingStudent && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Student Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewingStudent(null)}>Close</Button>
            </div>
            <div className="flex items-center gap-4">
              {viewingStudent.photo_path ? (
                <img src={`${UPLOAD_BASE}/${viewingStudent.photo_path}`} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-200" />
              )}
              <div>
                <p className="text-lg font-medium">{viewingStudent.name}</p>
                <p className="text-sm text-gray-500">ID: {viewingStudent.student_id}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div><span className="font-medium text-gray-700">Father's Name:</span> <span className="text-gray-600">{viewingStudent.father_name || '-'}</span></div>
              <div><span className="font-medium text-gray-700">Mother's Name:</span> <span className="text-gray-600">{viewingStudent.mother_name || '-'}</span></div>
              <div><span className="font-medium text-gray-700">Date of Birth:</span> <span className="text-gray-600">{viewingStudent.date_of_birth ? viewingStudent.date_of_birth.slice(0, 10) : '-'}</span></div>
              <div><span className="font-medium text-gray-700">Class:</span> <span className="text-gray-600">{viewingStudent.class}</span></div>
              <div><span className="font-medium text-gray-700">Section:</span> <span className="text-gray-600">{viewingStudent.section || '-'}</span></div>
              <div><span className="font-medium text-gray-700">Group:</span> <span className="text-gray-600">{viewingStudent.student_group || '-'}</span></div>
              <div><span className="font-medium text-gray-700">Gender:</span> <span className="text-gray-600">{viewingStudent.gender}</span></div>
              <div><span className="font-medium text-gray-700">Mobile:</span> <span className="text-gray-600">{viewingStudent.mobile || '-'}</span></div>
              <div><span className="font-medium text-gray-700">Parent Mobile:</span> <span className="text-gray-600">{viewingStudent.parent_mobile || '-'}</span></div>
              <div><span className="font-medium text-gray-700">WhatsApp:</span> <span className="text-gray-600">{viewingStudent.whatsapp || '-'}</span></div>
              <div className="sm:col-span-2"><span className="font-medium text-gray-700">Present Address:</span> <span className="text-gray-600">{viewingStudent.present_address || '-'}</span></div>
              <div className="sm:col-span-2"><span className="font-medium text-gray-700">Permanent Address:</span> <span className="text-gray-600">{viewingStudent.permanent_address || '-'}</span></div>
            </div>
            {(() => {
              let subjects: string[] = []
              if (Array.isArray(viewingStudent.selective_subjects)) {
                subjects = viewingStudent.selective_subjects
              } else if (typeof viewingStudent.selective_subjects === 'string') {
                try { subjects = JSON.parse(viewingStudent.selective_subjects) }
                catch { subjects = [] }
              }
              if (subjects.length === 0) return null
              return (
                <div>
                  <span className="text-sm font-medium text-gray-700">Selective Subjects:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {subjects.map((s: string) => (
                      <span key={s} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{s}</span>
                    ))}
                  </div>
                </div>
              )
            })()}
            {viewingStudent.optional_subject && (
              <div><span className="text-sm font-medium text-gray-700">Optional Subject:</span> <span className="text-sm text-gray-600">{viewingStudent.optional_subject}</span></div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">All Students</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No students" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
