'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, CustomFieldInput, DynamicFields, useCustomFields, type CustomFieldDef, type CustomFieldValues } from '@/components/ui'
import { api } from '@/lib/api'

const GROUPS = [
  { value: 'Science', label: 'Science' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Humanities', label: 'Humanities' },
]

const CLASSES = [
  { value: '11th', label: '11th' },
  { value: '12th', label: '12th' },
  { value: 'Old', label: 'Old (Ex-Student)' },
]

const HSC_BATCHES = Array.from({ length: 24 }, (_, i) => {
  const y = String(2027 + i)
  return { value: y, label: y }
})

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Internal subject names; display names shown as tags on the form
const COMPULSORY_SUBJECTS = ['Bangla', 'English', 'ICT']
const COMPULSORY_SUBJECT_LABELS: Record<string, string> = {
  ICT: 'Information and Communication Technology',
}

// Subjects not offered as Selective/Optional choices (matched case-insensitively)
const EXCLUDED_SELECTIVE_SUBJECTS = [
  'library and information science',
  'information and communication technology',
  'n/a (not applicable)',
]
const isExcludedSubject = (s: string) =>
  EXCLUDED_SELECTIVE_SUBJECTS.includes(s.toLowerCase())

const GROUP_CODES: Record<string, string> = {
  'Science': '1',
  'Business Studies': '2',
  'Humanities': '3',
}

const buildStudentId = (batch: string, group: string, roll: string): string => {
  const yy = batch ? batch.slice(-2) : ''
  const gcode = GROUP_CODES[group] ?? ''
  const r = roll ? String(parseInt(roll, 10) || 0).padStart(3, '0') : ''
  return yy && gcode && r ? yy + gcode + r : ''
}

function AddStudentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

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
  const [hscBatch, setHscBatch] = useState('')
  const [classRoll, setClassRoll] = useState('')
  const [section, setSection] = useState('')
  const [gender, setGender] = useState('male')
  const [bloodGroup, setBloodGroup] = useState('')
  const [studentGroup, setStudentGroup] = useState('')
  const [selectiveSubjects, setSelectiveSubjects] = useState<string[]>([])
  const [optionalSubject, setOptionalSubject] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])
  // Subjects with paper codes for display: "253_254 Accounting" (code left of name)
  const [codedSubjects, setCodedSubjects] = useState<{ name: string; label: string }[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customValues, setCustomValues] = useState<CustomFieldValues>({})
  const customDefs = useCustomFields('student')

  const autoStudentId = editId ? studentId : buildStudentId(hscBatch, studentGroup, classRoll)
  const selectableSubjects = publicSubjects.filter(
    (s) => !COMPULSORY_SUBJECTS.includes(s) && !isExcludedSubject(s),
  )

  useEffect(() => {
    const query = studentGroup ? `/subjects?group=${encodeURIComponent(studentGroup)}` : '/subjects'
    api.get<{ status: number; data: string[] }>(query)
      .then((res) => setPublicSubjects(res.data))
      .catch(() => {})
  }, [studentGroup])

  useEffect(() => {
    let active = true
    api
      .get<{ status: number; data: { name: string; label: string; group: string | null }[] }>('/subjects-with-codes')
      .then((res) => { if (active) setCodedSubjects((res.data || []).map((s) => ({ name: s.name, label: s.label }))) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const codeLabel = (name: string) =>
    codedSubjects.find((c) => c.name === name)?.label ?? name

  const loadStudent = useCallback(async () => {
    if (!editId) return
    try {
      const res = await api.get<{ status: number; data: Record<string, unknown> }>(`/admin/students/${editId}`)
      // Backend returns {status, data: student}; older shape nested data.data
      const s = (res.data && (res.data as { data?: Record<string, unknown> }).data) || res.data || (res as unknown as Record<string, unknown>)
      setStudentId(String(s.student_id ?? ''))
      setHscBatch(String(s.academic_session ?? ''))
      setClassRoll(String(s.class_roll ?? ''))
      setName(String(s.name ?? ''))
      setFatherName(String(s.father_name ?? ''))
      setMotherName(String(s.mother_name ?? ''))
      setDateOfBirth(s.date_of_birth ? String(s.date_of_birth).slice(0, 10) : '')
      setMobile(String(s.mobile ?? ''))
      setParentMobile(String(s.parent_mobile ?? ''))
      setWhatsapp(String(s.whatsapp ?? ''))
      setPresentAddress(String(s.present_address ?? ''))
      setPermanentAddress(String(s.permanent_address ?? ''))
      setStudentClass(String(s.class ?? '11th'))
      setSection(String(s.section ?? ''))
      setGender(String(s.gender ?? 'male'))
      setBloodGroup(String(s.blood_group ?? ''))
      setStudentGroup(String(s.student_group ?? ''))
      const subj = s.selective_subjects
      setSelectiveSubjects(Array.isArray(subj) ? (subj as string[]) : [])
      setOptionalSubject(String(s.optional_subject ?? ''))
      setExistingPhotoPath(s.photo_path ? String(s.photo_path) : null)
      let cf = s.custom_fields
      if (typeof cf === 'string') { try { cf = JSON.parse(cf) } catch { cf = null } }
      if (cf && typeof cf === 'object') {
        const parsed: CustomFieldValues = {}
        Object.entries(cf as Record<string, unknown>).forEach(([k, v]) => { parsed[k] = v == null ? '' : String(v) })
        setCustomValues(parsed)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load student')
    }
  }, [editId])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => { if (active) loadStudent() }, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [loadStudent])

  const toggleSelectiveSubject = (sub: string) => {
    setSelectiveSubjects((prev) => (prev.includes(sub) ? prev.filter((x) => x !== sub) : [...prev, sub]))
  }

  const handleSubmit = async () => {
    setError('')
    if (!name || !mobile) {
      setError('Name and Mobile are required')
      return
    }
    if (!editId && !autoStudentId) {
      setError('HSC Batch, Group, and Class Roll are required to build the Student ID')
      return
    }
    const missingCustom = customDefs.find((f) => !f.is_builtin && f.required && !(customValues[f.label] || '').trim())
    if (missingCustom) {
      setError(`"${missingCustom.label}" is required`)
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('student_id', autoStudentId)
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
      formData.append('academic_session', hscBatch)
      formData.append('class_roll', classRoll)
      formData.append('section', section)
      formData.append('gender', gender)
      formData.append('blood_group', bloodGroup)
      formData.append('student_group', studentGroup)
      formData.append('compulsory_subjects', JSON.stringify(COMPULSORY_SUBJECTS))
      formData.append('selective_subjects', JSON.stringify(selectiveSubjects))
      formData.append('optional_subject', optionalSubject)
      formData.append('custom_fields', JSON.stringify(customValues))
      if (photoFile) formData.append('photo', photoFile)
      if (existingPhotoPath) formData.append('photo_path', existingPhotoPath)

      if (editId) {
        await api.upload(`/admin/students/${editId}`, formData)
        alert('Student updated')
      } else {
        await api.upload('/admin/students', formData)
        alert('Student created. Login ID: ' + autoStudentId + ', Password: ' + mobile)
      }
      router.push('/p_F7c2j/students')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student')
      return
    } finally {
      setSaving(false)
    }
  }

  // Renderers for built-in fields — the def carries the admin's label,
  // options and required flag; value binding stays tied to the field_key.
  const studentRenderers: Record<string, (def: CustomFieldDef) => React.ReactNode> = {
    student_id: () => (
      <Input label="Student ID" value={autoStudentId} disabled className="bg-gray-50 text-gray-500" placeholder="Auto: batch + group + roll" />
    ),
    hsc_batch: (def) => (
      <Select label={`${def.label}${def.required ? ' *' : ''}`} options={HSC_BATCHES} value={hscBatch} onChange={(e) => setHscBatch(e.target.value)} placeholder="Select batch" />
    ),
    class_roll: (def) => (
      <Input label={`${def.label}${def.required ? ' *' : ''}`} type="number" value={classRoll} onChange={(e) => setClassRoll(e.target.value)} placeholder="e.g. 1" />
    ),
    name: (def) => (
      <Input label={`${def.label}${def.required ? ' *' : ''}`} value={name} onChange={(e) => setName(e.target.value)} />
    ),
    father_name: (def) => (
      <Input label={def.label} value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
    ),
    mother_name: (def) => (
      <Input label={def.label} value={motherName} onChange={(e) => setMotherName(e.target.value)} />
    ),
    date_of_birth: (def) => (
      <Input label={def.label} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
    ),
    mobile: (def) => (
      <Input label={`${def.label}${def.required ? ' *' : ''}`} value={mobile} onChange={(e) => setMobile(e.target.value)} />
    ),
    parent_mobile: (def) => (
      <Input label={def.label} value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} />
    ),
    whatsapp: (def) => (
      <Input label={def.label} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
    ),
    student_class: (def) => (
      <Select label={def.label} options={CLASSES} value={studentClass} onChange={(e) => setStudentClass(e.target.value)} />
    ),
    section: (def) => (
      <Input label={def.label} value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" />
    ),
    gender: (def) => (
      <Select label={def.label} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={gender} onChange={(e) => setGender(e.target.value)} />
    ),
    blood_group: (def) => (
      <Select label={def.label} options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="Select blood group" />
    ),
    student_group: (def) => (
      <Select label={def.label} options={GROUPS} value={studentGroup} onChange={(e) => setStudentGroup(e.target.value)} placeholder="Select group" />
    ),
    photo: (def) => (
      <Input label={def.label} type="file" accept=".png,.jpg,.jpeg" key={editId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
    ),
    present_address: (def) => (
      <Input label={def.label} value={presentAddress} onChange={(e) => setPresentAddress(e.target.value)} />
    ),
    permanent_address: (def) => (
      <Input label={def.label} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
    ),
    compulsory_subjects: (def) => (
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">{def.label}</label>
        <div className="flex flex-wrap gap-2">
          {COMPULSORY_SUBJECTS.map((s) => (
            <span key={s} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{COMPULSORY_SUBJECT_LABELS[s] ?? s}</span>
          ))}
        </div>
      </div>
    ),
    selective_subjects: (def) => (
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">{def.label}</label>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
          {selectableSubjects.map((s) => (
            <label key={s} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100">
              <input type="checkbox" checked={selectiveSubjects.includes(s)} onChange={() => toggleSelectiveSubject(s)} /> {codeLabel(s)}
            </label>
          ))}
        </div>
      </div>
    ),
    optional_subject: (def) => (
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">{def.label}</label>
        <select value={optionalSubject} onChange={(e) => setOptionalSubject(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">-- None --</option>
          {selectableSubjects.map((s) => (
            <option key={s} value={s}>{codeLabel(s)}</option>
          ))}
        </select>
      </div>
    ),
  }

  return (
    <PanelLayout role="admin" title={editId ? 'Edit Student' : 'Add Student'}>
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DynamicFields
              defs={customDefs}
              renderers={studentRenderers}
              fallback={(def) => <CustomFieldInput def={def} values={customValues} onChange={(lbl, val) => setCustomValues((p) => ({ ...p, [lbl]: val }))} />}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Student' : 'Create Student'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/p_F7c2j/students')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}

export default function AddStudentPage() {
  return (
    <Suspense fallback={null}>
      <AddStudentForm />
    </Suspense>
  )
}
