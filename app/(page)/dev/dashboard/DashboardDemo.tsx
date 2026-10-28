'use client'

import { CalendarCheck, CalendarPlus, Component, Copy, Download, FormInput, Home, LayoutDashboard, Loader, Mail, Map, Megaphone, Pencil, SearchX, Ticket, Trash2, UserMinus, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'

import {
  ActionMenu,
  AppShell,
  CommandPalette,
  DescriptionList,
  Dialog,
  Divider,
  EmptyState,
  Avatar,
  AvatarGroup,
  Badge,
  BarChart,
  Button,
  FilterBar,
  Kbd,
  LineChart,
  Stat,
  StatGroup,
  Stepper,
  Table,
  Tabs,
  Timeline,
  useNotify,
  NotificationProvider,
  type Command,
  type FilterValues,
  type TimelineItem,
} from '@/components'
import { Checkbox, Input } from '@/components/Form'
import { card } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

// ── Made-up data ──────────────────────────────────────────────────────────────

const FIRST = ['Jordan', 'Sam', 'Avery', 'Priya', 'Malik', 'Elena', 'Chris', 'Imani', 'Diego', 'Hana', 'Tariq', 'Zoe', 'Kofi', 'Mei', 'Liam', 'Aaliyah', 'Noah', 'Sofia', 'Jamal', 'Grace', 'Omar', 'Lena', 'Ethan', 'Nia']
const LAST = ['Lee', 'Kim', 'Patel', 'Johnson', 'Garcia', 'Nguyen', 'Brown', 'Okafor', 'Rivera', 'Sato', 'Ali', 'Martin', 'Mensah', 'Chen', 'Walker', 'Davis', 'Lopez', 'Rossi', 'Wright', 'Hall', 'Hassan', 'Novak', 'Young', 'Adeyemi']
const MAJORS = ['Computer Science', 'Biology', 'Business', 'Psychology', 'Nursing', 'Political Science']
const STATUSES = ['active', 'new', 'inactive'] as const
type Status = (typeof STATUSES)[number]
const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'] as const

interface Member {
  id: string
  name: string
  email: string
  major: string
  year: (typeof YEARS)[number]
  status: Status
  events: number
  joined: string
  term: 'fall' | 'spring'
}

const MEMBERS: Member[] = FIRST.map((first, i) => {
  const last = LAST[(i * 7) % LAST.length]
  const status = STATUSES[i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0]
  const month = (i * 5) % 10
  return {
    id: `m${i + 1}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@student.gsu.edu`,
    major: MAJORS[(i * 5 + Math.floor(i / 6)) % MAJORS.length],
    year: YEARS[i % YEARS.length],
    status,
    events: status === 'inactive' ? i % 3 : status === 'new' ? 1 + (i % 3) : 4 + ((i * 3) % 9),
    joined: `2026-${String(month + 1).padStart(2, '0')}-${String(((i * 11) % 27) + 1).padStart(2, '0')}`,
    term: month >= 7 ? 'fall' : 'spring',
  }
})

const STATUS_BADGE: Record<Status, { tone: 'success' | 'brand' | 'neutral'; word: string }> = {
  active: { tone: 'success', word: 'Active' },
  new: { tone: 'brand', word: 'New' },
  inactive: { tone: 'neutral', word: 'Inactive' },
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
const ATTENDANCE = MONTHS.map((month, i) => ({
  month,
  rsvps: [42, 58, 64, 51, 30, 12, 9, 88, 104, 97][i],
  checkins: [35, 47, 55, 40, 22, 9, 7, 71, 90, 84][i],
}))

const ACTIVITY: TimelineItem[] = [
  { id: 'a1', title: 'Priya Patel RSVP’d to Resume Workshop', time: '2026-10-27T13:40:00', avatar: { name: 'Priya Patel' } },
  { id: 'a2', title: 'Fall Social published', description: 'Thursday, Oct 30 · Student Center East ballroom', time: '2026-10-27T10:05:00', icon: <Megaphone />, tone: 'brand' },
  { id: 'a3', title: '3 new members joined', time: '2026-10-26T18:20:00', icon: <UserPlus />, tone: 'success' },
  { id: 'a4', title: 'Study Night is full', description: 'A waitlist opened for the last 6 RSVPs.', time: '2026-10-26T12:00:00', icon: <Ticket />, tone: 'warning' },
  { id: 'a5', title: 'Malik Garcia checked in 42 people', time: '2026-10-24T17:30:00', avatar: { name: 'Malik Garcia' } },
]

const EVENT_STEPS = [
  { label: 'Details', description: 'Name and description' },
  { label: 'Date & place' },
  { label: 'Tickets', optional: true },
  { label: 'Review' },
]

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

// ── Pieces ────────────────────────────────────────────────────────────────────

const Panel: FC<{ title?: string; className?: string; children: React.ReactNode }> = ({ title, className, children }) => (
  <section className={cn(card({ padded: true }), 'min-w-0 gap-4', className)}>
    {title ? <h2 className="m-0 text-[1rem] font-bold text-ink">{title}</h2> : null}
    {children}
  </section>
)

/** Overview: one term filter scopes the stats and both charts, so the numbers agree */
const Overview: FC<{ loading: boolean }> = ({ loading }) => {
  const [filters, setFilters] = useState<FilterValues>({})
  const term = filters.term?.[0]
  const majors = filters.major ?? []
  const rows = MEMBERS.filter((m) => (!term || m.term === term) && (!majors.length || majors.includes(m.major)))
  const active = rows.filter((m) => m.status === 'active').length
  const fresh = rows.filter((m) => m.status === 'new').length
  const events = rows.reduce((s, m) => s + m.events, 0)

  const byMajor = MAJORS.filter((mj) => !majors.length || majors.includes(mj)).map((major) => ({
    major: major.replace('Political Science', 'Poli Sci').replace('Computer Science', 'Comp Sci'),
    active: rows.filter((m) => m.major === major && m.status === 'active').length,
    new: rows.filter((m) => m.major === major && m.status === 'new').length,
  }))

  return (
    <div className="flex flex-col gap-5">
      <FilterBar
        filters={[
          { id: 'term', label: 'Term', multiple: false, options: [{ value: 'fall', label: 'Fall 2026' }, { value: 'spring', label: 'Spring 2026' }] },
          { id: 'major', label: 'Major', options: MAJORS.map((m) => ({ value: m, label: m, count: MEMBERS.filter((x) => x.major === m).length })) },
        ]}
        value={filters}
        onValueChange={setFilters}
        resultCount={rows.length}
      />
      <StatGroup>
        <Stat label="Members" value={rows.length} icon={<Users />} delta={{ value: 12, period: 'vs last term' }} trend={[8, 11, 12, 15, 14, 18, 21, rows.length]} trendLabel="last 8 weeks" loading={loading} />
        <Stat label="Active members" value={`${pct(active, rows.length)}%`} description={`${active} of ${rows.length}`} delta={{ value: 4, period: 'vs last term' }} loading={loading} />
        <Stat label="New this term" value={fresh} icon={<UserPlus />} delta={{ value: 0, period: 'vs last term', format: 'number' }} loading={loading} />
        <Stat label="No-show rate" value="13%" icon={<CalendarCheck />} delta={{ value: 2.5, period: 'vs last event', goodWhen: 'down' }} href="#members" loading={loading} />
      </StatGroup>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <LineChart
            title="RSVPs and check-ins"
            description={`By month, 2026 · ${events} event visits by these members`}
            x="month"
            series={[
              { key: 'rsvps', name: 'RSVPs' },
              { key: 'checkins', name: 'Check-ins' },
            ]}
            data={ATTENDANCE}
            loading={loading}
          />
        </Panel>
        <Panel>
          <BarChart
            title="Members by major"
            description="Active and new members"
            x="major"
            stacked
            series={[
              { key: 'active', name: 'Active' },
              { key: 'new', name: 'New' },
            ]}
            data={byMajor}
            loading={loading}
          />
        </Panel>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <BarChart title="Check-ins per event" description="Fall 2026" x="event" series={[{ key: 'n', name: 'Check-ins' }]} data={[
            { event: 'Welcome', n: 84 },
            { event: 'Resume', n: 36 },
            { event: 'Study Night', n: 52 },
            { event: 'Tour', n: 28 },
            { event: 'Social', n: 61 },
          ]} loading={loading} height={200} />
        </Panel>
        <Panel title="Recent activity">
          <Timeline aria-label="Recent activity" groupByDay items={ACTIVITY} />
        </Panel>
      </div>
    </div>
  )
}

/** Members: search and filters over a selectable table with row and bulk actions */
const Members: FC<{ loading: boolean; editId: string | null; onEdit: (id: string | null) => void }> = ({ loading, editId, onEdit }) => {
  const { toast, confirm } = useNotify()
  const [filters, setFilters] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState(MEMBERS)
  const [selected, setSelected] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const editing = members.find((m) => m.id === editId) ?? null
  const [draft, setDraft] = useState({ name: '', email: '' })
  // Start the form from whoever's being edited
  useEffect(() => {
    if (editing) setDraft({ name: editing.name, email: editing.email })
    // Only when a different member opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // "/" jumps to the search box, as in many dashboards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')
      if (e.key !== '/' || typing) return
      const input = searchRef.current?.querySelector<HTMLInputElement>('input[type="search"]')
      if (!input || !input.offsetParent) return
      e.preventDefault()
      input.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = query.trim().toLowerCase()
  const rows = members.filter(
    (m) =>
      (!filters.status?.length || filters.status.includes(m.status)) &&
      (!filters.major?.length || filters.major.includes(m.major)) &&
      (!filters.year?.length || filters.year.includes(m.year)) &&
      (!q || m.name.toLowerCase().includes(q) || m.email.includes(q))
  )

  const remove = async (ids: string[]) => {
    const names = members.filter((m) => ids.includes(m.id)).map((m) => m.name)
    const ok = await confirm({
      title: ids.length === 1 ? `Remove ${names[0]}?` : `Remove ${ids.length} members?`,
      message: 'They’ll lose access to members-only events. (This is a demo; nothing is saved.)',
      variant: 'error',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    setMembers((all) => all.filter((m) => !ids.includes(m.id)))
    setSelected((s) => s.filter((id) => !ids.includes(id)))
    toast({ variant: 'success', title: ids.length === 1 ? `Removed ${names[0]}` : `Removed ${ids.length} members` })
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={searchRef}>
        <FilterBar
          filters={[
            { id: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: STATUS_BADGE[s].word, count: members.filter((m) => m.status === s).length })) },
            { id: 'major', label: 'Major', options: MAJORS.map((m) => ({ value: m, label: m })) },
            { id: 'year', label: 'Year', options: YEARS.map((y) => ({ value: y, label: y })) },
          ]}
          value={filters}
          onValueChange={setFilters}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search members"
          resultCount={rows.length}
        >
          <span className="hidden items-center gap-1.5 text-[0.8rem] text-muted sm:inline-flex">
            Press <Kbd keys="/" size="sm" /> to search
          </span>
        </FilterBar>
      </div>
      <Table
        caption="Members"
        hideCaption
        rows={rows}
        getRowId={(m) => m.id}
        loading={loading}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        defaultSort={{ key: 'name', direction: 'ascending' }}
        getRowLabel={(m) => m.name}
        empty={
          <EmptyState
            size="sm"
            icon={<SearchX />}
            title="No members match"
            description="Try fewer filters, or a different spelling."
            actions={
              <Button size="sm" variant="outline" onClick={() => (setFilters({}), setQuery(''))}>
                Clear filters
              </Button>
            }
          />
        }
        bulkActions={(ids) => (
          <>
            <Button size="sm" variant="outline" leading={<Mail size={15} aria-hidden />} onClick={() => toast({ title: `Emailing ${ids.length}`, message: 'A draft would open here.' })}>
              Email
            </Button>
            <Button size="sm" variant="outline" leading={<Download size={15} aria-hidden />} onClick={() => toast({ title: `Exported ${ids.length} rows` })}>
              Export
            </Button>
            <Button size="sm" variant="danger" leading={<Trash2 size={15} aria-hidden />} onClick={() => remove(ids)}>
              Remove
            </Button>
          </>
        )}
        columns={[
          {
            key: 'name',
            header: 'Name',
            sortable: true,
            cell: (m) => (
              <span className="flex items-center gap-3">
                <Avatar name={m.name} size="sm" decorative status={m.status === 'active' ? 'online' : undefined} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{m.name}</span>
                  <span className="truncate text-[0.8rem] font-normal text-muted">{m.email}</span>
                </span>
              </span>
            ),
          },
          { key: 'major', header: 'Major', sortable: true },
          { key: 'year', header: 'Year', sortable: true, sortValue: (m) => YEARS.indexOf(m.year), hideWhenStacked: true },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            cell: (m) => (
              <Badge size="sm" dot tone={STATUS_BADGE[m.status].tone}>
                {STATUS_BADGE[m.status].word}
              </Badge>
            ),
          },
          { key: 'events', header: 'Events', align: 'end', sortable: true, cell: (m) => <span className="tabular-nums">{m.events}</span> },
          {
            key: 'joined',
            header: 'Joined',
            sortable: true,
            cell: (m) => new Date(`${m.joined}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          },
        ]}
        rowActions={(m) => (
          <ActionMenu
            label={`Actions for ${m.name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, description: 'Details and contact', onSelect: () => onEdit(m.id) },
              { label: 'Copy email', icon: <Copy />, onSelect: () => toast({ title: 'Copied', message: m.email }) },
              {
                label: 'Change status',
                items: STATUSES.filter((s) => s !== m.status).map((s) => ({
                  label: `Mark ${STATUS_BADGE[s].word.toLowerCase()}`,
                  onSelect: () => setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, status: s } : x))),
                })),
              },
              'separator',
              { label: 'Remove from club', icon: <UserMinus />, danger: true, onSelect: () => remove([m.id]) },
            ]}
          />
        )}
      />
      <Dialog
        open={!!editing}
        onClose={() => onEdit(null)}
        title={editing ? `Edit ${editing.name}` : ''}
        description="Changes show in the table right away. (Nothing is saved; it’s a demo.)"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => onEdit(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editing) return
                setMembers((all) => all.map((x) => (x.id === editing.id ? { ...x, ...draft } : x)))
                toast({ variant: 'success', title: 'Saved', message: draft.name })
                onEdit(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={draft.name || editing.name} size="lg" decorative />
              <Badge size="sm" dot tone={STATUS_BADGE[editing.status].tone}>
                {STATUS_BADGE[editing.status].word}
              </Badge>
            </div>
            <DescriptionList
              items={[
                { term: 'Major', details: editing.major },
                { term: 'Year', details: editing.year },
                { term: 'Events attended', details: editing.events },
                { term: 'Joined', details: new Date(`${editing.joined}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              ]}
            />
            <Divider label="Contact" />
            <label className="flex flex-col gap-1.5 text-[0.9rem] font-semibold text-ink">
              Name
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-[0.9rem] font-semibold text-ink">
              Email
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </label>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}

/** Setup: a stepper over a short multi-step form */
const EventSetup: FC = () => {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Fall Social')
  const last = step === EVENT_STEPS.length - 1
  return (
    <div className="flex flex-col gap-6">
      <Stepper aria-label="Create an event" steps={EVENT_STEPS.map((s, i) => (i === 0 && !name.trim() && step > 0 ? { ...s, status: 'error' as const } : s))} current={step} onStepChange={setStep} />
      <Panel title={EVENT_STEPS[step].label}>
        {step === 0 ? (
          <label className="flex max-w-md flex-col gap-1.5 text-[0.9rem] font-semibold text-ink">
            Event name
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <span className="text-[0.8rem] font-normal text-muted">Clear it and go on to see the step marked as needing attention.</span>
          </label>
        ) : step === 1 ? (
          <p className="m-0 text-ink-soft">Thursday, Oct 30 at 6 p.m., Student Center East ballroom.</p>
        ) : step === 2 ? (
          <p className="m-0 text-ink-soft">Free, members only. (This step is optional.)</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-ink-soft">
              <strong className="text-ink">{name || 'Untitled event'}</strong> · Oct 30 · Free
            </p>
            <div className="flex items-center gap-3 text-[0.85rem] text-muted">
              <AvatarGroup aria-label="Officers hosting" people={MEMBERS.slice(0, 7)} max={4} />
              7 officers hosting
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} disabled={step === 0}>
            Back
          </Button>
          <Button size="sm" onClick={() => setStep(last ? 0 : step + 1)}>
            {last ? 'Publish' : 'Next'}
          </Button>
        </div>
      </Panel>
      <Panel title="Vertical">
        <Stepper aria-label="Profile setup" orientation="vertical" current={1} steps={[
          { label: 'Sign in with your GSU account', description: 'Done Oct 3' },
          { label: 'Pick your interests', description: 'So we can suggest events' },
          { label: 'Join a committee', optional: true },
        ]} />
      </Panel>
    </div>
  )
}

// ── The page ──────────────────────────────────────────────────────────────────

const NAV = [
  {
    items: [
      { label: 'Dashboard', href: '/dev/dashboard', icon: <LayoutDashboard />, exact: true },
      { label: 'Components', href: '/dev/components', icon: <Component /> },
      { label: 'Forms', href: '/dev/forms', icon: <FormInput /> },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Home', href: '/', icon: <Home /> },
      { label: 'Events', href: '/events', icon: <CalendarPlus />, count: 4 },
      { label: 'Campus map', href: '/map', icon: <Map /> },
    ],
  },
]

const Brand: FC<{ mark?: boolean }> = ({ mark }) => (
  <span className="flex items-center gap-2.5 font-bold text-ink">
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-solid text-[0.8rem] text-white">
      C
    </span>
    {mark ? <span className="sr-only">CSEG Admin</span> : 'CSEG Admin'}
  </span>
)

export const DashboardDemo: FC = () => {
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [editId, setEditId] = useState<string | null>(null)
  const memberCount = useMemo(() => MEMBERS.length, [])

  const commands: Command[] = [
    { id: 'tab-overview', group: 'Dashboard', label: 'Overview', icon: <LayoutDashboard />, onSelect: () => setTab('overview') },
    { id: 'tab-members', group: 'Dashboard', label: 'Members', icon: <Users />, keywords: ['people', 'roster'], onSelect: () => setTab('members') },
    { id: 'tab-setup', group: 'Dashboard', label: 'Create an event', icon: <CalendarPlus />, keywords: ['new'], onSelect: () => setTab('setup') },
    { id: 'loading', group: 'Actions', label: loading ? 'Stop simulating loading' : 'Simulate loading', icon: <Loader />, onSelect: () => setLoading(!loading) },
    ...NAV.flatMap((section) => section.items.map((item) => ({ id: item.href, group: 'Go to', label: item.label, icon: item.icon, href: item.href }))),
    ...MEMBERS.map((m) => ({
      id: m.id,
      group: 'Members',
      label: m.name,
      description: m.major,
      keywords: [m.email],
      onSelect: () => {
        setTab('members')
        setEditId(m.id)
      },
    })),
  ]

  return (
    <NotificationProvider>
      <AppShell
        aria-label="Dashboard"
        nav={NAV}
        brand={<Brand />}
        brandMark={<Brand mark />}
        className="rounded-2xl border border-line"
        topbar={
          <>
            <CommandPalette commands={commands} className="mr-auto w-full max-w-72" />
            <Checkbox checked={loading} onCheckedChange={setLoading} className="max-sm:hidden">
              Simulate loading
            </Checkbox>
            <ActionMenu
              label="Account"
              trigger={
                <button type="button" aria-label="Account" className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  <Avatar name="Jordan Lee" size="sm" status="online" decorative />
                </button>
              }
              items={[
                { label: 'Jordan Lee', description: 'President · CSEG', disabled: true },
                'separator',
                { label: 'Profile', href: '/dev/dashboard' },
                { label: 'Settings', shortcut: ['mod', ','] },
                'separator',
                { label: 'Sign out', disabled: true, description: 'Not in the demo' },
              ]}
            />
          </>
        }
      >
        <Tabs
          aria-label="Dashboard"
          value={tab}
          onValueChange={setTab}
          items={[
            { id: 'overview', label: 'Overview', content: <Overview loading={loading} /> },
            { id: 'members', label: 'Members', count: memberCount, icon: <Users />, content: <Members loading={loading} editId={editId} onEdit={setEditId} /> },
            { id: 'setup', label: 'New event', content: <EventSetup /> },
          ]}
        />
      </AppShell>
    </NotificationProvider>
  )
}
