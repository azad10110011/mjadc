'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, GraduationCap, Users, BookOpen,
  Calendar, Image, Settings, LogOut, Menu, X, UserCheck, ListPlus,
  ClipboardList, Upload, Download, CheckSquare,
  UserPlus, UserCog, ChevronLeft, ChevronDown, KeyRound, Receipt, MapPin, Type, Award, DollarSign, CreditCard,
  ArrowLeftRight, ShieldOff, Star, Landmark } from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { canOpenPage, isAdminUser, normPath, pageKeyFor } from '@/lib/permissions'

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
    { label: 'Internal Exam Management', icon: <GraduationCap className="h-4 w-4" />, children: [
      { label: 'All Results', href: '/p_Xk7mN/results' },
      { label: 'Result Summary', href: '/p_Xk7mN/result-summary' },
      { label: 'Transcript', href: '/p_Xk7mN/transcript' },
      { label: 'Transcript QR Verify', href: '/p_Xk7mN/transcript-verify' },
      { label: 'Exams & Groups', href: '/p_Xk7mN/exams-groups' },
      { label: 'Exam Routine', href: '/p_Xk7mN/exam-routine' },
      { label: 'Exam Paper Selection', href: '/p_Xk7mN/exam-paper-selection' },
      { label: 'Admit Card', href: '/p_Xk7mN/admit-card' },
      { label: 'Mark Entry Form', href: '/p_Xk7mN/mark-entry-form' },
      { label: 'Exam Fee Set', href: '/p_Xk7mN/exam-fee-set' },
      { label: 'Exam Fee Waiver', href: '/p_Xk7mN/exam-fee-waiver' },
      { label: 'Exam Fee Collection', href: '/p_Xk7mN/exam-fee-collection' },
      { label: 'Exam Fee Paid List', href: '/p_Xk7mN/exam-fee-paid-list' },
      { label: 'Fee Due Rules', href: '/p_Xk7mN/due-rules' },
      { label: 'Exam Seat Plan', href: '/p_Xk7mN/seat-plan' },
      { label: 'Hall Duty Allocation', href: '/p_Xk7mN/exam-duty' },
      { label: 'Duty Appointment Letters', href: '/p_Xk7mN/duty-letters' },
    ] },
    { label: 'Board Exam Management', icon: <Landmark className="h-4 w-4" />, children: [
      { label: 'Board Exams & Venues', href: '/p_Xk7mN/board/exams' },
      { label: 'Candidates', href: '/p_Xk7mN/board/candidates' },
      { label: 'Board Routine', href: '/p_Xk7mN/board/routine' },
      { label: 'Board Seat Plan', href: '/p_Xk7mN/board/seat-plan' },
      { label: 'Attendance Sheets', href: '/p_Xk7mN/board/attendance' },
      { label: 'External Teachers', href: '/p_Xk7mN/board/external-teachers' },
      { label: 'Board Hall Duty', href: '/p_Xk7mN/board/hall-duty' },
      { label: 'Board Duty Letters', href: '/p_Xk7mN/board/duty-letters' },
    ] },
    { label: 'Custom Entry Fields', href: '/p_Xk7mN/custom-fields', icon: <ListPlus className="h-4 w-4" /> },
    { label: 'Subjects', href: '/p_Xk7mN/subjects', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'User History', href: '/p_Xk7mN/user-history', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Routines', href: '/p_Xk7mN/routines', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Syllabus', href: '/p_Xk7mN/syllabus', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Teachers', icon: <GraduationCap className="h-4 w-4" />, children: [
      { label: 'All Teachers', href: '/p_Xk7mN/teachers' },
      { label: 'Add Teacher', href: '/p_Xk7mN/teachers/add' },
    ] },
    { label: 'Staff', icon: <Users className="h-4 w-4" />, children: [
      { label: 'All Staff', href: '/p_Xk7mN/staff' },
      { label: 'Add Staff', href: '/p_Xk7mN/staff/add' },
    ] },
    { label: 'Student Management', icon: <Users className="h-4 w-4" />, children: [
      { label: 'All Students', href: '/p_Xk7mN/students' },
      { label: 'Add Student', href: '/p_Xk7mN/students/add' },
      { label: 'Bulk Photo Upload', href: '/p_Xk7mN/students/photos' },
      { label: 'Class Change', href: '/p_Xk7mN/class-change' },
      { label: 'Student Info', href: '/p_Xk7mN/student-info' },
      { label: 'Old Students', href: '/p_Xk7mN/students?class=Old' },
    ] },
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
      { label: 'Add Teacher/Staff', href: '/p_Xk7mN/users/teacher-staff/add' },
      { label: 'Students', href: '/p_Xk7mN/users/students' },
      { label: 'User Permissions', href: '/p_Xk7mN/users/permissions' },
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
    { label: 'My Results', href: '/p_G9n4s/results', icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'My Attendance', href: '/p_G9n4s/attendance', icon: <UserCheck className="h-4 w-4" /> },
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
      { label: 'Exam Fee Waiver', href: '/p_Xk7mN/exam-fee-waiver' },
    ] },
    { label: 'Exam Fee Collection', href: '/p_Xk7mN/exam-fee-collection', icon: <CreditCard className="h-4 w-4" /> },
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
    { label: 'Exam Fee Collection', href: '/p_Xk7mN/exam-fee-collection', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Collected Summary', href: '/p_F7c2j/collected-summary', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Student Management', icon: <Users className="h-4 w-4" />, children: [
      { label: 'All Students', href: '/p_F7c2j/students' },
      { label: 'Add Student', href: '/p_F7c2j/students/add' },
      { label: 'Old Students', href: '/p_F7c2j/students?class=Old' },
    ] },
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
    if (pathname.startsWith('/p_Xk7mN/users')) expanded['Users'] = true
    if (pathname.startsWith('/p_Xk7mN/board/')) expanded['Board Exam Management'] = true
    if (pathname.startsWith('/p_Xk7mN/teachers/') || pathname === '/p_Xk7mN/teachers') expanded['Teachers'] = true
    if (pathname.startsWith('/p_Xk7mN/staff')) expanded['Staff'] = true
    if (pathname.startsWith('/p_Xk7mN/results') || pathname.startsWith('/p_Xk7mN/result-summary') || pathname.startsWith('/p_Xk7mN/transcript') || pathname.startsWith('/p_Xk7mN/exam-') || pathname.startsWith('/p_Xk7mN/admit-card') || pathname.startsWith('/p_Xk7mN/mark-entry-form') || pathname.startsWith('/p_Xk7mN/seat-plan') || pathname.startsWith('/p_Xk7mN/duty-letters') || pathname.startsWith('/p_Xk7mN/exams-groups') || pathname.startsWith('/p_Xk7mN/due-rules')) expanded['Internal Exam Management'] = true
    if (pathname.startsWith('/p_Xk7mN/students')) expanded['Student Management'] = true
    if (pathname.startsWith('/p_F7c2j/students')) expanded['Student Management'] = true
    return expanded
  })

  const lastActivityRef = useRef(0)
  useEffect(() => {
    lastActivityRef.current = Date.now()
  }, [])
  const tickingRef = useRef(false)

  const doLogout = useCallback(() => {
    logout()
    router.push('/')
  }, [logout, router])

  useEffect(() => {
    if (loading) return
    if (!user || !user.roles.includes(role as unknown as UserRole)) {
      // Shared pages (e.g. /p_Xk7mN/exam-fee-collection, /collected-summary) declare a
      // hardcoded role but are reachable from several panels. If the declared role
      // doesn't fit, keep the session if the user has ANY authorized panel role and
      // derive the effective role from their highest-priority role instead of logging out.
      const effective = ROLE_PRIORITY.find((r) => user?.roles.includes(r as UserRole))
      if (effective && user) return
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
  // Keep the active panel independent of the current page URL. Some pages are
  // shared across panels and use another panel's route prefix; navigating there
  // must not silently switch the active panel.
  const lastRole = (typeof window !== 'undefined' ? localStorage.getItem('active_panel_role') : null) as PanelRole | null
  const userHas = (r: PanelRole) => !!user?.roles?.includes(r as unknown as UserRole)
  const defaultRole = user?.default_role as PanelRole | undefined
  const fallbackRole = userHas(role) ? role : (availableRoles[0] || role) as PanelRole
  const effectiveRole = lastRole && userHas(lastRole)
    ? lastRole
    : defaultRole && userHas(defaultRole)
      ? defaultRole
      : fallbackRole
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('active_panel_role', effectiveRole) }, [effectiveRole])
  const baseNav = panelNav[effectiveRole] || panelNav[role]

  // ---- Session 80: dynamic menu from per-user permissions ----
  // A page is shown if it is not permission-controlled (dashboards) or the user has its permission.
  // When the backend sends no permission data (older API), everything behaves as before.
  const permAware = !!user?.permission_keys
  const visibleHref = useCallback((href: string) => {
    if (!permAware || !user) return true
    const key = pageKeyFor(href, user)
    return key ? canOpenPage(user, key) : true
  }, [permAware, user])
  const navItems = useMemo(() => baseNav
    .map((item) => item.children ? { ...item, children: item.children.filter((c) => visibleHref(c.href)) } : item)
    .filter((item) => item.children ? item.children.length > 0 : visibleHref(item.href!)), [baseNav, visibleHref])

  // Pages granted from OTHER panels (e.g. a teacher given "Exam Fee Collection") → "Assigned to me"
  const assignedItems = useMemo(() => {
    if (!permAware || !user || isAdminUser(user)) return [] as SubNavItem[]
    const shown = new Set<string>()
    for (const it of navItems) {
      if (it.href) shown.add(normPath(it.href))
      for (const c of it.children || []) shown.add(normPath(c.href))
    }
    const all: SubNavItem[] = []
    for (const items of Object.values(panelNav)) for (const it of items) {
      if (it.href) all.push({ label: it.label, href: it.href })
      for (const c of it.children || []) all.push(c)
    }
    const out: SubNavItem[] = []
    const seen = new Set<string>()
    for (const k of user.permissions || []) {
      const base = k.split('#')[0]
      if (shown.has(base) || seen.has(base)) continue
      const hit = all.find((x) => normPath(x.href) === base)
      if (hit) { out.push(hit); seen.add(base) }
    }
    return out
  }, [permAware, user, navItems])

  // Direct-URL guard: permission-controlled pages need the permission; other panel pages need the role.
  const pageAllowed = useMemo(() => {
    if (!user || !permAware) return true
    const key = pageKeyFor(pathname, user)
    if (key) return canOpenPage(user, key)
    return isAdminUser(user) || user.roles.includes(role as unknown as UserRole)
  }, [user, permAware, pathname, role])

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  if (!user && !loading) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', // sticky: sidebar stays visible on long pages
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
                  value={effectiveRole}
                  onChange={(e) => {
                    const newRole = e.target.value as PanelRole
                    localStorage.setItem('active_panel_role', newRole)
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
                  ? pathname.startsWith('/p_Xk7mN/users')
                  : item.label === 'Student Management'
                    ? pathname.startsWith('/p_Xk7mN/students') || pathname.startsWith('/p_F7c2j/students') || pathname.startsWith('/p_Xk7mN/class-change') || pathname.startsWith('/p_Xk7mN/student-info')
                    : item.label === 'Internal Exam Management'
                      ? pathname.startsWith('/p_Xk7mN/results') || pathname.startsWith('/p_Xk7mN/result-summary') || pathname.startsWith('/p_Xk7mN/transcript') || pathname.startsWith('/p_Xk7mN/exam-') || pathname.startsWith('/p_Xk7mN/admit-card') || pathname.startsWith('/p_Xk7mN/mark-entry-form') || pathname.startsWith('/p_Xk7mN/seat-plan') || pathname.startsWith('/p_Xk7mN/duty-letters') || pathname.startsWith('/p_Xk7mN/exams-groups') || pathname.startsWith('/p_Xk7mN/due-rules')
                      : item.children.some((c) => c.href && normPath(pathname) === normPath(c.href))
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
                            normPath(pathname) === normPath(child.href)
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
                  normPath(pathname) === normPath(item.href!)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
          {assignedItems.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-3">
              <p className="mb-1 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <Star className="h-3 w-3" /> Assigned to me
              </p>
              {assignedItems.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setSidebarOpen(false)}
                  className={cn('flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    normPath(pathname) === normPath(it.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100')}>
                  {it.label}
                </Link>
              ))}
            </div>
          )}
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

      {/* min-w-0: lets wide tables scroll inside their own box instead of widening the whole page (Session 77) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Site
              </Button>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          {pageAllowed ? children : (
            <div className="mx-auto mt-10 max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <ShieldOff className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="mt-3 text-lg font-semibold text-gray-900">No access</h2>
              <p className="mt-1 text-sm text-gray-600">
                You don&apos;t have permission for this page. Ask the administrator if you need it.
              </p>
              <Link href={ROLE_HOME[effectiveRole] || '/'} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
                Go to my dashboard
              </Link>
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
