'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { PhotoWithPreview } from '@/components/ui/PhotoWithPreview'
import { UserPlus } from 'lucide-react'

const CLUBS = [
  { slug: 'bncc', name: 'BNCC' },
  { slug: 'rover-scout', name: 'Rover Scout' },
  { slug: 'science-club', name: 'Science Club' },
  { slug: 'debating-club', name: 'Debating Club' },
]

interface Member {
  id: number
  club: string
  name: string
  designation: string
  mobile: string
  photo_path: string | null
}

export default function AdminCoCurricularPage() {
  const [selectedClub, setSelectedClub] = useState(CLUBS[0].slug)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [mobile, setMobile] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null); setName(''); setDesignation(''); setMobile('')
    setPhotoFile(null); setExistingPhotoPath(null)
  }

  const fetchMembers = () => {
    setLoading(true)
    api.get(`/admin/co-curricular/${selectedClub}`).then((r: any) => setMembers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [selectedClub])

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
        await api.put(`/admin/co-curricular/${selectedClub}/${editingId}`, {
          name, designation, mobile: mobile || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      } else {
        await api.post(`/admin/co-curricular/${selectedClub}`, {
          name, designation, mobile: mobile || undefined,
          ...(photoPath && { photo_path: photoPath }),
        })
      }
      resetForm()
      const r: any = await api.get(`/admin/co-curricular/${selectedClub}`)
      setMembers(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (m: Member) => {
    setEditingId(m.id); setName(m.name); setDesignation(m.designation)
    setMobile(m.mobile || ''); setExistingPhotoPath(m.photo_path || null); setPhotoFile(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this member?')) return
    api.delete(`/admin/co-curricular/${selectedClub}/${id}`).then(() => fetchMembers()).catch(() => {})
  }

  const columns = [
    { key: 'sl', label: 'SL' },
    { key: 'photo', label: 'Photo' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = members.map((m, i) => ({
    ...m,
    sl: i + 1,
    photo: m.photo_path ? <PhotoWithPreview src={`${UPLOAD_BASE}/${m.photo_path}`} alt={m.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-gray-200" />,
    actions: (
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" onClick={() => handleEdit(m)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(m.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Co-Curricular Clubs">
      <Card className="mb-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              {editingId ? 'Edit Member' : 'Add New Member'} — {CLUBS.find((c) => c.slug === selectedClub)?.name}
            </h3>
            {editingId && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
          </div>
          <Select
            label="Club"
            options={CLUBS.map((c) => ({ value: c.slug, label: c.name }))}
            value={selectedClub}
            onChange={(e) => { setSelectedClub(e.target.value); resetForm() }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Designation" placeholder="e.g. Moderator" required value={designation} onChange={(e) => setDesignation(e.target.value)} />
            <Input label="Mobile" placeholder="01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Input label="Picture" type="file" accept=".png,.jpg" key={editingId ?? selectedClub} onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">{CLUBS.find((c) => c.slug === selectedClub)?.name} Members</h3>
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No members added yet" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
