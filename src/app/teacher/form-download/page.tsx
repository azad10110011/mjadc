'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { FileDown } from 'lucide-react'
import { api } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api'

export default function TeacherFormDownloadPage() {
  const [forms, setForms] = useState<any[]>([])

  useEffect(() => {
    api.get('/teacher/forms').then((r: any) => setForms(r.data || [])).catch(() => {})
  }, [])

  return (
    <PanelLayout role="teacher" title="Form Download">
      <Card>
        <CardContent className="space-y-3 pt-6">
          {forms.length === 0 ? (
            <p className="text-center text-sm text-gray-500">No forms available</p>
          ) : (
            forms.map((f) => (
              <a key={f.id} href={f.pdf_path ? `${API_BASE}/${f.pdf_path}` : '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300">
                <span className="font-medium text-gray-900">{f.form_name}</span>
                <FileDown className="h-5 w-5 text-blue-600" />
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
