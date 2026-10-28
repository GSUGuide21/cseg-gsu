import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import LoginPage from '../app/(dashboard)/login/page'
import { coordsFrom, parseDocument, parseMember, parsePlace, safeNext, slugify } from '@/lib/dashboard/validate'
import { Markdown, safeHref } from '@/lib/markdown'
import { DocumentBody, plainText, safeStyle } from '@/lib/richtext'

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

describe('Dashboard form checks', () => {
  it('slugs titles for web addresses', () => {
    expect(slugify('Fall Social 2026!')).toBe('fall-social-2026')
    expect(slugify('  Café — Résumé Night  ')).toBe('cafe-resume-night')
    expect(slugify('***')).toBe('')
  })

  it('requires a member’s name and checks their email and year', () => {
    const bad = parseMember(form({ name: ' ', email: 'nope', year: 'Fifth' }))
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'year'])
    const good = parseMember(form({ name: ' Jordan Lee ', email: 'Jordan@Student.GSU.edu', year: 'Junior', status: 'active' }))
    expect(good).toEqual({ ok: true, data: expect.objectContaining({ name: 'Jordan Lee', email: 'jordan@student.gsu.edu', year: 'Junior', status: 'active', major: null }) })
  })

  it('makes a post’s web address from its title when none is given', () => {
    const parsed = parseDocument(form({ title: 'Welcome Week Recap', body: '# Hi' }))
    expect(parsed).toEqual({ ok: true, data: expect.objectContaining({ slug: 'welcome-week-recap', status: 'draft', body: '# Hi' }) })
    expect(parseDocument(form({ title: 'x', cover_image_url: 'http://insecure.example/a.jpg' })).ok).toBe(false)
  })

  it('keeps map pins near campus', () => {
    expect(parsePlace(form({ name: 'Meeting room', lat: '33.7531', lng: '-84.3853', published: 'on' }))).toEqual({
      ok: true,
      data: expect.objectContaining({ lat: 33.7531, lng: -84.3853, published: true, category: 'student-life' }),
    })
    const far = parsePlace(form({ name: 'Paris', lat: '48.85', lng: '2.35' }))
    expect(far.ok).toBe(false)
    if (!far.ok) expect(far.errors).toHaveProperty('lat')
  })

  it('reads coordinates out of pasted map links', () => {
    expect(coordsFrom('https://www.google.com/maps/place/x/@33.7531,-84.3853,17z')).toEqual({ lat: 33.7531, lng: -84.3853 })
    expect(coordsFrom('https://www.openstreetmap.org/?mlat=33.75&mlon=-84.38#map=18')).toEqual({ lat: 33.75, lng: -84.38 })
    expect(coordsFrom('33.7531, -84.3853')).toEqual({ lat: 33.7531, lng: -84.3853 })
    expect(coordsFrom('Student Center')).toBeNull()
  })

  it('only goes back to paths on this site after signing in', () => {
    expect(safeNext('/dashboard/members')).toBe('/dashboard/members')
    expect(safeNext('https://evil.example')).toBe('/dashboard')
    expect(safeNext('//evil.example')).toBe('/dashboard')
    expect(safeNext(null)).toBe('/dashboard')
  })
})

describe('Markdown', () => {
  it('renders headings, emphasis, lists, and links', () => {
    render(<Markdown source={'## Welcome\n\nCome **on time**.\n\n- Snacks\n- Games\n\nSee [events](/events) or [GSU](https://www.gsu.edu).'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('on time').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'events' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('link', { name: 'GSU' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('never runs HTML or script links that officers paste in', () => {
    const { container } = render(<Markdown source={'<script>alert(1)</script>\n\n[click](javascript:alert(1)) <img src=x onerror=alert(1)>\n\n![pic](http://insecure.example/a.png)'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    // Shown as text instead
    expect(container).toHaveTextContent('<script>alert(1)</script>')
    expect(safeHref('JavaScript:alert(1)')).toBeNull()
    expect(safeHref('mailto:cseg.gsu@gmail.com')).toBe('mailto:cseg.gsu@gmail.com')
  })
})

describe('Login page', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('explains the setup when Supabase isn’t configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY
    render(await LoginPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('heading', { name: 'Officer dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Supabase isn’t set up yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
  })
})

describe('Rich text on the site', () => {
  const doc = (children: unknown[]) => JSON.stringify({ root: { type: 'root', children } })
  const p = (...children: unknown[]) => ({ type: 'paragraph', children })
  const t = (text: string, format = 0, style = '') => ({ type: 'text', text, format, style })

  it('draws the editor’s blocks, marks, and links', () => {
    render(
      <DocumentBody
        source={doc([
          { type: 'heading', tag: 'h2', children: [t('Welcome')] },
          p(t('Bold', 1), t(' and '), t('marked', 128), t(' '), { type: 'link', url: '/events', children: [t('events')] }),
          { type: 'list', listType: 'number', children: [{ type: 'listitem', children: [t('One')] }] },
          { type: 'table', children: [{ type: 'tablerow', children: [{ type: 'tablecell', headerState: 1, children: [p(t('Item'))] }] }] },
        ])}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('Bold').closest('strong')).not.toBeNull()
    expect(screen.getByText('marked').closest('mark')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'events' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeInTheDocument()
  })

  it('keeps only safe links and styles, and still reads markdown', () => {
    const { container } = render(
      <DocumentBody source={doc([p({ type: 'link', url: 'javascript:alert(1)', children: [t('bad')] }, t('red', 0, 'color: #dc2626; position: fixed; background: url(x)'))])} />
    )
    expect(container.querySelector('a')).toBeNull()
    expect(screen.getByText('red').closest('[style]')).toHaveStyle({ color: '#dc2626' })
    expect(screen.getByText('red').closest('[style]')?.getAttribute('style')).not.toMatch(/position|url/)
    expect(safeStyle('font-size: 18px; color: expression(alert(1))')).toEqual({ fontSize: '18px' })
    render(<DocumentBody source={'## Old post\n\nWritten in markdown.'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Old post' })).toBeInTheDocument()
    expect(plainText(doc([p(t('Hello')), p(t('world'))]))).toBe('Hello\nworld')
  })
})
