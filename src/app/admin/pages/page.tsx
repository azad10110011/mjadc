'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

interface PageItem {
  id: number
  page_key: string
  title: string | null
  content: string
  updated_at: string
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      const res = await api.get<{ status: number; data: PageItem[] }>('/admin/pages')
      setPages(res.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <PanelLayout role="admin" title="All Pages">
      <div className="mx-auto w-4/5">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">{loading ? 'Loading...' : `${pages.length} page(s)`}</p>
          <Link href="/admin/pages/new">
            <Button variant="primary">Create New Page</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading pages...</p>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No pages found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <Link key={page.page_key} href={`/admin/pages/${page.page_key}`}>
                <Card className="transition-colors hover:border-blue-300 hover:shadow-sm cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">{page.page_key}</span>
                      <span className="font-medium text-gray-900">{page.title || page.page_key}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : ''}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  )
}
