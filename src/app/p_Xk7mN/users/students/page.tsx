'use client'

import { UserManager } from '@/components/users/UserManager'

export default function AdminStudentUsersPage() {
  return <UserManager scope="student" title="Student Users" listTitle="Student Users" />
}
