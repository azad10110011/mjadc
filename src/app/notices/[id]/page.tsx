import NoticeDetailClient from './client'

export async function generateStaticParams() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://mjadc.makafoodbd.com/mjadc-api/api'
    const res = await fetch(`${base}/notices`, { next: { revalidate: 3600 } })
    const json = await res.json()
    const notices: { id: number }[] = json.data || []
    return notices.map((n) => ({ id: String(n.id) }))
  } catch {
    return []
  }
}

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <NoticeDetailClient params={params} />
}