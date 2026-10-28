import { requireOfficer } from '@/lib/dashboard/dal'
import { listPlaces } from '@/lib/dashboard/queries'

import { MapView } from './MapView'

export const metadata = { title: 'Map' }

export default async function DashboardMapPage() {
  await requireOfficer()
  return <MapView places={await listPlaces()} />
}
