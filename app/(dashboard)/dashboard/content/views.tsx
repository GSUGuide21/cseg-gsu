'use client'
/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */

import { BarChart3, BookOpen, Briefcase, ClipboardList, DownloadCloud, ExternalLink, Images, ListChecks, Quote, Route } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

import { Badge, Button } from '@/components'
import { importBuiltInTours } from '@/lib/content/actions'
import {
  FORM_FIELD_TYPES,
  hasOptions,
  isOpen,
  LIMITS,
  OPPORTUNITY_KINDS,
  opportunityKindLabel,
  type AlbumRow,
  type DocumentRow,
  type FormRow,
  type OpportunityRow,
  type PollRow,
  type TestimonialRow,
  type TourRow,
} from '@/lib/content/types'
import { formatDate } from '@/lib/dashboard/format'
import { atlantaToday } from '@/lib/eateries'

import { useAction } from '../ui'
import { CollectionView, type CollectionConfig } from './CollectionView'

/**
 * The dashboard's screens for the smaller kinds of content. Each is the same screen (a table
 * and an editor), told what that kind holds.
 */

const shown = (published: boolean, yes = 'Shown', no = 'Hidden') => (
  <Badge size="sm" dot tone={published ? 'success' : 'neutral'}>
    {published ? yes : no}
  </Badge>
)
const SHOW = { name: 'published', label: 'Show on the site', type: 'switch', description: 'Hidden ones stay here for later.' } as const
const ORDER = { name: 'sort', label: 'Order', type: 'number', description: 'Lower numbers come first.' } as const
const muted = (text: string) => <span className="text-muted">{text}</span>

// ── Albums ──────────────────────────────────────────────────────────────────

const ALBUMS: CollectionConfig<AlbumRow> = {
  kind: 'album',
  noun: 'album',
  title: 'Photo albums',
  description: 'Photos from events and the term, each album at its own address (/albums/fall-social) and listed at /albums.',
  icon: <Images />,
  addLabel: 'Add an album',
  hint: 'Give each photo a description: it’s what people who can’t see the photo read.',
  defaults: { published: false },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Web address', type: 'slug', prefix: '/albums/' },
    { name: 'description', label: 'About it', type: 'textarea', rows: 2 },
    { name: 'taken_on', label: 'When it was', type: 'date', description: 'Albums are listed newest first.' },
    { name: 'cover_url', label: 'Cover', type: 'image', description: 'What the list shows. Left empty, the first photo.' },
    {
      name: 'photos',
      label: 'Photos',
      type: 'list',
      itemLabel: 'photo',
      max: LIMITS.photos,
      fields: [
        { name: 'src', label: 'Photo', type: 'image' },
        { name: 'alt', label: 'What it shows', type: 'text', placeholder: 'Students at the welcome table' },
        { name: 'caption', label: 'Caption (optional)', type: 'text' },
      ],
    },
    SHOW,
  ],
  columns: [
    {
      key: 'title',
      header: 'Album',
      cell: (a) => {
        const cover = a.cover_url ?? a.photos[0]?.src
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            {cover ? <img src={cover} alt="" className="size-9 shrink-0 rounded-md object-cover ring-1 ring-line" /> : null}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-ink">{a.title}</span>
              <span className="truncate text-[0.8rem] text-muted">/albums/{a.slug}</span>
            </span>
          </span>
        )
      },
    },
    { key: 'photos', header: 'Photos', hideWhenStacked: true, cell: (a) => a.photos.length },
    { key: 'taken_on', header: 'Date', hideWhenStacked: true, cell: (a) => (a.taken_on ? formatDate(a.taken_on) : muted('—')) },
    { key: 'published', header: 'On the site', cell: (a) => shown(a.published) },
  ],
  nameOf: (a) => a.title,
  actions: (a) => (a.published ? [{ label: 'View on the site', icon: <ExternalLink />, href: `/albums/${a.slug}` }] : []),
  emptyHint: 'Add one and it’s listed at /albums.',
  removeHint: 'It comes off the site. Its photos stay in the media library.',
}
export const AlbumsView: FC<{ rows: AlbumRow[] }> = ({ rows }) => <CollectionView config={ALBUMS} rows={rows} />

// ── Tours ───────────────────────────────────────────────────────────────────

export const ToursView: FC<{ rows: TourRow[]; places: { value: string; label: string }[] }> = ({ rows, places }) => {
  const router = useRouter()
  const { pending, run } = useAction()
  const config: CollectionConfig<TourRow> = {
    kind: 'tour',
    noun: 'tour',
    title: 'Tours',
    description: 'The walking tours on the map’s Tours tab. Each is a list of stops in walking order; the map works out the paths and the times between them.',
    icon: <Route />,
    addLabel: 'Add a tour',
    hint: 'The first tour in order is the one the Tours tab opens on.',
    defaults: { published: true, sort: (rows.length + 1) * 10 },
    fields: [
      { name: 'title', label: 'Name', type: 'text', required: true, placeholder: 'First week on campus' },
      { name: 'label', label: 'Short name', type: 'text', maxLength: 30, description: 'A word or two for the tour switcher. Left empty, the name.' },
      { name: 'slug', label: 'Link name', type: 'slug', prefix: '/map?tour=' },
      { name: 'intro', label: 'What it’s for', type: 'textarea', rows: 2 },
      {
        name: 'stops',
        label: 'Stops, in walking order',
        type: 'list',
        itemLabel: 'stop',
        max: LIMITS.stops,
        fields: [
          { name: 'placeId', label: 'Place', type: 'select', options: places, placeholder: 'Pick a place on the map' },
          { name: 'title', label: 'What to do here', type: 'text', placeholder: 'Get your PantherCard' },
          { name: 'why', label: 'Why go', type: 'textarea' },
          { name: 'tip', label: 'A tip (optional)', type: 'text' },
        ],
      },
      ORDER,
      SHOW,
    ],
    columns: [
      {
        key: 'title',
        header: 'Tour',
        cell: (t) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-ink">{t.title}</span>
            <span className="truncate text-[0.8rem] text-muted">{t.intro}</span>
          </span>
        ),
      },
      { key: 'stops', header: 'Stops', hideWhenStacked: true, cell: (t) => t.stops.length },
      { key: 'published', header: 'On the map', cell: (t) => shown(t.published) },
    ],
    nameOf: (t) => t.title,
    actions: (t) => (t.published ? [{ label: 'Open on the map', icon: <ExternalLink />, href: `/map?tour=${t.slug}` }] : []),
    headerActions: (
      <Button size="sm" variant="outline" leading={<DownloadCloud size={15} aria-hidden />} loading={pending} onClick={() => run(importBuiltInTours, () => router.refresh())}>
        Copy in the built-in tours
      </Button>
    ),
    emptyHint: 'Until there’s a tour here, the map shows the ones built into the site. Copy those in to change them, or add your own.',
    removeHint: 'It comes off the map. If it’s the last one here, the built-in tours show again.',
  }
  return <CollectionView config={config} rows={rows} />
}

// ── Library ─────────────────────────────────────────────────────────────────

const LIBRARY: CollectionConfig<DocumentRow> = {
  kind: 'document',
  noun: 'document',
  title: 'Library',
  description: 'Flyers, forms, handouts, and useful links, listed at /library under their categories.',
  icon: <BookOpen />,
  addLabel: 'Add a document',
  defaults: { published: true, sort: 0 },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'url', label: 'File or link', type: 'file', required: true, nameField: 'file_name', description: 'Upload a file, or paste a link to one.' },
    { name: 'category', label: 'Category', type: 'text', placeholder: 'Forms', description: 'Documents with the same category are listed together.' },
    { name: 'description', label: 'About it', type: 'textarea', rows: 2 },
    ORDER,
    SHOW,
  ],
  columns: [
    {
      key: 'title',
      header: 'Document',
      cell: (d) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{d.title}</span>
          <span className="truncate text-[0.8rem] text-muted">{d.file_name ?? d.url}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', hideWhenStacked: true, cell: (d) => d.category ?? muted('None') },
    { key: 'published', header: 'On the site', cell: (d) => shown(d.published) },
  ],
  nameOf: (d) => d.title,
  actions: (d) => [{ label: 'Open it', icon: <ExternalLink />, onSelect: () => window.open(d.url, '_blank', 'noopener') }],
  emptyHint: 'Add one and it’s listed at /library.',
  removeHint: 'It comes off the library. An uploaded file stays in storage.',
}
export const LibraryView: FC<{ rows: DocumentRow[] }> = ({ rows }) => <CollectionView config={LIBRARY} rows={rows} />

// ── Testimonials ────────────────────────────────────────────────────────────

const TESTIMONIALS: CollectionConfig<TestimonialRow> = {
  kind: 'testimonial',
  noun: 'testimonial',
  title: 'Testimonials',
  description: 'What members say about the club, in their words. They show on the Join page.',
  icon: <Quote />,
  addLabel: 'Add a testimonial',
  hint: 'Ask before you quote someone, and use the name they’d like shown.',
  defaults: { published: true, sort: 0 },
  fields: [
    { name: 'quote', label: 'What they said', type: 'textarea', rows: 3, required: true, maxLength: 600 },
    { name: 'name', label: 'Who said it', type: 'text', required: true },
    { name: 'role', label: 'Who they are', type: 'text', placeholder: 'Junior, Biology' },
    { name: 'photo_url', label: 'Their photo (optional)', type: 'image' },
    ORDER,
    SHOW,
  ],
  columns: [
    {
      key: 'name',
      header: 'From',
      cell: (t) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{t.name}</span>
          {t.role ? <span className="truncate text-[0.8rem] text-muted">{t.role}</span> : null}
        </span>
      ),
    },
    { key: 'quote', header: 'What they said', hideWhenStacked: true, cell: (t) => <span className="line-clamp-2 text-ink-soft">“{t.quote}”</span> },
    { key: 'published', header: 'On the site', cell: (t) => shown(t.published) },
  ],
  nameOf: (t) => t.name,
  emptyHint: 'Add one and a “What members say” section appears on the Join page.',
  removeHint: 'It comes off the Join page.',
}
export const TestimonialsView: FC<{ rows: TestimonialRow[] }> = ({ rows }) => <CollectionView config={TESTIMONIALS} rows={rows} />

// ── Opportunities ───────────────────────────────────────────────────────────

const OPPORTUNITIES: CollectionConfig<OpportunityRow> = {
  kind: 'opportunity',
  noun: 'opportunity',
  title: 'Opportunities',
  description: 'Scholarships, jobs, internships, and volunteering worth passing on. They’re listed at /opportunities and come off by themselves when their deadline passes.',
  icon: <Briefcase />,
  addLabel: 'Add an opportunity',
  defaults: { published: true, kind: 'scholarship' },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'kind', label: 'Kind', type: 'select', options: OPPORTUNITY_KINDS },
    { name: 'organization', label: 'Who’s offering it', type: 'text' },
    { name: 'deadline', label: 'Last day to apply', type: 'date', description: 'Empty: it stays up until you hide it.' },
    { name: 'url', label: 'Where to apply', type: 'url', placeholder: 'https://…' },
    { name: 'location', label: 'Where', type: 'text', placeholder: 'On campus, remote, Atlanta…' },
    { name: 'description', label: 'About it', type: 'textarea', rows: 3 },
    SHOW,
  ],
  columns: [
    {
      key: 'title',
      header: 'Opportunity',
      cell: (o) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{o.title}</span>
          {o.organization ? <span className="truncate text-[0.8rem] text-muted">{o.organization}</span> : null}
        </span>
      ),
    },
    { key: 'kind', header: 'Kind', hideWhenStacked: true, cell: (o) => opportunityKindLabel(o.kind) },
    { key: 'deadline', header: 'Deadline', hideWhenStacked: true, cell: (o) => (o.deadline ? formatDate(o.deadline) : muted('None')) },
    {
      key: 'published',
      header: 'On the site',
      cell: (o) =>
        o.published && o.deadline && o.deadline < atlantaToday() ? (
          <Badge size="sm" dot tone="warning">
            Deadline passed
          </Badge>
        ) : (
          shown(o.published)
        ),
    },
  ],
  nameOf: (o) => o.title,
  actions: (o) => (o.url ? [{ label: 'Open the link', icon: <ExternalLink />, onSelect: () => window.open(o.url!, '_blank', 'noopener') }] : []),
  emptyHint: 'Add one and it’s listed at /opportunities.',
  removeHint: 'It comes off the site. Ones past their deadline are already off it.',
}
export const OpportunitiesView: FC<{ rows: OpportunityRow[] }> = ({ rows }) => <CollectionView config={OPPORTUNITIES} rows={rows} />

// ── Polls and quizzes ───────────────────────────────────────────────────────

type PollListRow = PollRow & { correct: Record<string, string>; responses: number }

const openState = (row: { published: boolean; closes_at: string | null }) =>
  !row.published ? (
    shown(false, '', 'Not open')
  ) : isOpen(row) ? (
    shown(true, 'Open')
  ) : (
    <Badge size="sm" dot tone="warning">
      Closed
    </Badge>
  )

const POLLS: CollectionConfig<PollListRow> = {
  kind: 'poll',
  noun: 'poll',
  title: 'Polls and quizzes',
  description: 'A poll asks what people think; a quiz has right answers and gives a mark. Each is at its own address (/polls/spring-social) and listed at /polls. One answer per person.',
  icon: <BarChart3 />,
  addLabel: 'Add a poll or quiz',
  hint: 'Changing an option’s wording after people have answered starts its count over.',
  defaults: { kind: 'poll', published: false, results_public: true },
  // A quiz's right answers are kept apart from it; the editor has each beside its question
  toValues: (p) => ({ ...p, questions: p.questions.map((q) => ({ ...q, correct: p.correct[q.id] ?? '' })) }),
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'poll', label: 'Poll: what people think' },
        { value: 'quiz', label: 'Quiz: right answers, and a mark' },
      ],
    },
    { name: 'slug', label: 'Web address', type: 'slug', prefix: '/polls/' },
    { name: 'description', label: 'About it', type: 'textarea', rows: 2 },
    {
      name: 'questions',
      label: 'Questions',
      type: 'list',
      itemLabel: 'question',
      max: LIMITS.questions,
      ids: true,
      fields: [
        { name: 'text', label: 'Question', type: 'text' },
        // A quiz marks one of them as the right answer, kept beside the question as `correct`
        { name: 'options', label: 'Options', type: 'options', max: LIMITS.options, correctField: 'correct', markCorrectIf: (_item, values) => values.kind === 'quiz' },
      ],
    },
    { name: 'results_public', label: 'Show people how everyone answered', type: 'switch', description: 'After they’ve answered. Off, only officers see the results.' },
    { name: 'closes_at', label: 'Closes', type: 'datetime', description: 'Atlanta time. Empty: it stays open.' },
    { name: 'published', label: 'Open it on the site', type: 'switch', description: 'Until then only officers see it.' },
  ],
  columns: [
    {
      key: 'title',
      header: 'Title',
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{p.title}</span>
          <span className="truncate text-[0.8rem] text-muted">/polls/{p.slug}</span>
        </span>
      ),
    },
    { key: 'kind', header: 'Kind', hideWhenStacked: true, cell: (p) => (p.kind === 'quiz' ? 'Quiz' : 'Poll') },
    { key: 'responses', header: 'Answers', cell: (p) => p.responses },
    { key: 'published', header: 'On the site', cell: openState },
  ],
  nameOf: (p) => p.title,
  actions: (p) => [
    { label: 'See the results', icon: <ListChecks />, href: `/dashboard/polls/${p.id}` },
    ...(p.published ? [{ label: 'View on the site', icon: <ExternalLink />, href: `/polls/${p.slug}` }] : []),
  ],
  emptyHint: 'Add one and, once it’s open, it’s listed at /polls.',
  removeHint: 'It comes off the site, and every answer to it is deleted with it.',
}
export const PollsView: FC<{ rows: PollListRow[] }> = ({ rows }) => <CollectionView config={POLLS} rows={rows} />

// ── Forms ───────────────────────────────────────────────────────────────────

type FormListRow = FormRow & { responses: number }

const FORMS: CollectionConfig<FormListRow> = {
  kind: 'form',
  noun: 'form',
  title: 'Forms',
  description: 'Sign-ups, surveys, and feedback forms you build here. Each is at its own address (/forms/volunteer-sign-up) to link to; what people send comes back here.',
  icon: <ClipboardList />,
  addLabel: 'Add a form',
  hint: 'Ask only for what you’ll use. Don’t collect passwords, ID numbers, or payment details.',
  defaults: { published: false },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Web address', type: 'slug', prefix: '/forms/' },
    { name: 'description', label: 'What it’s for', type: 'textarea', rows: 2, description: 'Shown above the questions.' },
    {
      name: 'fields',
      label: 'Questions',
      type: 'list',
      itemLabel: 'question',
      max: LIMITS.fields,
      ids: true,
      fields: [
        { name: 'label', label: 'Question', type: 'text', placeholder: 'Your name' },
        { name: 'type', label: 'Answered with', type: 'select', options: FORM_FIELD_TYPES, placeholder: 'Short answer' },
        { name: 'options', label: 'Options', type: 'options', max: LIMITS.options, showIf: (item) => hasOptions(String(item.type ?? '')) },
        { name: 'required', label: 'It has to be answered', type: 'switch' },
      ],
    },
    { name: 'success_message', label: 'What people read after sending it', type: 'textarea', rows: 2, placeholder: 'Thanks! We’ll be in touch.' },
    { name: 'closes_at', label: 'Closes', type: 'datetime', description: 'Atlanta time. Empty: it stays open.' },
    { name: 'published', label: 'Open it on the site', type: 'switch', description: 'Until then only officers see it.' },
  ],
  columns: [
    {
      key: 'title',
      header: 'Form',
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{f.title}</span>
          <span className="truncate text-[0.8rem] text-muted">/forms/{f.slug}</span>
        </span>
      ),
    },
    { key: 'fields', header: 'Questions', hideWhenStacked: true, cell: (f) => f.fields.length },
    { key: 'responses', header: 'Responses', cell: (f) => f.responses },
    { key: 'published', header: 'On the site', cell: openState },
  ],
  nameOf: (f) => f.title,
  actions: (f) => [
    { label: 'See the responses', icon: <ListChecks />, href: `/dashboard/forms/${f.id}` },
    ...(f.published ? [{ label: 'View on the site', icon: <ExternalLink />, href: `/forms/${f.slug}` }] : []),
  ],
  emptyHint: 'Add one, open it, and share its address.',
  removeHint: 'It comes off the site, and every response to it is deleted with it.',
}
export const FormsView: FC<{ rows: FormListRow[] }> = ({ rows }) => <CollectionView config={FORMS} rows={rows} />
