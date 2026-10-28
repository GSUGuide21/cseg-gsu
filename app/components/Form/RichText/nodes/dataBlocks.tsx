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
  parseSteps,
  parseVideoId,
  parseVideoTitle,
  STEP_TEXT_MAX,
  STEP_TITLE_MAX,
  STEPS_MAX,
  StepList,
  Video,
  watchUrl,
  type CardEntry,
  type Step,
  type VideoProvider,
} from '@/lib/richtext/blocks'
import { ReferenceGrid } from '@/globals/References'
import { parseReferences, REFERENCE_KINDS } from '@/lib/references'

import { defineDataBlock } from './DataBlockNode'
import { ReferencesDialog, type ReferencesData } from './ReferencesDialog'
import { ListDialog } from './ListDialog'
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

/** Every data block, by its saved type */
export const DATA_BLOCKS = { steps: StepsBlock, cards: CardsBlock, video: VideoBlock, reference: ReferencesBlock }
export type DataBlockType = keyof typeof DATA_BLOCKS
