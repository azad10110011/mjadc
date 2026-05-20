'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'

export default function AdminSettingsPage() {
  const [footerText, setFooterText] = useState('')

  useEffect(() => {
    api.get<{ status: number; data: { setting_key: string; setting_value: string }[] }>('/admin/settings')
      .then((res) => {
        const footer = res.data.find((s) => s.setting_key === 'footer_text')
        if (footer) setFooterText(footer.setting_value)
      })
      .catch(() => {})
  }, [])

  const handleSave = () => {
    api.put('/admin/settings/footer_text', { setting_value: footerText })
      .then(() => alert('Footer text saved'))
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
            <Button className="mt-4" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
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
