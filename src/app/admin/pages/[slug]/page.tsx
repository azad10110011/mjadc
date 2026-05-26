import AdminPageEditClient from './client'

const PAGE_SLUGS = [
  'home', 'about', 'scholarship', 'admission_info', 'career_club',
  'contact', 'principal', 'governing_body', 'teachers_council',
  'departments_intro', 'co_curricular_intro', 'academic_forms',
  'annual_reports', 'gallery_intro', 'events_intro', 'notices_intro',
]

export async function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }))
}

export default function AdminPageEdit({ params }: { params: Promise<{ slug: string }> }) {
  return <AdminPageEditClient params={params} />
}
