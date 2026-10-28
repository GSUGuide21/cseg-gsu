import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $getRoot, $getSelection, KEY_ENTER_COMMAND, type ElementNode, type LexicalEditor } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { joinSections } from '../app/(dashboard)/dashboard/SectionsEditor'
import { parseDocument, parseSections } from '@/lib/dashboard/validate'
import { DocumentBody, PageSections, plainText } from '@/lib/richtext'
import { videoFromUrl } from '@/lib/richtext/blocks'

/** A saved document: the editor's JSON around these blocks */
const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })
const text = (t: string) => ({ type: 'text', version: 1, text: t, format: 0, style: '' })
// Several of these start a whole editor (some twice), which can pass 5s with every suite running at once
jest.setTimeout(15000)

// jsdom doesn't lay anything out; Lexical measures the cursor to scroll it into view
beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

/** The Lexical editor behind an editable area, to put the cursor somewhere */
const lexicalOf = (el: HTMLElement) => (el as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor

describe('the site’s blocks, shown on a page', () => {
  it('shows a callout as a note in its tone', () => {
    render(<DocumentBody source={saved({ type: 'callout', version: 1, tone: 'warning', children: [text('Bring your PantherCard.')] })} />)
    const note = screen.getByRole('note', { name: 'Heads up' })
    expect(note).toHaveTextContent('Bring your PantherCard.')
  })

  it('treats a callout with an unknown tone as a note', () => {
    render(<DocumentBody source={saved({ type: 'callout', version: 1, tone: 'sparkly', children: [text('Hi')] })} />)
    expect(screen.getByRole('note', { name: 'Note' })).toBeInTheDocument()
  })

  it('shows buttons as links, dropping any that aren’t safe', () => {
    render(
      <DocumentBody
        source={saved({
          type: 'buttons',
          version: 1,
          align: 'center',
          buttons: [
            { label: 'Join CSEG', href: '/join', style: 'primary' },
            { label: 'PIN', href: 'https://gsu.campuslabs.com/engage', style: 'outline' },
            { label: 'Sneaky', href: 'javascript:alert(1)', style: 'primary' },
            { label: '', href: '/empty', style: 'primary' },
          ],
        })}
      />
    )
    expect(screen.getByRole('link', { name: 'Join CSEG' })).toHaveAttribute('href', '/join')
    expect(screen.getByRole('link', { name: 'PIN' })).toHaveAttribute('target', '_blank')
    expect(screen.queryByRole('link', { name: 'Sneaky' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('shows an https image with its description and caption, and no image from an unsafe address', () => {
    const { container } = render(
      <DocumentBody
        source={saved(
          { type: 'image', version: 1, src: 'https://example.supabase.co/storage/v1/object/public/media/a.jpg', alt: 'Officers at the welcome table', caption: 'Spring welcome' },
          { type: 'image', version: 1, src: 'javascript:alert(1)', alt: 'Bad' },
          { type: 'image', version: 1, src: 'data:image/png;base64,AAAA', alt: 'Inline' }
        )}
      />
    )
    const img = screen.getByRole('img', { name: 'Officers at the welcome table' })
    expect(img).toHaveAttribute('src', expect.stringMatching(/^https:/))
    expect(screen.getByText('Spring welcome').tagName).toBe('FIGCAPTION')
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('draws Lexical’s own nodes too: header cells, dividers, and links by kind', () => {
    const cell = (headerState: number, t: string) => ({ type: 'tablecell', version: 1, headerState, children: [{ type: 'paragraph', version: 1, children: [text(t)] }] })
    const { container } = render(
      <DocumentBody
        source={saved(
          { type: 'table', version: 1, children: [{ type: 'tablerow', version: 1, children: [cell(1, 'Day'), cell(0, 'Monday')] }] },
          { type: 'horizontalrule', version: 1 },
          {
            type: 'paragraph',
            version: 1,
            children: [
              { type: 'link', version: 1, url: 'mailto:cseg@gsu.edu', children: [text('Email')] },
              { type: 'autolink', version: 1, url: 'https://gsu.edu', children: [text('GSU')] },
            ],
          },
          { type: 'something-new', version: 1, children: [text('Still readable')] }
        )}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Day' })).toHaveAttribute('scope', 'col')
    expect(screen.getByRole('cell', { name: 'Monday' })).toBeInTheDocument()
    expect(container.querySelector('hr')?.className).toMatch(/border-t-2/)
    expect(screen.getByRole('link', { name: 'Email' })).not.toHaveAttribute('target')
    expect(screen.getByRole('link', { name: 'GSU' })).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Still readable')).toBeInTheDocument()
  })

  it('counts captions and callouts as words, but not button labels', () => {
    const source = saved(
      { type: 'callout', version: 1, children: [text('Checked in October.')] },
      { type: 'image', version: 1, src: 'https://x.test/a.png', caption: 'The quad' },
      { type: 'buttons', version: 1, buttons: [{ label: 'Join', href: '/join' }] }
    )
    expect(plainText(source)).toBe('Checked in October.\nThe quad')
  })
})

describe('the site’s blocks, in the editor', () => {
  it('reads them from HTML, draws them, and saves them as JSON', async () => {
    let last: RichTextValue | null = null
    render(
      <RichTextEditor
        aria-label="Body"
        onChange={(v) => (last = v)}
        defaultValue={[
          '<aside data-callout="tip">Bring a friend.</aside>',
          '<figure><img src="https://x.test/quad.jpg" alt="The quad"><figcaption>Fall</figcaption></figure>',
          '<div data-buttons style="text-align:center"><a href="/join" data-style="outline">Join</a></div>',
        ].join('')}
      />
    )
    const editor = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(within(editor).getByRole('note', { name: 'Tip' })).toHaveTextContent('Bring a friend.'))
    expect(within(editor).getByRole('img', { name: 'The quad' })).toBeInTheDocument()
    expect(within(editor).getByText('Join')).toBeInTheDocument()

    await waitFor(() => expect(last).not.toBeNull())
    const blocks = JSON.parse(last!.json).root.children
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(expect.arrayContaining(['callout', 'image', 'buttons']))
    expect(blocks.find((b: { type: string }) => b.type === 'callout').tone).toBe('tip')
    expect(blocks.find((b: { type: string }) => b.type === 'image')).toMatchObject({ src: 'https://x.test/quad.jpg', alt: 'The quad', caption: 'Fall' })
    expect(blocks.find((b: { type: string }) => b.type === 'buttons')).toMatchObject({ align: 'center', buttons: [{ label: 'Join', href: '/join', style: 'outline' }] })
    // And back out as HTML another editor (or this one) can read again
    expect(last!.html).toContain('data-callout="tip"')
    expect(last!.html).toMatch(/<figure><img src="https:\/\/x.test\/quad.jpg" alt="The quad"><figcaption>Fall<\/figcaption><\/figure>/)
  })

  it('leaves out a pasted image whose address isn’t safe', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" onChange={(v) => (last = v)} defaultValue={'<p>Before</p><img src="javascript:alert(1)" alt="x"><p>After</p>'} />)
    await waitFor(() => expect(last?.text).toContain('After'))
    expect(JSON.parse(last!.json).root.children.some((b: { type: string }) => b.type === 'image')).toBe(false)
  })

  it('uploads an image from the Image tool and inserts it', async () => {
    let last: RichTextValue | null = null
    const uploadImage = jest.fn(async () => 'https://example.supabase.co/storage/v1/object/public/media/2026/10/a.png')
    const { container } = render(<RichTextEditor aria-label="Body" toolbar="ribbon" uploadImage={uploadImage} onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))

    const file = new File(['png'], 'quad.png', { type: 'image/png' })
    const input = document.body.querySelector<HTMLInputElement>('dialog input[type="file"]')!
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(screen.getByLabelText('Image address')).toHaveValue('https://example.supabase.co/storage/v1/object/public/media/2026/10/a.png'))
    expect(uploadImage).toHaveBeenCalledWith(file)

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'The quad at noon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    // The picture itself (Lexical can also put an empty, zero-size anchor img before a block that starts the text)
    await waitFor(() => expect(container.querySelector('[contenteditable] figure img')).toHaveAttribute('alt', 'The quad at noon'))
    const image = JSON.parse(last!.json).root.children.find((b: { type: string }) => b.type === 'image')
    expect(image).toMatchObject({ src: 'https://example.supabase.co/storage/v1/object/public/media/2026/10/a.png', alt: 'The quad at noon' })
  })

  it('shows why an upload failed, and offers no upload without uploadImage', async () => {
    const uploadImage = jest.fn(async () => {
      throw new Error('Images can be up to 5 MB.')
    })
    const { unmount } = render(<RichTextEditor aria-label="Body" toolbar="ribbon" uploadImage={uploadImage} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))
    fireEvent.change(document.body.querySelector('dialog input[type="file"]')!, { target: { files: [new File(['x'], 'big.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Images can be up to 5 MB.')
    unmount()

    render(<RichTextEditor aria-label="Body" toolbar="ribbon" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))
    expect(screen.queryByRole('button', { name: /Choose an image/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Image address')).toBeInTheDocument()
  })

  it('redraws a callout when its kind changes', async () => {
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue={'<aside data-callout="info">Bring ID</aside>'} />)
    const editor = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(within(editor).getByRole('note', { name: 'Note' })).toBeInTheDocument())
    act(() => lexicalOf(editor).update(() => $getRoot().getFirstChildOrThrow<ElementNode>().selectEnd()))
    fireEvent.click(await screen.findByRole('tab', { name: /Callout/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads up' }))
    await waitFor(() => expect(within(editor).getByRole('note', { name: 'Heads up' })).toHaveTextContent('Bring ID'))
    expect(within(editor).queryByRole('note', { name: 'Note' })).not.toBeInTheDocument()
  })

  it('puts a block on an empty line in place of that line', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} defaultValue={'<p>Intro</p><p><br></p><p>Outro</p>'} />)
    const editor = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(editor).toHaveTextContent('Outro'))
    act(() => lexicalOf(editor).update(() => $getRoot().getChildAtIndex<ElementNode>(1)!.select()))
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buttons' }))
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Join' } })
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: '/join' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(JSON.parse(last!.json).root.children.map((b: { type: string }) => b.type)).toEqual(['paragraph', 'buttons', 'paragraph']))
  })

  it('changes a table from a menu in the cell the cursor’s in', async () => {
    let last: RichTextValue | null = null
    render(
      <RichTextEditor
        aria-label="Body"
        onChange={(v) => (last = v)}
        defaultValue={'<table><tr><th>Day</th><th>Time</th></tr><tr><td>Monday</td><td>Noon</td></tr></table>'}
      />
    )
    const editor = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(within(editor).getByText('Monday')).toBeInTheDocument())
    // No menu until the cursor's in a cell
    expect(screen.queryByRole('button', { name: 'Table options' })).not.toBeInTheDocument()
    act(() => {
      lexicalOf(editor).update(() => $getRoot().getFirstChildOrThrow<ElementNode>().getLastChildOrThrow<ElementNode>().getFirstChildOrThrow<ElementNode>().selectEnd())
      fireEvent.focusIn(editor)
    })

    const rows = () => JSON.parse(last!.json).root.children[0].children
    fireEvent.click(await screen.findByRole('button', { name: 'Table options' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert row below' }))
    await waitFor(() => expect(rows()).toHaveLength(3))

    fireEvent.click(screen.getByRole('button', { name: 'Table options' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove header row' }))
    // The row-header bit goes (pasted HTML can also mark the corner cell as a column header, which stays)
    await waitFor(() => expect(rows()[0].children.every((c: { headerState?: number }) => !((c.headerState ?? 0) & 1))).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Table options' }))
    expect(screen.getByRole('menuitem', { name: 'Make the first row headers' })).toBeInTheDocument()
  })

  it('inserts buttons, refusing a link that isn’t safe', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buttons' }))
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Join on PIN' } })
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(await screen.findByText(/Use a web address/)).toBeInTheDocument()

    // A bare address gets https:// in front
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'gsu.campuslabs.com/engage' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(JSON.parse(last!.json).root.children.some((b: { type: string }) => b.type === 'buttons')).toBe(true))
    const row = JSON.parse(last!.json).root.children.find((b: { type: string }) => b.type === 'buttons')
    expect(row.buttons).toEqual([{ label: 'Join on PIN', href: 'https://gsu.campuslabs.com/engage', style: 'primary' }])
  })
})

describe('FAQ, steps, cards, and video', () => {
  it('reads YouTube and Vimeo links, and nothing else', () => {
    expect(videoFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    expect(videoFromUrl('youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    expect(videoFromUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    expect(videoFromUrl('https://vimeo.com/76979871')).toEqual({ provider: 'vimeo', id: '76979871' })
    expect(videoFromUrl('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(videoFromUrl('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(videoFromUrl('javascript:alert(1)')).toBeNull()
  })

  it('shows each on a page, with bold and safe links in their text', () => {
    const { container } = render(
      <DocumentBody
        source={saved(
          { type: 'faq', version: 1, items: [{ q: 'Who can join?', a: 'Any **Panther**. See [Join](/join) or [this](javascript:alert(1)).' }, { q: '', a: 'No question, dropped' }] },
          { type: 'steps', version: 1, items: [{ title: 'Request on PIN', text: 'Takes a minute.' }, { title: 'Come to an event' }] },
          { type: 'cards', version: 1, items: [{ title: 'Tutoring', text: 'Free.', href: '/resources', icon: 'book' }, { title: 'Bad link', href: 'javascript:alert(1)', icon: 'nope' }] },
          { type: 'video', version: 1, provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Welcome Week' },
          { type: 'video', version: 1, provider: 'youtube', id: '"><script>' }
        )}
      />
    )
    // FAQ: native details, the bad link left as words
    const question = screen.getByText('Who can join?')
    expect(question.closest('details')).toBeInTheDocument()
    expect(screen.getByText('Panther').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/join')
    expect(screen.queryByRole('link', { name: 'this' })).not.toBeInTheDocument()
    expect(screen.queryByText('No question, dropped')).not.toBeInTheDocument()
    // Steps: a numbered list
    expect(screen.getByText('Request on PIN').closest('ol')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    // Cards: the linked one opens its link; the bad one is a plain card
    expect(screen.getByRole('link', { name: 'Tutoring' })).toHaveAttribute('href', '/resources')
    expect(screen.getByRole('heading', { name: 'Bad link' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bad link' })).not.toBeInTheDocument()
    // Video: one player, from the privacy-minded address; the bad id makes none
    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(1)
    expect(frames[0]).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0')
    expect(frames[0]).toHaveAttribute('title', 'Welcome Week')
  })

  it('counts their words', () => {
    const source = saved(
      { type: 'faq', version: 1, items: [{ q: 'Who?', a: 'Any **Panther**.' }] },
      { type: 'cards', version: 1, items: [{ title: 'Tutoring', text: 'See [here](/x).' }] }
    )
    expect(plainText(source)).toBe('Who?\nAny Panther.\nTutoring\nSee here.')
  })

  it('types an FAQ in place: Enter moves from question to answer to the next question, and out', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} defaultValue="<p>Intro</p>" />)
    const el = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(el).toHaveTextContent('Intro'))
    const editor = lexicalOf(el)
    act(() => editor.update(() => $getRoot().selectEnd()))
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'FAQ' }))

    const type = (text: string) => act(() => editor.update(() => $getSelection()!.insertText(text)))
    const enter = () => act(() => void editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown', { key: 'Enter' })))
    type('Who can join?')
    enter() // to the answer
    type('Any student.')
    enter() // a second paragraph in the answer
    type('Really, anyone.')
    enter()
    enter() // an empty last line: the next question
    type('Is it free?')
    enter()
    enter() // an empty answer: the next question again
    enter() // an empty question: out of the FAQ
    type('After')

    await waitFor(() => expect(plainText(last!.json)).toContain('After'))
    const blocks = JSON.parse(last!.json).root.children
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(['paragraph', 'faq', 'paragraph'])
    const items = blocks[1].children
    expect(items.map((i: { children: { type: string }[] }) => i.children.map((c) => c.type))).toEqual([
      ['faq-question', 'faq-answer'],
      ['faq-question', 'faq-answer'],
    ])
    expect(plainText(last!.json)).toBe('Intro\nWho can join?\nAny student.\nReally, anyone.\nIs it free?\n\nAfter')
    // Drawn as it'll look: a question row and its answer, with placeholders when empty
    expect(within(el).getByText('Who can join?')).toBeInTheDocument()
  })

  it('shows a typed-in FAQ on a page as questions that open', () => {
    const p = (t: string) => ({ type: 'paragraph', version: 1, children: [text(t)] })
    const item = (q: string, ...answer: object[]) => ({
      type: 'faq-item',
      version: 1,
      children: [
        { type: 'faq-question', version: 1, children: [text(q)] },
        { type: 'faq-answer', version: 1, children: answer },
      ],
    })
    const { container } = render(
      <DocumentBody
        source={saved({
          type: 'faq',
          version: 1,
          children: [
            item('Who can join?', p('Any student.'), { type: 'list', version: 1, listType: 'bullet', children: [{ type: 'listitem', version: 1, children: [text('Transfers too')] }] }),
            item('Is it free?', p('Yes.')),
          ],
        })}
      />
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(2)
    // One open at a time: the questions share a name
    expect(details[0].getAttribute('name')).toBeTruthy()
    expect(details[0].getAttribute('name')).toBe(details[1].getAttribute('name'))
    expect(details[0].querySelector('summary')).toHaveTextContent('Who can join?')
    expect(within(details[0] as HTMLElement).getByText('Transfers too').closest('ul')).toBeInTheDocument()
  })

  it('opens an FAQ saved as data as questions and answers, keeping bold and links', async () => {
    let last: RichTextValue | null = null
    render(
      <RichTextEditor
        aria-label="Body"
        onChange={(v) => (last = v)}
        defaultValue={saved({ type: 'faq', version: 1, items: [{ q: 'Who can join?', a: 'Any **Panther**. See [Join](/join).' }] })}
      />
    )
    await waitFor(() => expect(last).not.toBeNull())
    const faq = JSON.parse(last!.json).root.children[0]
    expect(faq.type).toBe('faq')
    const [question, answer] = faq.children[0].children
    expect(question.children[0].text).toBe('Who can join?')
    const parts = answer.children[0].children
    expect(parts.find((t: { text?: string }) => t.text === 'Panther').format & 1).toBe(1)
    expect(parts.find((t: { type: string }) => t.type === 'link')).toMatchObject({ url: '/join' })
    // And its HTML reads back in as an FAQ
    const html = last!.html
    expect(html).toMatch(/<details>.*<summary>.*Who can join\?/)
    let again: RichTextValue | null = null
    render(<RichTextEditor aria-label="Again" defaultValue={html} onChange={(v) => (again = v)} />)
    await waitFor(() => expect(JSON.parse(again!.json).root.children.find((b: { type: string }) => b.type === 'faq')?.children[0].children.map((c: { type: string }) => c.type)).toEqual(['faq-question', 'faq-answer']))
  })

  it('inserts a video from a link, refusing other sites', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Video' }))
    fireEvent.change(screen.getByLabelText('Video link'), { target: { value: 'https://example.com/video' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(await screen.findByText(/Paste a YouTube or Vimeo link/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Video link'), { target: { value: 'https://vimeo.com/76979871' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Highlights' } })
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(JSON.parse(last!.json).root.children.find((b: { type: string }) => b.type === 'video')).toMatchObject({ provider: 'vimeo', id: '76979871', title: 'Highlights' }))
  })
})

describe('pages in sections', () => {
  const doc = (...texts: string[]) => saved(...texts.map((t) => ({ type: 'paragraph', version: 1, children: [text(t)] })))

  it('draws each section as the site’s own pages do, with a #link from its title', () => {
    const { container } = render(
      <PageSections
        sections={[
          { title: 'Your first week', subtitle: 'Before classes get busy.', body: doc('Get your PantherCard.') },
          { title: 'Finding help', subtitle: '', body: doc('Tutoring is free.') },
          { title: 'Finding help', subtitle: '', body: '' },
        ]}
      />
    )
    const blocks = container.querySelectorAll('section')
    expect(blocks).toHaveLength(3)
    expect(within(blocks[0] as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent('Your first week')
    expect(blocks[0]).toHaveTextContent('Before classes get busy.')
    expect(blocks[0]).toHaveTextContent('Get your PantherCard.')
    expect(blocks[1]).toHaveTextContent('Tutoring is free.')
    expect([...blocks].map((b) => b.id)).toEqual(['your-first-week', 'finding-help', 'finding-help-2'])
  })

  it('reads sections sent from the editor, dropping what isn’t one', () => {
    const sent = JSON.stringify([
      { id: 'a1', title: '  Your   first week ', subtitle: 'Soon', body: doc('Hi') },
      'nonsense',
      { id: 'bad id!', title: 'x'.repeat(200) },
      ...Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, title: `S${i}` })),
    ])
    const sections = parseSections(sent)
    expect(sections).toHaveLength(20)
    expect(sections[0]).toEqual({ id: 'a1', title: 'Your first week', subtitle: 'Soon', anchor: '', body: doc('Hi') })
    expect(sections[1].id).toBe('section-2')
    expect(sections[1].title).toHaveLength(120)
    expect(parseSections('not json')).toEqual([])
  })

  it('saves a page’s layout, subtitle, and sections, needing titles only when shown in sections', () => {
    const form = (fields: Record<string, string>) => {
      const f = new FormData()
      for (const [k, v] of Object.entries({ title: 'Guide', ...fields })) f.set(k, v)
      return f
    }
    const sections = JSON.stringify([{ id: 's1', title: '', subtitle: '', body: '' }])
    const ok = parseDocument(form({ layout: 'document', subtitle: '  The first month.  ', sections }))
    expect(ok.ok && ok.data).toMatchObject({ layout: 'document', subtitle: 'The first month.' })
    const untitled = parseDocument(form({ layout: 'sections', sections }))
    expect(!untitled.ok && untitled.errors).toEqual({ 'section-s1': 'Give this section a title.' })
    const none = parseDocument(form({ layout: 'sections', sections: '[]' }))
    expect(!none.ok && none.errors.sections).toMatch(/Add a section/)
    expect(parseDocument(form({ layout: 'sideways' })).ok && parseDocument(form({ layout: 'sideways' }))).toMatchObject({ data: { layout: 'document', subtitle: null } })
    expect(parseDocument(form({ subtitle: 'x'.repeat(301) })).ok).toBe(false)
  })

  it('joins sections into one piece of writing, each title a heading', () => {
    const joined = joinSections([
      { id: 'a', title: 'Your first week', subtitle: 'Before classes.', anchor: '', body: doc('Get your card.') },
      { id: 'b', title: 'Finding help', subtitle: '', anchor: '', body: '' },
    ])
    render(<DocumentBody source={joined} />)
    expect(screen.getByRole('heading', { name: 'Your first week', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Finding help', level: 2 })).toBeInTheDocument()
    expect(plainText(joined)).toBe('Your first week\nBefore classes.\nGet your card.\nFinding help')
  })
})
