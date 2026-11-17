'use client'

import { UserManager } from '@/components/users/UserManager'

export default function AdminUsersPage() {
  return <UserManager scope="all" title="User Management" listTitle="All Users" />
}
