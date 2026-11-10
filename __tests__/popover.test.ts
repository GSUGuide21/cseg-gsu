import { opensAbove } from '@/components/Form/usePopover'

const rect = (top: number, bottom: number) => ({ top, bottom }) as DOMRect

/** A control inside a wrapper, both at set positions on a 800 px tall window */
const control = (box: DOMRect, wrapper?: { box: DOMRect; overflowY: string }) => {
  const parent = document.body.appendChild(document.createElement('div'))
  const el = parent.appendChild(document.createElement('div'))
  el.getBoundingClientRect = () => box
  if (wrapper) {
    parent.style.overflowY = wrapper.overflowY
    parent.getBoundingClientRect = () => wrapper.box
  }
  return el
}

describe('opensAbove', () => {
  beforeEach(() => {
    window.innerHeight = 800
  })

  it('opens downward with room below', () => {
    expect(opensAbove(control(rect(100, 140)), 280)).toBe(false)
  })

  it('opens upward near the bottom of the window', () => {
    expect(opensAbove(control(rect(700, 740)), 280)).toBe(true)
  })

  it('measures from what scrolls or clips the control, not the window', () => {
    const inSheet = { box: rect(560, 800), overflowY: 'auto' }
    // Low on the screen, but the panel would be cut off above: more room down
    expect(opensAbove(control(rect(570, 610), inSheet), 280)).toBe(false)
  })

  it('ignores wrappers that don’t clip', () => {
    expect(opensAbove(control(rect(700, 740), { box: rect(690, 750), overflowY: 'visible' }), 280)).toBe(true)
  })
})
