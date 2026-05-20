import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Administration - MJADC',
}

export default function AdministrationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Administration</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Principal & Vice-Principal', href: '/administration/principal' },
          { label: 'Governing Body', href: '/administration/governing-body' },
          { label: "Teacher's Council", href: '/administration/teachers-council' },
          { label: "Teacher's List", href: '/administration/teachers-list' },
          { label: 'Staff List', href: '/administration/staff-list' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="rounded-xl border border-gray-200 bg-white p-6 text-center font-medium text-gray-700 transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
