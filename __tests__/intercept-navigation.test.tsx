import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'

import { useInterceptNavigation } from '../app/hooks/useInterceptNavigation'

const Guarded = ({ dirty, onIntercept }: { dirty: boolean; onIntercept: (to: URL) => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useInterceptNavigation(ref, { shouldIntercept: dirty, onIntercept })
  return (
    <div ref={ref}>
      <a href="/about">Same site</a>
      <a href="/about#faq">Same site, with a hash</a>
      <a href="https://example.com/">Another site</a>
      <a href="#section">On this page</a>
      <a href="/about" target="_blank">New tab</a>
      <a href="/file.pdf" download>
        Download
      </a>
    </div>
  )
}

const click = (name: string, init?: MouseEventInit) => {
  const link = screen.getByRole('link', { name })
  // jsdom doesn't navigate, so whether the click went ahead is whether it was prevented
  return fireEvent.click(link, init)
}

describe('useInterceptNavigation', () => {
  it('holds links that leave the page, on this site or another, with or without a hash', () => {
    const onIntercept = jest.fn()
    render(<Guarded dirty onIntercept={onIntercept} />)
    expect(click('Same site')).toBe(false)
    expect(click('Same site, with a hash')).toBe(false)
    expect(click('Another site')).toBe(false)
    expect(onIntercept).toHaveBeenCalledTimes(3)
    expect(onIntercept.mock.calls[0][0].pathname).toBe('/about')
  })

  it('lets through jumps within the page, new tabs, downloads, and modified clicks', () => {
    const onIntercept = jest.fn()
    render(<Guarded dirty onIntercept={onIntercept} />)
    expect(click('On this page')).toBe(true)
    expect(click('New tab')).toBe(true)
    expect(click('Download')).toBe(true)
    expect(click('Same site', { ctrlKey: true })).toBe(true)
    expect(click('Same site', { button: 1 })).toBe(true)
    expect(onIntercept).not.toHaveBeenCalled()
  })

  it('does nothing while there’s nothing to lose, and follows the latest options without re-rendering stale ones', () => {
    const first = jest.fn()
    const { rerender } = render(<Guarded dirty={false} onIntercept={first} />)
    expect(click('Same site')).toBe(true)
    const second = jest.fn()
    rerender(<Guarded dirty onIntercept={second} />)
    expect(click('Same site')).toBe(false)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('asks before the tab closes only while there’s something to lose', () => {
    const { rerender } = render(<Guarded dirty onIntercept={jest.fn()} />)
    const leaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leaving)
    expect(leaving.defaultPrevented).toBe(true)
    rerender(<Guarded dirty={false} onIntercept={jest.fn()} />)
    const again = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(again)
    expect(again.defaultPrevented).toBe(false)
  })
})
