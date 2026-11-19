'use client'

// Mobile app (Session 116): shown when the saved session can't be checked because there is no
// internet. The user stays signed in; Retry checks again.

import { WifiOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function OfflineScreen() {
  const { refresh, loading } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <WifiOff className="h-12 w-12 text-gray-400" />
      <h1 className="mt-4 text-lg font-semibold text-gray-900">No internet connection</h1>
      <p className="mt-1 max-w-xs text-sm text-gray-600">
        You are still signed in. Connect to the internet and tap Retry.
      </p>
      <button type="button" onClick={() => refresh()} disabled={loading}
        className="mt-6 rounded-lg bg-blue-700 px-6 py-3 text-base font-semibold text-white disabled:opacity-60">
        {loading ? 'Checking…' : 'Retry'}
      </button>
    </div>
  )
}
