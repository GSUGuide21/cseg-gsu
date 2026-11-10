import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $getRoot, type ElementNode, type LexicalEditor, type TextNode } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { SiteContentProvider } from '@/globals/SiteContent'
import { documentAssets } from '@/lib/dashboard/documentChecks'
import { NO_SITE_CONTENT, type SiteContent } from '@/lib/references'
import { DocumentBody, PageSections, plainText } from '@/lib/richtext'
import { dateTimeText, hasLiveBlock, parseDate, parseTime } from '@/lib/richtext/blocks'
import type { PortableTextBlock } from '@/lib/richtext/portableText'

// jsdom doesn't lay anything out; Lexical measures the cursor to scroll it into view
beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

const text = (t: string) => ({ type: 'text', version: 1, text: t, format: 0, style: '' })
/** A saved document of one paragraph of these */
const line = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children }] } })

const button = (fields: object) => ({ type: 'inline-button', version: 1, label: 'Sign up', href: '/join', buttonStyle: 'primary', ...fields })
const chip = (fields: object) => ({ type: 'chip', version: 1, kind: 'post', target: 'welcome', label: 'Old title', ...fields })
const footnote = (note: string) => ({ type: 'footnote', version: 1, note })

const site: SiteContent = {
  ...NO_SITE_CONTENT,
  posts: [{ slug: 'welcome', title: 'Welcome Week', excerpt: null }],
  events: [{ id: 'e1', name: 'Fall Social', start: '2026-10-13T00:30:00+00:00', end: '2026-10-13T02:00:00+00:00', description: '', href: 'https://pin.gsu.edu/event/1' }],
}

describe('inline items on a page', () => {
  it('shows a button as a link, in the sentence', () => {
    const { container } = render(<DocumentBody source={line(text('Ready? '), button({}), text(' today.'))} />)
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/join')
    expect(container.querySelector('p')).toHaveTextContent('Ready? Sign up today.')
  })

  it('drops a button or image with an unsafe address, keeping the sentence', () => {
    const { container } = render(
      <DocumentBody source={line(text('Before '), button({ href: 'javascript:alert(1)' }), { type: 'inline-image', version: 1, src: 'javascript:alert(1)', alt: 'x' }, text('after'))} />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('p')).toHaveTextContent('Before after')
  })

  it('shows an image in the line, with its description', () => {
    render(<DocumentBody source={line(text('By '), { type: 'inline-image', version: 1, src: '/logo.png', alt: 'CSEG logo' })} />)
    expect(screen.getByRole('img', { name: 'CSEG logo' })).toHaveAttribute('src', '/logo.png')
  })

  it('shows a badge, falling back to the usual color for one it doesn’t know', () => {
    render(<DocumentBody source={line({ type: 'badge', version: 1, label: 'New', tone: 'sparkly' })} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('shows a date as what it is, and leaves out one that isn’t a date', () => {
    const { container } = render(<DocumentBody source={line({ type: 'datetime', version: 1, date: '2026-10-12', time: '18:00', dateStyle: 'short' }, { type: 'datetime', version: 1, date: 'soon', time: '', dateStyle: 'short' })} />)
    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(1)
    expect(times[0]).toHaveAttribute('datetime', '2026-10-12T18:00')
    expect(times[0]).toHaveTextContent('Mon, Oct 12 · 6:00 PM')
  })

  it('numbers footnotes in reading order, however deep, and links each both ways', () => {
    const source = JSON.stringify({
      root: {
        type: 'root',
        version: 1,
        children: [
          { type: 'paragraph', version: 1, children: [text('First'), footnote('The **first** note.')] },
          { type: 'callout', version: 1, tone: 'info', children: [text('Second'), footnote('The second note.')] },
        ],
      },
    })
    render(<DocumentBody source={source} />)
    const list = screen.getByRole('list', { name: 'Footnotes' })
    const notes = within(list).getAllByRole('listitem')
    expect(notes.map((n) => n.textContent)).toEqual(['The first note. ↩', 'The second note. ↩'])
    const mark = screen.getByRole('link', { name: 'Footnote 2' })
    expect(mark).toHaveAttribute('href', `#${notes[1].id}`)
    const back = within(notes[1]).getByRole('link', { name: /Back to footnote 2/ })
    expect(document.getElementById(back.getAttribute('href')!.slice(1))).toContainElement(mark)
  })

  it('gives each of a page’s sections its own footnotes, which can’t link into each other', () => {
    const section = (title: string, note: string) => ({ title, subtitle: '', body: line(text(title), footnote(note)) })
    render(<PageSections sections={[section('One', 'From one.'), section('Two', 'From two.')]} />)
    const lists = screen.getAllByRole('list', { name: 'Footnotes' })
    expect(lists).toHaveLength(2)
    const ids = lists.map((l) => within(l).getByRole('listitem').id)
    expect(new Set(ids).size).toBe(2)
    expect(screen.getAllByRole('link', { name: 'Footnote 1' }).map((a) => a.getAttribute('href'))).toEqual(ids.map((id) => `#${id}`))
  })

  it('shows a chip as what it points at now, not its old name', () => {
    render(
      <SiteContentProvider content={site}>
        <DocumentBody source={line(text('See '), chip({}))} />
      </SiteContentProvider>
    )
    expect(screen.getByRole('link', { name: 'Welcome Week' })).toHaveAttribute('href', '/posts/welcome')
    expect(screen.queryByText('Old title')).not.toBeInTheDocument()
  })

  it('shows an event’s chip with its day on campus, wherever it’s read', () => {
    render(
      <SiteContentProvider content={site}>
        <DocumentBody source={line(chip({ kind: 'event', target: 'e1' }))} />
      </SiteContentProvider>
    )
    // 12:30am UTC on the 13th is the evening of the 12th in Atlanta
    expect(screen.getByRole('link', { name: 'Fall Social · Oct 12' })).toHaveAttribute('href', 'https://pin.gsu.edu/event/1')
  })

  it('keeps a gone chip’s name as plain words, so the sentence still reads', () => {
    const { container } = render(
      <SiteContentProvider content={site}>
        <DocumentBody source={line(text('See '), chip({ target: 'deleted' }), text(' for more.'))} />
      </SiteContentProvider>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('p')).toHaveTextContent('See Old title for more.')
  })
})

describe('inline items as data', () => {
  it('reads as part of the sentence, leaving footnotes for the end of the page', () => {
    const source = line(text('Meet at '), chip({ label: 'the Library' }), text(' on '), { type: 'datetime', version: 1, date: '2026-10-12', time: '', dateStyle: 'short' }, footnote('Bring ID.'), text('.'))
    expect(plainText(source)).toBe('Meet at the Library on Mon, Oct 12.')
  })

  it('writes a date the same in any zone, and turns down ones that aren’t real', () => {
    expect(dateTimeText({ date: '2026-12-31', time: '23:30', dateStyle: 'long' })).toBe('Thursday, December 31, 2026 · 11:30 PM')
    expect(dateTimeText({ date: '2026-01-01', time: '00:00', dateStyle: 'short' })).toBe('Thu, Jan 1 · 12:00 AM')
    expect(parseDate('2026-02-30')).toBe('')
    expect(parseTime('25:00')).toBe('')
  })

  it('tells a page it needs what’s on the site for a chip, saved either way', () => {
    expect(hasLiveBlock(line(text('Plain words')))).toBe(false)
    expect(hasLiveBlock(line(chip({})))).toBe(true)
    expect(hasLiveBlock('[{"_type":"block","children":[{"_type":"chip"}]}]')).toBe(true)
  })

  it('checks inline images’ descriptions and inline buttons’ links before publishing', () => {
    const { images, links } = documentAssets([line({ type: 'inline-image', version: 1, src: '/logo.png', alt: '' }, button({ href: 'http://old.example.com' }))])
    expect(images).toEqual([{ src: '/logo.png', alt: '' }])
    expect(links).toEqual(['http://old.example.com'])
  })
})

describe('inline items in the editor', () => {
  /** An editor on "Hello world", with the cursor after "Hello" */
  const start = async (props = {}) => {
    const box: { last: RichTextValue | null } = { last: null }
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue="<p>Hello world</p>" onChange={(v) => (box.last = v)} {...props} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(box.last).not.toBeNull())
    act(() => area.focus())
    const editor = (area as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor
    await act(async () => editor.update(() => $getRoot().getFirstChildOrThrow<ElementNode>().getFirstChildOrThrow<TextNode>().select(5, 5)))
    return { box, area, editor }
  }

  const insertBadge = async (label: string) => {
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Badge' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: label } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Insert' }))
  }

  const lineOf = (v: RichTextValue | null) => JSON.parse(v!.json).root.children

  it('goes in at the cursor, in the sentence, without breaking the line', async () => {
    const { box, area } = await start()
    await insertBadge('New')
    await waitFor(() => expect(lineOf(box.last)[0].children.map((c: { type: string }) => c.type)).toEqual(['text', 'badge', 'text']))
    expect(lineOf(box.last)).toHaveLength(1)
    expect(lineOf(box.last)[0].children[1]).toMatchObject({ label: 'New' })
    expect(box.last!.text).toBe('HelloNew world')
    expect(within(area).getByText('New').closest('p')).toBeInTheDocument()
  })

  it('comes through Portable Text as an object among the spans, and back', async () => {
    const { box } = await start()
    await insertBadge('New')
    await waitFor(() => expect(box.last!.json).toContain('"badge"'))
    const [block] = JSON.parse(box.last!.portableText) as PortableTextBlock[]
    expect(block.children.map((c) => c._type)).toEqual(['span', 'badge', 'span'])
    expect(block.children[1]).toMatchObject({ label: 'New' })

    const portableText = box.last!.portableText
    let again: RichTextValue | null = null
    render(<RichTextEditor aria-label="Again" defaultValue={portableText} onChange={(v) => (again = v)} />)
    await waitFor(() => expect(again).not.toBeNull())
    expect(lineOf(again)[0].children.map((c: { type: string }) => c.type)).toEqual(['text', 'badge', 'text'])
    expect(again!.portableText).toBe(portableText)
  })

  it('reads back from its HTML, as when copied and pasted', async () => {
    const { box } = await start()
    await insertBadge('New')
    await waitFor(() => expect(box.last!.html).toContain('data-block="badge"'))
    const html = box.last!.html
    let again: RichTextValue | null = null
    render(<RichTextEditor aria-label="Again" defaultValue={html} onChange={(v) => (again = v)} />)
    await waitFor(() => expect(again?.json).toContain('"badge"'))
    expect(lineOf(again)[0].children[1]).toMatchObject({ type: 'badge', label: 'New' })
  })

  it('is edited in place from its frame', async () => {
    const { box, area } = await start()
    await insertBadge('New')
    const shown = await within(area).findByText('New')
    await act(async () => fireEvent.click(shown))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: 'Updated' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(lineOf(box.last)[0].children[1]).toMatchObject({ label: 'Updated' }))
  })

  it('turns down a link that isn’t safe, and makes one of a bare address', async () => {
    const { box } = await start()
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inline button' }))
    const dialog = await screen.findByRole('dialog')
    const insert = within(dialog).getByRole('button', { name: 'Insert' })
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: 'Go' } })
    fireEvent.change(within(dialog).getByLabelText(/Link/), { target: { value: 'javascript:alert(1)' } })
    expect(insert).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(/Link/), { target: { value: 'gsu.edu' } })
    fireEvent.click(insert)
    await waitFor(() => expect(lineOf(box.last)[0].children[1]).toMatchObject({ type: 'inline-button', href: 'https://gsu.edu' }))
  })

  it('stays out of code blocks', async () => {
    render(<RichTextEditor aria-label="Code" toolbar="ribbon" defaultValue="<pre><code>x</code></pre>" />)
    const area = screen.getByRole('textbox', { name: 'Code' })
    const editor = (area as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor
    await waitFor(() => expect(area).toHaveTextContent('x'))
    await act(async () => editor.update(() => $getRoot().getFirstChildOrThrow<ElementNode>().selectEnd()))
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    expect(screen.getByRole('button', { name: 'Badge' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Footnote' })).toBeDisabled()
  })
})
