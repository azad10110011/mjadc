'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { Save, Type } from 'lucide-react'
import { api } from '@/lib/api'

const FONT_SIZES = [
  { label: 'Extra Small', value: 'text-xs' },
  { label: 'Small', value: 'text-sm' },
  { label: 'Base', value: 'text-base' },
  { label: 'Large', value: 'text-lg' },
  { label: 'Extra Large', value: 'text-xl' },
  { label: '2X Large', value: 'text-2xl' },
]

const FONT_STYLES = [
  { label: 'Normal', value: 'font-normal' },
  { label: 'Medium', value: 'font-medium' },
  { label: 'Semibold', value: 'font-semibold' },
  { label: 'Bold', value: 'font-bold' },
]

interface FontSetting {
  fontSize: string
  fontStyle: string
}

type PageFontSettings = Record<string, FontSetting>

const PUBLIC_PAGES: { category: string; pages: { label: string; path: string }[] }[] = [
  {
    category: 'Home',
    pages: [{ label: 'Homepage', path: '/' }],
  },
  {
    category: 'About',
    pages: [
      { label: 'About MJADC', path: '/about' },
      { label: 'Academic Approval', path: '/about/academic-approval' },
    ],
  },
  {
    category: 'Administration',
    pages: [
      { label: 'Principal & Vice-Principal', path: '/administration/principal' },
      { label: 'Governing Body', path: '/administration/governing-body' },
      { label: "Teacher's Council", path: '/administration/teachers-council' },
      { label: "Teacher's List", path: '/administration/teachers-list' },
      { label: 'Staff List', path: '/administration/staff-list' },
    ],
  },
  {
    category: 'Academic',
    pages: [
      { label: 'Student Info', path: '/academic/student-info' },
      { label: 'Class Routine', path: '/academic/routine' },
      { label: 'Syllabus', path: '/academic/syllabus' },
      { label: 'Results', path: '/academic/results' },
      { label: 'Scholarship Info', path: '/academic/scholarship' },
      { label: 'Form Downloads', path: '/academic/forms' },
      { label: 'Annual Reports', path: '/academic/annual-reports' },
      { label: 'Career Club', path: '/academic/career-club' },
    ],
  },
  {
    category: 'Admission',
    pages: [
      { label: 'Admission', path: '/admission' },
    ],
  },
  {
    category: 'Departments',
    pages: [
      { label: 'Science', path: '/departments/science' },
      { label: 'Business Studies', path: '/departments/business-studies' },
      { label: 'Humanities', path: '/departments/humanities' },
      { label: 'BMT', path: '/departments/bmt' },
    ],
  },
  {
    category: 'Co-Curriculum',
    pages: [
      { label: 'BNCC', path: '/co-curricular/bncc' },
      { label: 'Rover Scout', path: '/co-curricular/rover-scout' },
      { label: 'Science Club', path: '/co-curricular/science-club' },
      { label: 'Debating Club', path: '/co-curricular/debating-club' },
    ],
  },
  {
    category: 'Other',
    pages: [
      { label: 'Contact Us', path: '/contact' },
      { label: 'Notices', path: '/notices' },
      { label: 'Notice Detail', path: '/notices' },
      { label: 'Pay Fees', path: '/pay-fees' },
      { label: 'Events', path: '/events' },
      { label: 'Gallery', path: '/gallery' },
      { label: 'Student Login', path: '/student/login' },
    ],
  },
]

const DEFAULT_SETTING: FontSetting = { fontSize: 'text-base', fontStyle: 'font-normal' }

export default function AdminFontSettingsPage() {
  const [settings, setSettings] = useState<PageFontSettings>({})

  useEffect(() => {
    api.get<{ status: number; data: { setting_key: string; setting_value: string }[] }>('/admin/settings')
      .then((res) => {
        const entry = res.data.find((s) => s.setting_key === 'page_font_settings')
        if (entry) {
          try {
            const parsed = JSON.parse(entry.setting_value)
            setSettings(parsed)
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  const updateSetting = (path: string, field: keyof FontSetting, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [path]: { ...(prev[path] || DEFAULT_SETTING), [field]: value },
    }))
  }

  const handleSave = async () => {
    await api.put('/admin/settings/page_font_settings', { setting_value: JSON.stringify(settings) })
    alert('Font settings saved')
  }

  return (
    <PanelLayout role="admin" title="Font Settings">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Type className="h-5 w-5" /> Page Font Settings
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure font size and style for each public page individually.
              </p>
            </div>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save All</Button>
          </div>

          {PUBLIC_PAGES.map((group) => (
            <div key={group.category} className="border-t border-gray-300 pt-6">
              <h4 className="text-base font-semibold text-blue-700 mb-4">{group.category}</h4>
              <div className="space-y-4">
                {group.pages.map((page) => {
                  const setting = settings[page.path] || DEFAULT_SETTING
                  return (
                    <div key={page.path} className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 w-44">{page.label}</span>
                      <span className="text-xs text-gray-400 w-32 truncate">{page.path}</span>
                      <select
                        value={setting.fontSize}
                        onChange={(e) => updateSetting(page.path, 'fontSize', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <select
                        value={setting.fontStyle}
                        onChange={(e) => updateSetting(page.path, 'fontStyle', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {FONT_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <span className="text-xs text-gray-400">
                        Preview: <span className={`${setting.fontSize} ${setting.fontStyle}`}>{page.label}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
