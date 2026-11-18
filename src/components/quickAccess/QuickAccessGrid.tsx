'use client'

// Quick Access tiles on a panel dashboard (Session 110). The list comes from the admin's settings.

import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import type { PanelRole } from '@/components/layout/PanelLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/lib/permissions'
import { useQuickAccess } from '@/lib/quickAccess'

const TONES = [
  'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-amber-100 text-amber-700',
]

export function QuickAccessGrid({ panel, title = 'Quick Access' }: { panel: PanelRole; title?: string }) {
  const { user } = useAuth()
  const tiles = useQuickAccess(panel)
  const admin = isAdminUser(user)
  if (!tiles) return null
  if (tiles.length === 0 && !admin) return null

  return (
    <section aria-labelledby={`qa-${panel}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={`qa-${panel}`} className="text-sm font-semibold uppercase tracking-wide text-gray-600">{title}</h2>
        {admin && (
          <Link href={`/p_Xk7mN/users/quick-access?panel=${panel}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
            <Settings2 className="h-3.5 w-3.5" /> Customize
          </Link>
        )}
      </div>
      {tiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">No shortcuts yet. Use Customize to add some.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tiles.map((t, i) => (
            <Link key={t.href} href={t.href}
              className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5 ${TONES[i % TONES.length]}`}>{t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-gray-900">{t.label}</span>
                {t.desc ? <span className="block text-xs text-gray-500">{t.desc}</span>
                  : t.section ? <span className="block truncate text-xs text-gray-500">{t.section}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
