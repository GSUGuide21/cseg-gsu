'use client'

import {
  CARD_ICONS,
  CARD_TEXT_MAX,
  CARD_TITLE_MAX,
  CARDS_MAX,
  CardGrid,
  inlinePlain,
  parseCards,
  parseProvider,
  parseRankings,
  rankingText,
  parseSteps,
  RANKING_DESCRIPTION_MAX,
  RANKING_MAX,
  RANKING_SUBTITLE_MAX,
  RANKING_TITLE_MAX,
  RankingList,
  parseVideoId,
  parseVideoTitle,
  parseEventCount,
  parsePlaceId,
  parsePlaceNote,
  parseScheduleItems,
  parseStats,
  parseTestimonials,
  parseWhenNone,
  SCHEDULE_MAX,
  SCHEDULE_TEXT_MAX,
  SCHEDULE_TIME_MAX,
  SCHEDULE_TITLE_MAX,
  ScheduleList,
  scheduleText,
  STAT_LABEL_MAX,
  STAT_VALUE_MAX,
  STATS_MAX,
  StatRow,
  statText,
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_ROLE_MAX,
  TESTIMONIALS_MAX,
  TestimonialList,
  testimonialText,
  type ScheduleItem,
  type Stat,
  type Testimonial,
  STEP_TEXT_MAX,
  STEP_TITLE_MAX,
  STEPS_MAX,
  StepList,
  Video,
  watchUrl,
  type CardEntry,
  type RankingItem,
  type Step,
  type VideoProvider,
} from '@/lib/richtext/blocks'
import { EventsBlock as EventsView, PlaceBlock as PlaceView } from '@/globals/LiveBlocks'
import { CoreValues as CoreValuesView } from '@/globals/Page/CoreValues'
import { CORE_VALUES } from '@/globals/config/club'
import { InlineChip } from '@/globals/InlineChip'
import {
  dateTimeText,
  footnoteMark,
  InlineBadge,
  InlineButton,
  InlineDateTime,
  InlineImage,
  parseBadgeLabel,
  parseBadgeTone,
  parseChipKind,
  parseChipLabel,
  parseChipTarget,
  parseDate,
  parseDateStyle,
  parseFootnote,
  parseInlineAlt,
  parseInlineButtonStyle,
  parseInlineHref,
  parseInlineLabel,
  parseInlineSrc,
  parseTime,
  type ChipData,
  type DateTimeData,
  type InlineBadgeData,
  type InlineButtonData,
  type InlineImageData,
} from '@/lib/richtext/blocks/inlineItems'
import { ReferenceGrid } from '@/globals/References'
import { getPlace } from '@/lib/data/places'
import { parseReferences, REFERENCE_KINDS } from '@/lib/references'

import { defineDataBlock } from './DataBlockNode'
import { ChipDialog, FootnoteDialog, InlineBadgeDialog, InlineButtonDialog, InlineDateTimeDialog, InlineImageDialog } from './InlineDialogs'
import { ReferencesDialog, type ReferencesData } from './ReferencesDialog'
import { ListDialog } from './ListDialog'
import { CoreValuesDialog, EventsDialog, PlaceDialog, type CoreValuesData, type EventsData, type PlaceData } from './LiveDialogs'
import { VideoDialog } from './VideoDialog'

/** An element with text in it, for the readable HTML export */
const el = (doc: Document, tag: string, text?: string, ...children: Node[]) => {
  const e = doc.createElement(tag)
  if (text) e.textContent = text
  e.append(...children)
  return e
}

export const StepsBlock = defineDataBlock<{ items: Step[] }>({
  type: 'steps',
  label: 'Steps',
  fields: { items: parseSteps },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <StepList items={data.items} />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="steps"
      noun="step"
      max={STEPS_MAX}
      description="Numbered steps, side by side on wide screens."
      fields={[
        { key: 'title', label: 'Title', kind: 'text', required: true, max: STEP_TITLE_MAX, placeholder: 'Request to join on PIN' },
        { key: 'text', label: 'Details', kind: 'long', max: STEP_TEXT_MAX },
      ]}
      initial={initial?.items}
      preview={(items) => <StepList items={parseSteps(items)} />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseSteps(items) })}
    />
  ),
  toDOM: ({ items }, doc) => el(doc, 'ol', undefined, ...items.map((s) => el(doc, 'li', undefined, el(doc, 'strong', s.title), doc.createTextNode(s.text ? ` ${inlinePlain(s.text)}` : '')))),
  text: ({ items }) => items.map((s) => `${s.title}\n${inlinePlain(s.text)}`).join('\n'),
})

export const RankingBlock = defineDataBlock<{ items: RankingItem[] }>({
  type: 'ranking',
  label: 'Ranking',
  fields: { items: parseRankings },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <RankingList items={data.items} />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="ranking"
      noun="pick"
      max={RANKING_MAX}
      description="A numbered list, best first. The order is the ranking: move picks up and down to change it."
      fields={[
        { key: 'title', label: 'Title', kind: 'text', required: true, max: RANKING_TITLE_MAX, placeholder: 'Library North, 4th floor' },
        { key: 'subtitle', label: 'Line under it (optional)', kind: 'text', max: RANKING_SUBTITLE_MAX, placeholder: 'Quiet floor · outlets at every table' },
        { key: 'description', label: 'Why it’s here (optional)', kind: 'long', max: RANKING_DESCRIPTION_MAX },
      ]}
      initial={initial?.items}
      preview={(items) => <RankingList items={parseRankings(items)} />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseRankings(items) })}
    />
  ),
  toDOM: ({ items }, doc) =>
    el(
      doc,
      'ol',
      undefined,
      ...items.map((r) =>
        el(doc, 'li', undefined, el(doc, 'strong', r.title), doc.createTextNode([r.subtitle, r.description ? inlinePlain(r.description) : ''].filter(Boolean).map((t) => ` ${t}`).join('')))
      )
    ),
  text: ({ items }) => items.map(rankingText).join('\n'),
})

const ICON_OPTIONS = Object.entries(CARD_ICONS).map(([value, { label }]) => ({ value, label }))

export const CardsBlock = defineDataBlock<{ items: CardEntry[] }>({
  type: 'cards',
  label: 'Cards',
  fields: { items: parseCards },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <CardGrid items={data.items} preview />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="cards"
      noun="card"
      max={CARDS_MAX}
      description="One card on its own, or several in a grid. With a link, the whole card opens it."
      fields={[
        { key: 'title', label: 'Title', kind: 'text', required: true, max: CARD_TITLE_MAX, placeholder: 'Free tutoring' },
        { key: 'icon', label: 'Icon', kind: 'choice', options: ICON_OPTIONS },
        { key: 'text', label: 'Text', kind: 'long', max: CARD_TEXT_MAX },
        { key: 'href', label: 'Link (optional)', kind: 'link', placeholder: 'https://… or /resources' },
      ]}
      initial={initial?.items}
      preview={(items) => <CardGrid items={parseCards(items)} preview />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseCards(items) })}
    />
  ),
  toDOM: ({ items }, doc) =>
    el(
      doc,
      'div',
      undefined,
      ...items.map((c) => {
        const title = el(doc, 'h3', c.href ? undefined : c.title)
        if (c.href) {
          const a = el(doc, 'a', c.title)
          a.setAttribute('href', c.href)
          title.append(a)
        }
        return el(doc, 'article', undefined, title, el(doc, 'p', inlinePlain(c.text)))
      })
    ),
  text: ({ items }) => items.map((c) => `${c.title}\n${inlinePlain(c.text)}`).join('\n'),
})

export const VideoBlock = defineDataBlock<{ provider: VideoProvider | ''; id: string; title: string }>({
  type: 'video',
  label: 'Video',
  fields: { provider: parseProvider, id: parseVideoId, title: parseVideoTitle },
  has: ({ provider, id }) => !!provider && !!id,
  View: ({ data }) => (data.provider ? <Video video={{ ...data, provider: data.provider }} preview /> : null),
  Dialog: VideoDialog,
  toDOM: (v, doc) => {
    const a = el(doc, 'a', v.title || 'Watch the video')
    if (v.provider) a.setAttribute('href', watchUrl({ provider: v.provider, id: v.id }))
    return el(doc, 'p', undefined, a)
  },
  text: ({ title }) => title,
})

export const ReferencesBlock = defineDataBlock<ReferencesData>({
  type: 'reference',
  label: 'References',
  fields: { items: parseReferences },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <ReferenceGrid items={data.items} preview />,
  Dialog: ReferencesDialog,
  // What they point at is looked up live, so a copy holds only which ones
  toDOM: ({ items }, doc) => el(doc, 'ul', undefined, ...items.map((r) => el(doc, 'li', `${REFERENCE_KINDS[r.kind]}: ${r.ref}`))),
  text: () => '',
})

export const StatsBlock = defineDataBlock<{ items: Stat[] }>({
  type: 'stats',
  label: 'Stats',
  fields: { items: parseStats },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <StatRow items={data.items} />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="stats"
      noun="number"
      max={STATS_MAX}
      description="Big numbers in a row, each with what it counts."
      fields={[
        { key: 'value', label: 'Number', kind: 'text', required: true, max: STAT_VALUE_MAX, placeholder: '120+' },
        { key: 'label', label: 'What it counts', kind: 'text', required: true, max: STAT_LABEL_MAX, placeholder: 'members this year' },
      ]}
      initial={initial?.items}
      preview={(items) => <StatRow items={parseStats(items)} />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseStats(items) })}
    />
  ),
  toDOM: ({ items }, doc) => el(doc, 'ul', undefined, ...items.map((s) => el(doc, 'li', undefined, el(doc, 'strong', s.value), doc.createTextNode(` ${s.label}`)))),
  text: ({ items }) => items.map(statText).join('\n'),
})

export const ScheduleBlock = defineDataBlock<{ items: ScheduleItem[] }>({
  type: 'schedule',
  label: 'Schedule',
  fields: { items: parseScheduleItems },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <ScheduleList items={data.items} />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="schedule"
      noun="item"
      max={SCHEDULE_MAX}
      description="A day’s plan, top to bottom: when, what, and a line about it."
      fields={[
        { key: 'time', label: 'When', kind: 'text', max: SCHEDULE_TIME_MAX, placeholder: '5:00 PM' },
        { key: 'title', label: 'What', kind: 'text', required: true, max: SCHEDULE_TITLE_MAX, placeholder: 'Doors open, snacks' },
        { key: 'text', label: 'Details (optional)', kind: 'long', max: SCHEDULE_TEXT_MAX },
      ]}
      initial={initial?.items}
      preview={(items) => <ScheduleList items={parseScheduleItems(items)} />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseScheduleItems(items) })}
    />
  ),
  toDOM: ({ items }, doc) =>
    el(doc, 'ol', undefined, ...items.map((s) => el(doc, 'li', undefined, el(doc, 'strong', [s.time, s.title].filter(Boolean).join(' ')), doc.createTextNode(s.text ? ` ${inlinePlain(s.text)}` : '')))),
  text: ({ items }) => items.map(scheduleText).join('\n'),
})

export const TestimonialBlock = defineDataBlock<{ items: Testimonial[] }>({
  type: 'testimonial',
  label: 'Testimonial',
  fields: { items: parseTestimonials },
  has: ({ items }) => items.length > 0,
  View: ({ data }) => <TestimonialList items={data.items} />,
  Dialog: ({ open, initial, onClose, onSave }) => (
    <ListDialog
      open={open}
      name="testimonial"
      noun="quote"
      max={TESTIMONIALS_MAX}
      description="What someone said, with their name under it. One on its own reads as a pull quote; several sit side by side."
      fields={[
        { key: 'quote', label: 'Quote', kind: 'long', required: true, max: TESTIMONIAL_QUOTE_MAX, placeholder: 'CSEG is how I found my people on campus.' },
        { key: 'name', label: 'Who said it', kind: 'text', max: TESTIMONIAL_NAME_MAX, placeholder: 'Jordan Lee' },
        { key: 'role', label: 'Under the name (optional)', kind: 'text', max: TESTIMONIAL_ROLE_MAX, placeholder: 'Sophomore, Biology' },
      ]}
      initial={initial?.items}
      preview={(items) => <TestimonialList items={parseTestimonials(items)} />}
      onClose={onClose}
      onSave={(items) => onSave({ items: parseTestimonials(items) })}
    />
  ),
  toDOM: ({ items }, doc) => el(doc, 'div', undefined, ...items.map((t) => el(doc, 'figure', undefined, el(doc, 'blockquote', inlinePlain(t.quote)), el(doc, 'figcaption', [t.name, t.role].filter(Boolean).join(', '))))),
  text: ({ items }) => items.map(testimonialText).join('\n'),
})

export const EventsBlock = defineDataBlock<EventsData>({
  type: 'events',
  label: 'Upcoming events',
  fields: { count: parseEventCount, whenNone: parseWhenNone },
  has: () => true,
  View: ({ data }) => <EventsView {...data} />,
  Dialog: EventsDialog,
  // What shows is looked up live, so a copy holds only how many
  toDOM: (_, doc) => el(doc, 'p', 'Upcoming CSEG events'),
  text: () => '',
})

export const CoreValuesBlock = defineDataBlock<CoreValuesData>({
  type: 'core-values',
  label: 'Core values',
  fields: {},
  has: () => true,
  View: () => <CoreValuesView />,
  Dialog: CoreValuesDialog,
  // Drawn from the site's list when shown, so a copy holds only the names
  toDOM: (_, doc) => el(doc, 'ol', undefined, ...CORE_VALUES.map((v) => el(doc, 'li', v.title))),
  text: () => CORE_VALUES.map((v) => `${v.title}: ${v.body}`).join('\n'),
})

export const PlaceBlock = defineDataBlock<PlaceData>({
  type: 'place',
  label: 'Map place',
  fields: { placeId: parsePlaceId, note: parsePlaceNote },
  has: ({ placeId }) => !!placeId,
  View: ({ data }) => <PlaceView {...data} preview />,
  Dialog: PlaceDialog,
  toDOM: ({ placeId, note }, doc) => {
    const a = el(doc, 'a', getPlace(placeId)?.name ?? 'On the campus map')
    a.setAttribute('href', `/map?place=${placeId}`)
    return el(doc, 'p', undefined, a, doc.createTextNode(note ? ` ${inlinePlain(note)}` : ''))
  },
  text: ({ placeId, note }) => [getPlace(placeId)?.name, inlinePlain(note)].filter(Boolean).join('\n'),
})

export const InlineButtonItem = defineDataBlock<InlineButtonData>({
  type: 'inline-button',
  label: 'Inline button',
  inline: true,
  fields: { label: parseInlineLabel, href: parseInlineHref, buttonStyle: parseInlineButtonStyle },
  has: ({ label, href }) => !!label && !!href,
  View: ({ data }) => <InlineButton {...data} preview />,
  Dialog: InlineButtonDialog,
  toDOM: ({ label, href }, doc) => {
    const a = el(doc, 'a', label)
    a.setAttribute('href', href)
    return a
  },
  text: ({ label }) => label,
})

export const InlineImageItem = defineDataBlock<InlineImageData>({
  type: 'inline-image',
  label: 'Inline image',
  inline: true,
  fields: { src: parseInlineSrc, alt: parseInlineAlt },
  has: ({ src }) => !!src,
  View: ({ data }) => <InlineImage {...data} />,
  Dialog: InlineImageDialog,
  toDOM: ({ src, alt }, doc) => {
    const img = doc.createElement('img')
    img.src = src
    img.alt = alt
    return img
  },
  text: () => '',
})

export const BadgeItem = defineDataBlock<InlineBadgeData>({
  type: 'badge',
  label: 'Badge',
  inline: true,
  fields: { label: parseBadgeLabel, tone: parseBadgeTone },
  has: ({ label }) => !!label,
  View: ({ data }) => <InlineBadge {...data} />,
  Dialog: InlineBadgeDialog,
  toDOM: ({ label }, doc) => el(doc, 'span', label),
  text: ({ label }) => label,
})

export const DateTimeItem = defineDataBlock<DateTimeData>({
  type: 'datetime',
  label: 'Date or time',
  inline: true,
  fields: { date: parseDate, time: parseTime, dateStyle: parseDateStyle },
  has: ({ date }) => !!date,
  View: ({ data }) => <InlineDateTime {...data} />,
  Dialog: InlineDateTimeDialog,
  toDOM: (data, doc) => {
    const time = el(doc, 'time', dateTimeText(data))
    time.setAttribute('datetime', data.time ? `${data.date}T${data.time}` : data.date)
    return time
  },
  text: dateTimeText,
})

export const FootnoteItem = defineDataBlock<{ note: string }>({
  type: 'footnote',
  label: 'Footnote',
  inline: true,
  fields: { note: parseFootnote },
  has: ({ note }) => !!note,
  // The number is a CSS counter, so it's right whatever's added or moved before it
  View: ({ data }) => <sup title={inlinePlain(data.note)} className={`${footnoteMark} [counter-increment:rich-footnote] before:content-[counter(rich-footnote)]`} />,
  Dialog: FootnoteDialog,
  toDOM: ({ note }, doc) => el(doc, 'small', ` (${inlinePlain(note)})`),
  // It's read at the end of the page, not in the middle of the sentence
  text: () => '',
})

export const ChipItem = defineDataBlock<ChipData>({
  type: 'chip',
  label: 'Chip',
  inline: true,
  fields: { kind: parseChipKind, target: parseChipTarget, label: parseChipLabel },
  has: ({ target }) => !!target,
  View: ({ data }) => <InlineChip {...data} preview />,
  Dialog: ChipDialog,
  toDOM: ({ label }, doc) => el(doc, 'span', label),
  text: ({ label }) => label,
})

/** Every data block, by its saved type */
export const DATA_BLOCKS = {
  steps: StepsBlock,
  ranking: RankingBlock,
  cards: CardsBlock,
  video: VideoBlock,
  reference: ReferencesBlock,
  stats: StatsBlock,
  schedule: ScheduleBlock,
  testimonial: TestimonialBlock,
  events: EventsBlock,
  'core-values': CoreValuesBlock,
  place: PlaceBlock,
  'inline-button': InlineButtonItem,
  'inline-image': InlineImageItem,
  badge: BadgeItem,
  datetime: DateTimeItem,
  footnote: FootnoteItem,
  chip: ChipItem,
}
export type DataBlockType = keyof typeof DATA_BLOCKS
