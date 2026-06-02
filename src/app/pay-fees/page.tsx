'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2 } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface FeeRecord {
  year: string
  month: number
  amount_due: string
  amount_paid: string
  waiver_amount: string
  due: string
}

interface StudentFeeData {
  student: { id: number; student_id: string; name: string; class: string; mobile: string }
  fees: FeeRecord[]
  total_due: number
  total_paid: number
  total_outstanding: number
}

export default function PayFeesPage() {
  const [studentId, setStudentId] = useState('')
  const [searched, setSearched] = useState(false)
  const [data, setData] = useState<StudentFeeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  async function handleSearch() {
    if (!studentId) return
    setLoading(true)
    setError('')
    setSearched(true)
    setData(null)
    try {
      const res = await api.get<{ data: StudentFeeData }>(`/payments/student/${encodeURIComponent(studentId)}`)
      setData(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Student not found')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayNow() {
    if (!data) return
    setPaying(true)
    try {
      const res = await api.post<{ data: { transaction_id: string; payment_url: string } }>(
        '/payments/initiate',
        { amount: data.total_outstanding, payment_type: 'tuition_fee', student_id: data.student.id }
      )
      if (res.data.payment_url) {
        window.open(res.data.payment_url, '_blank')
      }
      alert('Payment initiated. Transaction ID: ' + res.data.transaction_id)
    } catch (err: unknown) {
      alert('Payment failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <PageContainer className="max-w-3xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Pay Fees</h1>

      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <Input label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter your Student ID" />
          <Button onClick={handleSearch} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</> : <><Search className="mr-2 h-4 w-4" /> Search</>}
          </Button>
        </CardContent>
      </Card>

      {searched && data && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Student ID:</span> <span className="font-medium text-gray-900">{data.student.student_id}</span></div>
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{data.student.name}</span></div>
              <div><span className="text-gray-500">Class:</span> <span className="font-medium text-gray-900">{data.student.class}</span></div>
              <div><span className="text-gray-500">Total Paid:</span> <span className="font-medium text-green-600">৳{data.total_paid}</span></div>
            </div>
            <div className="border-t border-gray-200 pt-4 text-center">
              <p className="text-sm text-gray-500">
                Outstanding: <span className="font-semibold text-red-600">৳{data.total_outstanding}</span>
              </p>
              <Button className="mt-3" onClick={handlePayNow} disabled={paying || data.total_outstanding <= 0}>
                {paying ? 'Processing...' : data.total_outstanding > 0 ? 'Pay Now' : 'No Dues'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {searched && !data && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <p>{error || 'Student not found. Please check the ID and try again.'}</p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
