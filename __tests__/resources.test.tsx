import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
// No dashboard version published: the page in the code shows (and nothing asks Supabase)
jest.mock('../app/lib/dashboard/public', () => {
  const { BUILT_IN_RESOURCE_GROUPS: groups, BUILT_IN_RESOURCES: resources } = jest.requireActual('../app/lib/resources')
  return { getPublishedPage: jest.fn(async () => null), getResources: jest.fn(async () => ({ groups, resources })) }
})
import ResourcesPage from '../app/(page)/resources/page'
import { getPlace } from '../app/lib/data/places'
import { RESOURCE_GROUPS } from '../app/lib/data/resources'

describe('Resources', () => {
  it('points every map link at a real place', () => {
    const missing = RESOURCE_GROUPS.flatMap((g) => g.links)
      .filter((l) => l.placeId && !getPlace(l.placeId))
      .map((l) => `${l.label} -> ${l.placeId}`)
    expect(missing).toEqual([])
  })

  it('links offices to their building on the map', async () => {
    render(await ResourcesPage())
    // Career Services, the Writing Studio, CAS, and CMII all share the building
    const links = screen.getAllByRole('link', { name: 'Show 25 Park Place on the map' })
    expect(links).toHaveLength(4)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/map?place=25-park-place'))
  })
})
