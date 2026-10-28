'use client'

import { Grid2x2, List, Rows3 } from 'lucide-react'
import { useState, type FC, type FormEvent, type ReactNode } from 'react'

import {
  Calendar,
  Checkbox,
  CheckboxGroup,
  ColorPicker,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Field,
  FileInput,
  Form,
  Input,
  NumberInput,
  PasswordInput,
  PinInput,
  Radio,
  RadioGroup,
  RangeSlider,
  RichTextEditor,
  Rating,
  SegmentedControl,
  Select,
  Slider,
  Sortable,
  SortableHandle,
  SlugInput,
  Switch,
  TagInput,
  TextArea,
  TimeInput,
  DEFAULT_REQUIREMENTS,
  type DateRange,
  type LabelType,
  type RichTextValue,
  type SelectItems,
  type SlugCheck,
} from '@/components/Form'
import { today } from '@/components/Form/Date/utils'
import { formatBytes } from '@/components/Form/File'
import { button, card } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

const MAJORS: SelectItems = [
  {
    label: 'Arts & Sciences',
    options: [
      { value: 'bio', label: 'Biology' },
      { value: 'cs', label: 'Computer Science', description: 'B.S., College of Arts & Sciences' },
      { value: 'eng', label: 'English' },
      { value: 'psych', label: 'Psychology' },
    ],
  },
  {
    label: 'Business',
    options: [
      { value: 'acct', label: 'Accounting' },
      { value: 'cis', label: 'Computer Information Systems' },
      { value: 'fin', label: 'Finance', disabled: true },
      { value: 'mkt', label: 'Marketing' },
    ],
  },
  { value: 'undecided', label: 'Undecided' },
]

const INTERESTS: SelectItems = [
  { value: 'socials', label: 'Socials' },
  { value: 'workshops', label: 'Workshops' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'career', label: 'Career prep' },
  { value: 'study', label: 'Study groups' },
  { value: 'sports', label: 'Intramurals' },
]

/** Addresses the demo pretends are taken, to show the availability check */
const TAKEN = new Set(['welcome-week', 'fall-social', 'about'])
const pretendCheck = (slug: string) =>
  new Promise<SlugCheck>((done) => setTimeout(() => done(TAKEN.has(slug) ? { ok: false, message: 'Another post already uses this address.' } : { ok: true }), 350))

const RIBBON_HTML = `<h1>Meeting notes</h1><p>Agenda for <i>Thursday</i>:</p><table><tr><th>Item</th><th>Who</th></tr><tr><td>Budget</td><td>Sam</td></tr><tr><td>Fall Social</td><td>Jordan</td></tr></table>`

const STARTING_HTML = `<h2>Fall Social</h2><p>Join us <b>Thursday at 6</b> in the <mark>Student Center East ballroom</mark>. Bring a friend!</p><ul><li>Games</li><li>Free food</li></ul>`

const AGENDA = [
  { id: 'welcome', title: 'Welcome and introductions' },
  { id: 'budget', title: 'Spring budget' },
  { id: 'events', title: 'Event calendar' },
  { id: 'elections', title: 'Officer elections' },
]

/** How a file reads in the demo's output: "flyer.pdf (43.4 KB)", or "(no file)" for an empty file field */
const describeFile = (f: File) => (f.name ? `${f.name} (${formatBytes(f.size)})` : '(no file)')

/** A titled card with the component and its current value */
const Demo: FC<{ title: string; note?: ReactNode; value?: unknown; wide?: boolean; children: ReactNode }> = ({
  title,
  note,
  value,
  wide,
  children,
}) => (
  <section className={cn(card({ padded: true }), 'gap-4', wide && 'md:col-span-2')}>
    <div className="flex flex-col gap-1">
      <h2 className="text-[1.05rem] font-bold text-ink">{title}</h2>
      {note ? <p className="text-[0.85rem] leading-relaxed text-muted">{note}</p> : null}
    </div>
    {children}
    {value !== undefined ? (
      <pre className="m-0 overflow-x-auto rounded-lg bg-fill px-3 py-2 text-[0.75rem] text-ink-soft">
        {JSON.stringify(value, (_, v) => (v instanceof File ? describeFile(v) : v))}
      </pre>
    ) : null}
  </section>
)

export const FormsDemo: FC = () => {
  const [labelType, setLabelType] = useState<LabelType>('normal')
  const [text, setText] = useState('')
  const [bio, setBio] = useState('')
  const [guests, setGuests] = useState<number | null>(2)
  const [agree, setAgree] = useState(false)
  const [interests, setInterests] = useState<string[]>(['socials'])
  const [year, setYear] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>('member')
  const [major, setMajor] = useState<string | null>(null)
  const [search, setSearch] = useState<string | null>('cs')
  const [tags, setTags] = useState<string[]>(['workshops'])
  const [days, setDays] = useState<string[]>([])
  const [volume, setVolume] = useState(40)
  const [budget, setBudget] = useState<[number, number]>([50, 200])
  const [vertical, setVertical] = useState(60)
  const [files, setFiles] = useState<File[]>([])
  const [date, setDate] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [trip, setTrip] = useState<{ start: string; end: string } | null>(null)
  const [span, setSpan] = useState<DateRange | null>(null)
  const [time, setTime] = useState<string | null>('18:00')
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [exact, setExact] = useState<string | null>('10:07')
  const [color, setColor] = useState('#0039a6')
  const [overlay, setOverlay] = useState('#0039a6cc')
  const [agenda, setAgenda] = useState(AGENDA)
  const [submitted, setSubmitted] = useState<[string, string][] | null>(null)
  const [emails, setEmails] = useState(true)
  const [publicProfile, setPublicProfile] = useState(false)
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState('week')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeDone, setCodeDone] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [stars, setStars] = useState(0)
  const [skills, setSkills] = useState<string[]>(['Python', 'Public speaking'])
  const [invites, setInvites] = useState<string[]>([])
  const [postTitle, setPostTitle] = useState('Welcome Week')
  const [slug, setSlug] = useState('')
  const [rich, setRich] = useState<RichTextValue | null>(null)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setSubmitted([...data.entries()].map(([k, v]) => [k, v instanceof File ? describeFile(v) : v]))
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Demo
          title="Field, Input & label styles"
          note="Switch where labels sit; it applies to the Input, TextArea, and NumberInput demos."
          value={text}
        >
          <RadioGroup legend="Label style" orientation="horizontal" value={labelType} onValueChange={(v) => setLabelType(v as LabelType)}>
            <Radio value="normal">Normal</Radio>
            <Radio value="inline">Inline</Radio>
            <Radio value="floating">Floating</Radio>
          </RadioGroup>
          <Field label="GSU email" labelType={labelType} description="We’ll only use this for event updates." required>
            <Input type="email" value={text} onChange={(e) => setText(e.target.value)} trailing={labelType === 'floating' ? undefined : '@student.gsu.edu'} />
          </Field>
          <Field label="Search" labelType={labelType === 'floating' ? 'normal' : labelType}>
            <Input type="search" size="sm" placeholder="Small, with a leading icon" leading={<span aria-hidden>⌕</span>} />
          </Field>
          <Field label="Panther ID" labelType={labelType} error="Panther IDs are 9 digits.">
            <Input inputMode="numeric" defaultValue="0021" />
          </Field>
          <Field label="Disabled" labelType={labelType} disabled>
            <Input defaultValue="Can’t edit this" />
          </Field>
        </Demo>

        <Demo title="TextArea & NumberInput" value={{ bio, guests }}>
          <Field label="Short bio" labelType={labelType} description="Grows as you type.">
            <TextArea maxLength={200} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <Field label="Guests" labelType={labelType} description="1–10, buttons or arrow keys.">
            <NumberInput min={1} max={10} value={guests} onValueChange={setGuests} />
          </Field>
          <Field label="Dues" labelType={labelType}>
            <NumberInput min={0} step={0.25} defaultValue={12.5} stepper={false} />
          </Field>
        </Demo>

        <Demo title="Checkbox & CheckboxGroup" value={{ agree, interests }}>
          <Checkbox checked={agree} onCheckedChange={setAgree} description="You can unsubscribe anytime.">
            Email me about events
          </Checkbox>
          <Checkbox
            checked={interests.length === 3}
            indeterminate={interests.length > 0 && interests.length < 3}
            onCheckedChange={(on) => setInterests(on ? ['socials', 'workshops', 'volunteering'] : [])}
          >
            All interests (indeterminate when some are picked)
          </Checkbox>
          <CheckboxGroup legend="Interests" name="interests" value={interests} onValueChange={setInterests} orientation="horizontal">
            <Checkbox value="socials">Socials</Checkbox>
            <Checkbox value="workshops">Workshops</Checkbox>
            <Checkbox value="volunteering">Volunteering</Checkbox>
          </CheckboxGroup>
          <CheckboxGroup legend="Card style" variant="card" defaultValue={['b']} error="Pick at least two.">
            <Checkbox value="a" description="Shown on the events page">
              Public
            </Checkbox>
            <Checkbox value="b" description="Sent to members by email">
              Newsletter
            </Checkbox>
          </CheckboxGroup>
        </Demo>

        <Demo title="RadioGroup" value={{ year, plan }}>
          <RadioGroup legend="Year" name="year" value={year} onValueChange={setYear} required description="Arrow keys move between choices.">
            <Radio value="1">Freshman</Radio>
            <Radio value="2">Sophomore</Radio>
            <Radio value="3">Junior</Radio>
            <Radio value="4" disabled>
              Senior (disabled)
            </Radio>
          </RadioGroup>
          <RadioGroup legend="Membership" variant="card" value={plan} onValueChange={setPlan}>
            <Radio value="member" description="Free for GSU students">
              Member
            </Radio>
            <Radio value="officer" description="Runs events and votes on the budget">
              Officer
            </Radio>
          </RadioGroup>
        </Demo>

        <Demo title="Select" note="Try typing letters in the dropdown, and Backspace in tags." value={{ major, search, tags, days }} wide>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Dropdown, grouped">
              <Select options={MAJORS} value={major} onValueChange={setMajor} placeholder="Choose a major" />
            </Field>
            <Field label="Combobox (search)">
              <Select type="combobox" options={MAJORS} value={search} onValueChange={setSearch} placeholder="Type to search" />
            </Field>
            <Field label="Tags" description="Pick several.">
              <Select type="tags" options={INTERESTS} value={tags} onValueChange={setTags} placeholder="Add interests" />
            </Field>
            <Field label="Multiple dropdown">
              <Select
                mode="multiple"
                options={['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => ({ value: d.toLowerCase(), label: d }))}
                value={days}
                onValueChange={setDays}
                placeholder="Days you’re free"
              />
            </Field>
            <Field label="Small, with an error" error="Choose a campus.">
              <Select size="sm" options={[{ value: 'atl', label: 'Atlanta' }, { value: 'per', label: 'Perimeter' }]} />
            </Field>
            <Field label="Disabled" disabled>
              <Select options={MAJORS} defaultValue="cs" />
            </Field>
          </div>
        </Demo>

        <Demo title="Slider & RangeSlider" note="Drag, click the track, or use arrows, Page Up/Down, and Home/End." value={{ volume, budget, vertical }} wide>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-6">
              <Field label="Volume">
                <Slider value={volume} onValueChange={setVolume} formatValue={(v) => `${v}%`} tooltip />
              </Field>
              <Field label="Rating" description="Steps of 1, with labeled marks; click a label to jump there.">
                <Slider
                  min={1}
                  max={5}
                  defaultValue={3}
                  showValue={false}
                  marks={[
                    { value: 1, label: 'Poor' },
                    { value: 2 },
                    { value: 3, label: 'OK' },
                    { value: 4 },
                    { value: 5, label: 'Great' },
                  ]}
                />
              </Field>
              <Field label="Ticket price" description="snapToMarks: it stops only at the marks.">
                <Slider
                  min={0}
                  max={50}
                  defaultValue={10}
                  snapToMarks
                  formatValue={(v) => (v ? `$${v}` : 'Free')}
                  marks={[
                    { value: 0, label: 'Free' },
                    { value: 5, label: '$5' },
                    { value: 10, label: '$10' },
                    { value: 20, label: '$20' },
                    { value: 50, label: '$50' },
                  ]}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-6">
              <Field label="Budget">
                <RangeSlider min={0} max={500} step={10} minDistance={20} value={budget} onValueChange={setBudget} formatValue={(v) => `$${v}`} tooltip />
              </Field>
              <Field label="Disabled" disabled>
                <RangeSlider defaultValue={[20, 70]} />
              </Field>
            </div>
            <Field label="Vertical">
              <Slider type="vertical" value={vertical} onValueChange={setVertical} marks={[0, 25, 50, 75, { value: 100, label: 'Max' }]} />
            </Field>
          </div>
        </Demo>

        <Demo
          title="DatePicker & Calendar"
          note="Type a date (10/27/2026, 2026-10-27, Oct 27) or use the calendar. Click a calendar’s title to jump by month or year."
          value={{ date, day }}
        >
          <Field label="Event date" description="Weekdays from today on.">
            <DatePicker
              value={date}
              onValueChange={setDate}
              min={today()}
              isDateDisabled={(iso) => [0, 6].includes(new Date(`${iso}T00:00`).getDay())}
            />
          </Field>
          <Calendar value={day} onValueChange={setDay} weekStartsOn={1} className="self-center" />
        </Demo>

        <Demo title="DateRangePicker" note="Type both ends, use a quick pick, or click the first day and then the last." value={{ trip, span }}>
          <Field label="Trip dates" description="From today on.">
            <DateRangePicker value={trip} onValueChange={setTrip} min={today()} />
          </Field>
          <Calendar mode="range" range={span} onRangeChange={setSpan} className="self-center" />
        </Demo>

        <Demo title="TimeInput & DateTimePicker" note="Type any time (930a, 21:15, noon) or use the clock button’s hour and minute columns." value={{ time, exact, startsAt }}>
          <Field label="Meeting time">
            <TimeInput value={time} onValueChange={setTime} step={15} min="08:00" max="22:00" />
          </Field>
          <Field
            label="Exact time (segments)"
            description="Any minute, like 10:07. Type digits or use the arrows; Shift+arrow jumps 15 minutes. A or P sets the period."
          >
            <TimeInput type="segments" value={exact} onValueChange={setExact} />
          </Field>
          <Field label="Starts" description="Both halves are needed for a value.">
            <DateTimePicker value={startsAt} onValueChange={setStartsAt} step={30} />
          </Field>
        </Demo>

        <Demo
          title="ColorPicker"
          note="Drag in the square or use its arrow keys (Shift for bigger steps). The Details tab copies HEX, RGB, or HSL, pastes a color, and rates contrast. The box also takes rgb() and hsl()."
          value={{ color, overlay }}
        >
          <Field label="Event color">
            <ColorPicker value={color} onValueChange={setColor} />
          </Field>
          <Field label="Overlay (with alpha)" description="Adds an opacity bar and an Alpha field; the value is 8-digit hex.">
            <ColorPicker alpha value={overlay} onValueChange={setOverlay} />
          </Field>
          <div className="h-10 rounded-lg" style={{ backgroundColor: color }} aria-hidden />
        </Demo>

        <Demo title="FileInput" value={files}>
          <Field label="Flyer" description="Drop files here, or browse.">
            <FileInput multiple maxFiles={3} maxSize={5 * 1024 ** 2} accept=".pdf,image/*" hint="PDF or images, up to 5 MB, 3 files" onFilesChange={setFiles} />
          </Field>
        </Demo>

        <Demo title="Sortable" note="Drag the grips, or focus one and press Space, then the arrow keys." value={agenda.map((a) => a.id)} wide>
          <Sortable
            aria-label="Meeting agenda"
            items={agenda}
            onItemsChange={setAgenda}
            getKey={(a) => a.id}
            getLabel={(a) => a.title}
            renderItem={(a, { index, handleProps, active }) => (
              <div className={cn('flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5', active && 'border-brand')}>
                <SortableHandle {...handleProps} />
                <span className="w-5 text-[0.8rem] font-semibold text-muted tabular-nums">{index + 1}</span>
                <span className="text-[0.9rem] text-ink">{a.title}</span>
              </div>
            )}
          />
        </Demo>

        <Demo title="Switch" note="For settings that apply right away. Space toggles it; screen readers say on and off." value={{ emails, publicProfile }}>
          <div className="flex flex-col gap-4">
            <Switch checked={emails} onCheckedChange={setEmails} description="New events and reminders, about once a week">
              Email me about events
            </Switch>
            <Switch checked={publicProfile} onCheckedChange={setPublicProfile}>
              Show my profile to other members
            </Switch>
            <Switch size="sm" switchPosition="start" defaultChecked>
              Compact, before its label
            </Switch>
            <Switch disabled>Disabled</Switch>
          </div>
        </Demo>

        <Demo title="SegmentedControl" note="A few choices side by side. Arrow keys move the pick; it's sent with a form." value={{ view, period }}>
          <Field label="View">
            <SegmentedControl
              value={view}
              onValueChange={setView}
              options={[
                { value: 'list', label: 'List', icon: <List aria-hidden /> },
                { value: 'grid', label: 'Grid', icon: <Grid2x2 aria-hidden /> },
                { value: 'compact', label: 'Compact', icon: <Rows3 aria-hidden /> },
              ]}
            />
          </Field>
          <Field label="Period">
            <SegmentedControl
              fitted
              size="sm"
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'year', label: 'Year', disabled: true },
              ]}
            />
          </Field>
        </Demo>

        <Demo title="PasswordInput" note="The eye button shows what's typed. For a new password, the meter and checklist follow along." value={{ length: password.length }}>
          <Field label="Password">
            <PasswordInput autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} strength requirements={DEFAULT_REQUIREMENTS} />
          </Field>
        </Demo>

        <Demo title="PinInput" note="One real input drawn as boxes: type, paste the whole code, or let the phone autofill it." value={{ code, completed: codeDone }}>
          <Field label="Code from your email" description="Try 123456. It expires in 10 minutes.">
            <PinInput value={code} onValueChange={setCode} onComplete={setCodeDone} />
          </Field>
          <Field label="Club PIN" description="Try 0000 to see an error." error={pin === '0000' ? 'Pick a less guessable PIN' : undefined}>
            <PinInput length={4} mask value={pin} onValueChange={setPin} />
          </Field>
          <Field label="Invite code (letters too)">
            <PinInput length={5} type="alphanumeric" />
          </Field>
        </Demo>

        <Demo title="Rating" note="Stars over radio buttons: arrow keys change it; pick the same star again to clear. Read-only shows halves." value={stars}>
          <Field label="How was the workshop?">
            <Rating value={stars} onValueChange={setStars} labels={['Poor', 'Fair', 'Good', 'Great', 'Loved it']} />
          </Field>
          <div className="flex flex-wrap items-center gap-4 text-[0.85rem] text-ink-soft">
            <span className="flex items-center gap-2">
              <Rating readOnly value={4.5} size="sm" /> 4.5 (128 reviews)
            </span>
            <Rating readOnly value={3} size="lg" />
            <Rating aria-label="Disabled rating" defaultValue={2} disabled size="sm" />
          </div>
        </Demo>

        <Demo title="SlugInput" note="Follows the title until you edit it; asks whether it’s free (try “fall social” or “about”). A live one takes a press of Change first." value={{ slug }}>
          <Field label="Post title">
            <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
          </Field>
          <Field label="Web address">
            <SlugInput value={slug} onValueChange={setSlug} source={postTitle} prefix="/posts/" checkAvailability={pretendCheck} />
          </Field>
          <Field label="Published page" description="Already live, so it's locked.">
            <SlugInput defaultValue="spring-gala-2026" prefix="/events/" locked />
          </Field>
        </Demo>

        <Demo
          title="RichTextEditor"
          note="Blocks (headings, quote, lists, code, divider), font and size, bold through highlight and inline code, text, background, underline, and border colors, and tables with row and column tools. The toolbar is one Tab stop; use the arrow keys inside it."
          value={rich ? { words: rich.text.trim() ? rich.text.trim().split(/\s+/).length : 0, htmlLength: rich.html.length, jsonLength: rich.json.length } : null}
          wide
        >
          <Field label="Announcement" description="Starts from HTML; saves Lexical JSON, HTML, and plain text.">
            <RichTextEditor defaultValue={STARTING_HTML} onChange={setRich} />
          </Field>
          <Field label="With the ribbon" description="toolbar=&quot;ribbon&quot;: tabs of labeled groups. Click into the table for its tab; double-click a tab to collapse the ribbon.">
            <RichTextEditor toolbar="ribbon" defaultValue={RIBBON_HTML} minHeight="10rem" />
          </Field>
          <Field label="Read-only">
            <RichTextEditor readOnly defaultValue="<p>Shown without the toolbar, like a <b>preview</b>.</p>" />
          </Field>
        </Demo>

        <Demo title="TagInput" note="Type and press Enter or a comma; paste a list; Backspace in the empty box removes the last tag." value={{ skills, invites }} wide>
          <Field label="Skills" description="Suggestions appear as you type.">
            <TagInput
              value={skills}
              onValueChange={setSkills}
              max={6}
              placeholder="Add a skill"
              suggestions={['Python', 'JavaScript', 'Public speaking', 'Event planning', 'Graphic design', 'Photography', 'Spanish']}
            />
          </Field>
          <Field label="Invite by email" description="GSU addresses only; paste several separated by commas.">
            <TagInput
              value={invites}
              onValueChange={setInvites}
              transform={(t) => t.toLowerCase()}
              validate={(t) => (/^[^\s@]+@(student\.)?gsu\.edu$/.test(t) ? undefined : `“${t}” isn’t a GSU email`)}
              placeholder="name@student.gsu.edu"
            />
          </Field>
        </Demo>
      </div>

      <section className={cn(card({ padded: true }), 'gap-5')}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[1.25rem] font-bold text-ink">A whole form</h2>
          <p className="text-[0.85rem] text-muted">Submitting shows exactly what a plain form submission would send.</p>
        </div>
        <Form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Name" required>
              <Input name="name" autoComplete="name" />
            </Field>
            <Field label="Major">
              <Select type="combobox" name="major" options={MAJORS} />
            </Field>
            <Field label="Interests">
              <Select type="tags" name="interests" options={INTERESTS} />
            </Field>
            <Field label="Guests">
              <NumberInput name="guests" min={0} max={5} defaultValue={0} />
            </Field>
            <Field label="Arrives">
              <DateTimePicker name="arrives" />
            </Field>
            <Field label="Dates">
              <DateRangePicker name="dates" />
            </Field>
            <Field label="Favorite color">
              <ColorPicker name="color" />
            </Field>
            <Field label="Budget">
              <RangeSlider name="budget" min={0} max={300} step={10} defaultValue={[0, 100]} formatValue={(v) => `$${v}`} />
            </Field>
            <Field label="Résumé">
              <FileInput name="resume" accept=".pdf" hint="PDF" />
            </Field>
            <Field label="Skills">
              <TagInput name="skills" placeholder="Press Enter after each" />
            </Field>
            <Field label="Profile address">
              <SlugInput name="profile" prefix="/members/" source="Avery Patel" />
            </Field>
            <Field label="Attending">
              <SegmentedControl
                name="attending"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'maybe', label: 'Maybe' },
                  { value: 'no', label: 'No' },
                ]}
              />
            </Field>
            <Field label="Last event’s rating">
              <Rating name="rating" />
            </Field>
            <Field label="Password">
              <PasswordInput name="password" autoComplete="new-password" strength />
            </Field>
            <Field label="Verification code">
              <PinInput name="code" />
            </Field>
            <Switch name="emails" value="on" defaultChecked className="self-center">
              Email me about events
            </Switch>
          </div>
          <RadioGroup legend="Year" name="year" orientation="horizontal">
            <Radio value="1">Freshman</Radio>
            <Radio value="2">Sophomore</Radio>
            <Radio value="3">Junior</Radio>
            <Radio value="4">Senior</Radio>
          </RadioGroup>
          <Field label="Anything else?">
            <TextArea name="notes" rows={2} />
          </Field>
          <Field label="Introduce yourself" description="Sent as HTML (and Lexical JSON).">
            <RichTextEditor name="intro_json" htmlName="intro_html" minHeight="6rem" />
          </Field>
          <Checkbox name="agree" value="yes">
            I agree to the club’s code of conduct
          </Checkbox>
          <div className="flex gap-3">
            <button type="submit" className={button()}>
              Submit
            </button>
            <button type="reset" className={button({ variant: 'outline' })} onClick={() => setSubmitted(null)}>
              Reset
            </button>
          </div>
        </Form>
        {submitted ? (
          <pre className="m-0 overflow-x-auto rounded-lg bg-fill px-3 py-2 text-[0.8rem] text-ink-soft" aria-live="polite">
            {submitted.map(([k, v]) => `${k}: ${v}`).join('\n') || '(nothing sent)'}
          </pre>
        ) : null}
      </section>
    </div>
  )
}
