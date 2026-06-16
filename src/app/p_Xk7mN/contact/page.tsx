'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Textarea, Card, CardContent } from '@/components/ui'
import { Save, MapPin, Phone, Mail, Map } from 'lucide-react'
import { api } from '@/lib/api'

export default function AdminContactPage() {
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [map, setMap] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ status: number; data: { address: string; phone: string; email: string; map: string } }>('/admin/contact')
      .then((res) => {
        setAddress(res.data.address || '')
        setPhone(res.data.phone || '')
        setEmail(res.data.email || '')
        setMap(res.data.map || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    api.put('/admin/contact', { address, phone, email, map })
      .then(() => alert('Contact info saved'))
      .catch(() => alert('Failed to save'))
  }

  return (
    <PanelLayout role="admin" title="Contact Info">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
            <p className="mb-4 text-sm text-gray-500">
              Manage the address, phone, email, and Google Map embed URL shown on the Contact Us page.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <Textarea label="Address" placeholder="Full college address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <Input label="Phone" placeholder="Contact phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <Input label="Email" placeholder="contact@mjadc.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Map className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <Textarea label="Google Map Embed Code" placeholder="Paste the full iframe embed code or just the embed URL..." value={map} onChange={(e) => setMap(e.target.value)} />
                <p className="mt-1 text-xs text-gray-400">
                  Paste the full embed code from Google Maps &quot;Share&quot; &rarr; &quot;Embed a map&quot;.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" /> Save Contact Info
            </Button>
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
