'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

export default function AdminPageNew() {
  const router = useRouter()
  const [pageKey, setPageKey] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!pageKey.trim() || !content.trim()) return
    setSaving(true)
    try {
      await api.post('/admin/pages', { page_key: pageKey.trim(), title: title.trim() || null, content })
      router.push(`/p_Xk7mN/pages/${pageKey.trim()}`)
    } catch (e: any) {
      alert(e.message || 'Failed to create page')
    }
    setSaving(false)
  }

  return (
    <PanelLayout role="admin" title="Create New Page">
      <div className="mx-auto w-4/5">
        <Card>
        <CardContent className="space-y-4 pt-6">
          <Input label="Page Key" placeholder="e.g. history" value={pageKey} onChange={(e) => setPageKey(e.target.value)} />
          <Input label="Page Title (optional)" placeholder="Page title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Content" rows={16} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleCreate} disabled={!pageKey.trim() || !content.trim() || saving}>
              {saving ? 'Creating...' : 'Create Page'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/p_Xk7mN/pages')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </PanelLayout>
  )
}
