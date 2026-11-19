'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent, Button, Input } from '@/components/ui'
import { ROLE_HOME, type PanelRole } from '@/components/layout/PanelLayout'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { APP_LOGIN, APP_MODE } from '@/lib/appMode'

function getRoleFromToken(): PanelRole | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const roles: string[] = payload.roles || []
    if (roles.includes('admin')) return 'admin'
    if (roles.includes('principal')) return 'principal'
    if (roles.includes('administration')) return 'administration'
    if (roles.includes('exam_controller')) return 'exam_controller'
    if (roles.includes('teacher')) return 'teacher'
    if (roles.includes('staff')) return 'staff'
    if (roles.includes('student')) return 'student'
    return roles[0] as PanelRole
  } catch {
    return null
  }
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, refresh } = useAuth()
  const mustChange = !!user?.must_change_password
  const [role, setRole] = useState<PanelRole | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      const r = getRoleFromToken()
      if (!r) { router.push(APP_MODE ? APP_LOGIN : '/') }
      else { setRole(r) }
    })
  }, [router])

  if (!role) return null

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!currentPassword || !newPassword) { setError('Both fields are required'); return }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await api.post<{ data?: { token?: string } }>('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
      // Session 116: a new password ends all other sessions; keep this one with the fresh token
      if (res.data?.token) localStorage.setItem('token', res.data.token)
      setSuccess('Password changed successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      if (mustChange) {
        // Forced first-login change: clear the flag in memory, then go to the panel home.
        await refresh()
        if (role) router.replace(ROLE_HOME[role] || '/')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    }
    setLoading(false)
  }

  return (
    <PanelLayout role={role} title="Change Password">
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-gray-900">Change Your Password</h3>
            {mustChange && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                For your security, please set a new password before continuing. Your current password is the
                temporary one you were given (students: your mobile number).
              </p>
            )}
            <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
