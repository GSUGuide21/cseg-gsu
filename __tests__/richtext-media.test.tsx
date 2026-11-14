import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { documentChecks } from '@/lib/dashboard/documentChecks'
import { DocumentBody, plainText } from '@/lib/richtext'
import { embedFromInput, fileKind, parseEmbedHeight, parseEmbedSrc } from '@/lib/richtext/blocks'

const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })
const text = (t: string) => ({ type: 'text', version: 1, text: t, format: 0, style: '' })
const paragraph = (t: string) => ({ type: 'paragraph', version: 1, children: [text(t)] })
const blocksOf = (v: RichTextValue | null) => JSON.parse(v!.json).root.children as { type: string; [k: string]: unknown }[]
const lexicalOf = (el: HTMLElement) => (el as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor

jest.setTimeout(15000)

beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

describe('embeds', () => {
  it('take a link, or the site’s own embed code, from the sites it knows', () => {
    expect(embedFromInput('https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?usp=sf_link')).toMatchObject({ src: 'https://docs.google.com/forms/d/e/1FAIpQLSf/viewform?embedded=true', provider: 'Google Form' })
    expect(embedFromInput('<iframe src="https://www.google.com/maps/embed?pb=!1m18!2d-84.38" width="600"></iframe>')?.provider).toBe('Google Map')
    expect(embedFromInput('open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')?.src).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M')
    expect(embedFromInput('https://www.instagram.com/p/C1a2B3c4D5e/')?.src).toBe('https://www.instagram.com/p/C1a2B3c4D5e/embed')
    expect(embedFromInput('https://drive.google.com/file/d/abc123/view?usp=sharing')?.src).toBe('https://drive.google.com/file/d/abc123/preview')
  })

  it('turn away other sites, a plain map link, and anything that isn’t a web address', () => {
    expect(embedFromInput('https://evil.example/forms/d/e/x/viewform')).toBeNull()
    expect(embedFromInput('https://www.google.com/maps/place/Georgia+State')).toBeNull()
    expect(embedFromInput('javascript:alert(1)')).toBeNull()
    expect(embedFromInput('<iframe src="https://evil.example/x"></iframe>')).toBeNull()
    // What's saved is only kept if a known site would give it again
    expect(parseEmbedSrc('https://evil.example/embed')).toBe('')
    expect(parseEmbedHeight(99999)).toBe(1600)
    expect(parseEmbedHeight('nope')).toBe(480)
  })

  it('show in the page in a sandboxed frame, named by their title', () => {
    render(<DocumentBody source={saved({ type: 'embed', version: 1, src: 'https://docs.google.com/forms/d/e/abc/viewform?embedded=true', title: 'Retreat sign-up', height: 700 })} />)
    const frame = screen.getByTitle('Retreat sign-up')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'))
    expect(frame).not.toHaveAttribute('sandbox', expect.stringContaining('allow-top-navigation'))
    expect(frame).toHaveAttribute('height', '700')
  })

  it('show nothing for a saved frame from a site it doesn’t know', () => {
    const { container } = render(<DocumentBody source={saved({ type: 'embed', version: 1, src: 'https://evil.example/x', title: 'Nope' })} />)
    expect(container.querySelector('iframe')).toBeNull()
  })
})

describe('images, galleries, files, and columns, shown on a page', () => {
  it('shows an image at its size and side, as a link when it has one', () => {
    render(<DocumentBody source={saved({ type: 'image', version: 1, src: 'https://x.test/a.jpg', alt: 'The quad', caption: '', size: 'small', align: 'right', href: '/events' })} />)
    const img = screen.getByRole('img', { name: 'The quad' })
    expect(img.closest('a')).toHaveAttribute('href', '/events')
    expect(img.closest('figure')).toHaveClass('sm:float-right', 'sm:w-1/3')
  })

  it('leaves an old image as it was: full width, centered, not a link', () => {
    render(<DocumentBody source={saved({ type: 'image', version: 1, src: 'https://x.test/a.jpg', alt: 'The quad', caption: '', href: 'javascript:alert(1)' })} />)
    const img = screen.getByRole('img', { name: 'The quad' })
    expect(img.closest('a')).toBeNull()
    expect(img.closest('figure')).toHaveClass('mx-auto', 'w-full')
  })

  it('shows a gallery’s safe photos, each opening larger, and counts their captions', () => {
    const source = saved({
      type: 'gallery',
      version: 1,
      layout: 'masonry',
      items: [
        { src: 'https://x.test/1.jpg', alt: 'Tabling', caption: 'Welcome Week' },
        { src: 'https://x.test/2.jpg', alt: '', caption: '' },
        { src: 'javascript:alert(1)', alt: 'Bad', caption: '' },
      ],
    })
    render(<DocumentBody source={source} />)
    const list = screen.getByRole('list', { name: '2 photos' })
    expect(within(list).getByRole('button', { name: 'View larger: Tabling' })).toBeInTheDocument()
    // One with no description still says which it is
    expect(within(list).getByRole('button', { name: 'View larger: Photo 2 of 2' })).toBeInTheDocument()
    expect(plainText(source)).toBe('Welcome Week')
  })

  it('shows a file as a card that opens in a new tab, saying what kind it is', () => {
    render(<DocumentBody source={saved({ type: 'file', version: 1, href: 'https://x.test/files/Spring-Flyer.pdf?v=2', name: '', note: 'Print and post' })} />)
    const link = screen.getByRole('link', { name: /Spring Flyer\.pdf/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveTextContent('PDF · Print and post')
    expect(fileKind('/files/minutes.docx')).toBe('Word document')
  })

  it('lays columns side by side, each with its own writing, stacking on phones', () => {
    const source = saved({
      type: 'columns',
      version: 1,
      layout: '2-1',
      children: [
        { type: 'column', version: 1, children: [paragraph('Left side')] },
        { type: 'column', version: 1, children: [paragraph('Right side')] },
      ],
    })
    render(<DocumentBody source={source} />)
    const left = screen.getByText('Left side').closest('div')!.parentElement!
    expect(left).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[2fr_1fr]')
    expect(left.children).toHaveLength(2)
    expect(plainText(source)).toBe('Left side\nRight side')
  })

  it('checks a gallery’s photos for descriptions before publishing', () => {
    const bodies = [saved({ type: 'gallery', version: 1, items: [{ src: 'https://x.test/1.jpg', alt: '' }, { src: 'https://x.test/2.jpg', alt: 'Ok' }] })]
    expect(documentChecks({ kind: 'page', title: 'Recap', summary: 'x', cover: '', words: 10, bodies }).map((c) => c.message)).toContain('1 image has no description for people who can’t see them.')
  })
})

describe('in the editor', () => {
  it('sets an image’s size, side, and link from its dialog', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))
    fireEvent.change(screen.getByLabelText('Image address'), { target: { value: 'https://x.test/a.jpg' } })
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'gsu.edu' } })
    // Size and side are custom Selects
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Size' }), { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: 'Medium' }))
    fireEvent.keyDown(screen.getByRole('combobox', { name: /Where it sits/ }), { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: 'Left, text beside it' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'image')).toMatchObject({ src: 'https://x.test/a.jpg', size: 'medium', align: 'left', href: 'https://gsu.edu' }))
  })

  it('embeds a Google Form from the ribbon, pointing a video link to the Video block', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Embed' }))
    fireEvent.change(screen.getByLabelText('Link or embed code'), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(await screen.findByText(/use the Video block/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Link or embed code'), { target: { value: 'https://docs.google.com/forms/d/e/abc/viewform' } })
    expect(screen.getByText('Found a Google Form.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sign up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'embed')).toEqual(expect.objectContaining({ src: 'https://docs.google.com/forms/d/e/abc/viewform?embedded=true', title: 'Sign up', height: 800 })))
  })

  it('builds a gallery from addresses, in order, without the same photo twice', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gallery' }))
    const add = (src: string) => {
      fireEvent.change(screen.getByLabelText('Or add one by its address'), { target: { value: src } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    }
    add('https://x.test/1.jpg')
    add('https://x.test/2.jpg')
    add('https://x.test/1.jpg')
    add('http://x.test/insecure.jpg')
    expect(screen.getByRole('alert')).toHaveTextContent('https://')
    fireEvent.change(screen.getByLabelText('Description of photo 2'), { target: { value: 'The crowd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() =>
      // The usual layout (even squares) isn't written out, as a callout's usual tone isn't
      expect(blocksOf(last).find((b) => b.type === 'gallery')).toMatchObject({
        items: [
          { src: 'https://x.test/1.jpg', alt: '' },
          { src: 'https://x.test/2.jpg', alt: 'The crowd' },
        ],
      })
    )
  })

  it('inserts columns with a line to write on in each, and changes or removes them from the ribbon', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Two columns' }))
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'columns')).toBeDefined())
    const row = blocksOf(last).find((b) => b.type === 'columns') as unknown as { children: { type: string; children: { type: string }[] }[] }
    expect(row.children.map((c) => c.type)).toEqual(['column', 'column'])
    expect(row.children.every((c) => c.children[0]?.type === 'paragraph')).toBe(true)

    // The cursor's in the first column, so its tools are a tab of their own
    fireEvent.click(await screen.findByRole('tab', { name: /^Columns/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Three columns' }))
    await waitFor(() => expect((blocksOf(last).find((b) => b.type === 'columns') as unknown as { layout: string; children: unknown[] }).children).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: 'Remove columns' }))
    await waitFor(() => expect(blocksOf(last).some((b) => b.type === 'columns')).toBe(false))
  })

  it('makes a web address or email a link as it’s typed', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" onChange={(v) => (last = v)} />)
    const editor = lexicalOf(screen.getByRole('textbox', { name: 'Body' }))
    await act(async () => {
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode().append($createTextNode('See https://gsu.edu or write officers@cseg.org today')))
      })
    })
    await waitFor(() => {
      const links = (blocksOf(last)[0] as unknown as { children: { type: string; url?: string }[] }).children.filter((c) => c.type === 'autolink')
      expect(links.map((l) => l.url)).toEqual(['https://gsu.edu', 'mailto:officers@cseg.org'])
    })
  })
})
