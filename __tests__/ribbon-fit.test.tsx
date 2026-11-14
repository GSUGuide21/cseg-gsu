import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { RichTextEditor } from '@/components/Form'

/** Each big button is worth this much width; jsdom doesn't lay anything out */
const TOOL = 60

let room = 2000
let resized: (() => void)[] = []

const isPanel = (el: Element) => el.getAttribute('role') === 'toolbar' && /tools$/.test(el.getAttribute('aria-label') ?? '')

/** A group is as wide as its tools, half that once they're in two rows */
const contentWidth = (panel: Element) =>
  [...panel.children].reduce((sum, child) => {
    const tools = child.querySelectorAll('[data-tool]').length * TOOL
    return sum + (child.querySelector('.grid-rows-2') ? tools / 2 : tools)
  }, 0)

beforeAll(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => room })
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return isPanel(this) ? contentWidth(this) : 0
    },
  })
  global.ResizeObserver = class {
    constructor(private readonly report: () => void) {
      resized.push(report)
    }
    observe() {}
    unobserve() {}
    disconnect() {
      resized = resized.filter((r) => r !== this.report)
    }
  } as unknown as typeof ResizeObserver
})

afterAll(() => {
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth
})

beforeEach(() => {
  room = 2000
})

const resize = (width: number) => {
  room = width
  act(() => resized.forEach((report) => report()))
}

const openInsert = () => {
  render(<RichTextEditor aria-label="Body" toolbar="ribbon" />)
  fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
}

const group = (name: string) => screen.getByRole('group', { name })
const inTwoRows = (name: string) => group(name).querySelector('.grid-rows-2') !== null

describe('the ribbon fitting its width', () => {
  // The Insert tab is 1860 wide in one row, 1140 in two; up to the end of Live it's 910 in two
  it('keeps one row of big buttons when there’s room', () => {
    openInsert()
    expect(inTwoRows('Layout')).toBe(false)
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('moves to two rows before anything goes behind More', () => {
    room = 1200
    openInsert()
    expect(inTwoRows('Layout')).toBe(true)
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('leaves a group of small tools as it is in two rows', () => {
    room = 1200
    openInsert()
    expect(inTwoRows('In the line')).toBe(false)
  })

  it('puts groups behind More from the end, only as many as it must', async () => {
    room = 910
    openInsert()
    expect(screen.queryByRole('group', { name: 'Blocks' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'In the line' })).not.toBeInTheDocument()
    expect(group('Live')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const more = await screen.findByRole('dialog', { name: 'More tools' })
    expect(within(more).getByRole('button', { name: 'Divider' })).toBeEnabled()
    expect(within(more).getByRole('button', { name: 'Footnote' })).toBeEnabled()
  })

  it('keeps More in reach when not even the first group fits', () => {
    room = 100
    openInsert()
    expect(screen.queryByRole('group', { name: 'Tables' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  it('brings everything back as the editor gets wider', () => {
    room = 910
    openInsert()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()

    resize(2000)
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
    expect(inTwoRows('Layout')).toBe(false)
    expect(group('Blocks')).toBeInTheDocument()
  })

  it('fits each tab on its own', () => {
    room = 910
    openInsert()
    fireEvent.click(screen.getByRole('tab', { name: 'Format' }))
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('keeps the arrow keys inside More', async () => {
    room = 910
    openInsert()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const more = await screen.findByRole('dialog', { name: 'More tools' })
    const tools = within(more).getByRole('toolbar', { name: 'More tools' })
    const first = await within(tools).findByRole('button', { name: 'Chip' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(within(tools).getByRole('button', { name: 'Quote' }))
  })
})
