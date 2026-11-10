import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $getRoot, type ElementNode, type LexicalEditor, type TextNode } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { DocumentBody } from '@/lib/richtext'

beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})

const UNDERLINE = 8
const STRIKE = 4

const saved = (format: number, style: string) => JSON.stringify({ root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Words', format, style }] }] } })

describe('lines on a page', () => {
  it('puts an underline’s color and type on the element that draws it', () => {
    render(<DocumentBody source={saved(UNDERLINE, 'text-decoration-color: #dc2626; text-decoration-style: wavy; font-size: 14pt')} />)
    const drawn = screen.getByText('Words')
    expect(drawn).toHaveClass('underline')
    expect(drawn).toHaveStyle({ textDecorationColor: '#dc2626', textDecorationStyle: 'wavy' })
    // The rest stays on the span around it
    expect(drawn.parentElement).toHaveStyle({ fontSize: '14pt' })
    expect(drawn.parentElement!.style.textDecorationStyle).toBe('')
  })

  it('does the same for an underline with a line through it, and a line through alone', () => {
    const { unmount } = render(<DocumentBody source={saved(UNDERLINE + STRIKE, 'text-decoration-style: dashed')} />)
    expect(screen.getByText('Words')).toHaveStyle({ textDecorationStyle: 'dashed' })
    unmount()
    render(<DocumentBody source={saved(STRIKE, 'text-decoration-style: dotted')} />)
    expect(screen.getByText('Words').tagName).toBe('S')
    expect(screen.getByText('Words')).toHaveStyle({ textDecorationStyle: 'dotted' })
  })

  it('shows a border’s type and size', () => {
    render(<DocumentBody source={saved(0, 'border-color: #0039a6; border-style: dashed; border-width: 3px')} />)
    expect(screen.getByText('Words').closest('span[style]')).toHaveStyle({ borderStyle: 'dashed', borderWidth: '3px' })
  })

  it('leaves out a value that isn’t safe', () => {
    render(<DocumentBody source={saved(UNDERLINE, 'text-decoration-style: url(evil)')} />)
    expect(screen.getByText('Words').style.textDecorationStyle).toBe('')
  })
})

describe('line tools in the editor', () => {
  /** An editor on "Hello world" with all of it selected, the given tool open from the Format tab */
  const open = async (tool: string) => {
    const box: { last: RichTextValue | null } = { last: null }
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue="<p>Hello world</p>" onChange={(v) => (box.last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(box.last).not.toBeNull())
    act(() => area.focus())
    const editor = (area as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor
    await act(async () => editor.update(() => $getRoot().getFirstChildOrThrow<ElementNode>().getFirstChildOrThrow<TextNode>().select(0, 11)))
    fireEvent.click(screen.getByRole('tab', { name: 'Format' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${tool}`) }))
    return { box, panel: await screen.findByRole('dialog', { name: tool }) }
  }

  const firstText = (v: RichTextValue | null) => JSON.parse(v!.json).root.children[0].children[0]
  const pick = (panel: HTMLElement, group: string, name: string) => fireEvent.click(within(within(panel).getByRole('radiogroup', { name: group })).getByRole('radio', { name }))

  it('underlines the words with the type picked', async () => {
    const { box, panel } = await open('Underline style')
    pick(panel, 'Type', 'Wavy')
    await waitFor(() => expect(firstText(box.last).style).toContain('text-decoration-style: wavy'))
    expect(firstText(box.last).format & UNDERLINE).toBeTruthy()
  })

  it('saves nothing for a single line, and None goes back to a plain underline', async () => {
    const { box, panel } = await open('Underline style')
    pick(panel, 'Type', 'Double')
    await waitFor(() => expect(firstText(box.last).style).toContain('double'))
    pick(panel, 'Type', 'Single')
    await waitFor(() => expect(firstText(box.last).style ?? '').not.toContain('text-decoration-style'))
    pick(panel, 'Type', 'Dotted')
    await waitFor(() => expect(firstText(box.last).style).toContain('dotted'))
    fireEvent.click(within(panel).getByRole('button', { name: 'None' }))
    await waitFor(() => expect(firstText(box.last).style ?? '').not.toContain('text-decoration-style'))
    expect(firstText(box.last).format & UNDERLINE).toBeTruthy()
  })

  it('keeps the type when Done is pressed with no color picked', async () => {
    const { box, panel } = await open('Underline style')
    pick(panel, 'Type', 'Wavy')
    await waitFor(() => expect(firstText(box.last).style).toContain('wavy'))
    fireEvent.click(within(panel).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(firstText(box.last).style).toContain('wavy')
  })

  it('puts a border on from its type or size alone, keeping the rest of its look', async () => {
    const { box, panel } = await open('Border style')
    pick(panel, 'Type', 'Dashed')
    await waitFor(() => expect(firstText(box.last).style).toContain('border-style: dashed'))
    expect(firstText(box.last).style).toContain('border-width: 1.5px')
    expect(firstText(box.last).style).toContain('border-color: #0039a6')
    pick(panel, 'Size', 'Thick')
    await waitFor(() => expect(firstText(box.last).style).toContain('border-width: 3px'))
    expect(firstText(box.last).style).toContain('border-style: dashed')
  })

  it('makes a double border wide enough to show two lines', async () => {
    const { box, panel } = await open('Border style')
    pick(panel, 'Type', 'Double')
    await waitFor(() => expect(firstText(box.last).style).toContain('border-style: double'))
    expect(firstText(box.last).style).toContain('border-width: 3px')
  })

  it('takes all of a border off with None', async () => {
    const { box, panel } = await open('Border style')
    pick(panel, 'Type', 'Dotted')
    await waitFor(() => expect(firstText(box.last).style).toContain('dotted'))
    fireEvent.click(within(panel).getByRole('button', { name: 'None' }))
    await waitFor(() => expect(firstText(box.last).style ?? '').not.toContain('border'))
  })
})
