'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button, Input, Select, Card, CardContent } from '@/components/ui'
import { DynamicContent } from '@/components/ui/DynamicContent'
import { PageContainer } from '@/components/ui/PageContainer'
import { api } from '@/lib/api'

interface FormData {
  applicant_name: string
  dob: string
  gender: string
  religion: string
  nationality: string
  mobile: string
  father_name: string
  mother_name: string
  guardian_contact: string
  previous_institution: string
  previous_board: string
  previous_roll: string
  passing_year: string
  previous_gpa: string
  programme: string
  class_group: string
}

const emptyForm: FormData = {
  applicant_name: '', dob: '', gender: '', religion: '', nationality: 'Bangladeshi',
  mobile: '', father_name: '', mother_name: '', guardian_contact: '',
  previous_institution: '', previous_board: '', previous_roll: '', passing_year: '',
  previous_gpa: '', programme: '', class_group: '',
}

export default function AdmissionPage() {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applicationId, setApplicationId] = useState<number | null>(null)

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.applicant_name || !form.mobile || !form.programme) {
      setError('Full Name, Mobile Number, and Programme are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{ data: { id: number; message: string } }>('/admissions/apply', form)
      setApplicationId(res.data.id)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Online Admission</h1>
      <p className="mb-4 text-gray-600">Apply for admission to Miah Jinnah Alam Degree College</p>

      <div className="prose max-w-none text-gray-700 mb-8">
        <DynamicContent pageKey="admission_info" />
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name *" value={form.applicant_name} onChange={(e) => update('applicant_name', e.target.value)} placeholder="Applicant's full name" />
            <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            <Select label="Gender" value={form.gender} onChange={(e) => update('gender', e.target.value)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} placeholder="Select" />
            <Input label="Religion" value={form.religion} onChange={(e) => update('religion', e.target.value)} placeholder="Religion" />
            <Input label="Nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} placeholder="Bangladeshi" />
            <Input label="Mobile Number *" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
          </div>

          <h3 className="font-semibold text-gray-900">Parent/Guardian Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Father's Name" value={form.father_name} onChange={(e) => update('father_name', e.target.value)} placeholder="Father's name" />
            <Input label="Mother's Name" value={form.mother_name} onChange={(e) => update('mother_name', e.target.value)} placeholder="Mother's name" />
            <Input label="Guardian Contact" value={form.guardian_contact} onChange={(e) => update('guardian_contact', e.target.value)} placeholder="Guardian mobile" />
          </div>

          <h3 className="font-semibold text-gray-900">Previous Academic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Previous Institution" value={form.previous_institution} onChange={(e) => update('previous_institution', e.target.value)} placeholder="School/College name" />
            <Select label="Board" value={form.previous_board} onChange={(e) => update('previous_board', e.target.value)} options={[{ value: 'dhaka', label: 'Dhaka' }, { value: 'rajshahi', label: 'Rajshahi' }, { value: 'cumilla', label: 'Cumilla' }, { value: 'jessore', label: 'Jessore' }, { value: 'chittagong', label: 'Chittagong' }, { value: 'barisal', label: 'Barisal' }, { value: 'sylhet', label: 'Sylhet' }, { value: 'dinajpur', label: 'Dinajpur' }, { value: 'mymensingh', label: 'Mymensingh' }]} placeholder="Select Board" />
            <Input label="Roll Number" value={form.previous_roll} onChange={(e) => update('previous_roll', e.target.value)} placeholder="Previous roll" />
            <Input label="Passing Year" value={form.passing_year} onChange={(e) => update('passing_year', e.target.value)} placeholder="e.g. 2025" />
            <Input label="GPA" value={form.previous_gpa} onChange={(e) => update('previous_gpa', e.target.value)} placeholder="Previous GPA" />
          </div>

          <h3 className="font-semibold text-gray-900">Desired Programme</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Programme *" value={form.programme} onChange={(e) => update('programme', e.target.value)} options={[{ value: '11th', label: 'Class 11' }, { value: '12th', label: 'Class 12' }, { value: 'degree', label: 'Degree (Pass)' }]} placeholder="Select Programme" />
            <Select label="Group" value={form.class_group} onChange={(e) => update('class_group', e.target.value)} options={[{ value: 'science', label: 'Science' }, { value: 'business-studies', label: 'Business Studies' }, { value: 'humanities', label: 'Humanities' }]} placeholder="Select Group (if applicable)" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
          </Button>
        </CardContent>
      </Card>

      {submitted && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center text-green-800">
            <p className="font-semibold">Application submitted successfully!</p>
            {applicationId && <p className="mt-1 text-sm">Application ID: {applicationId}</p>}
            <p className="mt-2 text-sm">You will be redirected to the payment gateway to complete the admission fee payment.</p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
