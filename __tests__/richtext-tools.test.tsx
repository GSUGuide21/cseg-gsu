import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $createTableSelection, $isTableCellNode, $isTableNode, $isTableRowNode, type TableCellNode } from '@lexical/table'
import { $getRoot, $setSelection, type LexicalEditor } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { DocumentBody, documentHeadings } from '@/lib/richtext'

const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })
const text = (t: string) => ({ type: 'text', version: 1, text: t, format: 0, style: '' })
const heading = (tag: string, t: string) => ({ type: 'heading', version: 1, tag, children: [text(t)] })
const cell = (t: string, extra: object = {}) => ({ type: 'tablecell', version: 1, headerState: 0, ...extra, children: [{ type: 'paragraph', version: 1, children: [text(t)] }] })
const blocksOf = (v: RichTextValue | null) => JSON.parse(v!.json).root.children as { type: string; [k: string]: unknown }[]
const lexicalOf = (el: HTMLElement) => (el as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor

jest.setTimeout(15000)

beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

/** Every cell of the editor's first table, row by row */
const $cells = (): TableCellNode[][] => {
  const table = $getRoot().getChildren().find($isTableNode)
  return (table?.getChildren() ?? []).filter($isTableRowNode).map((row) => row.getChildren().filter($isTableCellNode))
}

describe('on a page', () => {
  it('spans a merged cell across the cells it took in, with its background, and no unsafe color', () => {
    render(
      <DocumentBody
        source={saved({
          type: 'table',
          version: 1,
          children: [
            { type: 'tablerow', version: 1, children: [cell('Both', { colSpan: 2, backgroundColor: '#facc15' })] },
            { type: 'tablerow', version: 1, children: [cell('A', { backgroundColor: 'url(javascript:x)' }), cell('B')] },
          ],
        })}
      />
    )
    const both = screen.getByText('Both').closest('td')!
    expect(both).toHaveAttribute('colspan', '2')
    expect(both).toHaveStyle({ backgroundColor: '#facc15' })
    expect(screen.getByText('A').closest('td')!.getAttribute('style')).toBeNull()
  })

  it('gives h2 to h4 a #link each, numbering a second one with the same words, and keeps their names', () => {
    const source = saved(heading('h2', 'Getting here'), heading('h3', 'By MARTA'), heading('h2', 'Getting here'), heading('h4', 'Parking'), heading('h5', 'Small print'))
    render(<DocumentBody source={source} />)
    const [first, second] = screen.getAllByRole('heading', { name: 'Getting here' })
    expect(first).toHaveAttribute('id', 'getting-here')
    expect(second).toHaveAttribute('id', 'getting-here-2')
    expect(screen.getByRole('heading', { name: 'By MARTA' })).toHaveAttribute('id', 'by-marta')
    expect(screen.getByRole('heading', { name: 'Parking' })).toHaveAttribute('id', 'parking')
    expect(screen.getByRole('heading', { name: 'Small print' })).not.toHaveAttribute('id')
    // The "On this page" list links to the same places
    expect(documentHeadings(source)).toEqual([
      { id: 'getting-here', text: 'Getting here' },
      { id: 'getting-here-2', text: 'Getting here' },
    ])
  })

  it('keeps a block’s own line spacing, and only the spacings it knows', () => {
    render(
      <DocumentBody
        source={saved(
          { type: 'paragraph', version: 1, $: { lineHeight: '2' }, children: [text('Double')] },
          { type: 'paragraph', version: 1, $: { lineHeight: '9; color: red' }, children: [text('Nope')] }
        )}
      />
    )
    expect(screen.getByText('Double').closest('p')).toHaveStyle({ lineHeight: '2' })
    expect(screen.getByText('Nope').closest('p')!.getAttribute('style')).toBeNull()
  })
})

describe('in the editor', () => {
  it('finds, counts, and replaces, with Match case, from ⌘/Ctrl+F', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue="<p>The quad, the Quad, and the quadrangle.</p>" onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('The quad'))
    fireEvent.keyDown(area, { key: 'f', ctrlKey: true })
    const bar = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(bar).getByRole('searchbox', { name: 'Find' }), { target: { value: 'quad' } })
    await waitFor(() => expect(within(bar).getByText('1 of 3')).toBeInTheDocument())
    fireEvent.click(within(bar).getByRole('checkbox', { name: 'Match case' }))
    await waitFor(() => expect(within(bar).getByText('1 of 2')).toBeInTheDocument())
    fireEvent.click(within(bar).getByRole('button', { name: 'Next match' }))
    expect(within(bar).getByText('2 of 2')).toBeInTheDocument()

    fireEvent.change(within(bar).getByRole('textbox', { name: 'Replace with' }), { target: { value: 'lawn' } })
    fireEvent.click(within(bar).getByRole('button', { name: 'Replace all' }))
    await waitFor(() => expect(last!.text).toBe('The lawn, the Quad, and the lawnrangle.'))
    expect(within(bar).getByText('Replaced 2 matches')).toBeInTheDocument()
    // Escape closes the bar
    fireEvent.keyDown(within(bar).getByRole('searchbox', { name: 'Find' }), { key: 'Escape' })
    expect(screen.queryByRole('search', { name: 'Find and replace' })).not.toBeInTheDocument()
  })

  it('replaces one match at a time, moving on to the next', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue="<p>cat cat cat</p>" onChange={(v) => (last = v)} />)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Body' })).toHaveTextContent('cat'))
    fireEvent.click(screen.getByRole('button', { name: /Find and replace/ }))
    const bar = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(bar).getByRole('searchbox', { name: 'Find' }), { target: { value: 'cat' } })
    fireEvent.change(within(bar).getByRole('textbox', { name: 'Replace with' }), { target: { value: 'dog' } })
    fireEvent.click(within(bar).getByRole('button', { name: 'Next match' }))
    fireEvent.click(within(bar).getByRole('button', { name: 'Replace' }))
    await waitFor(() => expect(last!.text).toBe('cat dog cat'))
    await waitFor(() => expect(within(bar).getByText('Replaced 1 match')).toBeInTheDocument())
  })

  it('lists the keyboard shortcuts from ⌘/Ctrl+/', async () => {
    render(<RichTextEditor aria-label="Body" />)
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Body' }), { key: '/', ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getByText('Find and replace')).toBeInTheDocument()
    expect(within(dialog).getByText('Move the block up or down')).toBeInTheDocument()
  })

  it('fills the window in full screen, and Escape leaves it', async () => {
    render(<RichTextEditor aria-label="Body" />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    const frame = area.closest('.rounded-lg')!
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    expect(frame).toHaveClass('fixed', 'inset-0')
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('button', { name: 'Leave full screen (Esc)' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(area, { key: 'Escape' })
    await waitFor(() => expect(frame).not.toHaveClass('fixed'))
    expect(document.body.style.overflow).toBe('')
  })

  it('puts in an emoji or symbol at the cursor', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" onChange={(v) => (last = v)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji and symbols' }))
    fireEvent.click(await screen.findByRole('button', { name: '🐾' }))
    await waitFor(() => expect(last!.text).toBe('🐾'))
    fireEvent.click(screen.getByRole('button', { name: 'Emoji and symbols' }))
    fireEvent.click(await screen.findByRole('button', { name: '→' }))
    await waitFor(() => expect(last!.text).toBe('🐾→'))
  })

  it('sets a paragraph’s line spacing from the ribbon, saved with it and drawn in the editor', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue="<p>Spaced out</p>" onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('Spaced out'))
    act(() => lexicalOf(area).update(() => $getRoot().selectEnd()))
    fireEvent.click(await screen.findByRole('button', { name: 'Line spacing: usual' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Double' }))
    await waitFor(() => expect(blocksOf(last)[0]).toMatchObject({ type: 'paragraph', $: { lineHeight: '2' } }))
    expect(within(area).getByText('Spaced out').closest('p')).toHaveStyle({ lineHeight: '2' })
  })

  it('merges selected cells from the ribbon, and splits them back', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue="<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>" onChange={(v) => (last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(area).toHaveTextContent('D'))
    const editor = lexicalOf(area)
    const firstRow = () => (blocksOf(last).find((b) => b.type === 'table') as unknown as { children: { children: { colSpan?: number; backgroundColor?: string }[] }[] }).children[0].children

    act(() => editor.update(() => $cells()[0][0].selectStart()))
    fireEvent.click(await screen.findByRole('tab', { name: /^Table/ }))
    // With only a text cursor, merging does nothing: there's one cell
    fireEvent.click(screen.getByRole('button', { name: 'Merge cells' }))
    await waitFor(() => expect(firstRow()).toHaveLength(2))

    // A and B selected across, as a drag would
    act(() =>
      editor.update(() => {
        const [[a, b]] = $cells()
        const table = $getRoot().getChildren().find($isTableNode)!
        const selection = $createTableSelection()
        selection.set(table.getKey(), a.getKey(), b.getKey())
        $setSelection(selection)
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Merge cells' }))
    await waitFor(() => expect(firstRow()).toHaveLength(1))
    expect(firstRow()[0].colSpan).toBe(2)

    act(() => editor.update(() => $cells()[0][0].selectStart()))
    fireEvent.click(screen.getByRole('button', { name: 'Split cell' }))
    await waitFor(() => expect(firstRow()).toHaveLength(2))
  })
})
