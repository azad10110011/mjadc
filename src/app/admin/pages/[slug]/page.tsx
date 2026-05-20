import AdminPageEditClient from './client'

export async function generateStaticParams() {
  return [{ slug: 'placeholder' }]
}

export default function AdminPageEdit({ params }: { params: Promise<{ slug: string }> }) {
  return <AdminPageEditClient params={params} />
}
