'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { UserRole } from '@/types'
import { api } from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  gender: string
  date_of_birth: string | null
  status: string
  roles: string[]
  subjects?: string[]
  result_subjects?: string[]
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedResultSubjects, setSelectedResultSubjects] = useState<string[]>([])
  const [examSubjects, setExamSubjects] = useState<string[]>([])
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])
  const [createError, setCreateError] = useState('')
  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwResult, setResetPwResult] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)

  const resetForm = () => {
    setEditingId(null); setName(''); setEmail(''); setPassword(''); setSelectedRoles([]); setSelectedSubjects([]); setSelectedResultSubjects([]); setCreateError('')
  }

  const fetchUsers = () => {
    api.get<{ status: number; data: User[] }>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    fetchUsers()
    api.get<{ status: number; data: string[] }>('/subjects')
      .then((res) => setPublicSubjects(res.data))
      .catch(() => {})
    api.get<{ status: number; data: { name: string; papers: { name: string }[] }[] }>('/admin/subjects/tree')
      .then((res) => {
        const list: string[] = []
        for (const group of res.data) {
          if (group.papers.length > 0) {
            for (const paper of group.papers) {
              list.push(paper.name)
            }
          } else {
            list.push(group.name)
          }
        }
        setExamSubjects(list)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async () => {
    setCreateError('')
    if (!name || !email) { setCreateError('Name and email are required'); return }
    if (!editingId && !password) { setCreateError('Password is required for new users'); return }
    try {
      const payload: any = { name, email, roles: selectedRoles }
      const isTeacher = selectedRoles.includes('teacher')
      if (isTeacher) {
        payload.subjects = selectedSubjects
        payload.result_subjects = selectedResultSubjects
      }
      if (editingId) {
        if (password) payload.password = password
        await api.put(`/admin/users/${editingId}`, payload)
        alert('User updated successfully')
      } else {
        payload.password = password
        await api.post('/admin/users', payload)
        alert('User created successfully')
      }
      resetForm()
      fetchUsers()
    } catch (err: unknown) { setCreateError(err instanceof Error ? err.message : 'Failed to save user') }
  }

  const handleEdit = (u: User) => {
    setEditingId(u.id); setName(u.name); setEmail(u.email); setSelectedRoles(u.roles)
    setSelectedSubjects(u.subjects || []); setSelectedResultSubjects(u.result_subjects || [])
    setPassword(''); setCreateError('')
  }

  const handleFreeze = (id: number) => {
    api.post(`/admin/users/${id}/freeze`, {})
      .then(() => fetchUsers())
      .catch(() => {})
  }

  const handleUnfreeze = (id: number) => {
    api.post(`/admin/users/${id}/unfreeze`, {})
      .then(() => fetchUsers())
      .catch(() => {})
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this user?')) return
    setCreateError('')
    api.delete(`/admin/users/${id}`)
      .then(() => fetchUsers())
      .catch((err: unknown) => setCreateError(err instanceof Error ? err.message : 'Delete failed'))
  }

  const handleResetPassword = async () => {
    if (!resetPwUser) return
    setResetPwLoading(true)
    setResetPwResult('')
    try {
      const payload: any = {}
      if (resetPwValue) payload.password = resetPwValue
      const res = await api.post<{ status: number; data: { new_password: string } }>(`/admin/users/${resetPwUser.id}/reset-password`, payload)
      setResetPwResult(`New Password: ${res.data.new_password}`)
    } catch (err: unknown) {
      setResetPwResult(err instanceof Error ? err.message : 'Failed to reset password')
    }
    setResetPwLoading(false)
  }

  const openResetPw = (u: User) => {
    setResetPwUser(u); setResetPwValue(''); setResetPwResult('')
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((x) => x !== subject) : [...prev, subject]
    )
  }

  const toggleResultSubject = (subject: string) => {
    setSelectedResultSubjects((prev) =>
      prev.includes(subject) ? prev.filter((x) => x !== subject) : [...prev, subject]
    )
  }

  const allRoles: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'staff', label: 'Staff' },
    { value: 'exam_controller', label: 'Exam Controller' },
    { value: 'administration', label: 'Administration' },
    { value: 'principal', label: 'Principal' },
  ]

  const checkboxList = (items: string[], selected: string[], toggle: (s: string) => void) => (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
      {items.map((s) => (
        <label key={s} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100">
          <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} /> {s}
        </label>
      ))}
    </div>
  )

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = users.map((u) => ({
    ...u,
    roles: u.roles.join(', '),
    status: <Badge variant={u.status === 'frozen' ? 'danger' : 'success'}>{u.status}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Edit</Button>
        <Button variant="secondary" size="sm" onClick={() => openResetPw(u)}>Reset Password</Button>
        {u.status === 'frozen'
          ? <Button variant="secondary" size="sm" onClick={() => handleUnfreeze(u.id)}>Unfreeze</Button>
          : <Button variant="secondary" size="sm" onClick={() => handleFreeze(u.id)}>Freeze</Button>
        }
        <Button variant="danger" size="sm" onClick={() => handleDelete(u.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="User Management">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit User' : 'Create New User'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingId ? 'Leave blank to keep current' : ''} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((r) => (
                <label key={r.value} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={selectedRoles.includes(r.value)} onChange={() => toggleRole(r.value)} /> {r.label}
                </label>
              ))}
            </div>
          </div>
          {selectedRoles.includes('teacher') && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assign Subject <span className="text-xs text-gray-400">(Public / Teacher Directory)</span>
                </label>
                {checkboxList(publicSubjects, selectedSubjects, toggleSubject)}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assign Result Management Subjects <span className="text-xs text-gray-400">(Exam Marks)</span>
                </label>
                <p className="mb-1 text-xs text-gray-500">Teacher can upload/update marks for these subjects.</p>
                {checkboxList(examSubjects, selectedResultSubjects, toggleResultSubject)}
              </div>
            </>
          )}
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <Button variant="primary" onClick={handleSubmit}>{editingId ? 'Update User' : 'Create User'}</Button>
        </CardContent>
      </Card>
      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !resetPwLoading && setResetPwUser(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Reset Password</h3>
            <p className="mb-4 text-sm text-gray-600">
              User: <strong>{resetPwUser.name}</strong> ({resetPwUser.email})
            </p>
            <Input label="New Password (leave empty for random)" type="text" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} />
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" onClick={handleResetPassword} disabled={resetPwLoading}>
                {resetPwLoading ? 'Resetting...' : 'Reset'}
              </Button>
              <Button variant="ghost" onClick={() => setResetPwUser(null)} disabled={resetPwLoading}>Cancel</Button>
            </div>
            {resetPwResult && (
              <p className="mt-3 rounded-md bg-green-50 p-2 text-center text-sm font-medium text-green-700">{resetPwResult}</p>
            )}
          </div>
        </div>
      )}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">All Users</h3>
          <DataTable columns={columns} data={rows} emptyMessage="No users" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
