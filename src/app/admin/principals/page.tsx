'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { ArrowUp, ArrowDown, UserPlus } from 'lucide-react'
import type { Principal } from '@/types'

export default function AdminPrincipalsPage() {
  const [members, setMembers] = useState<Principal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [message, setMessage] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null); setName(''); setDesignation(''); setMessage('')
    setPhotoFile(null); setExistingPhotoPath(null)
  }

  const fetchMembers = () => {
    api.get('/admin/principals').then((r: any) => setMembers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
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
        await api.put(`/admin/principals/${editingId}`, {
          name, designation, message: message || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      } else {
        await api.post('/admin/principals', {
          name, designation, message: message || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      }
      resetForm()
      const r: any = await api.get('/admin/principals')
      setMembers(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (m: Principal) => {
    setEditingId(m.id); setName(m.name); setDesignation(m.designation)
    setMessage(m.message || ''); setExistingPhotoPath(m.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this member?')) return
    api.delete(`/admin/principals/${id}`).then(() => fetchMembers()).catch(() => {})
  }

  const handleMoveUp = (id: number) => {
    api.post(`/admin/principals/${id}/move-up`, {}).then(() => fetchMembers()).catch(() => {})
  }

  const handleMoveDown = (id: number) => {
    api.post(`/admin/principals/${id}/move-down`, {}).then(() => fetchMembers()).catch(() => {})
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = members.map((m, i) => ({
    ...m,
    sl: i + 1,
    photo: m.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${m.photo_path}`} alt={m.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => handleMoveUp(m.id)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleMoveDown(m.id)} disabled={i === members.length - 1}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" onClick={() => handleEdit(m)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(m.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Principal & Vice-Principal">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Member' : 'Add New Member'}</h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Designation" placeholder="e.g. Principal / Vice-Principal" required value={designation} onChange={(e) => setDesignation(e.target.value)} />
            <div className="sm:col-span-2">
              <Textarea label="Message / Speech" placeholder="Optional message" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? 'new'} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Principal & Vice-Principal</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No members added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
