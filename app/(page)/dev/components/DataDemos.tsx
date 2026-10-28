'use client'

import { BadgeCheck, CalendarPlus, ChevronDown, Copy, Megaphone, Pencil, Share2, Trash2, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useState, type FC, type ReactNode } from 'react'

import {
  ActionMenu,
  Avatar,
  AvatarGroup,
  BarChart,
  Button,
  CommandPalette,
  DescriptionList,
  Dialog,
  Divider,
  EmptyState,
  FilterBar,
  Kbd,
  LineChart,
  Skeleton,
  Stat,
  StatGroup,
  Stepper,
  Table,
  Tabs,
  Timeline,
  useNotify,
  type FilterValues,
} from '@/components'
import { Checkbox } from '@/components/Form'
import { card } from '@/globals/ui/styles'
import { useHydrated } from '@/components/Portal'
import { cn } from '@/lib/cn'

/** The same card as the rest of the page's demos */
const Demo: FC<{ title: string; note?: ReactNode; wide?: boolean; children: ReactNode }> = ({ title, note, wide, children }) => (
  <section className={cn(card({ padded: true }), 'min-w-0 gap-4', wide && 'md:col-span-2')}>
    <div className="flex flex-col gap-1">
      <h2 className="text-[1.05rem] font-bold text-ink">{title}</h2>
      {note ? <p className="text-[0.85rem] leading-relaxed text-muted">{note}</p> : null}
    </div>
    {children}
  </section>
)

/** A face for the avatar demo: a soft gradient SVG, so no photo files are needed */
const face = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${hue + 40} 70% 42%)"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="31" r="14" fill="white" fill-opacity=".85"/><ellipse cx="40" cy="74" rx="26" ry="20" fill="white" fill-opacity=".85"/></svg>`
  )}`

const PEOPLE = ['Jordan Lee', 'Sam Kim', 'Avery Patel', 'Priya Johnson', 'Malik Garcia', 'Elena Nguyen', 'Chris Brown']

const EVENTS = [
  { id: 'e1', name: 'Welcome Social', date: '2026-08-21', rsvps: 104, status: 'Past' },
  { id: 'e2', name: 'Resume Workshop', date: '2026-10-30', rsvps: 36, status: 'Open' },
  { id: 'e3', name: 'Study Night', date: '2026-11-04', rsvps: 60, status: 'Full' },
  { id: 'e4', name: 'Campus Tour', date: '2026-11-12', rsvps: 18, status: 'Open' },
  { id: 'e5', name: 'Fall Social', date: '2026-11-20', rsvps: 72, status: 'Open' },
]

const WEEKS = ['Sep 7', 'Sep 14', 'Sep 21', 'Sep 28', 'Oct 5', 'Oct 12', 'Oct 19', 'Oct 26']
const SIGNUPS = WEEKS.map((week, i) => ({ week, signups: [12, 18, 15, 22, 30, 27, 35, 41][i] }))
const BY_YEAR = ['Freshman', 'Sophomore', 'Junior', 'Senior'].map((year, i) => ({
  year,
  fall: [48, 36, 29, 22][i],
  spring: [31, 33, 27, 25][i],
  summer: [6, 9, 12, 8][i],
}))

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** Sections for the dashboard components: data, navigation, and windows */
export const DataDemos: FC = () => {
  const { toast } = useNotify()
  const [stepperAt, setStepperAt] = useState(1)
  const [stepError, setStepError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [tableEmpty, setTableEmpty] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [compact, setCompact] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [filters, setFilters] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(false)
  const [palette, setPalette] = useState(false)
  // Times relative to now differ between the server and the browser, so they wait for the browser
  const hydrated = useHydrated()
  const ago = (ms: number) => (hydrated ? new Date(Date.now() - ms) : undefined)

  const q = query.trim().toLowerCase()
  const filtered = EVENTS.filter((e) => (!filters.status?.length || filters.status.includes(e.status)) && (!q || e.name.toLowerCase().includes(q)))

  return (
    <>
      <Demo title="Tabs" note="Arrow keys, Home, and End move between tabs (the disabled one is skipped). Underlined or pills; counts; filling the width.">
        <Tabs
          aria-label="Event"
          items={[
            { id: 'about', label: 'About', content: <p className="m-0 text-[0.9rem] text-ink-soft">Thursdays at 5 in Student Center East.</p> },
            { id: 'rsvps', label: 'RSVPs', count: 42, content: <AvatarGroup aria-label="Going" people={PEOPLE.map((name) => ({ name }))} max={5} /> },
            { id: 'photos', label: 'Photos', disabled: true, content: null },
            { id: 'settings', label: 'Settings', content: <p className="m-0 text-[0.9rem] text-ink-soft">Visible to members only.</p> },
          ]}
        />
        <Tabs
          aria-label="View"
          appearance="pill"
          fitted
          activation="manual"
          items={[
            { id: 'day', label: 'Day', content: <p className="m-0 text-[0.85rem] text-muted">Manual activation: arrow to a tab, then Enter.</p> },
            { id: 'week', label: 'Week', content: <p className="m-0 text-[0.85rem] text-muted">The week view.</p> },
            { id: 'month', label: 'Month', content: <p className="m-0 text-[0.85rem] text-muted">The month view.</p> },
          ]}
        />
      </Demo>

      <Demo title="Action menu & Kbd" note="↓ or Enter opens a menu on its first item, ↑ on its last; type a letter to jump. Keycaps follow the platform: ⌘ on a Mac, Ctrl elsewhere.">
        <div className="flex flex-wrap items-center gap-3">
          <ActionMenu
            label="Actions for Resume Workshop"
            items={[
              { label: 'Edit', icon: <Pencil />, shortcut: 'E', onSelect: () => toast({ title: 'Edit' }) },
              { label: 'Duplicate', icon: <Copy />, shortcut: ['mod', 'D'], onSelect: () => toast({ title: 'Duplicated' }) },
              { label: 'Share', items: [{ label: 'Copy link', icon: <Share2 />, onSelect: () => toast({ title: 'Link copied' }) }, { label: 'Email members', onSelect: () => toast({ title: 'Draft opened' }) }] },
              'separator',
              { label: 'Archive', disabled: true, description: 'After the event ends' },
              { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => toast({ variant: 'error', title: 'Deleted (not really)' }) },
            ]}
          />
          <ActionMenu
            label="Create"
            align="start"
            trigger={
              <Button size="sm" trailing={<ChevronDown size={15} aria-hidden />}>
                Create
              </Button>
            }
            items={[
              { label: 'Event', icon: <CalendarPlus />, description: 'A meeting, social, or workshop', onSelect: () => toast({ title: 'New event' }) },
              { label: 'Announcement', icon: <Megaphone />, onSelect: () => toast({ title: 'New announcement' }) },
              { label: 'Member', icon: <UserPlus />, onSelect: () => toast({ title: 'Invite sent' }) },
            ]}
          />
        </div>
        <Divider />
        <div className="flex flex-col gap-2 text-[0.88rem] text-ink-soft">
          <p className="m-0 flex flex-wrap items-center gap-2">
            Search: <Kbd keys={['mod', 'K']} /> · Close: <Kbd keys="Esc" /> · Help: <Kbd keys={['shift', '?']} />
          </p>
          <p className="m-0 flex flex-wrap items-center gap-2">
            Move: <Kbd keys="up" size="sm" /> <Kbd keys="down" size="sm" /> · Open: <Kbd keys="enter" size="sm" /> · New line: <Kbd keys={['alt', 'enter']} size="sm" />
          </p>
        </div>
      </Demo>

      <Demo title="Avatar" note="A photo, or initials on a color picked from the name when there's none (or it fails to load). Status dots are said in words.">
        <div className="flex flex-wrap items-end gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size, i) => (
            <Avatar key={size} name={PEOPLE[i]} size={size} src={i % 2 ? face(i * 60) : undefined} />
          ))}
          <Avatar name="Broken Photo" src="/no-such-photo.jpg" />
          <Avatar name="Student Government" shape="square" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {(['online', 'away', 'busy', 'offline'] as const).map((status, i) => (
            <span key={status} className="flex items-center gap-2 text-[0.85rem] text-ink-soft">
              <Avatar name={PEOPLE[i + 2]} size="sm" status={status} src={face(200 + i * 40)} />
              {status}
            </span>
          ))}
        </div>
        <AvatarGroup aria-label="Hosting" people={PEOPLE.map((name, i) => ({ name, src: i % 3 === 0 ? face(i * 45) : undefined }))} max={5} />
      </Demo>

      <Demo title="Skeleton" note="Placeholders in the shape of what's loading; still when motion is reduced.">
        <Checkbox checked={loaded} onCheckedChange={setLoaded}>
          Loaded
        </Checkbox>
        <div aria-busy={!loaded} className="flex items-start gap-3 rounded-xl border border-line p-4">
          {loaded ? (
            <>
              <Avatar name="Priya Patel" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="m-0 font-semibold text-ink">Priya Patel</p>
                <p className="m-0 text-[0.88rem] text-ink-soft">RSVP’d to the Resume Workshop and brought two friends from her lab section.</p>
              </div>
            </>
          ) : (
            <>
              <Skeleton shape="circle" />
              <div className="flex flex-1 flex-col gap-2.5">
                <Skeleton width="40%" height={14} />
                <Skeleton shape="text" lines={2} />
              </div>
            </>
          )}
        </div>
        {loaded ? null : <Skeleton height={96} className="rounded-xl" />}
      </Demo>

      <Demo title="Stat" note="The change is colored by whether it's good news: down is good for no-shows. A trend line, a link to details, and loading." wide>
        <Checkbox checked={statsLoading} onCheckedChange={setStatsLoading}>
          Loading
        </Checkbox>
        <StatGroup>
          <Stat label="Members" value={1284} icon={<Users />} delta={{ value: 12, period: 'vs last term' }} trend={[820, 900, 940, 1010, 1100, 1180, 1230, 1284]} trendLabel="last 8 weeks" loading={statsLoading} />
          <Stat label="Page views" value={129_400} delta={{ value: -8.2, period: 'vs last month' }} loading={statsLoading} />
          <Stat label="No-show rate" value="13%" delta={{ value: -2.5, period: 'vs last event', goodWhen: 'down' }} href="#" loading={statsLoading} />
          <Stat label="Open events" value={4} delta={{ value: 0, period: 'vs last week', format: 'number' }} description="2 close this week" loading={statsLoading} />
        </StatGroup>
      </Demo>

      <Demo title="Charts" note="Hover, or focus a chart and use ← →, to read every series at a point. “Show table” lists the numbers. A legend appears for two series or more." wide>
        <Checkbox checked={chartLoading} onCheckedChange={setChartLoading}>
          Loading (keeps the last chart, dimmed)
        </Checkbox>
        <div className="grid gap-6 lg:grid-cols-2">
          <LineChart title="Sign-ups" description="Per week, fall 2026" x="week" series={[{ key: 'signups', name: 'Sign-ups' }]} data={SIGNUPS} area loading={chartLoading} />
          <BarChart
            title="Members by year"
            description="By the term they joined"
            x="year"
            series={[
              { key: 'fall', name: 'Fall' },
              { key: 'spring', name: 'Spring' },
              { key: 'summer', name: 'Summer' },
            ]}
            data={BY_YEAR}
            loading={chartLoading}
          />
          <BarChart
            title="RSVPs by event"
            description="Stacked: members and guests"
            x="event"
            stacked
            series={[
              { key: 'members', name: 'Members' },
              { key: 'guests', name: 'Guests' },
            ]}
            data={EVENTS.map((e) => ({ event: e.name.split(' ')[0], members: Math.round(e.rsvps * 0.7), guests: Math.round(e.rsvps * 0.3) }))}
            height={200}
            loading={chartLoading}
          />
          <LineChart title="Waitlist" description="No data yet: the empty state" x="day" series={[{ key: 'n', name: 'Waitlist' }]} data={[]} height={200} />
        </div>
      </Demo>

      <Demo title="Filter bar & Table" note="Filters scope what's under them. The table sorts, selects with bulk actions, and has row menus; below 40rem of width each row becomes a card." wide>
        <FilterBar
          filters={[{ id: 'status', label: 'Status', options: ['Open', 'Full', 'Past'].map((s) => ({ value: s, label: s, count: EVENTS.filter((e) => e.status === s).length })) }]}
          value={filters}
          onValueChange={setFilters}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search events"
          resultCount={tableEmpty ? 0 : filtered.length}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Checkbox checked={tableEmpty} onCheckedChange={setTableEmpty}>
            Empty
          </Checkbox>
          <Checkbox checked={tableLoading} onCheckedChange={setTableLoading}>
            Loading
          </Checkbox>
          <Checkbox checked={compact} onCheckedChange={setCompact}>
            Compact
          </Checkbox>
        </div>
        <Table
          caption="Events"
          hideCaption
          rows={tableEmpty ? [] : filtered}
          getRowId={(e) => e.id}
          loading={tableLoading}
          density={compact ? 'compact' : 'comfortable'}
          selectable
          bulkActions={(ids) => (
            <Button size="sm" variant="outline" onClick={() => toast({ title: `Exported ${ids.length} events` })}>
              Export
            </Button>
          )}
          empty={
            <EmptyState
              size="sm"
              icon={<CalendarPlus />}
              title="No events"
              description="Events you create show up here."
              actions={
                <Button size="sm" onClick={() => (setTableEmpty(false), setFilters({}), setQuery(''))}>
                  Show them again
                </Button>
              }
            />
          }
          columns={[
            { key: 'name', header: 'Event', sortable: true },
            { key: 'date', header: 'Date', sortable: true, cell: (e) => fmtDate(e.date) },
            { key: 'status', header: 'Status', sortable: true },
            { key: 'rsvps', header: 'RSVPs', align: 'end', sortable: true, cell: (e) => <span className="tabular-nums">{e.rsvps}</span> },
          ]}
          rowActions={(e) => (
            <ActionMenu
              label={`Actions for ${e.name}`}
              items={[
                { label: 'Edit', icon: <Pencil />, onSelect: () => toast({ title: `Editing ${e.name}` }) },
                { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => toast({ variant: 'error', title: `Deleted ${e.name} (not really)` }) },
              ]}
            />
          )}
        />
      </Demo>

      <Demo title="Stepper" note="Finished steps are buttons back to them. Turns vertical when narrow; a step can be marked as needing attention.">
        <Stepper
          aria-label="Create an event"
          current={stepperAt}
          onStepChange={setStepperAt}
          steps={[
            { label: 'Details', status: stepError ? 'error' : undefined },
            { label: 'Date & place' },
            { label: 'Tickets', optional: true },
            { label: 'Review' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={stepperAt === 0} onClick={() => setStepperAt(stepperAt - 1)}>
            Back
          </Button>
          <Button size="sm" disabled={stepperAt === 3} onClick={() => setStepperAt(stepperAt + 1)}>
            Next
          </Button>
          <Checkbox checked={stepError} onCheckedChange={setStepError} className="ml-2">
            Details need fixing
          </Checkbox>
        </div>
        <Divider label="Vertical" />
        <Stepper
          aria-label="Profile setup"
          orientation="vertical"
          current={1}
          steps={[{ label: 'Sign in', description: 'With your GSU account' }, { label: 'Pick interests', description: 'So we can suggest events' }, { label: 'Join a committee', optional: true }]}
        />
      </Demo>

      <Demo title="Timeline" note="Relative times, grouped by day; or exact times. Each is a <time> with the exact moment.">
        <Timeline
          aria-label="Recent activity"
          groupByDay
          items={[
            { id: 't1', title: 'Priya RSVP’d to Resume Workshop', time: ago(25 * 60_000), avatar: { name: 'Priya Patel', src: face(300) } },
            { id: 't2', title: 'Fall Social published', description: 'Nov 20 · Student Center East ballroom', time: ago(5 * 3_600_000), icon: <Megaphone />, tone: 'brand' },
            { id: 't3', title: 'Sam was verified as an officer', time: ago(30 * 3_600_000), icon: <BadgeCheck />, tone: 'success' },
          ]}
        />
        <Divider />
        <Timeline
          timeFormat="absolute"
          items={[
            { id: 'u1', title: 'Doors open', time: '2026-11-20T18:00:00', tone: 'brand' },
            { id: 'u2', title: 'Games and food', time: '2026-11-20T18:30:00' },
            { id: 'u3', title: 'Raffle', time: '2026-11-20T20:00:00', tone: 'warning' },
          ]}
        />
      </Demo>

      <Demo title="Dialog, description list & divider" note="A window for a short task: focus moves in and stays, Escape or a click outside closes it, and focus returns to the button.">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialog(true)}>
            Open a dialog
          </Button>
        </div>
        <DescriptionList
          items={[
            { term: 'Event', details: 'Resume Workshop' },
            { term: 'When', details: 'Thursday, Oct 30 at 5 p.m.' },
            { term: 'Where', details: 'Student Center East, room 216' },
          ]}
        />
        <Divider label="or" />
        <DescriptionList layout="stacked" divided={false} items={[{ term: 'Stacked, no lines', details: 'Terms above their details at any width.' }]} />
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Invite an officer"
          description="They’ll get an email with a link to accept."
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setDialog(false)
                  toast({ variant: 'success', title: 'Invite sent' })
                }}
              >
                Send invite
              </Button>
            </>
          }
        >
          <DescriptionList items={[{ term: 'Role', details: 'Treasurer' }, { term: 'Can', details: 'Edit events, see RSVPs, export members' }]} />
        </Dialog>
      </Demo>

      <Demo title="Empty state & command palette" note="Say what's missing and how to fix it. The palette opens with its button or ⌘K / Ctrl+K anywhere on the page.">
        <EmptyState bordered icon={<CalendarPlus />} title="No events yet" description="Events you create show up here, with their RSVPs." actions={<Button size="sm">Create an event</Button>} />
        <CommandPalette
          open={palette}
          onOpenChange={setPalette}
          className="w-full"
          commands={[
            { id: 'dash', label: 'Dashboard demo', group: 'Go to', href: '/dev/dashboard' },
            { id: 'forms', label: 'Forms demo', group: 'Go to', href: '/dev/forms' },
            { id: 'home', label: 'Home', group: 'Go to', href: '/' },
            { id: 'toast', label: 'Show a toast', group: 'Actions', shortcut: ['mod', 'J'], onSelect: () => toast({ title: 'From the palette' }) },
            { id: 'dialog', label: 'Open the dialog', group: 'Actions', keywords: ['window', 'modal'], onSelect: () => setDialog(true) },
          ]}
        />
      </Demo>

      <Demo title="App shell" note="A sidebar of links (it collapses to icons, and moves into a slide-in menu on phones) beside a top bar and the page. It needs a whole page to show.">
        <p className="m-0 text-[0.9rem] text-ink-soft">
          See it on the{' '}
          <Link href="/dev/dashboard" className="font-semibold text-brand underline underline-offset-2">
            dashboard demo
          </Link>
          , which puts these components together: filters driving stats and charts, a member table with an edit dialog, and ⌘K to jump to anyone.
        </p>
      </Demo>
    </>
  )
}
