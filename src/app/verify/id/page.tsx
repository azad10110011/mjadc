'use client'

// Public ID card verification — opened by scanning the QR on a printed ID card. No login.
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { photoUrl } from '@/lib/photo'
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

interface IdVerify {
  verified: boolean
  active?: boolean
  expired?: boolean
  expire_date?: string | null
  type?: string
  name?: string
  photo_path?: string | null
  blood_group?: string | null
  college_name?: string
  identifier?: string
  detail?: string
  session?: string | null
  role_label?: string
  as_of?: string
  message?: string
}

function VerifyContent() {
  const search = useSearchParams()
  const [data, setData] = useState<IdVerify | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const type = search.get('type')
    const id = search.get('id')
    const t = search.get('t')
    if (!type || !id || !t) {
      const timer = setTimeout(() => { setError('Invalid verification link'); setLoading(false) }, 0)
      return () => clearTimeout(timer)
    }
    api
      .get<{ status: number; data: IdVerify }>(`/public/id-verify?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`)
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Verification failed'))
      .finally(() => setLoading(false))
  }, [search])

  const genuine = !!data?.verified && data.active !== false && data.expired !== true
  const niceExpire = data?.expire_date ? new Date(data.expire_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">Miah Jinnah Alam Degree College</h1>
      <p className="mb-6 flex items-center gap-1 text-center text-sm text-gray-500"><ShieldCheck className="h-4 w-4" /> ID Card Verification</p>

      {loading && <p className="text-gray-500">Verifying…</p>}
      {error && <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">{error}</div>}

      {data && !data.verified && (
        <div className="flex w-full items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
          <XCircle className="h-8 w-8 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Not a valid MJADC ID card</p>
            <p className="text-sm text-red-600">{data.message || 'This card is not in the college records.'}</p>
          </div>
        </div>
      )}

      {data && data.verified && (
        <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            {data.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(data.photo_path)} alt={data.name} className="h-20 w-20 rounded-lg border object-cover" />
            ) : null}
            <div>
              <p className="text-lg font-semibold text-gray-900">{data.name}</p>
              <p className="text-sm text-gray-500">
                {data.role_label}
                {data.identifier ? ` · ${data.identifier}` : ''}
              </p>
              {data.detail && <p className="text-sm text-gray-500">{data.detail}</p>}
              {data.session && <p className="text-xs text-gray-400">Session {data.session}</p>}
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-lg p-4 ${genuine ? 'border border-green-200 bg-green-50' : 'border border-amber-300 bg-amber-50'}`}>
            {genuine ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700">Genuine ID card</p>
                  <p className="text-sm text-green-600">Verified against college records{data.as_of ? ` on ${data.as_of}` : ''}.{niceExpire ? ` Valid till ${niceExpire}.` : ''}</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">{data.expired ? 'Card expired' : 'No longer active'}</p>
                  <p className="text-sm text-amber-700">{data.message || (data.expired ? `This ID card expired${niceExpire ? ` on ${niceExpire}` : ''}.` : 'This card holder is no longer active at the college.')}</p>
                </div>
              </>
            )}
          </div>
          {data.blood_group && <p className="mt-3 text-center text-sm text-gray-500">Blood group: <span className="font-medium text-gray-700">{data.blood_group}</span></p>}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">www.mjadc.ac.bd</p>
    </div>
  )
}

export default function IdVerifyPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading…</div>}>
      <VerifyContent />
    </Suspense>
  )
}
