'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'

interface MenuItem {
  label: string
  url?: string
  children?: MenuItem[]
}

const DEFAULT_MENU: MenuItem[] = [
  { label: 'Homepage', url: '/' },
  { label: 'About Us', children: [
    { label: 'About MJADC', url: '/about' },
    { label: 'Achievement', url: '/achievements' },
    { label: 'Academic Approval', url: '/about/academic-approval' },
  ]},
  { label: 'Administration', children: [
    { label: 'Principal & Vice-Principal', url: '/administration/principal' },
    { label: 'Governing Body', url: '/administration/governing-body' },
    { label: "Teacher's Council", url: '/administration/teachers-council' },
    { label: "Teacher's List", url: '/administration/teachers-list' },
    { label: 'Staff List', url: '/administration/staff-list' },
  ]},
  { label: 'Academic', children: [
    { label: 'Student Info', url: '/academic/student-info' },
    { label: 'Class Routine', url: '/academic/routine' },
    { label: 'Syllabus', url: '/academic/syllabus' },
    { label: 'Results', url: '/academic/results' },
    { label: 'Scholarship Info', url: '/academic/scholarship' },
    { label: 'Form Downloads', url: '/academic/forms' },
    { label: 'Annual Reports', url: '/academic/annual-reports' },
    { label: 'Career Club', url: '/academic/career-club' },
  ]},
  { label: 'Admission', children: [
    { label: '11th', url: '/admission?programme=11th' },
    { label: '12th Class', url: '/admission?programme=12th' },
    { label: 'Degree (Pass)', url: '/admission?programme=degree' },
  ]},
  { label: 'Departments', children: [
    { label: 'Science', url: '/departments/science' },
    { label: 'Business Studies', url: '/departments/business-studies' },
    { label: 'Humanities', url: '/departments/humanities' },
    { label: 'General', url: '/departments/general' },
    { label: 'BMT', url: '/departments/bmt' },
  ]},
  { label: 'Co-Curriculum', children: [
    { label: 'BNCC', url: '/co-curricular/bncc' },
    { label: 'Rover Scout', url: '/co-curricular/rover-scout' },
    { label: 'Science Club', url: '/co-curricular/science-club' },
    { label: 'Debating Club', url: '/co-curricular/debating-club' },
    { label: 'Gallery', url: '/gallery' },
  ]},
  { label: 'Contact Us', url: '/contact' },
  { label: 'Notices', url: '/notices' },
  { label: 'Pay Fees', url: '/pay-fees' },
  { label: 'Student Login', url: '/p_G9n4s/login' },
]

const resp = (val: string, min = 0.6, max = 1.5) => {
  const v = parseFloat(val)
  return v ? `clamp(${Math.round(v * min)}px, ${(v / 19.2).toFixed(2)}vw, ${Math.round(v * max)}px)` : undefined
}

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU)
  const [navWidth, setNavWidth] = useState(100)
  const [navFontSize, setNavFontSize] = useState('')
  const [navAlign, setNavAlign] = useState('right')
  const [hamburgerBg, setHamburgerBg] = useState('rgba(255,255,255,0.15)')
  const [hamburgerPos, setHamburgerPos] = useState('right')
  const [menuBg, setMenuBg] = useState('#1e3a5f')
  const [menuTextColor, setMenuTextColor] = useState('#ffffff')
  const [menuHoverColor, setMenuHoverColor] = useState('#2563eb')
  const [menuActiveColor, setMenuActiveColor] = useState('#1d4ed8')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const keys = ['nav_width', 'nav_align', 'nav_font_size', 'nav_menu', 'hamburger_bg', 'hamburger_pos', 'menu_bg', 'menu_text_color', 'menu_hover_color', 'menu_active_color']
    Promise.all(keys.map((k) =>
      api.get<{ data: { setting_value: string } }>(`/settings/${k}`).then((r) => ({ key: k, value: r.data?.setting_value })).catch(() => ({ key: k, value: null }))
    )).then((results) => {
      for (const r of results) {
        if (!r.value) continue
        if (r.key === 'nav_menu') { try { const p = JSON.parse(r.value); if (Array.isArray(p) && p.length > 0) setMenuItems(p) } catch {} }
        if (r.key === 'menu_bg') setMenuBg(r.value)
        if (r.key === 'menu_text_color') setMenuTextColor(r.value)
        if (r.key === 'menu_hover_color') setMenuHoverColor(r.value)
        if (r.key === 'menu_active_color') setMenuActiveColor(r.value)
        if (r.key === 'nav_width') { const v = parseInt(r.value, 10); if (v >= 20 && v <= 100) setNavWidth(v) }
        if (r.key === 'nav_align') setNavAlign(r.value)
        if (r.key === 'nav_font_size') setNavFontSize(r.value)
        if (r.key === 'hamburger_bg') setHamburgerBg(r.value)
        if (r.key === 'hamburger_pos') setHamburgerPos(r.value)
      }
    })
  }, [])

  useEffect(() => {
    const el = document.querySelector('nav')
    if (!el) return
    const sync = () => { (el as HTMLElement).style.width = `${document.documentElement.scrollWidth}px` }
    sync()
    const timer = setInterval(sync, 200)
    const stop = setTimeout(() => clearInterval(timer), 3000)
    window.addEventListener('resize', sync)
    return () => { clearInterval(timer); clearTimeout(stop); window.removeEventListener('resize', sync) }
  }, [])

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenDropdown(label)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150)
  }

  const renderMenu = (items: MenuItem[], isSub = false) =>
    items.map((item) => {
      const hasChildren = item.children && item.children.length > 0
      return (
        <div key={item.label} className="relative" onMouseEnter={isSub ? undefined : () => handleMouseEnter(item.label)} onMouseLeave={isSub ? undefined : handleMouseLeave}>
          <Link
            href={item.url || '#'}
            className="flex items-center gap-1 rounded-md px-3 py-2 font-medium whitespace-nowrap transition-colors"
            style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
            onMouseEnter={(e) => { if (!isSub) e.currentTarget.style.backgroundColor = menuHoverColor }}
            onMouseLeave={(e) => { if (!isSub) e.currentTarget.style.backgroundColor = 'transparent' }}
            onClick={() => { if (!hasChildren) { setMobileOpen(false); setOpenDropdown(null) } }}
          >
            {item.label}
            {hasChildren && <ChevronDown className="h-3 w-3" />}
          </Link>
          {hasChildren && openDropdown === item.label && (
            <div
              className="absolute left-0 top-full z-50 rounded-lg border py-1 shadow-lg whitespace-nowrap"
              style={{ backgroundColor: menuBg, borderColor: 'rgba(255,255,255,0.1)' }}
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {item.children!.map((child) => {
                const childHasChildren = child.children && child.children.length > 0
                return (
                  <div key={child.label} className="relative group">
                    <Link
                      href={child.url || '#'}
                      className="flex items-center justify-between px-4 py-2 transition-colors whitespace-nowrap"
                      style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = menuHoverColor }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={() => { if (!childHasChildren) { setMobileOpen(false); setOpenDropdown(null) } }}
                    >
                      {child.label}
                      {childHasChildren && <ChevronDown className="h-3 w-3 -rotate-90 ml-2" />}
                    </Link>
                    {childHasChildren && (
                      <div
                        className="absolute left-full top-0 z-50 rounded-lg border py-1 shadow-lg ml-1 hidden group-hover:block whitespace-nowrap"
                        style={{ backgroundColor: menuBg, borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        {child.children!.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.url || '#'}
                            className="block px-4 py-2 transition-colors whitespace-nowrap"
                            style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = menuHoverColor }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            onClick={() => { setMobileOpen(false); setOpenDropdown(null) }}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    })

  const renderMobileMenu = (items: MenuItem[]) =>
    items.map((item) => {
      const hasChildren = item.children && item.children.length > 0
      return (
        <div key={item.label}>
          <Link
            href={item.url || '#'}
            className="block rounded-md px-3 py-2.5 font-medium transition-colors"
            style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
            onClick={() => { if (!hasChildren) { setMobileOpen(false); setOpenDropdown(null) } }}
          >
            {item.label}
          </Link>
          {hasChildren && item.children!.map((child) => (
            <div key={child.label}>
              <Link
                href={child.url || '#'}
                className="block pl-6 pr-3 py-2 transition-colors"
                style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
                onClick={() => { if (!(child.children && child.children.length > 0)) { setMobileOpen(false); setOpenDropdown(null) } }}
              >
                {child.label}
              </Link>
              {child.children?.map((sub) => (
                <Link
                  key={sub.label}
                  href={sub.url || '#'}
                  className="block pl-10 pr-3 py-2 transition-colors"
                  style={{ color: menuTextColor, fontSize: resp(navFontSize) }}
                  onClick={() => { setMobileOpen(false); setOpenDropdown(null) }}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )
    })

  return (
    <nav className="relative z-40 shadow-sm" style={{ backgroundColor: menuBg, minWidth: '100vw' }}>
      <style>{`
        @media (width < 768px) { .tn-desktop { display: none !important; } .tn-hamburger { display: flex !important; } .tn-mobile { display: block !important; } }
        @media (width >= 768px) { .tn-desktop { display: flex !important; } .tn-hamburger { display: none !important; } .tn-mobile { display: none !important; } }
      `}</style>
      <div className={`mx-auto flex items-center px-4 relative`} style={{ maxWidth: `${navWidth}%`, justifyContent: navAlign === 'left' ? 'flex-start' : navAlign === 'center' ? 'center' : 'flex-end' }}>
        <div className="tn-desktop items-center gap-1 py-2 flex-wrap">
          {renderMenu(menuItems)}
        </div>
        <button
          className="tn-hamburger rounded-md p-2 transition-colors absolute top-1/2 -translate-y-1/2"
          style={{ color: menuTextColor, backgroundColor: hamburgerBg, ...(hamburgerPos === 'left' ? { left: '4px' } : { right: '4px' }) }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="tn-mobile border-t max-h-[80vh] overflow-y-auto" style={{ backgroundColor: menuBg, borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="space-y-1 px-4 py-3">
            {renderMobileMenu(menuItems)}
          </div>
        </div>
      )}
    </nav>
  )
}
