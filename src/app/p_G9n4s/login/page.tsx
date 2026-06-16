'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { PageContainer } from '@/components/ui/PageContainer'
import { useAuth } from '@/contexts/AuthContext'

export default function StudentLoginPage() {
  const router = useRouter()
  const { login: authLogin } = useAuth()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Student login uses ID instead of email
    const email = studentId + '@student.mjadc.local'

    try {
      await authLogin(email, password)
      router.push('/p_G9n4s/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error. Check if backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="flex min-h-[60vh] max-w-md items-center">
      <Card className="w-full">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Student Login</h1>
            <p className="mt-1 text-sm text-gray-600">Enter your Student ID and password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter your Student ID"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link href="/p_G9n4s/login/reset-password" className="text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

        </CardContent>
      </Card>
    </PageContainer>
  )
}
