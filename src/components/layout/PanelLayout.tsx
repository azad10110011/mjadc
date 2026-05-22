'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, GraduationCap, Users, BookOpen,
  Calendar, Image, Settings, LogOut, Menu, X, UserCheck,
  DollarSign, ClipboardList, Upload, Download, CheckSquare,
  UserPlus, UserCog, ChevronLeft, ChevronDown, KeyRound, Receipt,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

export type PanelRole = 'admin' | 'student' | 'teacher' | 'staff' | 'exam_controller' | 'principal' | 'administration'

interface PanelLayoutProps {
  children: ReactNode
  role: PanelRole
  title: string
}

interface SubNavItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  icon: ReactNode
  children?: SubNavItem[]
}

const PAGE_SUB_ITEMS: SubNavItem[] = [
  { label: 'All Pages', href: '/admin/pages' },
  { label: 'Home', href: '/admin/pages/home' },
  { label: 'About Us', href: '/admin/pages/about' },
  { label: 'Scholarship Info', href: '/admin/pages/scholarship' },
  { label: 'Admission Info', href: '/admin/pages/admission_info' },
  { label: 'Career Club', href: '/admin/pages/career_club' },
  { label: 'Contact Us', href: '/admin/pages/contact' },
  { label: 'Principal', href: '/admin/pages/principal' },
  { label: 'Governing Body', href: '/admin/pages/governing_body' },
  { label: 'Teachers Council', href: '/admin/pages/teachers_council' },
  { label: 'Departments', href: '/admin/pages/departments_intro' },
  { label: 'Co-curricular', href: '/admin/pages/co_curricular_intro' },
  { label: 'Academic Forms', href: '/admin/pages/academic_forms' },
  { label: 'Annual Reports', href: '/admin/pages/annual_reports' },
  { label: 'Gallery', href: '/admin/pages/gallery_intro' },
  { label: 'Events', href: '/admin/pages/events_intro' },
  { label: 'Notices', href: '/admin/pages/notices_intro' },
]

const panelNav: Record<PanelRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Notices', href: '/admin/notices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Results', href: '/admin/results', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Routines', href: '/admin/routines', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Syllabus', href: '/admin/syllabus', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Teachers', href: '/admin/teachers', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Staff', href: '/admin/staff', icon: <Users className="h-4 w-4" /> },
    { label: 'Forms', href: '/admin/forms', icon: <Download className="h-4 w-4" /> },
    { label: 'Pages', icon: <FileText className="h-4 w-4" />, children: PAGE_SUB_ITEMS },
    { label: 'Media', href: '/admin/media', icon: <Image className="h-4 w-4" /> },
    { label: 'Users', icon: <UserCog className="h-4 w-4" />, children: [
      { label: 'All Users', href: '/admin/users' },
      { label: 'Teacher/Staff', href: '/admin/users/teacher-staff' },
      { label: 'Students', href: '/admin/students' },
    ] },
    { label: 'Tuition Fees', href: '/admin/tuition-fees', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Transactions', href: '/admin/transactions', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/admin/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Collected Summary', href: '/admin/collected-summary', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
  ],
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Pay Fees', href: '/student/pay-fees', icon: <DollarSign className="h-4 w-4" /> },
  ],
  teacher: [
    { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Upload Result', href: '/teacher/upload-result', icon: <Upload className="h-4 w-4" /> },
    { label: 'Update Result', href: '/teacher/update-result', icon: <FileText className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/teacher/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Form Download', href: '/teacher/form-download', icon: <Download className="h-4 w-4" /> },
  ],
  staff: [
    { label: 'Leave Management', href: '/staff/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  exam_controller: [
    { label: 'Dashboard', href: '/exam-controller', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Upload Result', href: '/exam-controller/upload-result', icon: <Upload className="h-4 w-4" /> },
    { label: 'Approve Result', href: '/exam-controller/approve-result', icon: <CheckSquare className="h-4 w-4" /> },
  ],
  principal: [
    { label: 'Dashboard', href: '/principal', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Add Teacher', href: '/principal/add-teacher', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Add Staff', href: '/principal/add-staff', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Result Publish', href: '/principal/result-publish', icon: <CheckSquare className="h-4 w-4" /> },
    { label: 'Tuition Fee', href: '/principal/tuition-fee', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/principal/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  administration: [
    { label: 'Dashboard', href: '/administration-panel', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Notices', href: '/administration-panel/notices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Results', href: '/administration-panel/results', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Syllabus', href: '/administration-panel/syllabus', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Routine', href: '/administration-panel/routine', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Fee Collection', href: '/administration-panel/fee-collection', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Collected Summary', href: '/administration-panel/collected-summary', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Students', href: '/administration-panel/students', icon: <Users className="h-4 w-4" /> },
    { label: 'Forms', href: '/administration-panel/forms', icon: <Download className="h-4 w-4" /> },
  ],
}

export function PanelLayout({ children, role, title }: PanelLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {}
    if (pathname.startsWith('/admin/pages')) expanded['Pages'] = true
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/students')) expanded['Users'] = true
    return expanded
  })
  const navItems = panelNav[role]

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">MJ</div>
            <span className="text-sm font-semibold text-gray-900">College Portal</span>
          </Link>
          <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="space-y-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = expandedMenus[item.label]
              const anyChildActive = item.label === 'Pages'
                ? pathname.startsWith('/admin/pages')
                : item.label === 'Users'
                  ? pathname.startsWith('/admin/users') || pathname.startsWith('/admin/students')
                  : false
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      anyChildActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                            pathname === child.href
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3">
          <Link
            href="/change-password"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Website
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/' }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Site
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
