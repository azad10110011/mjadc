'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, Paperclip, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { api, UPLOAD_BASE } from '@/lib/api'
import type { Notice } from '@/types'
import { PageContainer } from '@/components/ui/PageContainer'

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.get<{ data: Notice[] }>('/notices').then((res) => {
      setNotices(res.data)
    }).catch(() => {})
  }, [])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageContainer>
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Notice Board</h1>
      <div className="space-y-4">
        {notices.map((notice) => (
          <div key={notice.id}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <button onClick={() => toggleExpand(notice.id)} className="w-full text-left">
                  <h2 className="font-semibold text-gray-900">{notice.title}</h2>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(notice.published_at)}</span>
                    {notice.pdf_path && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> PDF</span>}
                    <span className="flex items-center gap-1 text-blue-600">
                      {expanded.has(notice.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {expanded.has(notice.id) ? 'Less' : 'Details'}
                    </span>
                  </div>
                </button>
                {expanded.has(notice.id) && (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    {notice.body && (
                      <div className="text-sm text-gray-700 whitespace-pre-line">{notice.body}</div>
                    )}
                    {notice.pdf_path && (
                      <a
                        href={`${UPLOAD_BASE}/${notice.pdf_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        <Download className="h-3 w-3" /> Download PDF
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {notices.length === 0 && (
          <p className="py-8 text-center text-gray-500">No notices published yet.</p>
        )}
      </div>
    </PageContainer>
  )
}
