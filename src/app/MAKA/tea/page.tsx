'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types'

export default function TeacherLoginPage() {
  const router = useRouter()
  const { login: authLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userData = await authLogin(email, password)
      const roles = userData.roles
      const defaultRole = userData.default_role

      if (defaultRole) {
        const home: Record<string, string> = {
          teacher: '/p_R2t9b',
          staff: '/p_L8p1x/leave-management',
          exam_controller: '/p_H3v5d',
          principal: '/p_W4q6z',
          administration: '/p_F7c2j',
        }
        router.push(home[defaultRole] || '/p_R2t9b')
      } else if (roles.includes('teacher')) router.push('/p_R2t9b')
      else if (roles.includes('staff')) router.push('/p_L8p1x/leave-management')
      else if (roles.includes('exam_controller')) router.push('/p_H3v5d')
      else if (roles.includes('principal')) router.push('/p_W4q6z')
      else if (roles.includes('administration')) router.push('/p_F7c2j')
      else setError('This portal is for teachers and staff only')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
