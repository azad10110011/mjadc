'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { api } from '@/lib/api'

interface Event {
  id: number
  title: string
  description: string
  event_date: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    api.get<{ data: Event[] }>('/events').then((res) => {
      setEvents(res.data)
    }).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Events Calendar</h1>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <h2 className="font-semibold text-gray-900">{event.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                <p className="mt-2 text-xs text-gray-500">{formatDate(event.event_date)}</p>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="py-8 text-center text-gray-500">No upcoming events.</p>
        )}
      </div>
    </div>
  )
}
