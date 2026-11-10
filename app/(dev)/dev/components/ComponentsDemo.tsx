'use client'
/* eslint-disable @next/next/no-img-element -- the demo's images are generated SVG data URIs, which next/image doesn't optimize */

import { ArrowRight, BadgeCheck, Bell, CalendarDays, Check, Copy, Filter, Heart, Info, Lock, Mail, Plus, Share2, Star, Trash2 } from 'lucide-react'
import { useState, type FC, type ReactNode } from 'react'

import {
  Accordion,
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Carousel,
  CircularMeter,
  CircularProgress,
  Gallery,
  IndicatorBadge,
  Meter,
  Notification,
  NotificationProvider,
  Offcanvas,
  Pagination,
  Popover,
  Progress,
  RadialMeter,
  RadialProgress,
  Spinner,
  Tooltip,
  useNotify,
  type GalleryImage,
  type OffcanvasSide,
} from '@/components'
import { Checkbox, CheckboxGroup } from '@/components/Form'
import { HeroSection } from '@/(page)/components/Hero'
import { card } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { DataDemos } from './DataDemos'

/** A placeholder photo: a colored SVG at the given size, so the demo needs no image files */
const placeholder = (width: number, height: number, hue: number, text: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 75% 35%)"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<text x="50%" y="50%" fill="white" font-family="system-ui, sans-serif" font-size="${Math.round(Math.min(width, height) / 9)}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`
  )}`

const PHOTOS: GalleryImage[] = [
  { w: 1200, h: 800, hue: 220, alt: 'Welcome table', caption: 'Officers at the welcome table' },
  { w: 800, h: 1100, hue: 280, alt: 'Event poster', caption: 'Fall social poster' },
  { w: 1200, h: 600, hue: 160, alt: 'Group photo', caption: 'Everyone at the end of the night' },
  { w: 900, h: 900, hue: 20, alt: 'Study session' },
  { w: 800, h: 1200, hue: 330, alt: 'Campus at dusk' },
  { w: 1200, h: 900, hue: 50, alt: 'Workshop', caption: 'Résumé workshop in the library' },
  { w: 1000, h: 700, hue: 190, alt: 'Volunteering' },
  { w: 700, h: 1000, hue: 250, alt: 'Game night' },
].map((p) => ({ src: placeholder(p.w, p.h, p.hue, p.alt), alt: p.alt, caption: p.caption, width: p.w, height: p.h, thumbnail: placeholder(Math.round(p.w / 6), Math.round(p.h / 6), p.hue, '') }))

const Demo: FC<{ title: string; note?: ReactNode; wide?: boolean; children: ReactNode }> = ({ title, note, wide, children }) => (
  <section className={cn(card({ padded: true }), 'gap-4', wide && 'md:col-span-2')}>
    <div className="flex flex-col gap-1">
      <h2 className="text-[1.05rem] font-bold text-ink">{title}</h2>
      {note ? <p className="text-[0.85rem] leading-relaxed text-muted">{note}</p> : null}
    </div>
    {children}
  </section>
)

/** Toasts and confirmations, which need the provider around them */
const NotificationButtons: FC = () => {
  const { toast, confirm } = useNotify()
  const [answer, setAnswer] = useState<string>('—')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => toast({ variant: 'success', title: 'RSVP saved', message: 'See you Thursday at 5.' })}>
          Success toast
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast({ title: 'New event posted', message: 'Resume workshop, Oct 30', action: { label: 'View', onClick: () => toast({ title: 'Opened the event' }) } })}>
          Info with action
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast({ variant: 'warning', title: 'Registration closes soon', message: 'Friday at 5 p.m.' })}>
          Warning
        </Button>
        <Button size="sm" variant="outline" onClick={() => toast({ variant: 'error', title: 'Couldn’t save', message: 'Check your connection. This one stays until dismissed.' })}>
          Error (stays)
        </Button>
        <Button
          size="sm"
          variant="danger"
          leading={<Trash2 size={15} aria-hidden />}
          onClick={async () => setAnswer((await confirm({ title: 'Delete this event?', message: 'RSVPs and photos go too. This can’t be undone.', variant: 'error', confirmLabel: 'Delete event' })) ? 'Deleted' : 'Kept')}
        >
          Confirm dialog
        </Button>
      </div>
      <p className="text-[0.8rem] text-muted">Last answer: {answer}</p>
    </div>
  )
}

export const ComponentsDemo: FC = () => {
  const [page, setPage] = useState(5)
  const [progress, setProgress] = useState(40)
  const [drawer, setDrawer] = useState<OffcanvasSide | null>(null)
  const [banner, setBanner] = useState(true)
  const [alert, setAlert] = useState(true)
  const [tags, setTags] = useState(['Socials', 'Workshops', 'Study groups'])
  const [unread, setUnread] = useState(3)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <NotificationProvider>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Demo title="Button" note="Variants, sizes, icons, links, icon-only with a tooltip, loading, and disabled." wide>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" leading={<Plus size={15} aria-hidden />}>
              Small
            </Button>
            <Button size="lg" trailing={<ArrowRight size={17} aria-hidden />}>
              Large
            </Button>
            <Button href="/join" variant="outline">
              Internal link
            </Button>
            <Button href="https://gsu.edu" variant="ghost">
              External link
            </Button>
            <Button
              loading={saving}
              onClick={() => {
                setSaving(true)
                window.setTimeout(() => setSaving(false), 2000)
              }}
            >
              {saving ? 'Saving' : 'Save (loads 2s)'}
            </Button>
            <Tooltip content="Add to favorites" role="label">
              <Button iconOnly variant="outline" size="sm">
                <Heart size={16} aria-hidden />
              </Button>
            </Tooltip>
          </div>
        </Demo>

        <Demo title="Badge" note="Tones in soft, solid, and outline; a dot; removable tags; icon-only badges; counts and dots on an icon's corner.">
          <div className="flex flex-wrap gap-2">
            {(['neutral', 'brand', 'success', 'warning', 'danger'] as const).map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['neutral', 'brand', 'success', 'warning', 'danger'] as const).map((tone) => (
              <Badge key={tone} tone={tone} appearance="solid">
                {tone}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" dot>
              Open now
            </Badge>
            <Badge tone="danger" appearance="outline" size="sm">
              Full
            </Badge>
            <Badge icon={<CalendarDays aria-hidden />} tone="brand">
              Oct 30
            </Badge>
            {tags.map((t) => (
              <Badge key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge icon={<BadgeCheck aria-hidden />} label="Verified" tone="brand" />
            <Badge icon={<Lock aria-hidden />} label="Members only" />
            <Badge icon={<Star aria-hidden />} label="Featured" tone="warning" appearance="solid" />
            <Badge icon={<Check aria-hidden />} label="Done" tone="success" appearance="outline" size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <IndicatorBadge count={unread} label={`${unread} unread`}>
              <Button iconOnly variant="ghost" aria-label="Notifications" onClick={() => setUnread(unread ? 0 : 3)}>
                <Bell size={18} aria-hidden />
              </Button>
            </IndicatorBadge>
            <IndicatorBadge count={120} label="120 new messages" tone="brand">
              <Button iconOnly variant="outline" aria-label="Messages">
                <Mail size={18} aria-hidden />
              </Button>
            </IndicatorBadge>
            <IndicatorBadge dot label="New activity">
              <Heart size={22} className="text-ink-soft" aria-hidden />
            </IndicatorBadge>
            <IndicatorBadge dot tone="success" label="Online" overlap="circle" placement="bottom-end">
              <span role="img" aria-label="Jordan" className="grid size-10 place-items-center rounded-full bg-brand-tint font-bold text-brand">
                JL
              </span>
            </IndicatorBadge>
            <IndicatorBadge icon={<Check strokeWidth={3} aria-hidden />} label="Verified" overlap="circle">
              <span role="img" aria-label="Sam" className="grid size-10 place-items-center rounded-full bg-fill font-bold text-ink-soft">
                SK
              </span>
            </IndicatorBadge>
          </div>
        </Demo>

        <Demo title="Spinner">
          <div className="flex items-center gap-6 text-brand">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" label="Loading events" />
            <span className="flex items-center gap-2 text-[0.9rem] text-muted">
              <Spinner size="sm" decorative /> Loading events…
            </span>
          </div>
        </Demo>

        <Demo title="Card" note="With media, a whole-card link (the footer stays clickable), and the accent style." wide>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card
              media={<img src={PHOTOS[0].src} alt="" />}
              eyebrow="Social"
              title="Fall social"
              description="Food, games, and a photo booth in Student Center East."
              href="/events"
              footer={
                <>
                  <Badge tone="success" dot>
                    Open
                  </Badge>
                  <Tooltip content="Share this event">
                    <Button iconOnly variant="ghost" size="sm" aria-label="Share" className="ml-auto">
                      <Share2 size={15} aria-hidden />
                    </Button>
                  </Tooltip>
                </>
              }
            />
            <Card title="Study groups" description="Weekly sessions before exams, by course.">
              <Progress label="Seats" value={12} max={20} formatValue={(v, m) => `${v} of ${m}`} size="sm" />
            </Card>
            <Card accent title="New to campus?" description="Join CSEG and find your people." footer={<Button size="sm" href="/join">Join</Button>} />
          </div>
        </Demo>

        <Demo title="Alert" note="Tones, a title, actions, and dismiss. Screen readers hear the tone in words.">
          {alert ? (
            <Alert tone="info" title="Office hours moved" onDismiss={() => setAlert(false)}>
              We’re in Student Center West, Suite 270, this week.
            </Alert>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAlert(true)}>
              Show the dismissed alert
            </Button>
          )}
          <Alert tone="success" title="You’re registered">
            A confirmation is on its way.
          </Alert>
          <Alert tone="warning" title="Registration closes Friday" actions={<Button size="sm">Register now</Button>} />
          <Alert tone="danger" title="Couldn’t save your RSVP">
            Check your connection and try again.
          </Alert>
        </Demo>

        <Demo title="Notification" note="Toasts (bottom right; hover pauses them), a confirmation, and each type used directly.">
          <NotificationButtons />
          {banner ? (
            <Notification type="banner" variant="warning" title="Heads up:" onDismiss={() => setBanner(false)} className="rounded-lg border-x">
              The library closes early on Friday.
            </Notification>
          ) : null}
          <Notification type="toast" variant="success" title="A toast, on its own" message="Outside the provider’s stack." />
          <Button size="sm" variant="outline" onClick={() => setModal(true)}>
            Open a modal notification
          </Button>
          <Notification
            type="modal"
            open={modal}
            title="Leave this page?"
            message="Your RSVP form isn’t saved yet."
            confirmLabel="Leave"
            cancelLabel="Stay"
            onConfirm={() => setModal(false)}
            onCancel={() => setModal(false)}
          />
        </Demo>

        <Demo title="Accordion" note="Single (opening one closes the others) and multiple, card and plain styles.">
          <Accordion
            items={[
              { title: 'When does CSEG meet?', content: 'Thursdays at 5 p.m. in Student Center West.' },
              { title: 'Do I need to sign up?', content: 'No, just come. Joining gets you event emails.' },
              { title: 'Is it only for freshmen?', content: 'No, every student is welcome.' },
            ]}
          />
          <Accordion
            type="multiple"
            appearance="plain"
            defaultOpen={['Parking']}
            items={[
              { title: 'Parking', content: 'Decks K, M, and T are closest.' },
              { title: 'MARTA', content: 'Five Points and Georgia State stations.' },
            ]}
          />
        </Demo>

        <Demo title="Breadcrumb & Pagination" note="A long trail folds its middle; press “…” to see it all.">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/resources' }, { label: 'Tutoring' }]} />
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Resources', href: '/resources' },
              { label: 'Academics', href: '/resources' },
              { label: 'Tutoring', href: '/resources' },
              { label: 'Math lab' },
            ]}
          />
          <Pagination page={page} pageCount={12} onPageChange={setPage} />
          <p className="text-[0.8rem] text-muted">Page {page} of 12</p>
        </Demo>

        <Demo title="Progress" note="Bars, rings, and gauges; leave the value out for “working”." wide>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.max(0, p - 10))}>
              −10
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.min(100, p + 10))}>
              +10
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-4">
              <Progress label="Uploading flyer" value={progress} />
              <Progress label="Loading events" tone="success" size="sm" />
            </div>
            <div className="flex items-center gap-4">
              <CircularProgress label="Profile" value={progress} />
              <CircularProgress aria-label="Loading" size={40} thickness={4} />
            </div>
            <RadialProgress label="Semester" value={Math.round((progress / 100) * 16)} max={16} formatValue={(v) => `Week ${v}`} />
          </div>
        </Demo>

        <Demo title="Meter" note="Like <meter>: with low, high, and optimum it turns good, fair, or poor." wide>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-4">
              <Meter label="Seats filled" value={34} max={40} low={20} high={36} optimum={10} formatValue={(v, _, m) => `${v} of ${m}`} />
              <Meter label="Storage" value={92} low={50} high={80} optimum={0} formatValue={(v) => `${v}%`} />
              <Meter label="Attendance" value={progress} low={60} high={90} optimum={100} formatValue={(v) => `${v}%`} />
            </div>
            <CircularMeter label="Attendance" value={progress} low={60} high={90} optimum={100} formatValue={(v) => `${v}%`} />
            <RadialMeter
              label="Password strength"
              value={Math.round((progress / 100) * 4)}
              max={4}
              low={1.5}
              high={2.5}
              optimum={4}
              formatValue={(v) => ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][v]}
            />
          </div>
        </Demo>

        <Demo title="Tooltip & Popover" note="Tooltips show on hover or focus (Escape hides them); popovers open on click and take focus.">
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip content="Copy the link to this event">
              <Button variant="outline" size="sm" leading={<Copy size={15} aria-hidden />}>
                Copy link
              </Button>
            </Tooltip>
            <Tooltip content="Shown below when there’s no room above" side="bottom">
              <Badge icon={<Info aria-hidden />}>
                <span tabIndex={0}>Hover or focus me</span>
              </Badge>
            </Tooltip>
            <Popover trigger={<Button size="sm" variant="subtle" leading={<Share2 size={15} aria-hidden />}>Share</Button>} title="Share this event">
              <div className="flex flex-col gap-2">
                <p className="m-0">Send the link to a friend, or post it.</p>
                <div className="flex gap-2">
                  <Button size="sm">Copy link</Button>
                  <Button size="sm" variant="outline">
                    Email
                  </Button>
                </div>
              </div>
            </Popover>
            <Popover trigger={<Button size="sm" variant="ghost">Details</Button>} aria-label="Event details" side="top">
              Thursday, Oct 30, 5–7 p.m. · Student Center East Ballroom
            </Popover>
          </div>
        </Demo>

        <Demo title="Offcanvas" note="Slides in from any edge; focus stays inside; Escape or a click outside closes it.">
          <div className="flex flex-wrap gap-2">
            {(['right', 'left', 'top', 'bottom'] as const).map((side) => (
              <Button key={side} size="sm" variant="outline" onClick={() => setDrawer(side)} leading={side === 'right' ? <Filter size={15} aria-hidden /> : undefined}>
                From the {side}
              </Button>
            ))}
          </div>
          <Offcanvas
            open={drawer !== null}
            onClose={() => setDrawer(null)}
            side={drawer ?? 'right'}
            title="Filter events"
            description="Narrow the list down."
            footer={
              <>
                <Button variant="ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setDrawer(null)}>Apply</Button>
              </>
            }
          >
            <CheckboxGroup legend="Kinds of events" defaultValue={['socials']}>
              <Checkbox value="socials">Socials</Checkbox>
              <Checkbox value="workshops">Workshops</Checkbox>
              <Checkbox value="volunteering">Volunteering</Checkbox>
            </CheckboxGroup>
          </Offcanvas>
        </Demo>

        <Demo title="Carousel" note="Swipe, use the arrows or thumbnails, or the arrow keys while focus is inside. The second one plays on its own." wide>
          <Carousel
            aria-label="Event photos"
            thumbnails
            viewportClassName="aspect-[3/2] sm:aspect-[2/1]"
            slides={PHOTOS.slice(0, 5).map((p) => ({
              label: p.alt,
              thumbnail: p.thumbnail,
              content: <img src={p.src} alt={p.alt} className="size-full object-cover" />,
            }))}
          />
          <Carousel
            aria-label="Highlights"
            autoplay={4000}
            loop
            slides={['Welcome week', 'Resume workshops', 'Game nights'].map((title, i) => ({
              label: title,
              content: (
                <div className={cn('grid h-40 place-items-center rounded-xl text-[1.3rem] font-bold text-white', ['bg-[#0039a6]', 'bg-[#0f766e]', 'bg-[#7c3aed]'][i])}>{title}</div>
              ),
            }))}
          />
        </Demo>

        <Demo title="Gallery" note="Press an image to view it larger, with the rest. Grid crops to squares; masonry keeps each shape." wide>
          <Gallery aria-label="Event photos, grid" images={PHOTOS} />
          <Gallery aria-label="Event photos, masonry" layout="masonry" minColumnWidth="11rem" images={PHOTOS} />
        </Demo>

        <Demo title="Hero" note="A page's opening block. The image goes beside (left or right), above, below, or behind the text; actions take a link or just an href." wide>
          <div className="overflow-hidden rounded-xl border border-line">
            <HeroSection
              titleAs="h2"
              beforeContent={<p className="text-[0.75rem] font-bold tracking-[0.14em] text-brand uppercase">New this fall</p>}
              title="Find your way around campus"
              subtitle="Maps, eats, and study spots"
              description="Every building, room, and late-night snack between Five Points and the Quad."
              action={[{ href: '/map', label: 'Open the map', icon: <ArrowRight aria-hidden /> }, '/about']}
              image={{ src: placeholder(900, 600, 210, 'Campus'), alt: 'Students on the quad', width: 900, height: 600, isFullWidth: true }}
            />
          </div>
          <div className="overflow-hidden rounded-xl">
            <HeroSection
              titleAs="h2"
              title="Panther Welcome Week"
              description="Seven days of socials, tours, and free food."
              action={[{ href: '/events', label: 'See the schedule' }, { href: 'https://www.gsu.edu', label: 'GSU', target: '_blank' }]}
              image={{ src: placeholder(1600, 700, 330, ''), imagePosition: 'center' }}
            />
          </div>
        </Demo>

        <DataDemos />
      </div>
    </NotificationProvider>
  )
}
