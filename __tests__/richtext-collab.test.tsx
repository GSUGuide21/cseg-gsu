import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $isTableNode } from '@lexical/table'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { $getRoot, $isElementNode, $isTextNode, type LexicalEditor } from 'lexical'

import { RichTextEditor, type CommentsAdapter, type EditorComment, type RichTextValue } from '@/components/Form'
import { $findMatches, findPattern } from '@/components/Form/RichText/FindReplace'
import { DocumentBody } from '@/lib/richtext'
import { parseImageWidth } from '@/lib/richtext/blocks'
import { toPortableText, type LexicalJSON } from '@/lib/richtext/portableText'

const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })
const text = (t: string, format = 0) => ({ type: 'text', version: 1, text: t, format, style: '' })
const cell = (t: string, extra: object = {}) => ({ type: 'tablecell', version: 1, headerState: 0, ...extra, children: [{ type: 'paragraph', version: 1, children: [text(t)] }] })
const blocksOf = (v: RichTextValue | null) => JSON.parse(v!.json).root.children as { type: string; [k: string]: unknown }[]
const lexicalOf = (el: HTMLElement) => (el as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor
/** Every node of a saved document, depth first */
const allNodes = (v: RichTextValue | null) => {
  const out: { type: string; [k: string]: unknown }[] = []
  const walk = (n: { type: string; children?: unknown[] }) => {
    out.push(n as never)
    ;(n.children as { type: string }[] | undefined)?.forEach(walk)
  }
  walk(JSON.parse(v!.json).root)
  return out
}

jest.setTimeout(15000)

beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

/** Selects the words in the editor's first paragraph from `start` to `end` */
const selectWords = (editor: LexicalEditor, start: number, end: number) =>
  act(() =>
    editor.update(() => {
      const first = $getRoot().getFirstChild()
      const node = $isElementNode(first) ? first.getFirstChild() : null
      if ($isTextNode(node)) node.select(start, end)
    })
  )

describe('file uploads', () => {
  it('uploads a file from the File block’s dialog, taking its name', async () => {
    let last: RichTextValue | null = null
    const uploadFile = jest.fn(async () => ({ url: 'https://x.test/files/2026/11/abc/spring-flyer.pdf', name: 'Spring flyer' }))
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" uploadFile={uploadFile} onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    const pdf = new File(['%PDF'], 'Spring Flyer.pdf', { type: 'application/pdf' })
    await act(async () => fireEvent.change(screen.getByLabelText('File to upload'), { target: { files: [pdf] } }))
    expect(uploadFile).toHaveBeenCalledWith(pdf)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Spring flyer'))
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'file')).toMatchObject({ href: 'https://x.test/files/2026/11/abc/spring-flyer.pdf', name: 'Spring flyer' }))
  })

  it('turns a document dropped into the writing into a File block, and an image into an image', async () => {
    let last: RichTextValue | null = null
    const uploadFile = jest.fn(async () => ({ url: 'https://x.test/files/minutes.docx', name: 'Minutes' }))
    const uploadImage = jest.fn(async () => 'https://x.test/media/quad.jpg')
    render(<RichTextEditor aria-label="Body" uploadFile={uploadFile} uploadImage={uploadImage} onChange={(v) => (last = v)} />)
    const editor = lexicalOf(screen.getByRole('textbox', { name: 'Body' }))
    const doc = new File(['x'], 'minutes.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const img = new File(['x'], 'quad.jpg', { type: 'image/jpeg' })
    await act(async () => void editor.dispatchCommand(DRAG_DROP_PASTE, [doc, img]))
    await waitFor(() => expect(blocksOf(last).map((b) => b.type)).toEqual(expect.arrayContaining(['image', 'file'])))
    expect(blocksOf(last).find((b) => b.type === 'file')).toMatchObject({ href: 'https://x.test/files/minutes.docx', name: 'Minutes' })
  })
})

describe('image width', () => {
  it('keeps a width to the step, between the least and the column', () => {
    expect(parseImageWidth(42)).toBe(40)
    expect(parseImageWidth(3)).toBe(10)
    expect(parseImageWidth(250)).toBe(100)
    expect(parseImageWidth('nope')).toBe(0)
  })

  it('shows an image at the width it was given, from tablet width up', () => {
    render(<DocumentBody source={saved({ type: 'image', version: 1, src: 'https://x.test/a.jpg', alt: 'The quad', caption: '', width: 40 })} />)
    const figure = screen.getByRole('img', { name: 'The quad' }).closest('figure')!
    expect(figure).toHaveClass('w-full', 'sm:w-(--image-width)')
    expect(figure.style.getPropertyValue('--image-width')).toBe('40%')
  })

  it('is resized from its handle with the arrow keys once it’s selected', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue={'<figure><img src="https://x.test/a.jpg" alt="The quad"></figure>'} onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    const img = await within(area).findByRole('img', { name: 'The quad' })
    fireEvent.click(img)
    const handle = await screen.findByRole('slider', { name: 'Image width' })
    expect(handle).toHaveAttribute('aria-valuenow', '100')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'image')).toMatchObject({ width: 95 }))
  })
})

describe('tables', () => {
  const table = (extra: object, ...rows: object[][]) => ({ type: 'table', version: 1, ...extra, children: rows.map((cells) => ({ type: 'tablerow', version: 1, children: cells })) })

  it('shows dragged column widths as shares of the table, and stripes its rows', () => {
    const { container } = render(<DocumentBody source={saved(table({ colWidths: [300, 100], rowStriping: true }, [cell('A'), cell('B')]))} />)
    const cols = container.querySelectorAll('col')
    expect([...cols].map((c) => c.style.width)).toEqual(['75%', '25%'])
    expect(container.querySelector('table')!.className).toContain('nth-child(even)')
  })

  it('sorts rows by the cursor’s column from the ribbon, keeping the header row on top, and toggles a header column and stripes', async () => {
    let last: RichTextValue | null = null
    render(
      <RichTextEditor
        aria-label="Body"
        toolbar="ribbon"
        defaultValue="<table><tr><th>Name</th><th>Year</th></tr><tr><td>Sam</td><td>2</td></tr><tr><td>Ari</td><td>10</td></tr><tr><td>Lee</td><td>1</td></tr></table>"
        onChange={(v) => (last = v)}
      />
    )
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('Lee'))
    const editor = lexicalOf(area)
    const column = (i: number) =>
      (blocksOf(last).find((b) => b.type === 'table') as unknown as { children: { children: { children: { children: { text: string }[] }[] }[] }[] }).children.map((r) => r.children[i].children[0].children[0]?.text)
    // The cursor in the Year column's first body cell
    act(() =>
      editor.update(() => {
        const t = $getRoot().getChildren().find($isTableNode)!
        ;(t.getChildAtIndex(1) as unknown as { getChildAtIndex: (i: number) => { selectStart: () => void } }).getChildAtIndex(1).selectStart()
      })
    )
    fireEvent.click(await screen.findByRole('tab', { name: /^Table/ }))
    fireEvent.click(screen.getByRole('button', { name: 'A to Z' }))
    // Numbers by their value, the header row staying where it is
    await waitFor(() => expect(column(1)).toEqual(['Year', '1', '2', '10']))
    fireEvent.click(screen.getByRole('button', { name: 'Z to A' }))
    await waitFor(() => expect(column(0)).toEqual(['Name', 'Ari', 'Sam', 'Lee']))

    fireEvent.click(screen.getByRole('button', { name: 'Striped rows' }))
    await waitFor(() => expect(blocksOf(last).find((b) => b.type === 'table')).toMatchObject({ rowStriping: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Header column' }))
    await waitFor(() =>
      expect(
        (blocksOf(last).find((b) => b.type === 'table') as unknown as { children: { children: { headerState: number }[] }[] }).children.every((r) => (r.children[0].headerState & 2) === 2)
      ).toBe(true)
    )
  })
})

describe('finding', () => {
  /** The matches in a document, as the find bar would see them */
  const find = async (html: string, query: string, options = {}) => {
    render(<RichTextEditor aria-label="Body" defaultValue={html} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area.textContent).not.toBe(''))
    const found = findPattern(query, options)
    return lexicalOf(area).getEditorState().read(() => $findMatches(found && 're' in found ? found.re : null))
  }

  it('finds words whose formatting changes partway, in every run they cross', async () => {
    const matches = await find('<p>The <b>qu</b>ad is green</p>', 'quad')
    expect(matches).toHaveLength(1)
    expect(matches[0].text).toBe('qu' + 'ad')
    expect(matches[0].segments).toHaveLength(2)
  })

  it('finds only whole words when asked', async () => {
    expect(await find('<p>cat category cat</p>', 'cat', { wholeWord: true })).toHaveLength(2)
  })

  it('finds by a pattern, and says when a pattern can’t be searched for', async () => {
    expect((await find('<p>Room 101 and 202</p>', '\\d+', { pattern: true })).map((m) => m.text)).toEqual(['101', '202'])
    expect(findPattern('(', { pattern: true })).toEqual({ error: expect.any(String) })
  })

  it('replaces across formatting, and with a pattern’s groups, from the bar', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue="<p>The <b>qu</b>ad, room 101</p>" onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('room 101'))
    fireEvent.keyDown(area, { key: 'f', ctrlKey: true })
    const bar = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(bar).getByRole('searchbox', { name: 'Find' }), { target: { value: 'quad' } })
    fireEvent.change(within(bar).getByRole('textbox', { name: 'Replace with' }), { target: { value: 'lawn' } })
    await waitFor(() => expect(within(bar).getByText('1 of 1')).toBeInTheDocument())
    fireEvent.click(within(bar).getByRole('button', { name: 'Replace all' }))
    await waitFor(() => expect(last!.text).toBe('The lawn, room 101'))

    fireEvent.click(within(bar).getByRole('checkbox', { name: 'Pattern' }))
    fireEvent.change(within(bar).getByRole('searchbox', { name: 'Find' }), { target: { value: 'room (\\d+)' } })
    fireEvent.change(within(bar).getByRole('textbox', { name: 'Replace with' }), { target: { value: 'Room #$1' } })
    await waitFor(() => expect(within(bar).getByText('1 of 1')).toBeInTheDocument())
    fireEvent.click(within(bar).getByRole('button', { name: 'Replace all' }))
    await waitFor(() => expect(last!.text).toBe('The lawn, Room #101'))

    fireEvent.change(within(bar).getByRole('searchbox', { name: 'Find' }), { target: { value: '(' } })
    expect(within(bar).getByText('Not a valid pattern')).toBeInTheDocument()
  })
})

describe('comments', () => {
  const adapterWith = (comments: EditorComment[] = []): CommentsAdapter & { add: jest.Mock; resolve: jest.Mock; remove: jest.Mock } => ({
    comments,
    add: jest.fn(async () => {}),
    resolve: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
  })

  it('comments on the selected words, marking them in the writing', async () => {
    let last: RichTextValue | null = null
    const adapter = adapterWith()
    render(<RichTextEditor aria-label="Body" defaultValue="<p>Meet at the quad at noon</p>" comments={adapter} onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('quad'))
    expect(screen.getByRole('button', { name: 'Comment (select some words first)' })).toBeDisabled()
    selectWords(lexicalOf(area), 12, 16)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comment on the selected words' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Comment on the selected words' }))

    const panel = screen.getByRole('region', { name: 'Comments' })
    expect(within(panel).getByText('quad')).toBeInTheDocument()
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Write a comment' }), { target: { value: 'The quad is booked that day' } })
    await act(async () => fireEvent.click(within(panel).getByRole('button', { name: 'Comment' })))
    const [[threadId, quote, body]] = adapter.add.mock.calls as unknown as [string, string, string][]
    expect([quote, body]).toEqual(['quad', 'The quad is booked that day'])
    await waitFor(() => expect(allNodes(last).find((n) => n.type === 'mark')).toMatchObject({ ids: [threadId] }))
  })

  it('takes the mark off again when a new comment is cancelled', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue="<p>Meet at the quad</p>" comments={adapterWith()} onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('quad'))
    selectWords(lexicalOf(area), 12, 16)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comment on the selected words' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Comment on the selected words' }))
    await waitFor(() => expect(allNodes(last).some((n) => n.type === 'mark')).toBe(true))
    fireEvent.click(within(screen.getByRole('region', { name: 'Comments' })).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(allNodes(last).some((n) => n.type === 'mark')).toBe(false))
    expect(last!.text).toBe('Meet at the quad')
  })

  it('shows threads with replies, resolves one (unmarking its words), and hides resolved ones', async () => {
    let last: RichTextValue | null = null
    const thread = 'aaaaaaaa-1111-4111-8111-111111111111'
    const marked = saved({ type: 'paragraph', version: 1, children: [text('Meet at the '), { type: 'mark', version: 1, ids: [thread], children: [text('quad')] }] })
    const adapter = adapterWith([
      { id: 'c1', threadId: thread, quote: 'quad', body: 'Booked that day', authorName: 'Sam', createdAt: '2026-11-13T15:00:00Z', resolved: false, mine: false },
      { id: 'c2', threadId: thread, quote: null, body: 'Library then?', authorName: 'Ari', createdAt: '2026-11-13T16:00:00Z', resolved: false, mine: true },
      { id: 'c3', threadId: 'bbbbbbbb-2222', quote: 'noon', body: 'Old', authorName: 'Lee', createdAt: '2026-11-12T15:00:00Z', resolved: true, mine: false },
    ])
    render(<RichTextEditor aria-label="Body" defaultValue={marked} comments={adapter} onChange={(v) => (last = v)} />)
    const panel = screen.getByRole('region', { name: 'Comments' })
    expect(within(panel).getByText('Booked that day')).toBeInTheDocument()
    expect(within(panel).getByText('Library then?')).toBeInTheDocument()
    expect(within(panel).queryByText('Old')).not.toBeInTheDocument()
    // Only one's own comment can be deleted
    expect(within(panel).getAllByRole('button', { name: 'Delete comment' })).toHaveLength(1)

    fireEvent.change(within(panel).getByRole('textbox', { name: 'Reply' }), { target: { value: 'Works for me' } })
    await act(async () => fireEvent.click(within(panel).getByRole('button', { name: 'Reply' })))
    expect(adapter.add).toHaveBeenCalledWith(thread, null, 'Works for me')

    await act(async () => fireEvent.click(within(panel).getByRole('button', { name: 'Resolve' })))
    expect(adapter.resolve).toHaveBeenCalledWith(thread, true)
    await waitFor(() => expect(allNodes(last).some((n) => n.type === 'mark')).toBe(false))
    fireEvent.click(within(panel).getByRole('button', { name: 'Show resolved (1)' }))
    expect(within(panel).getByText('Old')).toBeInTheDocument()
  })

  it('are only words on the site and in Portable Text', () => {
    const marked = { type: 'paragraph', version: 1, children: [text('Meet at the '), { type: 'mark', version: 1, ids: ['aaaaaaaa'], children: [text('quad')] }] }
    const { container } = render(<DocumentBody source={saved(marked)} />)
    expect(container.querySelector('mark')).toBeNull()
    expect(container).toHaveTextContent('Meet at the quad')
    const blocks = toPortableText({ type: 'root', children: [marked] } as unknown as LexicalJSON) as { children: { text: string }[] }[]
    expect(blocks[0].children.map((c) => c.text).join('')).toBe('Meet at the quad')
  })
})
