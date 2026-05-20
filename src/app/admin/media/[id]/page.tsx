import AdminMediaViewClient from './client'

export async function generateStaticParams() {
  return [{ id: '1' }]
}

export default function AdminMediaViewPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminMediaViewClient params={params} />
}
