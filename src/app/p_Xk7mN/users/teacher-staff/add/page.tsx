'use client'

import { UserManager } from '@/components/users/UserManager'

export default function AdminAddTeacherStaffPage() {
  return <UserManager scope="teacher-staff" mode="create" title="Add Teacher/Staff" listTitle="Teacher/Staff Users" />
}
