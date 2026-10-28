import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components'
import { requireOfficer } from '@/lib/dashboard/dal'
import { formatDate } from '@/lib/dashboard/format'
import { getEventWithCheckins } from '@/lib/dashboard/queries'

import { PageTitle } from '../../ui'
import { CheckinView } from './CheckinView'

export default async function EventCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  const { event, checkins, members } = await getEventWithCheckins(id)
  if (!event) notFound()
  return (
    <>
      <Breadcrumb items={[{ label: 'Events', href: '/dashboard/events' }, { label: event.name }]} className="mb-3" />
      <PageTitle title={event.name} description={`${formatDate(event.start, true)}${event.location ? ` · ${event.location}` : ''}`} />
      <CheckinView eventId={event.id} checkins={checkins} members={members} />
    </>
  )
}
