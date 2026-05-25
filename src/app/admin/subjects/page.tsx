'use client'

import { useState, useEffect, Fragment } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'

interface SubjectPart {
  id: number
  subject: string
  part_name: string
  full_mark: number
  pass_mark: number
  sort_order: number
}

interface Paper {
  id: number
  name: string
  parent_id: number
  parts: SubjectPart[]
}

interface SubjectGroup {
  id: number
  name: string
  type: string
  papers: Paper[]
}

const SUBJECT_TYPES = [
  { value: 'public', label: 'Public (teacher directory)' },
  { value: 'result', label: 'Paper (exam)"' },
  { value: 'both', label: 'Both' },
]

function PartRow({ part, subject, onEdit, onDelete }: {
  part: SubjectPart
  subject: string
  onEdit: (p: SubjectPart) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm">
      <span className="min-w-[80px] font-medium text-gray-800">{part.part_name.toUpperCase()}</span>
      <span className="text-gray-500">Full: <strong>{part.full_mark}</strong></span>
      <span className="text-gray-500">Pass: <strong>{part.pass_mark}</strong></span>
      <span className="text-gray-400">Order: {part.sort_order}</span>
      <div className="ml-auto flex gap-1">
        <button onClick={() => onEdit(part)} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Edit marks">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(part.id)} className="rounded p-1 text-red-500 hover:bg-red-50" title="Delete part">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function AdminSubjectsPage() {
  const [tree, setTree] = useState<SubjectGroup[]>([])
  const [error, setError] = useState('')

  // New subject form
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('public')

  // New paper dialog
  const [addingPaperFor, setAddingPaperFor] = useState<number | null>(null)
  const [newPaperName, setNewPaperName] = useState('')

  // New part dialog
  const [addingPartFor, setAddingPartFor] = useState<string | null>(null)
  const [newPartName, setNewPartName] = useState('')
  const [newPartFull, setNewPartFull] = useState('50')
  const [newPartPass, setNewPartPass] = useState('8')

  // Edit part dialog
  const [editingPart, setEditingPart] = useState<SubjectPart | null>(null)
  const [editPartFull, setEditPartFull] = useState('')
  const [editPartPass, setEditPartPass] = useState('')

  // Rename dialog
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const fetchTree = () => {
    api.get<{ status: number; data: SubjectGroup[] }>('/admin/subjects/tree')
      .then((res) => setTree(res.data))
      .catch(() => setError('Failed to load subjects'))
  }

  useEffect(() => { fetchTree() }, [])

  const handleCreateSubject = async () => {
    setError('')
    const name = newName.trim()
    if (!name) { setError('Subject name required'); return }
    try {
      await api.post('/admin/subjects', { name, type: newType })
      setNewName('')
      fetchTree()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Delete this subject and unlink all its papers?')) return
    try {
      await api.delete(`/admin/subjects/${id}`)
      fetchTree()
    } catch { setError('Delete failed') }
  }

  const handleDeletePaper = async (id: number) => {
    if (!confirm('Delete this paper?')) return
    try {
      await api.delete(`/admin/subjects/${id}`)
      fetchTree()
    } catch { setError('Delete failed') }
  }

  const handleAddPaper = async (parentId: number) => {
    if (!newPaperName.trim()) return
    try {
      await api.post('/admin/subjects', {
        name: newPaperName.trim(),
        type: 'result',
        parent_id: parentId,
      })
      setNewPaperName('')
      setAddingPaperFor(null)
      fetchTree()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleAddPart = async () => {
    if (!addingPartFor || !newPartName.trim()) return
    try {
      await api.post('/admin/subject-parts', {
        subject: addingPartFor,
        part_name: newPartName.trim(),
        full_mark: Number(newPartFull) || 0,
        pass_mark: Number(newPartPass) || 0,
        sort_order: 99,
      })
      setNewPartName('')
      setNewPartFull('50')
      setNewPartPass('8')
      setAddingPartFor(null)
      fetchTree()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleEditPart = async () => {
    if (!editingPart) return
    try {
      await api.put(`/admin/subject-parts/${editingPart.id}`, {
        full_mark: Number(editPartFull) || 0,
        pass_mark: Number(editPartPass) || 0,
      })
      setEditingPart(null)
      fetchTree()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDeletePart = async (id: number) => {
    if (!confirm('Delete this part?')) return
    try {
      await api.delete(`/admin/subject-parts/${id}`)
      fetchTree()
    } catch { setError('Delete failed') }
  }

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return
    try {
      await api.put(`/admin/subjects/${renaming.id}`, { name: renameValue.trim() })
      setRenaming(null)
      fetchTree()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <PanelLayout role="admin" title="Subject & Paper Configuration">
      {/* New Subject */}
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Add New Subject Group</h3>
          <p className="text-xs text-gray-500">
            Create a subject (e.g. Bangla, English), then add papers (e.g. Bangla-1, Bangla-2) under it.
            Each paper can have mark distribution parts (MCQ, CQ, Practical).
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input label="Subject Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Bangla" />
            </div>
            <div className="w-56">
              <Select label="Type" options={SUBJECT_TYPES} value={newType} onChange={(e) => setNewType(e.target.value)} />
            </div>
            <Button variant="primary" onClick={handleCreateSubject}>
              <Plus className="mr-1 h-4 w-4" /> Add Subject
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Subject Tree */}
      {tree.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-gray-400">No subjects yet. Add one above.</CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {tree.map((group) => (
          <Card key={group.id}>
            <CardContent className="pt-6">
              {/* Subject header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Public</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setRenaming({ id: group.id, name: group.name }); setRenameValue(group.name) }}>
                    <Edit3 className="mr-1 h-3.5 w-3.5" /> Rename
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteSubject(group.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>

              {/* Papers */}
              {group.papers.length > 0 ? (
                <div className="ml-4 space-y-4 border-l-2 border-blue-200 pl-4">
                  {group.papers.map((paper) => (
                    <div key={paper.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-medium text-gray-800">{paper.name}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Paper</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setRenaming({ id: paper.id, name: paper.name }); setRenameValue(paper.name) }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeletePaper(paper.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Parts */}
                      <div className="ml-4 space-y-2 border-l-2 border-amber-200 pl-4">
                        {paper.parts.map((part) => (
                          <PartRow
                            key={part.id}
                            part={part}
                            subject={paper.name}
                            onEdit={(p) => { setEditingPart(p); setEditPartFull(String(p.full_mark)); setEditPartPass(String(p.pass_mark)) }}
                            onDelete={handleDeletePart}
                          />
                        ))}
                        <button
                          onClick={() => { setAddingPartFor(paper.name); setNewPartName(''); setNewPartFull('50'); setNewPartPass('8') }}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Part
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ml-4 text-sm text-gray-400">No papers yet. Add one below, or mark as N/A for single-paper subjects.</p>
              )}

              {/* Add paper */}
              <div className="ml-4 mt-4">
                {addingPaperFor === group.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="w-48 rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="e.g. Bangla-1"
                      value={newPaperName}
                      onChange={(e) => setNewPaperName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPaper(group.id)}
                      autoFocus
                    />
                    <Button size="sm" variant="primary" onClick={() => handleAddPaper(group.id)}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingPaperFor(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setAddingPaperFor(group.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Add Paper
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rename dialog */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRenaming(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Rename</h3>
            <Input label="New name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus />
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={handleRename}>Save</Button>
              <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit part dialog */}
      {editingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingPart(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Edit {editingPart.part_name.toUpperCase()} — {editingPart.subject}
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Input label="Full Mark" type="number" value={editPartFull} onChange={(e) => setEditPartFull(e.target.value)} />
                <Input label="Pass Mark" type="number" value={editPartPass} onChange={(e) => setEditPartPass(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={handleEditPart}>Save</Button>
              <Button variant="ghost" onClick={() => setEditingPart(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add part dialog */}
      {addingPartFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setAddingPartFor(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Add Part for <span className="text-blue-600">{addingPartFor}</span>
            </h3>
            <div className="space-y-3">
              <Input label="Part Name" value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="e.g. CQ, MCQ, Practical" />
              <div className="flex gap-3">
                <Input label="Full Mark" type="number" value={newPartFull} onChange={(e) => setNewPartFull(e.target.value)} />
                <Input label="Pass Mark" type="number" value={newPartPass} onChange={(e) => setNewPartPass(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={handleAddPart}>Add Part</Button>
              <Button variant="ghost" onClick={() => setAddingPartFor(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
