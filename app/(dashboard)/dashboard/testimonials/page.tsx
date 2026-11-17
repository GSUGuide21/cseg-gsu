import { listTestimonials } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { TestimonialsView } from '../content/views'

export const metadata = { title: 'Testimonials' }

export default async function DashboardTestimonialsPage() {
  await requireOfficer()
  return <TestimonialsView rows={await listTestimonials()} />
}
