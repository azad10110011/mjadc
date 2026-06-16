'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, GraduationCap, Users, BookOpen,
  Calendar, Image, Settings, LogOut, Menu, X, UserCheck,
  ClipboardList, Upload, Download, CheckSquare,
  UserPlus, UserCog, ChevronLeft, ChevronDown, KeyRound, Receipt, MapPin, Type, Award, DollarSign, CreditCard,
  ArrowLeftRight,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

const INACTIVITY_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000

export type PanelRole = 'admin' | 'student' | 'teacher' | 'staff' | 'exam_controller' | 'principal' | 'administration'

interface PanelLayoutProps {
  children: ReactNode
  role: PanelRole
  title: string
}

const ROLE_HOME: Record<PanelRole, string> = {
  admin: '/p_Xk7mN',
  student: '/p_G9n4s/dashboard',
  teacher: '/p_R2t9b',
  staff: '/p_L8p1x/leave-management',
  exam_controller: '/p_H3v5d',
  principal: '/p_W4q6z',
  administration: '/p_F7c2j',
}

const ROLE_LABELS: Record<PanelRole, string> = {
  admin: 'Admin',
  student: 'Student',
  teacher: 'Teacher',
  staff: 'Staff',
  exam_controller: 'Exam Controller',
  principal: 'Principal',
  administration: 'Administration',
}

const ROLE_PRIORITY: PanelRole[] = ['admin', 'principal', 'administration', 'exam_controller', 'teacher', 'staff', 'student']

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
  { label: 'All Pages', href: '/p_Xk7mN/pages' },
  { label: 'Home', href: '/p_Xk7mN/pages/home' },
  { label: 'About Us', href: '/p_Xk7mN/pages/about' },
  { label: 'Scholarship Info', href: '/p_Xk7mN/pages/scholarship' },
  { label: 'Admission Info', href: '/p_Xk7mN/pages/admission_info' },
  { label: 'Career Club', href: '/p_Xk7mN/pages/career_club' },
  { label: 'Contact Us', href: '/p_Xk7mN/pages/contact' },
  { label: 'Principal', href: '/p_Xk7mN/pages/principal' },
  { label: 'Governing Body', href: '/p_Xk7mN/pages/governing_body' },
  { label: 'Teachers Council', href: '/p_Xk7mN/pages/teachers_council' },
  { label: 'Departments', href: '/p_Xk7mN/pages/departments_intro' },
  { label: 'Co-curricular', href: '/p_Xk7mN/pages/co_curricular_intro' },
  { label: 'Academic Forms', href: '/p_Xk7mN/pages/academic_forms' },
  { label: 'Annual Reports', href: '/p_Xk7mN/pages/annual_reports' },
  { label: 'Gallery', href: '/p_Xk7mN/pages/gallery_intro' },
  { label: 'Events', href: '/p_Xk7mN/pages/events_intro' },
  { label: 'Notices', href: '/p_Xk7mN/pages/notices_intro' },
]

const panelNav: Record<PanelRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/p_Xk7mN', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Notices', href: '/p_Xk7mN/notices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Results', icon: <GraduationCap className="h-4 w-4" />, children: [
      { label: 'All Results', href: '/p_Xk7mN/results' },
      { label: 'Transcript', href: '/p_Xk7mN/transcript' },
    ] },
    { label: 'Subjects', href: '/p_Xk7mN/subjects', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'User History', href: '/p_Xk7mN/user-history', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Routines', href: '/p_Xk7mN/routines', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Syllabus', href: '/p_Xk7mN/syllabus', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Teachers', href: '/p_Xk7mN/teachers', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Staff', href: '/p_Xk7mN/staff', icon: <Users className="h-4 w-4" /> },
    { label: 'Governing Body', href: '/p_Xk7mN/governing-body', icon: <UserCheck className="h-4 w-4" /> },
    { label: 'Principal & Vice-Principal', href: '/p_Xk7mN/principals', icon: <UserCheck className="h-4 w-4" /> },
    { label: "Teachers Council", href: '/p_Xk7mN/teachers-council', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Career Club', href: '/p_Xk7mN/career-club', icon: <Users className="h-4 w-4" /> },
    { label: 'Co-Curricular', href: '/p_Xk7mN/co-curricular', icon: <Users className="h-4 w-4" /> },
    { label: 'Student Info', href: '/p_Xk7mN/student-info', icon: <FileText className="h-4 w-4" /> },
    { label: 'Attendance', href: '/p_Xk7mN/attendance', icon: <UserCheck className="h-4 w-4" /> },
    { label: 'Achievements', href: '/p_Xk7mN/achievements', icon: <Award className="h-4 w-4" /> },
    { label: 'Academic Approvals', href: '/p_Xk7mN/academic-approvals', icon: <FileText className="h-4 w-4" /> },
    { label: 'Forms', href: '/p_Xk7mN/forms', icon: <Download className="h-4 w-4" /> },
    { label: 'Pages', icon: <FileText className="h-4 w-4" />, children: PAGE_SUB_ITEMS },
    { label: 'Gallery', href: '/p_Xk7mN/gallery', icon: <Image className="h-4 w-4" /> },
    { label: 'Media', href: '/p_Xk7mN/media', icon: <Image className="h-4 w-4" /> },
    { label: 'Users', icon: <UserCog className="h-4 w-4" />, children: [
      { label: 'All Users', href: '/p_Xk7mN/users' },
      { label: 'Teacher/Staff', href: '/p_Xk7mN/users/teacher-staff' },
      { label: 'Students', href: '/p_Xk7mN/students' },
    ] },
    { label: 'Tuition Fees', href: '/p_Xk7mN/tuition-fees', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Transactions', href: '/p_Xk7mN/transactions', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/p_Xk7mN/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Collected Summary', href: '/p_Xk7mN/collected-summary', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Contact Info', href: '/p_Xk7mN/contact', icon: <MapPin className="h-4 w-4" /> },
    { label: 'Font Settings', href: '/p_Xk7mN/font-settings', icon: <Type className="h-4 w-4" /> },
    { label: 'Settings', href: '/p_Xk7mN/settings', icon: <Settings className="h-4 w-4" /> },
    { label: 'ID Cards', href: '/p_Xk7mN/id-cards', icon: <CreditCard className="h-4 w-4" /> },
  ],
  student: [
    { label: 'Dashboard', href: '/p_G9n4s/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Pay Fees', href: '/p_G9n4s/pay-fees', icon: <DollarSign className="h-4 w-4" /> },
  ],
  teacher: [
    { label: 'Dashboard', href: '/p_R2t9b', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Upload Result', href: '/p_R2t9b/upload-result', icon: <Upload className="h-4 w-4" /> },
    { label: 'Update Result', href: '/p_R2t9b/update-result', icon: <FileText className="h-4 w-4" /> },
    { label: 'Attendance', href: '/p_R2t9b/attendance', icon: <UserCheck className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/p_R2t9b/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Form Download', href: '/p_R2t9b/form-download', icon: <Download className="h-4 w-4" /> },
  ],
  staff: [
    { label: 'Leave Management', href: '/p_L8p1x/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  exam_controller: [
    { label: 'Dashboard', href: '/p_H3v5d', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Results', icon: <GraduationCap className="h-4 w-4" />, children: [
      { label: 'Upload Result', href: '/p_H3v5d/upload-result' },
      { label: 'Approve Result', href: '/p_H3v5d/approve-result' },
      { label: 'Transcript', href: '/p_H3v5d/transcript' },
    ] },
  ],
  principal: [
    { label: 'Dashboard', href: '/p_W4q6z', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Add Teacher', href: '/p_W4q6z/add-teacher', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Add Staff', href: '/p_W4q6z/add-staff', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Result Publish', href: '/p_W4q6z/result-publish', icon: <CheckSquare className="h-4 w-4" /> },
    { label: 'Tuition Fee', href: '/p_W4q6z/tuition-fee', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Leave Management', href: '/p_W4q6z/leave-management', icon: <ClipboardList className="h-4 w-4" /> },
  ],
  administration: [
    { label: 'Dashboard', href: '/p_F7c2j', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Notices', href: '/p_F7c2j/notices', icon: <FileText className="h-4 w-4" /> },
    { label: 'Results', href: '/p_F7c2j/results', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Syllabus', href: '/p_F7c2j/syllabus', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Routine', href: '/p_F7c2j/routine', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Fee Collection', href: '/p_F7c2j/fee-collection', icon: <DollarSign className="h-4 w-4" /> },
    { label: 'Collected Summary', href: '/p_F7c2j/collected-summary', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Students', href: '/p_F7c2j/students', icon: <Users className="h-4 w-4" /> },
    { label: 'Forms', href: '/p_F7c2j/forms', icon: <Download className="h-4 w-4" /> },
  ],
}

export function PanelLayout({ children, role, title }: PanelLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {}
    if (pathname.startsWith('/p_Xk7mN/pages')) expanded['Pages'] = true
    if (pathname.startsWith('/p_Xk7mN/users') || pathname.startsWith('/p_Xk7mN/students')) expanded['Users'] = true
    return expanded
  })

  const lastActivityRef = useRef(Date.now())
  const tickingRef = useRef(false)

  const doLogout = useCallback(() => {
    logout()
    router.push('/')
  }, [logout, router])

  useEffect(() => {
    if (loading) return
    if (!user || !user.roles.includes(role as unknown as UserRole)) {
      doLogout()
    }
  }, [user, loading, role, doLogout])

  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now() }
    const handleMove = () => {
      if (!tickingRef.current) {
        requestAnimationFrame(() => { updateActivity(); tickingRef.current = false })
        tickingRef.current = true
      }
    }
    const handleCheck = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) doLogout()
    }

    window.addEventListener('mousedown', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('touchstart', updateActivity)
    window.addEventListener('scroll', updateActivity)
    window.addEventListener('mousemove', handleMove)
    const timer = setInterval(handleCheck, CHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener('mousedown', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('touchstart', updateActivity)
      window.removeEventListener('scroll', updateActivity)
      window.removeEventListener('mousemove', handleMove)
      clearInterval(timer)
    }
  }, [doLogout])

  const availableRoles = useMemo(() => {
    if (!user?.roles) return [role]
    const userRoles = new Set(user.roles as UserRole[])
    return ROLE_PRIORITY.filter((r) => userRoles.has(r as unknown as UserRole))
  }, [user, role])

  const showRoleSwitcher = availableRoles.length > 1
  const navItems = panelNav[role]

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  if (!user && !loading) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="shrink-0 border-b border-gray-200 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">MJ</div>
            <span className="text-sm font-semibold text-gray-900">College Portal</span>
          </Link>
          {showRoleSwitcher && (
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-500">Active Role</label>
              <div className="relative mt-1">
                <select
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value as PanelRole
                    router.push(ROLE_HOME[newRole])
                  }}
                  className="w-full appearance-none rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 pr-7 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <ArrowLeftRight className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
          <button className="absolute right-4 top-3 rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = expandedMenus[item.label]
              const anyChildActive = item.label === 'Pages'
                ? pathname.startsWith('/p_Xk7mN/pages')
                : item.label === 'Users'
                  ? pathname.startsWith('/p_Xk7mN/users') || pathname.startsWith('/p_Xk7mN/students')
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
        <div className="shrink-0 border-t border-gray-200 p-3">
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
            onClick={doLogout}
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
