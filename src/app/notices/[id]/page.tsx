import NoticeDetailClient from './client'
export async function generateStaticParams() {
  return [{ id: '1' }]
}
export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <NoticeDetailClient params={params} />
}