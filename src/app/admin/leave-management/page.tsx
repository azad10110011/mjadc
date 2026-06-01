'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

interface LeaveApp {
  id: number
  applicant_id: number
  applicant_role: string
  applicant_name: string
  leave_type: string
  from_date: string
  to_date: string
  reason: string
  status: string
  created_at: string
  allocated: number
  taken: number
  remaining: number
}

interface Allocation {
  id: number
  role_type: string
  user_id: number | null
  user_name?: string
  leave_type: string
  total_days: number
  period: string
}

interface TakenRecord {
  id: number
  user_id: number
  user_name: string
  year: number
  leave_type: string
  period: string
  days_taken: number
}

interface UserOption {
  id: number
  name: string
  gender: string
}

export default function AdminLeaveManagementPage() {
  const [applications, setApplications] = useState<LeaveApp[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [takenRecords, setTakenRecords] = useState<TakenRecord[]>([])
  const [activeTab, setActiveTab] = useState<'applications' | 'allocations' | 'taken'>('applications')

  // Application form
  const [showAppForm, setShowAppForm] = useState(false)
  const [appUserId, setAppUserId] = useState('')
  const [appUserRole, setAppUserRole] = useState('teacher')
  const [appLeaveType, setAppLeaveType] = useState('casual')
  const [appFromDate, setAppFromDate] = useState('')
  const [appToDate, setAppToDate] = useState('')
  const [appReason, setAppReason] = useState('')
  const [appStatus, setAppStatus] = useState('pending')
  const [appUsersByRole, setAppUsersByRole] = useState<UserOption[]>([])

  const [editApp, setEditApp] = useState<LeaveApp | null>(null)
  const [editLeaveType, setEditLeaveType] = useState('')
  const [editFromDate, setEditFromDate] = useState('')
  const [editToDate, setEditToDate] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  // Allocation form
  const [showAllocForm, setShowAllocForm] = useState(false)
  const [allocRoleType, setAllocRoleType] = useState('teacher')
  const [allocUserId, setAllocUserId] = useState('')
  const [allocLeaveType, setAllocLeaveType] = useState('casual')
  const [allocTotalDays, setAllocTotalDays] = useState('')
  const [allocPeriod, setAllocPeriod] = useState('yearly')
  const [usersByRole, setUsersByRole] = useState<UserOption[]>([])

  // Taken form
  const [showTakenForm, setShowTakenForm] = useState(false)
  const [takenUserId, setTakenUserId] = useState('')
  const [takenLeaveType, setTakenLeaveType] = useState('casual')
  const [takenDays, setTakenDays] = useState('')
  const [takenYear, setTakenYear] = useState(String(new Date().getFullYear()))
  const [takenPeriod, setTakenPeriod] = useState('yearly')
  const [showResetYear, setShowResetYear] = useState(false)
  const [resetYear, setResetYear] = useState(String(new Date().getFullYear()))

  const fetchApplications = () => {
    api.get<{ status: number; data: LeaveApp[] }>('/admin/leave-management')
      .then((res) => setApplications(res.data))
      .catch(() => {})
  }

  const fetchAllocations = () => {
    api.get<{ status: number; data: Allocation[] }>('/admin/leave-allocations')
      .then((res) => setAllocations(res.data))
      .catch(() => {})
  }

  const fetchTakenRecords = () => {
    api.get<{ status: number; data: TakenRecord[] }>('/admin/leave-taken')
      .then((res) => setTakenRecords(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    fetchApplications()
    fetchAllocations()
    fetchTakenRecords()
  }, [])

  const loadAppUsersByRole = async (role: string) => {
    try {
      const res = await api.get<{ status: number; data: UserOption[] }>(`/admin/users-by-role?role=${role}`)
      setAppUsersByRole(res.data)
    } catch {
      setAppUsersByRole([])
    }
  }

  const handleCreateApplication = async () => {
    if (!appUserId || !appFromDate || !appToDate || !appReason) return
    try {
      await api.post('/admin/leave-management', {
        applicant_id: parseInt(appUserId),
        applicant_role: appUserRole,
        leave_type: appLeaveType,
        from_date: appFromDate,
        to_date: appToDate,
        reason: appReason,
        status: appStatus,
      })
      setShowAppForm(false)
      setAppUserId('')
      setAppFromDate('')
      setAppToDate('')
      setAppReason('')
      fetchApplications()
      fetchTakenRecords()
    } catch (e: any) {
      alert(e.message || 'Failed to create application')
    }
  }

  const handleDeleteApplication = async (id: number) => {
    if (!confirm('Delete this application?')) return
    try {
      await api.delete(`/admin/leave-management/${id}`)
      fetchApplications()
      fetchTakenRecords()
    } catch { alert('Failed to delete') }
  }

  const loadUsersByRole = async (role: string) => {
    try {
      const res = await api.get<{ status: number; data: UserOption[] }>(`/admin/users-by-role?role=${role}`)
      setUsersByRole(res.data)
    } catch {
      setUsersByRole([])
    }
  }

  const handleAction = async (id: number, action: 'approved' | 'rejected') => {
    const reason = action === 'rejected' ? prompt('Reason for rejection:') || '' : ''
    try {
      await api.post('/admin/leave-management/action', { application_id: id, action, reason })
      fetchApplications()
    } catch { alert('Action failed') }
  }

  const openEdit = (app: LeaveApp) => {
    setEditApp(app)
    setEditLeaveType(app.leave_type)
    setEditFromDate(app.from_date)
    setEditToDate(app.to_date)
    setEditReason(app.reason || '')
    setEditStatus(app.status)
  }

  const closeEdit = () => {
    setEditApp(null)
  }

  const handleSaveEdit = async () => {
    if (!editApp) return
    setSaving(true)
    try {
      await api.put(`/admin/leave-management/${editApp.id}`, {
        leave_type: editLeaveType,
        from_date: editFromDate,
        to_date: editToDate,
        reason: editReason,
        status: editStatus,
      })
      closeEdit()
      fetchApplications()
      fetchTakenRecords()
    } catch (e: any) {
      alert(e.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAllocation = async () => {
    if (!allocTotalDays) return
    try {
      await api.post('/admin/leave-allocations', {
        role_type: allocRoleType,
        user_id: allocUserId || null,
        leave_type: allocLeaveType,
        total_days: parseInt(allocTotalDays),
        period: allocLeaveType === 'maternity' && allocUserId ? 'lifetime' : allocPeriod,
      })
      setShowAllocForm(false)
      setAllocUserId('')
      setAllocTotalDays('')
      fetchAllocations()
    } catch (e: any) {
      alert(e.message || 'Failed to create allocation')
    }
  }

  const handleUpdateAllocation = async (id: number, totalDays: number) => {
    try {
      await api.put(`/admin/leave-allocations/${id}`, { total_days: totalDays })
      fetchAllocations()
    } catch { alert('Failed to update') }
  }

  const handleDeleteAllocation = async (id: number) => {
    if (!confirm('Delete this allocation?')) return
    try {
      await api.delete(`/admin/leave-allocations/${id}`)
      fetchAllocations()
    } catch { alert('Failed to delete') }
  }

  const handleCreateTaken = async () => {
    if (!takenUserId || !takenDays) return
    try {
      await api.post('/admin/leave-taken', {
        user_id: parseInt(takenUserId),
        leave_type: takenLeaveType,
        days_taken: parseInt(takenDays),
        year: parseInt(takenYear),
        period: takenPeriod,
      })
      setShowTakenForm(false)
      setTakenUserId('')
      setTakenDays('')
      fetchTakenRecords()
    } catch (e: any) {
      alert(e.message || 'Failed to create taken record')
    }
  }

  const handleUpdateTaken = async (id: number, days: number) => {
    try {
      await api.put(`/admin/leave-taken/${id}`, { days_taken: days })
      fetchTakenRecords()
    } catch { alert('Failed to update') }
  }

  const handleResetYear = async () => {
    if (!confirm(`Reset all taken records for year ${resetYear}? This will set days_taken to 0 for all users.`)) return
    try {
      await api.post('/admin/leave-taken/reset-year', { year: parseInt(resetYear) })
      setShowResetYear(false)
      fetchTakenRecords()
    } catch (e: any) {
      alert(e.message || 'Failed to reset year')
    }
  }

  const handleDeleteTaken = async (id: number) => {
    if (!confirm('Delete this taken record?')) return
    try {
      await api.delete(`/admin/leave-taken/${id}`)
      fetchTakenRecords()
    } catch { alert('Failed to delete') }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }
    return <Badge variant={(map[status] || 'default') as 'success' | 'warning' | 'danger' | 'info' | 'default'}>{status}</Badge>
  }

  const columns = [
    { key: 'sl', label: 'SL No' },
    { key: 'applicant_name', label: 'Applicant' },
    { key: 'applicant_role', label: 'Role' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'date_range', label: 'Date Range' },
    { key: 'allocated', label: 'Allocated' },
    { key: 'taken', label: 'Taken' },
    { key: 'remaining', label: 'Remaining' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = applications.map((a, i) => ({
    sl: i + 1,
    applicant_name: a.applicant_name,
    applicant_role: a.applicant_role,
    leave_type: a.leave_type,
    date_range: `${a.from_date} - ${a.to_date}`,
    allocated: a.allocated,
    taken: a.taken,
    remaining: a.remaining,
    status: statusBadge(a.status),
    actions: (
      <div className="flex gap-2">
        {a.status === 'pending' && (
          <>
            <Button variant="primary" size="sm" onClick={() => handleAction(a.id, 'approved')}>Approve</Button>
            <Button variant="danger" size="sm" onClick={() => handleAction(a.id, 'rejected')}>Reject</Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDeleteApplication(a.id)}>Delete</Button>
      </div>
    ),
  }))

  const allocColumns = [
    { key: 'role', label: 'Role' },
    { key: 'user', label: 'User' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'total_days', label: 'Total Days' },
    { key: 'period', label: 'Period' },
    { key: 'actions', label: 'Actions' },
  ]

  const allocRows = allocations.map((a) => ({
    role: a.role_type,
    user: a.user_name || '(All)',
    leave_type: a.leave_type,
    total_days: (
      <input
        type="number"
        className="w-20 rounded border px-2 py-1 text-sm"
        defaultValue={a.total_days}
        onBlur={(e) => {
          const val = parseInt(e.target.value)
          if (val !== a.total_days) handleUpdateAllocation(a.id, val)
        }}
      />
    ),
    period: a.period,
    actions: (
      <Button variant="danger" size="sm" onClick={() => handleDeleteAllocation(a.id)}>Delete</Button>
    ),
  }))

  const takenColumns = [
    { key: 'user', label: 'User' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'year', label: 'Year' },
    { key: 'period', label: 'Period' },
    { key: 'days', label: 'Days Taken' },
    { key: 'actions', label: 'Actions' },
  ]

  const takenRows = takenRecords.map((t) => ({
    user: t.user_name,
    leave_type: t.leave_type,
    year: t.year || 'Lifetime',
    period: t.period,
    days: (
      <input
        type="number"
        className="w-20 rounded border px-2 py-1 text-sm"
        defaultValue={t.days_taken}
        onBlur={(e) => {
          const val = parseInt(e.target.value)
          if (val !== t.days_taken) handleUpdateTaken(t.id, val)
        }}
      />
    ),
    actions: (
      <Button variant="danger" size="sm" onClick={() => handleDeleteTaken(t.id)}>Delete</Button>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Leave Management">
      <div className="mb-4 flex gap-2">
        <Button variant={activeTab === 'applications' ? 'primary' : 'ghost'} onClick={() => setActiveTab('applications')}>
          Applications
        </Button>
        <Button variant={activeTab === 'allocations' ? 'primary' : 'ghost'} onClick={() => setActiveTab('allocations')}>
          Allocations
        </Button>
        <Button variant={activeTab === 'taken' ? 'primary' : 'ghost'} onClick={() => setActiveTab('taken')}>
          Taken Records
        </Button>
      </div>

      {activeTab === 'applications' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Leave Applications</h3>
              <Button onClick={() => { setShowAppForm(true); loadAppUsersByRole(appUserRole) }}>New Application</Button>
            </div>
            <DataTable columns={columns} data={rows} emptyMessage="No leave applications" />
          </CardContent>
        </Card>
      )}

      {activeTab === 'allocations' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Leave Allocations</h3>
              <Button onClick={() => { setShowAllocForm(true); loadUsersByRole(allocRoleType) }}>Add Allocation</Button>
            </div>
            <DataTable columns={allocColumns} data={allocRows} emptyMessage="No allocations configured" />
          </CardContent>
        </Card>
      )}

      {activeTab === 'taken' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Leave Taken Records</h3>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => setShowResetYear(true)}>Reset Year</Button>
                <Button onClick={() => setShowTakenForm(true)}>Add Taken Record</Button>
              </div>
            </div>
            <DataTable columns={takenColumns} data={takenRows} emptyMessage="No taken records" />
          </CardContent>
        </Card>
      )}

      {editApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Leave Application</h3>
              <p className="text-sm text-gray-500">
                Applicant: {editApp.applicant_name} ({editApp.applicant_role})
              </p>

              <Select label="Leave Type" value={editLeaveType} onChange={(e) => setEditLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="From Date" type="date" value={editFromDate} onChange={(e) => setEditFromDate(e.target.value)} />
                <Input label="To Date" type="date" value={editToDate} onChange={(e) => setEditToDate(e.target.value)} />
              </div>

              <Input label="Reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} />

              <Select label="Status" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]} />

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAppForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">New Leave Application</h3>

              <Select label="Role" value={appUserRole} onChange={(e) => {
                setAppUserRole(e.target.value)
                setAppUserId('')
                loadAppUsersByRole(e.target.value)
              }}
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'staff', label: 'Staff' },
                  { value: 'principal', label: 'Principal' },
                ]} />

              <Select label="Applicant" value={appUserId} onChange={(e) => setAppUserId(e.target.value)}
                options={[
                  { value: '', label: '-- Select --' },
                  ...appUsersByRole.map((u) => ({ value: String(u.id), label: `${u.name} (${u.gender})` })),
                ]} />

              <Select label="Leave Type" value={appLeaveType} onChange={(e) => setAppLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="From Date" type="date" value={appFromDate} onChange={(e) => setAppFromDate(e.target.value)} />
                <Input label="To Date" type="date" value={appToDate} onChange={(e) => setAppToDate(e.target.value)} />
              </div>

              <Input label="Reason" value={appReason} onChange={(e) => setAppReason(e.target.value)} />

              <Select label="Status" value={appStatus} onChange={(e) => setAppStatus(e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]} />

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleCreateApplication}>Create Application</Button>
                <Button variant="ghost" onClick={() => setShowAppForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAllocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">New Leave Allocation</h3>

              <Select label="Role" value={allocRoleType} onChange={(e) => {
                setAllocRoleType(e.target.value)
                setAllocUserId('')
                loadUsersByRole(e.target.value)
              }}
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'staff', label: 'Staff' },
                  { value: 'principal', label: 'Principal' },
                ]} />

              <Select label="Specific Person (optional)" value={allocUserId} onChange={(e) => setAllocUserId(e.target.value)}
                options={[
                  { value: '', label: '-- All --' },
                  ...usersByRole.map((u) => ({ value: String(u.id), label: `${u.name} (${u.gender})` })),
                ]} />

              <Select label="Leave Type" value={allocLeaveType} onChange={(e) => setAllocLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} />

              <Input label="Total Days" type="number" value={allocTotalDays} onChange={(e) => setAllocTotalDays(e.target.value)} />

              <Select label="Period" value={allocPeriod} onChange={(e) => setAllocPeriod(e.target.value)}
                options={[
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'lifetime', label: 'Lifetime' },
                ]} />

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleCreateAllocation}>Create Allocation</Button>
                <Button variant="ghost" onClick={() => setShowAllocForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showResetYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Reset Taken Records for Year</h3>
              <p className="text-sm text-gray-500">This will set days_taken to 0 for all users for the selected year.</p>
              <Input label="Year" type="number" value={resetYear} onChange={(e) => setResetYear(e.target.value)} />
              <div className="flex gap-3 pt-2">
                <Button variant="danger" onClick={handleResetYear}>Reset</Button>
                <Button variant="ghost" onClick={() => setShowResetYear(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showTakenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Add / Edit Leave Taken Record</h3>

              <Input label="User ID" type="number" value={takenUserId} onChange={(e) => setTakenUserId(e.target.value)} />

              <Select label="Leave Type" value={takenLeaveType} onChange={(e) => setTakenLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} />

              <Input label="Days Taken" type="number" value={takenDays} onChange={(e) => setTakenDays(e.target.value)} />

              <Input label="Year (0 for lifetime)" type="number" value={takenYear} onChange={(e) => setTakenYear(e.target.value)} />

              <Select label="Period" value={takenPeriod} onChange={(e) => setTakenPeriod(e.target.value)}
                options={[
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'lifetime', label: 'Lifetime' },
                ]} />

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleCreateTaken}>Save</Button>
                <Button variant="ghost" onClick={() => setShowTakenForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PanelLayout>
  )
}
