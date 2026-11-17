'use client'

// Shared admin user manager (Session 77) — used by Users → All Users / Teacher-Staff / Students.
// Search (name, email, student ID), role + status filters, pagination, create/edit, reset password,
// freeze/unfreeze, delete. On scoped pages, roles outside the scope are preserved when editing.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'
import { PanelTaskPicker, loadDisabledTasks } from '@/components/users/PanelTaskPicker'
import { Search, X, ChevronLeft, ChevronRight, Users } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  gender: string
  date_of_birth: string | null
  default_role: string | null
  status: string
  roles: string[]
  subjects?: string[]
  result_subjects?: string[]
  student_id?: string | null
  student_class?: string | null
  created_at: string
}

export type UserScope = 'all' | 'teacher-staff' | 'student'

const ALL_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
  { value: 'exam_controller', label: 'Exam Controller' },
  { value: 'administration', label: 'Administration' },
  { value: 'principal', label: 'Principal' },
]

const SCOPE: Record<UserScope, { roles: string[]; query: string; canCreate: boolean; defaultPanel: boolean }> = {
  all: { roles: ALL_ROLES.map((r) => r.value), query: '', canCreate: true, defaultPanel: true },
  'teacher-staff': { roles: ['teacher', 'staff'], query: '?roles=teacher,staff', canCreate: true, defaultPanel: false },
  student: { roles: ['student'], query: '?roles=student', canCreate: false, defaultPanel: false },
}

const roleLabel = (r: string) => ALL_ROLES.find((x) => x.value === r)?.label ?? r.replace(/_/g, ' ')
const PAGE_SIZES = [25, 50, 100].map((n) => ({ value: String(n), label: `${n} per page` }))

interface Props {
  scope: UserScope
  title: string
  listTitle: string
  /** 'list' = list + edit only (create lives on its own page), 'create' = create form only. */
  mode?: 'both' | 'list' | 'create'
}

const ADD_PAGE: Partial<Record<UserScope, { href: string; label: string }>> = {
  'teacher-staff': { href: '/p_Xk7mN/users/teacher-staff/add', label: 'Add Teacher/Staff' },
}

export function UserManager({ scope, title, listTitle, mode = 'both' }: Props) {
  const base = SCOPE[scope]
  const cfg = { ...base, canCreate: base.canCreate && mode !== 'list' }
  const showList = mode !== 'create'
  const addPage = ADD_PAGE[scope]
  const scopeRoles = ALL_ROLES.filter((r) => cfg.roles.includes(r.value))

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRoles, setEditingRoles] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [defaultRole, setDefaultRole] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedResultSubjects, setSelectedResultSubjects] = useState<string[]>([])
  const [examSubjects, setExamSubjects] = useState<string[]>([])
  const [publicSubjects, setPublicSubjects] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [disabledTasks, setDisabledTasks] = useState<string[]>([]) // Session 102: unticked panel tasks
  const [notice, setNotice] = useState('')
  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwResult, setResetPwResult] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)

  // filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  // loading starts true; refreshes after an action keep the current rows visible until new data arrives
  const fetchUsers = () => {
    if (!showList) return
    api.get<{ status: number; data: User[] }>(`/admin/users${cfg.query}`)
      .then((res) => setUsers(res.data || []))
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
    if (!cfg.roles.includes('teacher')) return
    api.get<{ status: number; data: string[] }>('/subjects')
      .then((res) => setPublicSubjects(res.data || []))
      .catch(() => {})
    api.get<{ status: number; data: { name: string; papers: { name: string }[] }[] }>('/admin/subjects/tree')
      .then((res) => {
        const list: string[] = []
        for (const group of res.data || []) {
          if (group.papers.length > 0) for (const p of group.papers) list.push(p.name)
          else list.push(group.name)
        }
        setExamSubjects(list)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const resetForm = () => {
    setEditingId(null); setEditingRoles([]); setName(''); setEmail(''); setPassword('')
    setSelectedRoles(scope === 'student' ? ['student'] : []); setDefaultRole('')
    setSelectedSubjects([]); setSelectedResultSubjects([]); setFormError(''); setDisabledTasks([])
  }

  const handleSubmit = async () => {
    setFormError('')
    setNotice('')
    if (!name.trim() || !email.trim()) { setFormError('Name and email are required'); return }
    if (!editingId && !password) { setFormError('Password is required for new users'); return }
    // Keep roles this page cannot see (e.g. a teacher who is also admin, edited from Teacher/Staff)
    const hidden = editingRoles.filter((r) => !cfg.roles.includes(r))
    const roles = Array.from(new Set([...hidden, ...selectedRoles]))
    if (roles.length === 0) { setFormError('Select at least one role'); return }
    try {
      const payload: Record<string, unknown> = { name: name.trim(), email: email.trim(), roles, disabled_features: roles.includes('admin') ? [] : disabledTasks }
      if (cfg.defaultPanel) payload.default_role = defaultRole || null
      if (roles.includes('teacher') && cfg.roles.includes('teacher')) {
        payload.subjects = selectedSubjects
        payload.result_subjects = selectedResultSubjects
      }
      if (editingId) {
        if (password) payload.password = password
        await api.put(`/admin/users/${editingId}`, payload)
        setNotice(`Updated ${name.trim()}.`)
      } else {
        payload.password = password
        await api.post('/admin/users', payload)
        setNotice(`Created ${name.trim()}.`)
      }
      resetForm()
      fetchUsers()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save user')
    }
  }

  const handleEdit = (u: User) => {
    setEditingId(u.id); setEditingRoles(u.roles); setName(u.name); setEmail(u.email)
    setSelectedRoles(u.roles.filter((r) => cfg.roles.includes(r)))
    setDefaultRole(u.default_role || ''); setSelectedSubjects(u.subjects || []); setSelectedResultSubjects(u.result_subjects || [])
    setPassword(''); setFormError(''); setNotice('')
    setDisabledTasks([])
    void loadDisabledTasks(u.id).then(setDisabledTasks)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setStatus = (u: User, action: 'freeze' | 'unfreeze') => {
    api.post(`/admin/users/${u.id}/${action}`, {})
      .then(() => { setNotice(`${u.name} ${action === 'freeze' ? 'frozen' : 'unfrozen'}.`); fetchUsers() })
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : 'Action failed'))
  }

  const handleDelete = (u: User) => {
    if (!confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return
    setFormError('')
    api.delete(`/admin/users/${u.id}`)
      .then(() => { setNotice(`Deleted ${u.name}.`); fetchUsers() })
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : 'Delete failed'))
  }

  const handleResetPassword = async () => {
    if (!resetPwUser) return
    setResetPwLoading(true)
    setResetPwResult('')
    try {
      const payload: Record<string, string> = {}
      if (resetPwValue) payload.password = resetPwValue
      const res = await api.post<{ status: number; data: { new_password: string } }>(`/admin/users/${resetPwUser.id}/reset-password`, payload)
      setResetPwResult(`New Password: ${res.data.new_password}`)
    } catch (err: unknown) {
      setResetPwResult(err instanceof Error ? err.message : 'Failed to reset password')
    }
    setResetPwLoading(false)
  }

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

  const checkboxList = (items: string[], selected: string[], onToggle: (s: string) => void) => (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
      {items.map((s) => (
        <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100">
          <input type="checkbox" checked={selected.includes(s)} onChange={() => onToggle(s)} /> {s}
        </label>
      ))}
    </div>
  )

  // ----- filtering + pagination -----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) =>
      (!roleFilter || u.roles.includes(roleFilter)) &&
      (!statusFilter || (statusFilter === 'frozen' ? u.status === 'frozen' : u.status !== 'frozen')) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        || String(u.id) === q || (u.student_id || '').toLowerCase().includes(q)),
    )
  }, [users, search, roleFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const curPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((curPage - 1) * pageSize, curPage * pageSize)
  const hasFilters = !!(search || roleFilter || statusFilter)
  const frozenCount = users.filter((u) => u.status === 'frozen').length
  const roleCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const u of users) for (const r of u.roles) m[r] = (m[r] || 0) + 1
    return m
  }, [users])

  const clearFilters = () => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1) }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    ...(scope !== 'teacher-staff' ? [{ key: 'student', label: 'Student ID' }] : []),
    { key: 'roles', label: 'Roles' },
    ...(cfg.defaultPanel ? [{ key: 'default_role', label: 'Default Panel' }] : []),
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = pageRows.map((u) => ({
    ...u,
    name: <span className="font-medium text-gray-900">{u.name}</span>,
    email: <span className="break-all">{u.email}</span>,
    student: u.student_id ? <span className="font-mono text-xs">{u.student_id}{u.student_class ? ` · ${u.student_class}` : ''}</span> : '—',
    roles: (
      <div className="flex flex-wrap gap-1">
        {u.roles.map((r) => <span key={r} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800">{roleLabel(r)}</span>)}
      </div>
    ),
    default_role: u.default_role ? roleLabel(u.default_role) : '—',
    status: <Badge variant={u.status === 'frozen' ? 'danger' : 'success'}>{u.status}</Badge>,
    actions: (
      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Edit</Button>
        <Button variant="secondary" size="sm" onClick={() => { setResetPwUser(u); setResetPwValue(''); setResetPwResult('') }}>Reset Password</Button>
        {!u.roles.includes('admin') && (
          <Link href={`/p_Xk7mN/users/permissions?user=${u.id}`}><Button variant="secondary" size="sm">Permissions</Button></Link>
        )}
        {u.status === 'frozen'
          ? <Button variant="secondary" size="sm" onClick={() => setStatus(u, 'unfreeze')}>Unfreeze</Button>
          : <Button variant="secondary" size="sm" onClick={() => setStatus(u, 'freeze')}>Freeze</Button>}
        <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>Delete</Button>
      </div>
    ),
  }))

  const showForm = cfg.canCreate || editingId !== null

  return (
    <PanelLayout role="admin" title={title}>
      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{editingId ? `Edit User — ${name}` : `Create New ${scope === 'teacher-staff' ? 'Teacher/Staff' : 'User'}`}</h3>
              {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingId ? 'Leave blank to keep current' : ''} />
            </div>
            {scopeRoles.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {scopeRoles.map((r) => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                      <input type="checkbox" checked={selectedRoles.includes(r.value)} onChange={() => toggle(setSelectedRoles)(r.value)} /> {r.label}
                    </label>
                  ))}
                </div>
                {editingId && editingRoles.some((r) => !cfg.roles.includes(r)) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Other roles kept: {editingRoles.filter((r) => !cfg.roles.includes(r)).map(roleLabel).join(', ')} (change them in All Users)
                  </p>
                )}
              </div>
            )}
            <PanelTaskPicker roles={Array.from(new Set([...editingRoles.filter((r) => !cfg.roles.includes(r)), ...selectedRoles]))}
              disabled={disabledTasks} onChange={setDisabledTasks} />
            {cfg.defaultPanel && selectedRoles.length > 0 && (
              <div className="max-w-sm">
                <label className="mb-2 block text-sm font-medium text-gray-700">Default Panel (on login)</label>
                <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">— Auto-detect —</option>
                  {selectedRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
            )}
            {selectedRoles.includes('teacher') && cfg.roles.includes('teacher') && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Assign Subject <span className="text-xs text-gray-400">(Public / Teacher Directory)</span>
                  </label>
                  {checkboxList(publicSubjects, selectedSubjects, toggle(setSelectedSubjects))}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Assign Result Management Subjects <span className="text-xs text-gray-400">(Exam Marks)</span>
                  </label>
                  <p className="mb-1 text-xs text-gray-500">Teacher can upload/update marks for these subjects.</p>
                  {checkboxList(examSubjects, selectedResultSubjects, toggle(setSelectedResultSubjects))}
                </div>
              </>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {!showList && notice && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                {notice} <Link href="/p_Xk7mN/users/teacher-staff" className="font-medium underline">View Teacher/Staff list</Link>
              </p>
            )}
            <Button variant="primary" onClick={handleSubmit}>{editingId ? 'Update User' : 'Create User'}</Button>
          </CardContent>
        </Card>
      )}

      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !resetPwLoading && setResetPwUser(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Reset Password</h3>
            <p className="mb-4 break-all text-sm text-gray-600">
              User: <strong>{resetPwUser.name}</strong> ({resetPwUser.email})
            </p>
            <Input label="New Password (leave empty for random)" type="text" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} />
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" onClick={handleResetPassword} disabled={resetPwLoading}>
                {resetPwLoading ? 'Resetting...' : 'Reset'}
              </Button>
              <Button variant="ghost" onClick={() => setResetPwUser(null)} disabled={resetPwLoading}>Close</Button>
            </div>
            {resetPwResult && (
              <p className="mt-3 rounded-md bg-green-50 p-2 text-center text-sm font-medium text-green-700">{resetPwResult}</p>
            )}
          </div>
        </div>
      )}

      {showList && <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Users className="h-5 w-5 text-blue-700" /> {listTitle}
            </h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">Total <b>{users.length}</b></span>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-800">Active <b>{users.length - frozenCount}</b></span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Frozen <b>{frozenCount}</b></span>
            </div>
          </div>

          {!cfg.canCreate && !editingId && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {addPage
                ? <>New teachers and staff are added from <Link href={addPage.href} className="font-medium underline">Users → {addPage.label}</Link>. Here you can edit a login, reset a password, set permissions, freeze or delete.</>
                : 'New students are added from Student Management → Add Student. Here you can edit a login, reset a password, freeze or delete.'}
            </p>
          )}
          {notice && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
          {!showForm && formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Input label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder={scope === 'teacher-staff' ? 'Name or email' : 'Name, email or student ID'} />
              <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-400" />
            </div>
            {scopeRoles.length > 1 && (
              <Select label="Role" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                options={[{ value: '', label: 'All Roles' }, ...scopeRoles.map((r) => ({ value: r.value, label: `${r.label} (${roleCounts[r.value] || 0})` }))]} />
            )}
            <Select label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'frozen', label: 'Frozen' }]} />
            <Select label="Show" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} options={PAGE_SIZES} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span>
              {loading ? 'Loading…' : <>Showing <b>{filtered.length === 0 ? 0 : (curPage - 1) * pageSize + 1}–{Math.min(curPage * pageSize, filtered.length)}</b> of <b>{filtered.length}</b>{hasFilters && ` (filtered from ${users.length})`}</>}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>

          <DataTable columns={columns} data={rows} loading={loading} emptyMessage={hasFilters ? 'No users match these filters' : 'No users'} />

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(curPage - 1)} disabled={curPage <= 1}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-gray-600">Page <b>{curPage}</b> of {pageCount}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(curPage + 1)} disabled={curPage >= pageCount}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>}
    </PanelLayout>
  )
}
