'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface DynamicContentProps {
  pageKey: string
  className?: string
}

export function DynamicContent({ pageKey, className = '' }: DynamicContentProps) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ status: number; data: { content: string } }>(`/pages/${pageKey}`)
      .then((res) => { if (res?.data?.content) setHtml(res.data.content) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pageKey])

  if (loading) return <div className="animate-pulse space-y-2"><div className="h-4 w-3/4 rounded bg-gray-200" /><div className="h-4 w-1/2 rounded bg-gray-200" /></div>
  if (!html) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
