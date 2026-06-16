'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

export default function AdminPageEditClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!slug) return
    api.get<{ status: number; data: { page_key: string; title: string | null; content: string } }>(`/pages/${slug}`)
      .then((res) => {
        setTitle(res.data.title || '')
        setContent(res.data.content)
      })
      .catch(() => { /* page may not exist yet — show empty form */ })
      .finally(() => setLoading(false))
  }, [slug, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/pages/${slug}`, { title, content })
      router.push('/p_Xk7mN/pages')
    } catch {
      try {
        await api.post('/admin/pages', { page_key: slug, title, content })
        router.push('/p_Xk7mN/pages')
      } catch {
        alert('Failed to save')
      }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete page "${slug}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/pages/${slug}`)
      router.push('/p_Xk7mN/pages')
    } catch {
      alert('Failed to delete')
    }
  }

  return (
    <PanelLayout role="admin" title={`Edit: ${slug}`}>
      <div className="mx-auto w-4/5">
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">{slug}</span>
              <Input className="w-80" value={title} placeholder="Page title" onChange={(e) => setTitle(e.target.value)} />
            </div>
            <Textarea rows={20} value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button variant="outline" onClick={() => router.push('/p_Xk7mN/pages')}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} className="ml-auto">Delete Page</Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </PanelLayout>
  )
}
