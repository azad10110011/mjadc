'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent } from '@/components/ui'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }

      localStorage.setItem('token', data.data.token)
      const userData = data.data.user
      const roles = userData.roles
      const defaultRole = userData.default_role

      if (defaultRole) {
        const home: Record<string, string> = {
          teacher: '/teacher',
          staff: '/staff/leave-management',
          exam_controller: '/exam-controller',
          principal: '/principal',
          administration: '/administration-panel',
        }
        router.push(home[defaultRole] || '/teacher')
      } else if (roles.includes('teacher')) router.push('/teacher')
      else if (roles.includes('staff')) router.push('/staff/leave-management')
      else if (roles.includes('exam_controller')) router.push('/exam-controller')
      else if (roles.includes('principal')) router.push('/principal')
      else if (roles.includes('administration')) router.push('/administration-panel')
      else setError('This portal is for teachers and staff only')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Teacher / Staff Login</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
