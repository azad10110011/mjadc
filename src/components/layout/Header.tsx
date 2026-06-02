'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui'

const navItems = [
  { label: 'Homepage', href: '/' },
  {
    label: 'About Us',
    children: [
      { label: 'About MJADC', href: '/about' },
      { label: 'Achievement', href: '/achievements' },
      { label: 'Academic Approval', href: '/about/academic-approval' },
    ],
  },
  {
    label: 'Administration',
    children: [
      { label: 'Principal & Vice-Principal', href: '/administration/principal' },
      { label: 'Governing Body', href: '/administration/governing-body' },
      { label: "Teacher's Council", href: '/administration/teachers-council' },
      { label: "Teacher's List", href: '/administration/teachers-list' },
      { label: 'Staff List', href: '/administration/staff-list' },
    ],
  },
  {
    label: 'Academic',
    children: [
      { label: 'Student Info', href: '/academic/student-info' },
      { label: 'Class Routine', href: '/academic/routine' },
      { label: 'Syllabus', href: '/academic/syllabus' },
      { label: 'Results', href: '/academic/results' },
      { label: 'Scholarship Info', href: '/academic/scholarship' },
      { label: 'Form Downloads', href: '/academic/forms' },
      { label: 'Annual Reports', href: '/academic/annual-reports' },
      { label: 'Career Club', href: '/academic/career-club' },
    ],
  },
  {
    label: 'Admission',
    children: [
      { label: '11th', href: '/admission?programme=11th' },
      { label: '12th Class', href: '/admission?programme=12th' },
      { label: 'Degree (Pass)', href: '/admission?programme=degree' },
    ],
  },
  {
    label: 'Departments',
    children: [
      { label: 'Science', href: '/departments/science' },
      { label: 'Business Studies', href: '/departments/business-studies' },
      { label: 'Humanities', href: '/departments/humanities' },
      { label: 'General', href: '/departments/general' },
      { label: 'BMT', href: '/departments/bmt' },
    ],
  },
  {
    label: 'Co-Curriculum',
    children: [
      { label: 'BNCC', href: '/co-curricular/bncc' },
      { label: 'Rover Scout', href: '/co-curricular/rover-scout' },
      { label: 'Science Club', href: '/co-curricular/science-club' },
      { label: 'Debating Club', href: '/co-curricular/debating-club' },
      { label: 'Gallery', href: '/gallery' },
    ],
  },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Notices', href: '/notices' },
  { label: 'Pay Fees', href: '/pay-fees' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/college_logo.png" alt="MJADC Logo" className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-cover" />
          <div className="hidden md:block">
            <p className="text-xs md:text-sm font-semibold leading-tight text-gray-900">
              Miah Jinnah Alam
            </p>
            <p className="text-[10px] md:text-xs leading-tight text-gray-500">Degree College</p>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href || '#'}
                className="flex items-center gap-1 rounded-md px-2 py-2 text-xs 2xl:text-sm font-medium text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              >
                {item.label}
                {item.children && <ChevronDown className="h-3 w-3 2xl:h-3.5 2xl:w-3.5" />}
              </Link>
              {item.children && openDropdown === item.label && (
                <div className="absolute left-0 top-full z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Link href="/student/login">
            <Button variant="primary" size="sm" className="hidden sm:inline-flex text-xs px-2 whitespace-nowrap">Student Login</Button>
            <Button variant="primary" size="sm" className="sm:hidden px-2" aria-label="Student Login">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Button>
          </Link>
          <button
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100 xl:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white xl:hidden max-h-[80vh] overflow-y-auto">
          <div className="space-y-1 px-4 py-3">
            {navItems.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href || '#'}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => { setMobileOpen(false); setOpenDropdown(null) }}
                >
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.label}
                    href={child.href}
                    className="block pl-6 pr-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <Link
                href="/student/login"
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => setMobileOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Student Login
              </Link>
              <Link
                href="/pay-fees"
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileOpen(false)}
              >
                Pay Fees
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
