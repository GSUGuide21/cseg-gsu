import { FOOTER_NAV_SECTIONS, NAV_LINKS } from '@/globals/config/nav'
import { parseDocument, parseSiteChrome } from '@/lib/dashboard/validate'
import { BUILT_IN_CHROME, footerBottomLinks, footerColumns, footerFrom, headerFrom, headerLinks, menuUses, missingMenus, navigationFrom, searchFrom, siteChromeFrom } from '@/lib/siteChrome'

const form = (part: string, content: unknown) => {
  const f = new FormData()
  f.set('part', part)
  f.set('content', JSON.stringify(content))
  return f
}

const menu = (id: string, name: string, labels: string[]) => ({ id, name, links: labels.map((label) => ({ href: `/${label.toLowerCase()}`, label })) })

describe('the navigation, header, footer, and search', () => {
  it('fall back to the built-in copy', () => {
    expect(siteChromeFrom(undefined)).toEqual(BUILT_IN_CHROME)
    expect(siteChromeFrom({ navigation: {}, header: {}, footer: {}, search: {} })).toEqual(BUILT_IN_CHROME)
    expect(navigationFrom({ menus: [] })).toEqual(BUILT_IN_CHROME.navigation)
  })

  it('show the site’s own menu and columns until officers save', () => {
    expect(headerLinks(BUILT_IN_CHROME)).toEqual(NAV_LINKS)
    expect(footerColumns(BUILT_IN_CHROME)).toEqual(FOOTER_NAV_SECTIONS)
    expect(footerBottomLinks(BUILT_IN_CHROME)).toEqual([])
  })

  it('reads each part on its own, so one saved part leaves the others built in', () => {
    const c = siteChromeFrom({ header: { search: false } })
    expect(c.header).toEqual({ ...BUILT_IN_CHROME.header, search: false })
    expect(c.navigation).toEqual(BUILT_IN_CHROME.navigation)
  })

  it('takes saved menus whole, dropping one with no id or a repeated one, and what isn’t a link', () => {
    const { menus } = navigationFrom({
      menus: [
        { id: 'top', name: 'Top', links: [{ href: '/events', label: 'Events' }, 'nope', { href: '/about', label: 'About', menu: { description: 'Us', links: [{ href: '/executives', label: 'Executives', description: 'Who leads' }] } }, { href: '/map', label: 'Map', menu: { links: [] } }] },
        { name: 'No id', links: [] },
        { id: 'top', name: 'Again', links: [] },
      ],
    })
    expect(menus.map((m) => m.name)).toEqual(['Top'])
    expect(menus[0].links.map((l) => l.label)).toEqual(['Events', 'About', 'Map'])
    expect(menus[0].links[1].menu).toEqual({ description: 'Us', links: [{ href: '/executives', label: 'Executives', description: 'Who leads' }] })
    expect(menus[0].links[2].menu).toBeUndefined()
  })

  it('keeps a removed button removed, and other fields falling back', () => {
    expect(headerFrom({ cta: null }).cta).toBeNull()
    expect(headerFrom({ themeToggle: false })).toEqual({ ...BUILT_IN_CHROME.header, themeToggle: false })
    const footer = footerFrom({ cta: { title: 'Hello', button: null }, columns: [] })
    expect(footer.cta).toEqual({ ...BUILT_IN_CHROME.footer.cta, title: 'Hello', button: null })
    expect(footer.columns).toEqual([])
    expect(searchFrom({ suggestions: ['parking', 7] })).toEqual({ ...BUILT_IN_CHROME.search, suggestions: ['parking'] })
  })
})

describe('menu locations', () => {
  const navigation = { menus: [menu('top', 'Top', ['Events', 'Join']), menu('help', 'Get help', ['Contact']), menu('legal', 'Legal', ['Privacy']), menu('empty', 'Empty', [])] }
  const chrome = siteChromeFrom({ navigation, header: { menu: 'top' }, footer: { columns: ['help', 'empty', 'gone', 'top'], bottom: 'legal' } })

  it('give the header its menu, and the built-in one if that menu is gone', () => {
    expect(headerLinks(chrome).map((l) => l.label)).toEqual(['Events', 'Join'])
    expect(headerLinks({ ...chrome, header: { ...chrome.header, menu: 'gone' } })).toEqual(NAV_LINKS)
  })

  it('make a footer column of each menu, under its name, leaving out a missing or empty one', () => {
    expect(footerColumns(chrome)).toEqual([
      { title: 'Get help', links: [{ href: '/contact', label: 'Contact' }] },
      { title: 'Top', links: [{ href: '/events', label: 'Events' }, { href: '/join', label: 'Join' }] },
    ])
    expect(footerBottomLinks(chrome)).toEqual([{ href: '/privacy', label: 'Privacy' }])
  })

  it('say where a menu shows, and which of a part’s menus are missing', () => {
    expect(menuUses(chrome, 'top')).toEqual(['Header: Main menu', 'Footer: Link columns'])
    expect(menuUses(chrome, 'legal')).toEqual(['Footer: Bottom bar'])
    expect(menuUses(chrome, 'empty')).toEqual(['Footer: Link columns'])
    expect(missingMenus('footer', chrome.footer, chrome.navigation)).toEqual({ 'columns.2': expect.any(String) })
    expect(missingMenus('header', chrome.header, chrome.navigation)).toEqual({})
    expect(Object.keys(missingMenus('header', { ...chrome.header, menu: 'gone' }, chrome.navigation))).toEqual(['menu'])
  })
})

describe('saving one of them', () => {
  it('needs a part it knows and something to read', () => {
    expect(parseSiteChrome(form('sidebar', {})).ok).toBe(false)
    const unread = new FormData()
    unread.set('part', 'header')
    unread.set('content', '{nope')
    expect(parseSiteChrome(unread)).toEqual({ ok: false, errors: { content: expect.any(String) } })
  })

  it('checks each menu’s name and links', () => {
    const bad = parseSiteChrome(
      form('navigation', {
        menus: [
          { id: 'top', name: ' ', links: [{ href: 'javascript:alert(1)', label: ' ' }, { href: '/about', label: 'About', menu: { description: '', links: [{ href: 'ftp://x', label: 'Files' }] } }] },
          { id: 'Bad Id', name: 'Other', links: [] },
        ],
      })
    )
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['menus.0.links.0.href', 'menus.0.links.0.label', 'menus.0.links.1.menu.links.0.href', 'menus.0.name', 'menus.1'])
    const many = parseSiteChrome(form('navigation', { menus: [{ id: 'top', name: 'Top', links: Array.from({ length: 13 }, (_, i) => ({ href: `/p${i}`, label: `P${i}` })) }] }))
    expect(!many.ok && many.errors['menus.0.links']).toMatch(/12 links/)
  })

  it('checks the footer’s columns and card', () => {
    const bad = parseSiteChrome(form('footer', { columns: ['a', 'b', 'a'], cta: { shown: true, title: ' ', button: { label: 'Go', href: 'nope' } } }))
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors).toMatchObject({ 'columns.2': expect.any(String), 'cta.title': 'Add a title.', 'cta.button.href': expect.any(String) })
    // A hidden card's words aren't checked, and a footer can go without columns
    const hidden = parseSiteChrome(form('footer', { columns: [], cta: { shown: false, title: '' } }))
    expect(hidden.ok && hidden.data.content).toMatchObject({ columns: [], bottom: null })
  })

  it('trims what it saves, and says which part it is', () => {
    const good = parseSiteChrome(form('search', { title: '  Look it up  ', suggestions: [' parking ', 'financial aid'] }))
    expect(good.ok && good.data).toEqual({ part: 'search', content: { ...BUILT_IN_CHROME.search, title: 'Look it up', suggestions: ['parking', 'financial aid'] } })
    const header = parseSiteChrome(form('header', { menu: 'top', cta: { label: ' Join us ', href: ' /join ' } }))
    expect(header.ok && header.data.content).toEqual({ menu: 'top', search: true, themeToggle: true, cta: { label: 'Join us', href: '/join' } })
    const blank = parseSiteChrome(form('search', { suggestions: ['  '] }))
    expect(!blank.ok && blank.errors['suggestions.0']).toBeDefined()
  })
})

describe('a page’s own header menu', () => {
  const page = (menu?: string) => {
    const f = new FormData()
    f.set('kind', 'page')
    f.set('title', 'Parking')
    f.set('slug', 'parking')
    f.set('status', 'draft')
    if (menu !== undefined) f.set('header_menu', menu)
    return parseDocument(f)
  }

  it('is one of the site’s menus by its id, or none', () => {
    expect(page()).toMatchObject({ ok: true, data: { header_menu: null } })
    expect(page('')).toMatchObject({ ok: true, data: { header_menu: null } })
    expect(page('footer-campus')).toMatchObject({ ok: true, data: { header_menu: 'footer-campus' } })
    expect(page('Not A Menu')).toMatchObject({ ok: false, errors: { header_menu: expect.any(String) } })
  })
})
