import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'

import {
  Accordion,
  Alert,
  Badge,
  IndicatorBadge,
  Breadcrumb,
  Button,
  Card,
  Carousel,
  Gallery,
  Meter,
  NotificationProvider,
  Offcanvas,
  Pagination,
  Popover,
  Progress,
  RadialMeter,
  Tooltip,
  pageRange,
  useNotify,
} from '../app/components'

describe('Button', () => {
  it('is a button by default, and ignores clicks while loading', () => {
    const onClick = jest.fn()
    const { rerender } = render(<Button onClick={onClick}>Save</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(
      <Button onClick={onClick} loading>
        Save
      </Button>
    )
    const busy = screen.getByRole('button', { name: 'Save' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(busy)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a link with href, and says when it opens a new tab', () => {
    render(
      <>
        <Button href="/join">Join</Button>
        <Button href="https://gsu.edu">GSU</Button>
      </>
    )
    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/join')
    const out = screen.getByRole('link', { name: 'GSU (opens in a new tab)' })
    expect(out).toHaveAttribute('target', '_blank')
    expect(out).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('Badge', () => {
  it('has a remove button named for its label', () => {
    const onRemove = jest.fn()
    render(<Badge onRemove={onRemove}>Workshops</Badge>)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Workshops' }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('names an icon-only badge by its label', () => {
    render(<Badge icon={<svg aria-hidden />} label="Verified" />)
    expect(screen.getByText('Verified')).toHaveClass('sr-only')
    expect(screen.getByTitle('Verified')).toBeInTheDocument()
  })
})

describe('IndicatorBadge', () => {
  it('describes the element it sits on, caps the count, and hides at zero', () => {
    const { rerender } = render(
      <IndicatorBadge count={120} label="120 unread">
        <button type="button" aria-label="Notifications" />
      </IndicatorBadge>
    )
    const button = screen.getByRole('button', { name: 'Notifications' })
    expect(button).toHaveAccessibleDescription('120 unread')
    expect(screen.getByText('99+')).toHaveAttribute('aria-hidden', 'true')

    rerender(
      <IndicatorBadge count={0} label="0 unread">
        <button type="button" aria-label="Notifications" />
      </IndicatorBadge>
    )
    expect(button).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('Card', () => {
  it('makes the whole card one link, named by its title', () => {
    render(<Card title="Study groups" description="Weekly sessions" href="/events" />)
    expect(screen.getByRole('link', { name: 'Study groups' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('heading', { level: 3, name: 'Study groups' })).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('says its tone in words, announces urgent ones, and can be dismissed', () => {
    const onDismiss = jest.fn()
    render(
      <Alert tone="danger" title="Couldn’t save" live onDismiss={onDismiss}>
        Check your connection.
      </Alert>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Error: Couldn’t save')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('is just content when not live', () => {
    render(<Alert title="Heads up">Registration closes Friday.</Alert>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Accordion', () => {
  const items = [
    { title: 'When do we meet?', content: 'Thursdays.' },
    { title: 'Where?', content: 'Student Center West.' },
  ]

  it('groups single-open sections under one name, and opens defaults', () => {
    const { container } = render(<Accordion items={items} defaultOpen={['Where?']} />)
    const details = container.querySelectorAll('details')
    expect(details[0].getAttribute('name')).toBeTruthy()
    expect(details[0].getAttribute('name')).toBe(details[1].getAttribute('name'))
    expect(details[1]).toHaveAttribute('open')
  })

  it('lets any number open in multiple mode', () => {
    const { container } = render(<Accordion items={items} type="multiple" />)
    for (const d of container.querySelectorAll('details')) expect(d).not.toHaveAttribute('name')
  })
})

describe('Breadcrumb', () => {
  it('marks the current page and folds a long trail', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Resources', href: '/resources' },
          { label: 'Academics', href: '/resources/academics' },
          { label: 'Tutoring', href: '/resources/academics/tutoring' },
          { label: 'Math lab' },
        ]}
      />
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByText('Math lab')).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Resources' })).not.toBeInTheDocument()
    fireEvent.click(within(nav).getByRole('button', { name: 'Show 2 more levels' }))
    expect(within(nav).getByRole('link', { name: 'Resources' })).toBeInTheDocument()
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
  })
})

describe('Pagination', () => {
  it.each([
    [1, 10, '1 2 3 4 5 … 10'],
    [5, 10, '1 … 4 5 6 … 10'],
    [10, 10, '1 … 6 7 8 9 10'],
    [3, 5, '1 2 3 4 5'],
  ])('page %i of %i shows %s', (page, count, expected) => {
    expect(
      pageRange(page, count)
        .map((p) => (typeof p === 'number' ? p : '…'))
        .join(' ')
    ).toBe(expected)
  })

  it('marks the current page and moves with the arrows', () => {
    const onPageChange = jest.fn()
    render(<Pagination page={1} pageCount={10} onPageChange={onPageChange} />)
    expect(screen.getByText('1', { selector: '[aria-current="page"] *, [aria-current="page"]' }).closest('[aria-current]')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: 'Page 10' }))
    expect(onPageChange).toHaveBeenLastCalledWith(10)
  })
})

describe('Progress and Meter', () => {
  it('reports progress, and leaves the amount out while unknown', () => {
    const { rerender } = render(<Progress label="Uploading" value={40} />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuetext', '40%')
    rerender(<Progress label="Uploading" />)
    expect(screen.getByRole('progressbar', { name: 'Uploading' })).not.toHaveAttribute('aria-valuenow')
  })

  it('works out good, fair, or poor the way <meter> does', () => {
    render(
      <>
        <Meter label="Seats filled" value={34} max={40} low={20} high={36} optimum={10} />
        <RadialMeter label="Attendance" value={95} low={60} high={90} optimum={100} formatValue={(v) => `${v}%`} />
        <Meter label="Plain" value={5} />
      </>
    )
    expect(screen.getByRole('meter', { name: 'Seats filled' })).toHaveAttribute('aria-valuetext', '34, fair')
    expect(screen.getByRole('meter', { name: 'Attendance' })).toHaveAttribute('aria-valuetext', '95%, good')
    expect(screen.getByRole('meter', { name: 'Plain' })).toHaveAttribute('aria-valuetext', '5')
  })
})

describe('Tooltip', () => {
  it('shows on focus, describes its element, and hides on Escape', () => {
    jest.useFakeTimers()
    render(
      <Tooltip content="Copies the event link">
        <button type="button">Share</button>
      </Tooltip>
    )
    const button = screen.getByRole('button', { name: 'Share' })
    act(() => {
      button.focus()
      jest.runOnlyPendingTimers()
    })
    const tip = screen.getByRole('tooltip')
    expect(tip).toBeVisible()
    expect(button).toHaveAccessibleDescription('Copies the event link')
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    jest.useRealTimers()
  })
})

describe('Popover', () => {
  it('opens from its button, moves focus in, and Escape returns focus', () => {
    render(
      <Popover trigger={<button type="button">Share</button>} title="Share this event">
        <a href="/copy">Copy link</a>
      </Popover>
    )
    const button = screen.getByRole('button', { name: 'Share' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Share this event' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })
})

describe('Offcanvas', () => {
  it('opens as a dialog named by its title, and closes from its button', () => {
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Filters
          </button>
          <Offcanvas open={open} onClose={() => setOpen(false)} title="Filter events">
            <p>Pick some filters</p>
          </Offcanvas>
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter events' })
    expect(dialog).toHaveAttribute('open')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(dialog).not.toHaveAttribute('open')
  })
})

describe('Notifications', () => {
  const Buttons = ({ onAnswer }: { onAnswer?: (ok: boolean) => void }) => {
    const { toast, confirm } = useNotify()
    return (
      <>
        <button type="button" onClick={() => toast({ variant: 'success', title: 'Saved', message: 'Your RSVP is in.' })}>
          Save
        </button>
        <button type="button" onClick={() => toast({ variant: 'error', title: 'Couldn’t save' })}>
          Fail
        </button>
        <button type="button" onClick={async () => onAnswer?.(await confirm({ title: 'Delete this event?', variant: 'error', confirmLabel: 'Delete' }))}>
          Delete
        </button>
      </>
    )
  }

  it('shows toasts, times out the ordinary ones, and keeps errors', () => {
    jest.useFakeTimers()
    render(
      <NotificationProvider>
        <Buttons />
      </NotificationProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }))
    const region = screen.getByRole('region', { name: 'Notifications' })
    expect(within(region).getByText('Saved')).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(6000)
    })
    expect(within(region).queryByText('Saved')).not.toBeInTheDocument()
    expect(within(region).getByText('Couldn’t save')).toBeInTheDocument()
    fireEvent.click(within(region).getByRole('button', { name: 'Dismiss: Couldn’t save' }))
    expect(within(region).queryByText('Couldn’t save')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('asks for confirmation in a modal and reports the answer', async () => {
    const onAnswer = jest.fn()
    render(
      <NotificationProvider>
        <Buttons onAnswer={onAnswer} />
      </NotificationProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this event?' })
    // The safe choice has focus
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    })
    expect(onAnswer).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('Carousel', () => {
  const slides = ['Welcome', 'Workshops', 'Socials'].map((label) => ({ label, content: <p>{label} slide</p> }))

  it('moves with the arrows and dots, and only the current slide is reachable', () => {
    render(<Carousel aria-label="Highlights" slides={slides} />)
    const region = screen.getByRole('region', { name: 'Highlights' })
    expect(within(region).getByRole('group', { name: '1 of 3: Welcome' })).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(screen.getByRole('button', { name: 'Go to slide 2: Workshops' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('Welcome slide').parentElement).toHaveAttribute('inert')
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3: Socials' }))
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    // Arrow keys work while focus is inside
    fireEvent.keyDown(screen.getByRole('button', { name: 'Previous slide' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('button', { name: 'Go to slide 2: Workshops' })).toHaveAttribute('aria-current', 'true')
  })

  it('plays on its own until paused, and loops', () => {
    jest.useFakeTimers()
    render(<Carousel aria-label="Highlights" slides={slides} autoplay={3000} loop />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('button', { name: 'Go to slide 2: Workshops' })).toHaveAttribute('aria-current', 'true')
    act(() => {
      jest.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('button', { name: 'Go to slide 1: Welcome' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Pause slides' }))
    // Clicking also focuses inside it; blur so only the pause holds it still
    act(() => {
      ;(document.activeElement as HTMLElement).blur()
      jest.advanceTimersByTime(9000)
    })
    expect(screen.getByRole('button', { name: 'Go to slide 1: Welcome' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Play slides' })).toBeInTheDocument()
    jest.useRealTimers()
  })
})

describe('Thumbnails and masonry', () => {
  it('shows image thumbnails under a carousel that move it', () => {
    const slides = ['Welcome', 'Workshops'].map((label, i) => ({ label, content: <p>{label}</p>, thumbnail: `/t${i}.jpg` }))
    render(<Carousel aria-label="Highlights" slides={slides} thumbnails />)
    const thumb = screen.getByRole('button', { name: 'Go to slide 2: Workshops' })
    expect(thumb.querySelector('img')).toHaveAttribute('src', '/t1.jpg')
    fireEvent.click(thumb)
    expect(thumb).toHaveAttribute('aria-current', 'true')
  })

  it('keeps each image’s own shape in a masonry gallery', () => {
    render(
      <Gallery
        layout="masonry"
        aria-label="Posters"
        images={[
          { src: '/tall.jpg', alt: 'Tall poster', width: 600, height: 900 },
          { src: '/wide.jpg', alt: 'Wide banner', width: 1200, height: 400 },
        ]}
      />
    )
    expect(screen.getByRole('button', { name: 'View larger: Tall poster' })).toHaveStyle({ aspectRatio: '600 / 900' })
    expect(screen.getByRole('button', { name: 'View larger: Wide banner' })).not.toHaveClass('aspect-square')
    expect(screen.getByRole('list', { name: 'Posters' })).toHaveStyle({ columnWidth: '14rem' })
  })
})

describe('Gallery', () => {
  it('opens the pressed image in a viewer', () => {
    render(
      <Gallery
        aria-label="Fall social"
        images={[
          { src: '/a.jpg', alt: 'Welcome table' },
          { src: '/b.jpg', alt: 'Group photo', caption: 'Everyone at the end' },
        ]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'View larger: Group photo' }))
    const viewer = screen.getByRole('dialog', { name: 'Fall social' })
    expect(viewer).toHaveAttribute('open')
    expect(within(viewer).getByRole('group', { name: '2 of 2: Group photo' })).not.toHaveAttribute('inert')
    expect(within(viewer).getByText('Everyone at the end')).toBeInTheDocument()
    fireEvent.click(within(viewer).getByRole('button', { name: 'Close viewer' }))
    expect(viewer).not.toHaveAttribute('open')
  })
})
