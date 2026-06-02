'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, Select } from '@/components/ui'
import { Save, Image, Trash2, Link as LinkIcon, Plus, GripVertical } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'

export default function AdminSettingsPage() {
  const [footerText, setFooterText] = useState('')
  const [pageWidth, setPageWidth] = useState('90')
  const [collegePhoto, setCollegePhoto] = useState('')
  const [collegePhotoFile, setCollegePhotoFile] = useState<File | null>(null)
  const [heroImages, setHeroImages] = useState<string[]>([])
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroInterval, setHeroInterval] = useState('2')
  const [homeLinkLabel, setHomeLinkLabel] = useState('')
  const [homeLinkUrl, setHomeLinkUrl] = useState('')
  const [menuSections, setMenuSections] = useState<{ title: string; titleSize: string; titleColor: string; titleStyle: string; titleAlign: string; bgColor: string; links: { label: string; url: string }[] }[]>(
    Array.from({ length: 3 }, () => ({ title: '', titleSize: 'text-lg', titleColor: '#111827', titleStyle: 'font-bold', titleAlign: 'text-left', bgColor: '#ffffff', links: [{ label: '', url: '' }] }))
  )

  useEffect(() => {
    api.get<{ status: number; data: { setting_key: string; setting_value: string }[] }>('/admin/settings')
      .then((res) => {
        const footer = res.data.find((s) => s.setting_key === 'footer_text')
        if (footer) setFooterText(footer.setting_value)
        const width = res.data.find((s) => s.setting_key === 'page_width')
        if (width) setPageWidth(width.setting_value)
        const photo = res.data.find((s) => s.setting_key === 'college_photo')
        if (photo) setCollegePhoto(photo.setting_value)
        const hero = res.data.find((s) => s.setting_key === 'hero_images')
        if (hero) {
          try { const parsed = JSON.parse(hero.setting_value); if (Array.isArray(parsed)) setHeroImages(parsed) }
          catch { setHeroImages([]) }
        }
        const interval = res.data.find((s) => s.setting_key === 'hero_interval')
        if (interval) setHeroInterval(interval.setting_value)
        const hll = res.data.find((s) => s.setting_key === 'homepage_link_label')
        if (hll) setHomeLinkLabel(hll.setting_value)
        const hlu = res.data.find((s) => s.setting_key === 'homepage_link_url')
        if (hlu) setHomeLinkUrl(hlu.setting_value)
        const ms = res.data.find((s) => s.setting_key === 'homepage_menu_sections')
        if (ms) {
          try { const parsed = JSON.parse(ms.setting_value); if (Array.isArray(parsed) && parsed.length === 3) setMenuSections(parsed) }
          catch {}
        }
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
            <h3 className="mb-4 text-lg font-semibold text-gray-900">College Photo</h3>
            <p className="mb-2 text-sm text-gray-500">
              Upload the photo displayed in the &quot;About the College&quot; section on the home page.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {collegePhoto && (
                  <img src={`${UPLOAD_BASE}/${collegePhoto}`} alt="College" className="h-40 w-full max-w-xs rounded-lg border object-cover" />
                )}
                <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setCollegePhotoFile(e.target.files?.[0] || null)} />
                <Button onClick={async () => {
                  if (!collegePhotoFile) { alert('Select a file first'); return }
                  const formData = new FormData()
                  formData.append('file', collegePhotoFile)
                  formData.append('directory', 'gallery')
                  const res: any = await api.upload('/admin/media/upload', formData)
                  if (!res.data?.path) { alert('Upload failed'); return }
                  await api.put('/admin/settings/college_photo', { setting_value: res.data.path })
                  setCollegePhoto(res.data.path)
                  setCollegePhotoFile(null)
                  alert('College photo saved')
                }}>
                  <Image className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Hero Slider Images</h3>
            <p className="mb-2 text-sm text-gray-500">
              Images for the top banner slider. They auto-change every 2 seconds on the home page.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {heroImages.map((img, i) => (
                <div key={i} className="relative h-24 w-40 rounded-lg border overflow-hidden group">
                  <img src={`${UPLOAD_BASE}/${img}`} alt="" className="h-full w-full object-cover" />
                  <button onClick={async () => {
                    const updated = heroImages.filter((_, j) => j !== i)
                    await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(updated) })
                    setHeroImages(updated)
                  }} className="absolute top-1 right-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
              <Button onClick={async () => {
                if (!heroFile) { alert('Select a file first'); return }
                const formData = new FormData()
                formData.append('file', heroFile)
                formData.append('directory', 'gallery')
                const res: any = await api.upload('/admin/media/upload', formData)
                if (!res.data?.path) { alert('Upload failed'); return }
                const updated = [...heroImages, res.data.path]
                await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(updated) })
                setHeroImages(updated)
                setHeroFile(null)
                alert('Hero image added')
              }}>
                <Image className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-gray-600">Slide interval (seconds):</label>
              <Input type="number" min={1} max={60} value={heroInterval} onChange={(e) => setHeroInterval(e.target.value)} className="w-20" />
              <Button onClick={async () => {
                const val = parseInt(heroInterval, 10)
                if (val < 1) { alert('Minimum 1 second'); return }
                await api.put('/admin/settings/hero_interval', { setting_value: String(val) })
                alert('Interval saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Homepage Quick Menu Sections</h3>
            <p className="mb-4 text-sm text-gray-500">
              Manage the 3-column link section on the homepage. Each column has a title, title size, and multiple links.
            </p>
            <div className="space-y-6">
              {menuSections.map((section, si) => (
                <div key={si} className="rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">Section {si + 1}</h4>
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <Input label="Section Title" placeholder="e.g. Academics" value={section.title}
                      onChange={(e) => {
                        const copy = [...menuSections]
                        copy[si] = { ...copy[si], title: e.target.value }
                        setMenuSections(copy)
                      }}
                    />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Size</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleSize}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleSize: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="text-sm">Small</option>
                        <option value="text-base">Normal</option>
                        <option value="text-lg">Large</option>
                        <option value="text-xl">Extra Large</option>
                        <option value="text-2xl">2XL</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={section.titleColor}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si] = { ...copy[si], titleColor: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-xs text-gray-500">{section.titleColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Style</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleStyle}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleStyle: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="font-normal">Normal</option>
                        <option value="font-bold">Bold</option>
                        <option value="italic">Italic</option>
                        <option value="font-bold italic">Bold Italic</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Alignment</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleAlign}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleAlign: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="text-left">Left</option>
                        <option value="text-center">Center</option>
                        <option value="text-right">Right</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Section Background</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={section.bgColor}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si] = { ...copy[si], bgColor: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-xs text-gray-500">{section.bgColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {section.links.map((link, li) => (
                      <div key={li} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                        <Input placeholder="Link text" value={link.label}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si].links[li] = { ...copy[si].links[li], label: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="flex-1"
                        />
                        <Input placeholder="URL" value={link.url}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si].links[li] = { ...copy[si].links[li], url: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="flex-1"
                        />
                        <button onClick={() => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], links: copy[si].links.filter((_, j) => j !== li) }
                          setMenuSections(copy)
                        }} className="rounded-md p-1 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => {
                      const copy = [...menuSections]
                      copy[si] = { ...copy[si], links: [...copy[si].links, { label: '', url: '' }] }
                      setMenuSections(copy)
                    }}>
                      <Plus className="mr-1 h-3 w-3" /> Add Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={async () => {
              await api.put('/admin/settings/homepage_menu_sections', { setting_value: JSON.stringify(menuSections) })
              alert('Quick menu sections saved')
            }}>
              <Save className="mr-2 h-4 w-4" /> Save All Sections
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Homepage Custom Link</h3>
            <p className="mb-2 text-sm text-gray-500">
              A link shown between Gallery and Quick Links on the homepage. Leave blank to hide.
            </p>
            <div className="flex items-start gap-3">
              <LinkIcon className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1 space-y-3">
                <Input label="Link Text" placeholder="e.g. Admission 2026" value={homeLinkLabel} onChange={(e) => setHomeLinkLabel(e.target.value)} />
                <Input label="Link URL" placeholder="e.g. /admission or https://example.com" value={homeLinkUrl} onChange={(e) => setHomeLinkUrl(e.target.value)} />
              </div>
            </div>
            <Button className="mt-4" onClick={async () => {
              await api.put('/admin/settings/homepage_link_label', { setting_value: homeLinkLabel })
              await api.put('/admin/settings/homepage_link_url', { setting_value: homeLinkUrl })
              alert('Homepage link saved')
            }}>
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
