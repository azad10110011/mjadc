'use client'

import { UserManager } from '@/components/users/UserManager'

export default function AdminTeacherStaffPage() {
  return <UserManager scope="teacher-staff" mode="list" title="Teacher/Staff Management" listTitle="Teacher/Staff Users" />
}
