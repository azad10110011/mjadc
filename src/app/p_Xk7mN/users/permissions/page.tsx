'use client'

// Admin → Users → User Permissions (Session 80).
// Pick a user, tick/untick any feature. A tick that the user's role gives by default needs no override;
// ticking something extra stores a GRANT, unticking a default stores a REVOKE. Admin-only features
// (user management, seat plan, hall duty, duty letters) cannot be granted. Enforced on the backend.

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { Search, ShieldCheck, Lock, RotateCcw, Save } from 'lucide-react'
import { UserQuickAccess } from '@/components/quickAccess/UserQuickAccess'

interface CatalogItem { key: string; label: string; group: string; roles: string[]; grantable: boolean }
interface UserRow { id: number; name: string; email: string; roles: string[]; status: string; student_id?: string | null }
interface UserPerms {
  user: { id: number; name: string; email: string; roles: string[]; status: string }
  is_admin: boolean
  overrides: Record<string, 'grant' | 'revoke'>
  effective: string[]
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', teacher: 'Teacher', staff: 'Staff', student: 'Student',
  exam_controller: 'Exam Controller', administration: 'Administration', principal: 'Principal',
}

function PermissionsInner() {
  const params = useSearchParams()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [includeStudents, setIncludeStudents] = useState(false)
  const [userId, setUserId] = useState<number | null>(() => Number(params.get('user')) || null)
  const [data, setData] = useState<UserPerms | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get<{ data: CatalogItem[] }>('/admin/permissions/catalog').then((r) => setCatalog(r.data || [])).catch(() => {})
    api.get<{ data: UserRow[] }>('/admin/users').then((r) => setUsers(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!userId) return
    let alive = true
    api.get<{ data: UserPerms }>(`/admin/permissions/user/${userId}`)
      .then((r) => {
        if (!alive) return
        setData(r.data)
        setChecked(Object.fromEntries((r.data.effective || []).map((k) => [k, true])))
        setMsg(null)
      })
      .catch((e: unknown) => alive && setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load user' }))
    return () => { alive = false }
  }, [userId])

  const userList = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    return users
      .filter((u) => includeStudents || !(u.roles.length === 1 && u.roles[0] === 'student'))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.student_id || '').includes(q))
      .slice(0, 60)
  }, [users, userSearch, includeStudents])

  const roles = useMemo(() => data?.user.roles || [], [data])
  const isDefault = (it: CatalogItem) => it.roles.some((r) => roles.includes(r))

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const map = new Map<string, CatalogItem[]>()
    for (const it of catalog) {
      if (q && !it.label.toLowerCase().includes(q) && !it.group.toLowerCase().includes(q)) continue
      if (!map.has(it.group)) map.set(it.group, [])
      map.get(it.group)!.push(it)
    }
    return [...map.entries()]
  }, [catalog, filter])

  // what will be stored for each item
  const diff = useMemo(() => {
    const out: Record<string, 'grant' | 'revoke' | 'default'> = {}
    for (const it of catalog) {
      const on = !!checked[it.key]
      const def = isDefault(it)
      out[it.key] = on === def ? 'default' : on ? 'grant' : 'revoke'
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, checked, roles])

  const changed = data ? catalog.filter((it) => (data.overrides[it.key] || 'default') !== diff[it.key]).length : 0
  const grants = Object.values(diff).filter((v) => v === 'grant').length
  const revokes = Object.values(diff).filter((v) => v === 'revoke').length

  const save = async () => {
    if (!data) return
    setSaving(true); setMsg(null)
    try {
      const r = await api.put<{ data: { overrides: Record<string, 'grant' | 'revoke'>; effective: string[] } }>(
        `/admin/permissions/user/${data.user.id}`, { overrides: diff })
      setData({ ...data, overrides: r.data.overrides, effective: r.data.effective })
      setChecked(Object.fromEntries(r.data.effective.map((k) => [k, true])))
      setMsg({ ok: true, text: `Saved. ${data.user.name} now has ${r.data.effective.length} feature(s); their menu updates on their next page load.` })
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const catalogKeys = useMemo(() => catalog.map((it) => it.key), [catalog])
  const tickedKeys = useMemo(() => (data?.is_admin ? catalogKeys : Object.keys(checked).filter((k) => checked[k])), [data, catalogKeys, checked])

  const resetToRole = () => setChecked(Object.fromEntries(catalog.filter(isDefault).map((it) => [it.key, true])))

  return (
    <PanelLayout role="admin" title="User Permissions">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ---------- user picker ---------- */}
        <Card className="lg:self-start">
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold text-gray-900">Select User</h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} aria-label="Search users"
                placeholder="Name, email or student ID" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={includeStudents} onChange={(e) => setIncludeStudents(e.target.checked)} /> Include students
            </label>
            <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
              {userList.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setUserId(u.id)}
                    className={`w-full px-3 py-2 text-left text-sm ${u.id === userId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <span className="block font-medium text-gray-900">{u.name}</span>
                    <span className="block truncate text-xs text-gray-500">{u.email} · {u.roles.map((r) => ROLE_LABEL[r] || r).join(', ')}</span>
                  </button>
                </li>
              ))}
              {userList.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-500">No users</li>}
            </ul>
          </CardContent>
        </Card>

        {/* ---------- permissions ---------- */}
        <div className="space-y-4">
          {!data && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">Select a user to manage their permissions.</p>}
          {data && (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{data.user.name}</p>
                    <p className="text-sm text-gray-500">{data.user.email} · {roles.map((r) => ROLE_LABEL[r] || r).join(', ') || 'no role'}{data.user.status === 'frozen' ? ' · FROZEN' : ''}</p>
                  </div>
                  {!data.is_admin && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-800">Extra granted {grants}</span>
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Removed {revokes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {data.is_admin ? (
                <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  <ShieldCheck className="h-4 w-4" /> This user is an Admin and always has every permission.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter features"
                        placeholder="Filter features" className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm" />
                    </div>
                    <Button variant="secondary" size="sm" onClick={resetToRole}><RotateCcw className="mr-1 h-4 w-4" /> Reset to role defaults</Button>
                    <span className="flex-1" />
                    <Button onClick={save} disabled={saving || changed === 0}>
                      <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : changed ? `Save ${changed} change(s)` : 'Saved'}
                    </Button>
                  </div>
                  {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

                  {groups.map(([group, items]) => (
                    <Card key={group}>
                      <CardContent className="pt-5">
                        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{group}</h4>
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {items.map((it) => {
                            const def = isDefault(it)
                            const on = !!checked[it.key]
                            const locked = !it.grantable && !def
                            const state = diff[it.key]
                            return (
                              <li key={it.key}>
                                <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${locked ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400' : 'cursor-pointer border-gray-200 hover:bg-gray-50'} ${state === 'grant' ? 'border-green-300 bg-green-50' : state === 'revoke' ? 'border-red-300 bg-red-50' : ''}`}>
                                  <input type="checkbox" className="mt-0.5" checked={on} disabled={locked}
                                    onChange={(e) => setChecked((p) => ({ ...p, [it.key]: e.target.checked }))} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-medium">{it.label}</span>
                                    <span className="block text-xs text-gray-500">
                                      {locked ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Admin only</span>
                                        : state === 'grant' ? 'Extra — granted to this user'
                                        : state === 'revoke' ? 'Removed from this user'
                                        : def ? `From role (${it.roles.map((r) => ROLE_LABEL[r] || r).join(', ')})` : 'Not given'}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Session 110: this user's dashboard shortcuts */}
              <UserQuickAccess key={data.user.id} userId={data.user.id} roles={roles} permissions={tickedKeys} permissionKeys={catalogKeys} />
            </>
          )}
        </div>
      </div>
    </PanelLayout>
  )
}

export default function UserPermissionsPage() {
  return (
    <Suspense fallback={null}>
      <PermissionsInner />
    </Suspense>
  )
}
