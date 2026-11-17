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

  it('keeps a removed button removed, from before the hero had a list of them', () => {
    expect(homepageFrom({ hero: { secondary: null } }).hero.buttons).toEqual([{ label: 'Join CSEG →', href: '/join', style: 'primary' }])
    expect(homepageFrom({ hero: { primary: { label: 'Go', href: '/go' }, secondary: { label: 'More', href: '/more' } } }).hero.buttons).toEqual([
      { label: 'Go', href: '/go', style: 'primary' },
      { label: 'More', href: '/more', style: 'outline' },
    ])
    expect(homepageFrom({ hero: { buttons: [] } }).hero.buttons).toEqual([])
  })

  it('reads the hero’s background, keeping each kind’s settings', () => {
    const { media } = homepageFrom({
      hero: { media: { kind: 'slideshow', image: { src: '/a.jpg', alt: 'A' }, slides: [{ src: '/1.jpg' }, 'junk', { src: '/2.jpg', alt: 'Two' }], interval: 99 } },
    }).hero
    expect(media.kind).toBe('slideshow')
    // The image waits, kept, for switching back
    expect(media.image).toEqual({ src: '/a.jpg', alt: 'A' })
    expect(media.slides).toEqual([{ src: '/1.jpg', alt: '' }, { src: '', alt: '' }, { src: '/2.jpg', alt: 'Two' }])
    expect(media.interval).toBe(15)
    expect(homepageFrom({ hero: { media: { kind: 'hologram' } } }).hero.media.kind).toBe('none')
  })

  it('splits [words](links) out of a lead', () => {
    expect(leadParts('Follow, or [reach out](/contact) today.')).toEqual(['Follow, or ', { text: 'reach out', href: '/contact' }, ' today.'])
  })

  it('checks what officers save', () => {
    const bad = parseHomepage(
      form({
        hero: { ...BUILT_IN_HOMEPAGE.hero, title: '  ', buttons: [{ label: 'Go', href: 'javascript:alert(1)', style: 'primary' }] },
        sections: BUILT_IN_HOMEPAGE.sections.map((s) => ({ ...s, shown: false, lead: s.id === 'join' ? 'See [this](ftp://x)' : s.lead })),
      })
    )
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.errors).toMatchObject({ 'hero.title': 'Add a title.', 'hero.buttons.0.href': expect.any(String), 'join.lead': expect.stringContaining('ftp://x'), sections: 'Show at least one section.' })
    const good = parseHomepage(form({ ...BUILT_IN_HOMEPAGE, hero: { ...BUILT_IN_HOMEPAGE.hero, title: '  Hello  ' } }))
    expect(good.ok && good.data.hero.title).toBe('Hello')
  })
})

describe('the hero’s options', () => {
  const withHero = (hero: Record<string, unknown>) => form({ ...BUILT_IN_HOMEPAGE, hero: { ...BUILT_IN_HOMEPAGE.hero, ...hero } })
  const media = (m: Record<string, unknown>) => ({ ...BUILT_IN_HOMEPAGE.hero.media, ...m })

  it('takes a subtitle, no line above the title, and no description', () => {
    const saved = parseHomepage(withHero({ eyebrow: '', subtitle: '  Welcome home  ', lead: '' }))
    expect(saved.ok && saved.data.hero).toMatchObject({ eyebrow: '', subtitle: 'Welcome home', lead: '' })
  })

  it('checks only the background that shows', () => {
    // A half-done slideshow waits while an image shows
    const image = parseHomepage(withHero({ media: media({ kind: 'image', image: { src: 'http://x.test/a.jpg', alt: '' }, slides: [{ src: '', alt: '' }] }) }))
    expect(!image.ok && image.errors).toEqual({ 'hero.media.image.src': 'Use an https:// address, or upload one.' })

    const video = parseHomepage(withHero({ media: media({ kind: 'video', video: { src: 'https://youtube.com/watch?v=1', poster: '' } }) }))
    expect(!video.ok && video.errors['hero.media.video.src']).toMatch(/\.mp4 or \.webm/)
    expect(parseHomepage(withHero({ media: media({ kind: 'video', video: { src: 'https://x.test/hi.mp4', poster: '' } }) })).ok).toBe(true)

    const slides = parseHomepage(withHero({ media: media({ kind: 'slideshow', slides: [{ src: '/one.jpg', alt: '' }] }) }))
    expect(!slides.ok && slides.errors).toEqual({ 'hero.media.slides': 'Add at least 2 pictures.' })
  })

  it('keeps to four buttons', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ label: `B${i}`, href: '/x', style: 'outline' }))
    const saved = parseHomepage(withHero({ buttons: five }))
    expect(saved.ok && saved.data.hero.buttons).toHaveLength(4)
  })
})

describe('what the homepage sections hold', () => {
  const section = (c: ReturnType<typeof homepageFrom>, id: string) => c.sections.find((s) => s.id === id)!

  it('falls back to the built-in cards, steps, and choices, and keeps saved ones', () => {
    const built = homepageFrom(null)
    expect(section(built, 'offerings').items).toHaveLength(4)
    expect(section(built, 'join').items?.map((i) => i.title)).toEqual(['Join on PIN', 'Come to an event', 'Get involved'])
    expect(section(built, 'events')).toMatchObject({ count: 2, showPast: true })
    expect(section(built, 'connect').hidden).toEqual([])

    const saved = homepageFrom({
      sections: [
        { id: 'offerings', items: [{ icon: 'food', title: 'Free food', body: 'Every Friday.' }, 'not a card'] },
        { id: 'events', count: 9, showPast: false },
        { id: 'join', items: [] },
        { id: 'connect', hidden: ['x', 'x', 'myspace', 'email'] },
      ],
    })
    expect(section(saved, 'offerings').items).toEqual([{ icon: 'food', title: 'Free food', body: 'Every Friday.' }])
    // Too many events comes down to the most there can be
    expect(section(saved, 'events')).toMatchObject({ count: 4, showPast: false })
    // A list left empty falls back
    expect(section(saved, 'join').items).toHaveLength(3)
    // Only networks the site knows, each once
    expect(section(saved, 'connect').hidden).toEqual(['x', 'email'])
  })

  it('checks cards and steps, and drops an icon the site doesn’t have', () => {
    const withItems = (offerings: unknown[], join: unknown[]) =>
      form({ ...BUILT_IN_HOMEPAGE, sections: BUILT_IN_HOMEPAGE.sections.map((s) => (s.id === 'offerings' ? { ...s, items: offerings } : s.id === 'join' ? { ...s, items: join } : s)) })
    const bad = parseHomepage(withItems([{ icon: 'star', title: ' ', body: 'x'.repeat(241) }], Array.from({ length: 7 }, () => ({ title: 'Step', body: '' }))))
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.errors).toMatchObject({ 'offerings.items.0.title': 'Add a title.', 'offerings.items.0.body': 'Keep it under 240 characters.', 'join.items': 'Up to 6 steps.' })

    const good = parseHomepage(withItems([{ icon: 'nonsense', title: '  Free food ', body: ' Fridays ' }], [{ icon: '', title: 'Show up', body: '' }]))
    expect(good.ok).toBe(true)
    if (!good.ok) return
    expect(good.data.sections.find((s) => s.id === 'offerings')?.items).toEqual([{ icon: '', title: 'Free food', body: 'Fridays' }])
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
