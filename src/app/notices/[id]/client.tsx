'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { api, UPLOAD_BASE } from '@/lib/api'
import type { Notice } from '@/types'

export default function NoticeDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParams<{ id: string }>()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Notice }>(`/notices/${id}`)
      .then((res) => setNotice(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/notices" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Notices
        </Link>
        <p className="text-center text-gray-500">Notice not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/notices" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Notices
      </Link>
      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <FileText className="mt-1 h-6 w-6 shrink-0 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{notice.title}</h1>
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4" /> {formatDate(notice.published_at)}
            </div>
          </div>
        </div>
        {notice.body && (
          <div className="prose prose-gray max-w-none border-t border-gray-100 pt-4 text-gray-700 whitespace-pre-line">
            {notice.body}
          </div>
        )}
        {notice.pdf_path && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <a
              href={`${UPLOAD_BASE}/${notice.pdf_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        )}
      </article>
    </div>
  )
}
