import { parseHomepage, parsePageMeta } from '@/lib/dashboard/validate'
import { BUILT_IN_HOMEPAGE, homepageFrom, leadParts } from '@/lib/homepage'

const form = (content: unknown) => {
  const f = new FormData()
  f.set('content', JSON.stringify(content))
  return f
}

describe('homepage words', () => {
  it('falls back to the built-in words', () => {
    expect(homepageFrom(undefined)).toEqual(BUILT_IN_HOMEPAGE)
    expect(homepageFrom({})).toEqual(BUILT_IN_HOMEPAGE)
  })

  it('keeps a saved order and fields, drops unknown sections, and adds missing ones at the end', () => {
    const c = homepageFrom({ hero: { title: 'Hi' }, sections: [{ id: 'connect', shown: false }, { id: 'bogus' }, { id: 'join', title: 'Join' }] })
    expect(c.hero.title).toBe('Hi')
    expect(c.hero.eyebrow).toBe(BUILT_IN_HOMEPAGE.hero.eyebrow)
    expect(c.sections.map((s) => s.id)).toEqual(['connect', 'join', 'offerings', 'events'])
    expect(c.sections[0].shown).toBe(false)
    expect(c.sections[1].title).toBe('Join')
  })

  it('keeps a removed button removed', () => {
    expect(homepageFrom({ hero: { secondary: null } }).hero.secondary).toBeNull()
  })

  it('splits [words](links) out of a lead', () => {
    expect(leadParts('Follow, or [reach out](/contact) today.')).toEqual(['Follow, or ', { text: 'reach out', href: '/contact' }, ' today.'])
  })

  it('checks what officers save', () => {
    const bad = parseHomepage(
      form({
        hero: { ...BUILT_IN_HOMEPAGE.hero, title: '  ', primary: { label: 'Go', href: 'javascript:alert(1)' } },
        sections: BUILT_IN_HOMEPAGE.sections.map((s) => ({ ...s, shown: false, lead: s.id === 'join' ? 'See [this](ftp://x)' : s.lead })),
      })
    )
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.errors).toMatchObject({ 'hero.title': 'Add a title.', 'hero.primary.href': expect.any(String), 'join.lead': expect.stringContaining('ftp://x'), sections: 'Show at least one section.' })
    const good = parseHomepage(form({ ...BUILT_IN_HOMEPAGE, hero: { ...BUILT_IN_HOMEPAGE.hero, title: '  Hello  ' } }))
    expect(good.ok && good.data.hero.title).toBe('Hello')
  })
})

describe('page titles', () => {
  it('saves blank or unchanged fields as null, and checks lengths', () => {
    const f = new FormData()
    f.set('meta', JSON.stringify([{ path: '/', title: ' Home ', description: 'x'.repeat(201) }, { path: '/map', title: '  Map  of GSU ', description: '' }, { path: '/nope', title: 'X' }]))
    const bad = parsePageMeta(f)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors)).toEqual(['/.description'])
    f.set('meta', JSON.stringify([{ path: '/', title: 'Home', description: '' }, { path: '/map', title: '  Map  of GSU ', description: '' }]))
    const good = parsePageMeta(f)
    expect(good.ok && good.data.find((r) => r.path === '/')).toEqual({ path: '/', title: null, description: null })
    expect(good.ok && good.data.find((r) => r.path === '/map')?.title).toBe('Map of GSU')
    expect(good.ok && good.data.some((r) => r.path === '/nope')).toBe(false)
  })
})
