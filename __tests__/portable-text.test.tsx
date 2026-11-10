import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { $createTextNode, $getRoot, $getSelection, $isRangeSelection, KEY_DOWN_COMMAND, type ElementNode, type LexicalEditor, type TextNode } from 'lexical'

import { RichTextEditor, type RichTextValue } from '@/components/Form'
import { DocumentBody, parseRichText, plainText, safeStyle } from '@/lib/richtext'
import { parsePortableText, portableTextRoot, toPortableText, type LexicalJSON, type PortableTextBlock } from '@/lib/richtext/portableText'

// jsdom doesn't lay anything out; Lexical measures the cursor to scroll it into view, and
// watches the slash menu's size to place it
beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const lexicalOf = (el: HTMLElement) => (el as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor

const types = (v: RichTextValue | null) => JSON.parse(v!.json).root.children.map((b: { type: string }) => b.type)
const portable = (v: RichTextValue | null) => JSON.parse(v!.portableText) as PortableTextBlock[]

/** A saved document's nodes, without the fields Lexical fills in that don't change what's in it */
const shape = (n: LexicalJSON): unknown => {
  const rest = Object.entries(n).filter(([field]) => !['direction', 'textFormat', 'textStyle', 'version', 'value', '$'].includes(field))
  return { ...Object.fromEntries(rest), ...(n.children ? { children: n.children.map(shape) } : {}) }
}

const span = (text: string, marks: string[] = []) => ({ _type: 'span', _key: text, text, marks })
const block = (fields: object) => ({ _type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [span('Hi')], ...fields })

describe('Portable Text', () => {
  it('writes text blocks as the spec does: styles, decorators, and links in markDefs', () => {
    const [heading, para] = toPortableText({
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Fall Social', format: 0 }] },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Join ', format: 1 },
            { type: 'link', url: '/join', children: [{ type: 'text', text: 'us', format: 2 }] },
            { type: 'linebreak' },
          ],
        },
      ],
    }) as PortableTextBlock[]
    expect(heading).toMatchObject({ _type: 'block', style: 'h2', markDefs: [], children: [{ _type: 'span', text: 'Fall Social', marks: [] }] })
    expect(para.style).toBe('normal')
    expect(para.markDefs).toEqual([expect.objectContaining({ _type: 'link', href: '/join' })])
    expect(para.children.map((c) => [c.text, c.marks])).toEqual([
      ['Join ', ['strong']],
      ['us', ['em', para.markDefs[0]._key]],
      ['\n', []],
    ])
  })

  it('flattens lists into blocks with a kind and a level, and folds them back', () => {
    const blocks = [
      block({ _key: 'a', listItem: 'bullet', level: 1, children: [span('One')] }),
      block({ _key: 'b', listItem: 'bullet', level: 2, children: [span('Nested')] }),
      block({ _key: 'c', listItem: 'bullet', level: 1, children: [span('Two')] }),
      block({ _key: 'd', listItem: 'check', level: 1, checked: true, children: [span('Done')] }),
    ]
    const root = portableTextRoot(blocks)
    expect(root.children!.map((c) => c.listType)).toEqual(['bullet', 'check'])
    expect(root.children![0].children!.map((i) => i.children![0].type)).toEqual(['text', 'list', 'text'])
    expect(toPortableText(root).map((b) => [b.listItem, b.level, b.checked])).toEqual([
      ['bullet', 1, undefined],
      ['bullet', 2, undefined],
      ['bullet', 1, undefined],
      ['check', 1, true],
    ])
  })

  it('tells Portable Text from markdown that starts with a bracket', () => {
    expect(parsePortableText('[A link](https://gsu.edu) in a post')).toBeNull()
    expect(parsePortableText('[1, 2]')).toBeNull()
    expect(parsePortableText(JSON.stringify([block({})]))).toHaveLength(1)
    expect(parseRichText('[A link](https://gsu.edu)')).toBeNull()
  })

  it('draws Portable Text on a page, with links kept as safe as the editor’s', () => {
    const source = JSON.stringify([
      block({ style: 'h2', children: [span('Welcome')] }),
      block({
        markDefs: [
          { _type: 'link', _key: 'ok', href: '/join' },
          { _type: 'link', _key: 'bad', href: 'javascript:alert(1)' },
        ],
        children: [span('Join', ['strong', 'ok']), span(' or else', ['bad'])],
      }),
    ])
    render(<DocumentBody source={source} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/join')
    expect(screen.getByText('or else')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(plainText(source)).toBe('Welcome\nJoin or else')
  })

  it('comes through the editor and back without changing the document', async () => {
    const html =
      '<h2 style="text-align:center">Title</h2><p>Some <b>bold</b>, <a href="/join">a link</a>, and <span style="color: red">red</span>.</p>' +
      '<ul><li>One<ul><li>Nested</li></ul></li><li>Two</li></ul><ol start="3"><li>Third</li></ol><blockquote>Said</blockquote>' +
      '<aside data-callout="warning">Careful</aside><hr><table><tr><th>Day</th></tr><tr><td>Monday</td></tr></table>'
    let first: RichTextValue | null = null
    const { unmount } = render(<RichTextEditor aria-label="First" defaultValue={html} onChange={(v) => (first = v)} />)
    await waitFor(() => expect(first?.text).toContain('Monday'))
    const before = JSON.parse(first!.json).root
    const blocks = first!.portableText
    unmount()

    let second: RichTextValue | null = null
    render(<RichTextEditor aria-label="Second" defaultValue={blocks} onChange={(v) => (second = v)} />)
    await waitFor(() => expect(second?.text).toContain('Monday'))
    expect(shape(JSON.parse(second!.json).root)).toEqual(shape(before))
    expect(second!.portableText).toBe(blocks)
  })

  it('says what it can’t open, rather than losing it or failing to start', async () => {
    let last: RichTextValue | null = null
    render(<RichTextEditor aria-label="Body" defaultValue={JSON.stringify([block({}), { _type: 'youtube', _key: 'y', url: 'x' }])} onChange={(v) => (last = v)} />)
    await waitFor(() => expect(last?.text).toContain('Unsupported block: youtube'))
  })

  it('sends Portable Text with the form when asked', async () => {
    const { container } = render(<RichTextEditor aria-label="Body" portableTextName="body_pt" defaultValue="<p>Hello</p>" />)
    await waitFor(() => expect(container.querySelector<HTMLInputElement>('input[name="body_pt"]')!.value).toContain('Hello'))
  })
})

describe('writing with blocks', () => {
  /** An editor with these lines, and the cursor at the end of one */
  const start = async (html: string, line = 0) => {
    const box: { last: RichTextValue | null } = { last: null }
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue={html} onChange={(v) => (box.last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(box.last).not.toBeNull())
    const editor = lexicalOf(area)
    // Focused, as when someone's typing: only then does Lexical put the page's selection back after moving a block
    act(() => area.focus())
    act(() => editor.update(() => $getRoot().getChildAtIndex<ElementNode>(line)!.selectEnd()))
    return { box, area, editor }
  }

  const press = (editor: LexicalEditor, init: KeyboardEventInit) =>
    act(async () =>
      editor.update(() => {
        editor.dispatchCommand(KEY_DOWN_COMMAND, new KeyboardEvent('keydown', { cancelable: true, ...init }))
      })
    )

  /** What each block says, in order */
  const lines = (editor: LexicalEditor) =>
    editor.read(() =>
      $getRoot()
        .getChildren()
        .map((n) => n.getTextContent())
    )

  const lastLine = () => $getRoot().getLastChildOrThrow<ElementNode>()

  /** Replaces a line's text, with the cursor after it */
  const typeOn = (editor: LexicalEditor, text: string, line = lastLine) =>
    act(async () =>
      editor.update(() => {
        line().clear().append($createTextNode(text))
        line().selectEnd()
      })
    )

  /** One more keystroke at the cursor, which is what markdown shortcuts listen for */
  const keystroke = (editor: LexicalEditor, char: string) =>
    act(async () =>
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) selection.insertText(char)
      })
    )

  it('moves a block from the keyboard, stopping at the ends', async () => {
    const { editor } = await start('<p>One</p><p>Two</p><p>Three</p>', 1)
    await press(editor, { key: 'ArrowUp', altKey: true })
    await waitFor(() => expect(lines(editor)).toEqual(['Two', 'One', 'Three']))
    await press(editor, { key: 'ArrowUp', altKey: true })
    await press(editor, { key: 'ArrowDown', altKey: true })
    await press(editor, { key: 'ArrowDown', altKey: true })
    await waitFor(() => expect(lines(editor)).toEqual(['One', 'Three', 'Two']))
    await press(editor, { key: 'ArrowDown', altKey: true })
    await act(async () => {})
    expect(lines(editor)).toEqual(['One', 'Three', 'Two'])
  })

  it('duplicates a block with what’s inside it, keeping the cursor in the first', async () => {
    const { box, editor } = await start('<blockquote>Said <b>this</b></blockquote><p>After</p>')
    await press(editor, { key: 'ArrowDown', altKey: true, shiftKey: true })
    await waitFor(() => expect(types(box.last)).toEqual(['quote', 'quote', 'paragraph']))
    expect(lines(editor)).toEqual(['Said this', 'Said this', 'After'])
    expect(JSON.parse(box.last!.json).root.children[1].children[1]).toMatchObject({ text: 'this', format: 1 })
    await press(editor, { key: 'ArrowUp', altKey: true, shiftKey: true })
    await act(async () => {})
    expect(types(box.last)).toEqual(['quote', 'quote', 'paragraph'])
  })

  it('joins a duplicated list onto itself, as lists side by side always are', async () => {
    const { box, editor } = await start('<ul><li>One</li><li>Two</li></ul>')
    await press(editor, { key: 'ArrowDown', altKey: true, shiftKey: true })
    await waitFor(() => expect(lines(editor)).toEqual(['One\n\nTwo\n\nOne\n\nTwo']))
    expect(types(box.last)).toEqual(['list'])
  })

  it('sets styles from the keyboard', async () => {
    const { box, editor } = await start('<p>Title</p>')
    await press(editor, { code: 'Digit4', ctrlKey: true, altKey: true })
    await waitFor(() => expect(JSON.parse(box.last!.json).root.children[0].tag).toBe('h4'))
    await press(editor, { code: 'Digit9', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(JSON.parse(box.last!.json).root.children[0].listType).toBe('check'))
  })

  it('turns markdown into blocks as it’s typed', async () => {
    const { box, area, editor } = await start('<p><br></p>')
    await typeOn(editor, '##')
    await keystroke(editor, ' ')
    await waitFor(() => expect(area.querySelector('h2')).toBeInTheDocument())
    expect(types(box.last)).toEqual(['heading'])
  })

  it('starts a checklist from "[ ] "', async () => {
    const { box, editor } = await start('<p><br></p>')
    await typeOn(editor, '[ ]')
    await keystroke(editor, ' ')
    await waitFor(() => expect(JSON.parse(box.last!.json).root.children[0].listType).toBe('check'))
  })

  it('makes a divider of "---" and carries on below it', async () => {
    const { box, editor } = await start('<p><br></p>')
    await typeOn(editor, '---')
    await keystroke(editor, ' ')
    await waitFor(() => expect(types(box.last)).toEqual(['horizontalrule', 'paragraph']))
  })

  it('leaves an FAQ question a plain line, whether by markdown or the keyboard', async () => {
    const { box, editor } = await start('<p><br></p>')
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    fireEvent.click(screen.getByRole('button', { name: 'FAQ' }))
    await waitFor(() => expect(types(box.last)).toContain('faq'))
    const question = () => $getRoot().getFirstChildOrThrow<ElementNode>().getFirstChildOrThrow<ElementNode>().getFirstChildOrThrow<ElementNode>()
    await typeOn(editor, '##', question)
    await keystroke(editor, ' ')
    await waitFor(() => expect(box.last!.text).toContain('## '))
    await press(editor, { code: 'Digit1', ctrlKey: true, altKey: true })
    await act(async () => {})
    expect(box.last!.json).toContain('"faq-question"')
    expect(box.last!.json).not.toContain('"heading"')
  })

  it('offers every block on "/", narrows as it’s typed, and takes the "/…" out', async () => {
    const { box, editor } = await start('<p>Intro</p><p><br></p>', 1)
    await typeOn(editor, '/')
    expect(await screen.findByRole('option', { name: 'Divider' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Checklist' })).toBeInTheDocument()
    await typeOn(editor, '/headi')
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Divider' })).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('option', { name: 'Heading 2' }))
    await waitFor(() => expect(types(box.last)).toEqual(['paragraph', 'heading']))
    expect(box.last!.text).not.toContain('/')
  })

  it('opens a block’s dialog from "/", and puts the block where it was typed', async () => {
    const { box, editor } = await start('<p>Intro</p><p><br></p><p>Outro</p>', 1)
    act(() =>
      editor.update(() => {
        const line = $getRoot().getChildAtIndex<ElementNode>(1)!
        line.append($createTextNode('/butt'))
        line.selectEnd()
      })
    )
    fireEvent.click(await screen.findByRole('option', { name: /^Buttons/ }, { timeout: 5000 }))
    const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 })
    fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Join' } })
    fireEvent.change(within(dialog).getByLabelText('Link'), { target: { value: '/join' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Insert' }))
    await waitFor(() => expect(types(box.last)).toEqual(['paragraph', 'buttons', 'paragraph']))
  })

  it('stays out of the way in a code block', async () => {
    const { editor } = await start('<pre><code>x</code></pre>')
    await typeOn(editor, '/')
    await act(async () => {})
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('aligns and indents a block, and shows it so on a page', async () => {
    const { box } = await start('<p>Line</p>')
    fireEvent.click(screen.getByRole('tab', { name: 'Format' }))
    fireEvent.click(screen.getByRole('button', { name: 'Center' }))
    fireEvent.click(screen.getByRole('button', { name: 'Indent more' }))
    await waitFor(() => expect(JSON.parse(box.last!.json).root.children[0]).toMatchObject({ format: 'center', indent: 1 }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Center' })).toHaveAttribute('aria-pressed', 'true'))
    expect(portable(box.last)[0]).toMatchObject({ align: 'center', indent: 1 })
    const { container } = render(<DocumentBody source={box.last!.json} />)
    const line = container.querySelector('p')!
    expect(line).toHaveClass('text-center')
    expect(line).toHaveStyle({ paddingInlineStart: '40px' })
  })

  it('shows a checklist on a page, saying which are done', () => {
    const item = (text: string, checked?: boolean) => ({ type: 'listitem', version: 1, checked, children: [{ type: 'text', version: 1, text, format: 0 }] })
    const list = { type: 'list', version: 1, listType: 'check', tag: 'ul', children: [item('Get card', true), item('Find class')] }
    render(<DocumentBody source={JSON.stringify({ root: { type: 'root', version: 1, children: [list] } })} />)
    const [done, todo] = screen.getAllByRole('listitem')
    expect(done).toHaveTextContent('Done: Get card')
    expect(todo).toHaveTextContent('Not done: Find class')
  })

  it('has the block’s tools on the right-click', async () => {
    const { area, editor } = await start('<p>One</p><p>Two</p>')
    fireEvent.contextMenu(area)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /Move up/ })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Move down/ }))
    await waitFor(() => expect(lines(editor)).toEqual(['Two', 'One']))
  })

  it('has no block tools when read-only', () => {
    const { container } = render(<RichTextEditor readOnly aria-label="Preview" defaultValue="<p>Hi</p>" />)
    expect(container.querySelector('[data-block-gutter]')).not.toBeInTheDocument()
  })
})

describe('font sizes, in points', () => {
  const sized = (style: string) => JSON.stringify({ root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: null, format: '', indent: 0, textFormat: 0, textStyle: '', children: [{ type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style, text: 'Words' }] }] } })

  /** An editor on this text, with the words selected */
  const start = async (style: string) => {
    const box: { last: RichTextValue | null } = { last: null }
    render(<RichTextEditor aria-label="Body" toolbar="ribbon" defaultValue={sized(style)} onChange={(v) => (box.last = v)} />)
    const area = screen.getByRole('textbox', { name: 'Body' })
    await waitFor(() => expect(box.last).not.toBeNull())
    act(() => area.focus())
    await act(async () => lexicalOf(area).update(() => $getRoot().getFirstChildOrThrow<ElementNode>().getFirstChildOrThrow<TextNode>().select(0, 5)))
    return box
  }
  const box = () => screen.getByRole('combobox', { name: 'Text size, in points' })
  const saved = (v: RichTextValue | null) => JSON.parse(v!.json).root.children[0].children[0].style

  it('shows text with no size as the page’s 12', async () => {
    await start('')
    await waitFor(() => expect(box()).toHaveValue('12'))
  })

  it('shows sizes saved in pixels in points, without changing them until asked', async () => {
    const value = await start('font-size: 24px;')
    await waitFor(() => expect(box()).toHaveValue('18'))
    expect(saved(value.last)).toContain('24px')
    fireEvent.click(screen.getByRole('button', { name: 'Larger text' }))
    await waitFor(() => expect(saved(value.last)).toContain('font-size: 20pt'))
    expect(saved(value.last)).not.toContain('px')
  })

  it('shows a pixel size between points to the half point', async () => {
    await start('font-size: 14px;')
    await waitFor(() => expect(box()).toHaveValue('10.5'))
  })

  it('takes a typed size in points, and turns down one out of range', async () => {
    const value = await start('')
    fireEvent.focus(box())
    fireEvent.change(box(), { target: { value: '26pt' } })
    fireEvent.keyDown(box(), { key: 'Enter' })
    await waitFor(() => expect(saved(value.last)).toContain('font-size: 26pt'))
    fireEvent.focus(box())
    fireEvent.change(box(), { target: { value: '500' } })
    fireEvent.keyDown(box(), { key: 'Enter' })
    await act(async () => {})
    expect(saved(value.last)).toContain('font-size: 26pt')
  })

  it('draws old and new sizes on a page', () => {
    expect(safeStyle('font-size: 18pt')).toEqual({ fontSize: '18pt' })
    expect(safeStyle('font-size: 24px')).toEqual({ fontSize: '24px' })
  })
})
