import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { SiteContentProvider } from '@/globals/SiteContent'
import { RESOURCE_GROUPS } from '@/lib/data/resources'
import type { Eatery } from '@/lib/eateries'
import { parseReferences, referenceOptions, resolveReference, type SiteContent } from '@/lib/references'
import { DocumentBody, plainText } from '@/lib/richtext'
import { hasLiveBlock, upgradeEateriesBlocks } from '@/lib/richtext/blocks'

const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })

const tacos: Eatery = { id: 'taco-spot', name: 'Taco Spot', area: 'park-place', address: '1 Park Place', description: 'Tacos.', lat: 33.754, lng: -84.386 }
const hall: Eatery = { id: 'big-hall', name: 'Big Hall', area: 'campus', diningHall: true, address: '', description: '', placeId: 'piedmont-central', schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '24:00' }] }
const content: SiteContent = {
  eateries: [tacos, hall],
  posts: [{ slug: 'welcome-week', title: 'Welcome Week recap', excerpt: 'Photos and highlights.' }],
  pages: [
    { slug: 'about', title: 'About CSEG', description: 'Who we are.', subtitle: null },
    { slug: 'study-spots', title: 'Study spots', description: null, subtitle: 'Quiet places on campus.' },
  ],
}
const paws = RESOURCE_GROUPS[0].links[0]

describe('References blocks', () => {
  const block = (...items: object[]) => saved({ type: 'reference', version: 1, items })

  it('draws each kind live from what’s published, linking to it', () => {
    render(
      <SiteContentProvider content={content}>
        <DocumentBody
          source={block(
            { kind: 'eatery', ref: 'taco-spot' },
            { kind: 'place', ref: 'piedmont-central' },
            { kind: 'resource', ref: paws.href },
            { kind: 'post', ref: 'welcome-week' },
            { kind: 'page', ref: 'about' },
            { kind: 'page', ref: 'study-spots' }
          )}
        />
      </SiteContentProvider>
    )
    // An eatery gets its own card, with its map link
    expect(within(screen.getByRole('heading', { name: 'Taco Spot' }).closest('article')!).getByRole('link', { name: 'Show on map' })).toHaveAttribute('href', '/map?place=taco-spot')
    // A building takes its dining hall's hours from the eateries
    const place = screen.getByRole('link', { name: 'Piedmont Central' })
    expect(place).toHaveAttribute('href', '/map?place=piedmont-central')
    expect(within(place.closest('article')!).getByText('Open 24/7')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: `${paws.label} (opens in a new tab)` })).toHaveAttribute('href', paws.href)
    expect(screen.getByRole('link', { name: 'Welcome Week recap' })).toHaveAttribute('href', '/posts/welcome-week')
    // A site page links to its own path; the others to /pages/…
    expect(screen.getByRole('link', { name: 'About CSEG' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: 'Study spots' })).toHaveAttribute('href', '/pages/study-spots')
    expect(screen.getByText('Quiet places on campus.')).toBeInTheDocument()
  })

  it('drops what’s gone on the site, and the whole block when nothing’s left', () => {
    const { container, rerender } = render(
      <SiteContentProvider content={content}>
        <DocumentBody source={block({ kind: 'post', ref: 'deleted-post' }, { kind: 'page', ref: 'about' })} />
      </SiteContentProvider>
    )
    expect(container.querySelectorAll('article')).toHaveLength(1)
    rerender(
      <SiteContentProvider content={content}>
        <DocumentBody source={block({ kind: 'post', ref: 'deleted-post' })} />
      </SiteContentProvider>
    )
    expect(container.querySelector('article, p')).toBeNull()
  })

  it('reads only well-formed references, without repeats, and adds no words', () => {
    expect(parseReferences([{ kind: 'page', ref: 'about' }, { kind: 'page', ref: 'about' }, { kind: 'person', ref: 'x' }, { kind: 'post' }, 'about'])).toEqual([{ kind: 'page', ref: 'about' }])
    expect(plainText(block({ kind: 'page', ref: 'about' }))).toBe('')
    expect(hasLiveBlock(block({ kind: 'page', ref: 'about' }))).toBe(true)
  })

  it('draws an area’s eateries, all or some, as a card each', () => {
    const { rerender } = render(
      <SiteContentProvider content={content}>
        <DocumentBody source={block({ kind: 'eateries', ref: 'campus:dining-halls' }, { kind: 'eateries', ref: 'park-place' })} />
      </SiteContentProvider>
    )
    expect(screen.getByRole('heading', { name: 'Big Hall' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Taco Spot' })).toBeInTheDocument()
    // An area with none yet shows nothing on the site; a bad area is no reference
    rerender(
      <SiteContentProvider content={content}>
        <DocumentBody source={block({ kind: 'eateries', ref: 'campus:others' }, { kind: 'eateries', ref: 'mars' })} />
      </SiteContentProvider>
    )
    expect(document.querySelector('article')).toBeNull()
    expect(resolveReference({ kind: 'eateries', ref: 'campus:nope' }, content)).toBeNull()
  })

  it('offers areas in the page’s order, split into dining halls and the rest where there are some', () => {
    const areas = referenceOptions('eateries', content)
    expect(areas.slice(0, 3).map((o) => [o.value, o.description])).toEqual([
      ['campus', '1 place'],
      ['campus:dining-halls', '1 place'],
      ['campus:others', '0 places'],
    ])
    expect(areas.map((o) => o.value)).toContain('park-place')
    expect(areas.map((o) => o.value)).not.toContain('park-place:dining-halls')
  })

  it('offers each kind’s published things to pick, A–Z', () => {
    expect(referenceOptions('eatery', content).map((o) => o.label)).toEqual(['Big Hall', 'Taco Spot'])
    expect(referenceOptions('page', content).map((o) => o.value)).toEqual(['about', 'study-spots'])
    // Map places are the buildings and spaces; eateries are their own kind
    const places = referenceOptions('place', content).map((o) => o.value)
    expect(places).toContain('piedmont-central')
    expect(places).not.toContain('taco-spot')
    expect(resolveReference({ kind: 'place', ref: 'taco-spot' }, content)).toBeNull()
  })
})

describe('Eateries blocks from before they were references', () => {
  const old = (area: string, kind?: string) => ({ type: 'eateries', version: 1, area, ...(kind ? { kind } : {}) })

  it('upgrade to the References block they became, anywhere in the writing', () => {
    const source = saved({ type: 'paragraph', version: 1, children: [] }, old('campus', 'dining-halls'), old('park-place'), old('mars'))
    const root = JSON.parse(upgradeEateriesBlocks(source)).root
    expect(root.children.slice(1)).toEqual([
      { type: 'reference', version: 1, items: [{ kind: 'eateries', ref: 'campus:dining-halls' }] },
      { type: 'reference', version: 1, items: [{ kind: 'eateries', ref: 'park-place' }] },
      { type: 'reference', version: 1, items: [] },
    ])
    // Writing without them, or that isn't JSON, comes back as it was
    const plain = saved({ type: 'paragraph', version: 1, children: [] })
    expect(upgradeEateriesBlocks(plain)).toBe(plain)
    expect(upgradeEateriesBlocks('# "type":"eateries" in markdown')).toBe('# "type":"eateries" in markdown')
  })

  it('still show on the site until then', () => {
    render(
      <SiteContentProvider content={content}>
        <DocumentBody source={saved(old('campus', 'dining-halls'))} />
      </SiteContentProvider>
    )
    expect(screen.getByRole('heading', { name: 'Big Hall' })).toBeInTheDocument()
  })
})
