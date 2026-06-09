'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable, Modal } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { exportToExcel, exportToPDF, type ExportColumn } from '@/lib/export'
import { UserPlus, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import type { TeachersCouncilMember } from '@/types'

export default function AdminTeachersCouncilPage() {
  const [members, setMembers] = useState<TeachersCouncilMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [position, setPosition] = useState('')
  const [mobile, setMobile] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)
  const [viewingMember, setViewingMember] = useState<TeachersCouncilMember | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedField, setCopiedField] = useState('')

  const copySingle = (val: string | undefined | null, field: string) => {
    if (!val || val === '-') return
    navigator.clipboard.writeText(val)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 1500)
  }

  const copyMemberText = (m: TeachersCouncilMember) => {
    const lines = [
      `Name: ${m.name}`,
      `Designation: ${m.designation}`,
      m.position ? `Position: ${m.position}` : null,
      m.mobile ? `Mobile: ${m.mobile}` : null,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const resetForm = () => {
    setEditingId(null); setName(''); setDesignation(''); setPosition(''); setMobile('')
    setPhotoFile(null); setExistingPhotoPath(null)
  }

  const fetchMembers = () => {
    api.get('/admin/teachers-council').then((r: any) => setMembers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [])

  const uploadPhoto = async (): Promise<string> => {
    const formData = new FormData()
    formData.append('file', photoFile!)
    formData.append('directory', 'profiles')
    const res: any = await api.upload('/admin/media/upload', formData)
    if (!res.data?.path) throw new Error('Upload succeeded but no path returned')
    return res.data.path
  }

  const handleSubmit = async () => {
    if (!name || !designation) return
    setSubmitting(true)
    try {
      const photoPath = photoFile ? await uploadPhoto() : existingPhotoPath
      if (editingId) {
        await api.put(`/admin/teachers-council/${editingId}`, {
          name, designation, position: position || undefined, mobile: mobile || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      } else {
        await api.post('/admin/teachers-council', {
          name, designation, position: position || undefined, mobile: mobile || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      }
      resetForm()
      const r: any = await api.get('/admin/teachers-council')
      setMembers(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (m: TeachersCouncilMember) => {
    setEditingId(m.id); setName(m.name); setDesignation(m.designation)
    setPosition(m.position || ''); setMobile(m.mobile || ''); setExistingPhotoPath(m.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this member?')) return
    api.delete(`/admin/teachers-council/${id}`).then(() => fetchMembers()).catch(() => {})
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/teachers-council/${id}/move-up`, {}).then(() => fetchMembers()).catch(() => alert('Already at top'))
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/teachers-council/${id}/move-down`, {}).then(() => fetchMembers()).catch(() => alert('Already at bottom'))
  }

  const handleReorder = useCallback((reordered: Record<string, unknown>[]) => {
    const ids = reordered.map((row) => row.id as number)
    api.post('/admin/teachers-council/reorder', { ids }).then(() => fetchMembers()).catch(() => {})
  }, [])

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'position', label: 'Position' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = members.map((m, i) => ({
    ...m,
    sl: i + 1,
    photo: m.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${m.photo_path}`} alt={m.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => handleMoveUp(m.id)} disabled={i === 0} title="Move up">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleMoveDown(m.id)} disabled={i === members.length - 1} title="Move down">
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setViewingMember(m)}>View</Button>
        <Button variant="secondary" size="sm" onClick={() => handleEdit(m)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(m.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Teachers Council">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Member' : 'Add New Member'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Designation" placeholder="e.g. Assistant Professor" required value={designation} onChange={(e) => setDesignation(e.target.value)} />
            <Input label="Position" placeholder="e.g. Member / President" value={position} onChange={(e) => setPosition(e.target.value)} />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Teachers Council Members</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'name', label: 'Name' }, { key: 'designation', label: 'Designation' },
                  { key: 'position', label: 'Position' }, { key: 'mobile', label: 'Mobile' },
                ]
                exportToExcel(members, cols, 'Teachers_Council')
              }}>Excel</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'name', label: 'Name' }, { key: 'designation', label: 'Designation' },
                  { key: 'position', label: 'Position' }, { key: 'mobile', label: 'Mobile' },
                ]
                exportToPDF(members, cols, 'Teachers Council Members', 'Teachers_Council')
              }}>PDF</Button>
            </div>
          </div>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No members added yet" onRowReorder={handleReorder} />
        </CardContent>
      </Card>

      <Modal open={!!viewingMember} onClose={() => setViewingMember(null)} title="Member Details">
        {viewingMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewingMember.photo_path ? (
                <PhotoWithPreview src={`${UPLOAD_BASE}/${viewingMember.photo_path}`} alt={viewingMember.name} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-200" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{viewingMember.name}</h3>
                  <button onClick={() => copyMemberText(viewingMember)} className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50">{copied ? 'Copied!' : 'Copy'}</button>
                </div>
                <p className="text-sm text-gray-600">{viewingMember.designation}</p>
                {viewingMember.position && <p className="text-xs text-gray-400">{viewingMember.position}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-gray-500">Designation</span><p className="text-gray-900">{viewingMember.designation}</p></div>
              <div><span className="font-medium text-gray-500">Position</span><p className="text-gray-900">{viewingMember.position || '-'}</p></div>
              <div><span className="font-medium text-gray-500">Mobile</span><p className="text-gray-900">{viewingMember.mobile || '-'}{viewingMember.mobile ? <button onClick={() => copySingle(viewingMember.mobile, 'm')} className="ml-1.5 inline align-middle text-blue-400 hover:text-blue-600">{copiedField === 'm' ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="inline h-3 w-3" />}</button> : null}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </PanelLayout>
  )
}
