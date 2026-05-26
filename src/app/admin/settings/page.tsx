'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'

export default function AdminSettingsPage() {
  const [footerText, setFooterText] = useState('')
  const [pageWidth, setPageWidth] = useState('90')

  useEffect(() => {
    api.get<{ status: number; data: { setting_key: string; setting_value: string }[] }>('/admin/settings')
      .then((res) => {
        const footer = res.data.find((s) => s.setting_key === 'footer_text')
        if (footer) setFooterText(footer.setting_value)
        const width = res.data.find((s) => s.setting_key === 'page_width')
        if (width) setPageWidth(width.setting_value)
      })
      .catch(() => {})
  }, [])

  const handleSaveFooter = () => {
    api.put('/admin/settings/footer_text', { setting_value: footerText })
      .then(() => alert('Footer text saved'))
      .catch(() => {})
  }

  const handleSaveWidth = () => {
    const val = parseInt(pageWidth, 10)
    if (val < 50 || val > 100) { alert('Page width must be between 50 and 100'); return }
    api.put('/admin/settings/page_width', { setting_value: String(val) })
      .then(() => alert('Page width saved'))
      .catch(() => {})
  }

  return (
    <PanelLayout role="admin" title="Settings">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Global Footer Text</h3>
            <p className="mb-2 text-sm text-gray-500">
              This text appears at the bottom of every public-facing page. Changing it here
              updates all pages immediately.
            </p>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
            <Button className="mt-4" onClick={handleSaveFooter}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Page Width</h3>
            <p className="mb-2 text-sm text-gray-500">
              Set the width of public-facing pages as a percentage of the screen (50–100).
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={50}
                max={100}
                value={pageWidth}
                onChange={(e) => setPageWidth(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-gray-500">%</span>
              <Button onClick={handleSaveWidth}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Site Configuration</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <p><strong>Domain:</strong> mjadc.ac.bd</p>
              <p><strong>Hosting:</strong> Namecheap Shared Hosting</p>
              <p><strong>Default Footer:</strong> {footerText}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
