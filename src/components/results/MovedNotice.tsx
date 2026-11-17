'use client'

// Shown on old admin result pages that are no longer in the menu (Session 77). They called a June
// workflow API that changed results across ALL years of an exam, so it was not restored.

import { PanelLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { Info } from 'lucide-react'

export function MovedNotice({ title, where }: { title: string; where: string }) {
  return (
    <PanelLayout role="admin" title={title}>
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div className="space-y-1 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{title} has moved</p>
            <p>{where}</p>
            <p className="text-gray-500">Results can be reviewed any time from Internal Exam Management → All Results or Result Summary.</p>
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
