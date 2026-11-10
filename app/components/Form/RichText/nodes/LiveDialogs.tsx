'use client'

import { useState, type FC } from 'react'

import { EventsBlock, PlaceBlock } from '@/globals/LiveBlocks'
import { CoreValues } from '@/globals/Page/CoreValues'
import { PLACE_CATEGORIES, PLACES } from '@/lib/data/places'
import { INLINE_HINT } from '@/lib/richtext/blocks/inline'
import { EVENT_COUNTS, PLACE_NOTE_MAX, type EventCount, type WhenNoEvents } from '@/lib/richtext/blocks/live'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { SegmentedControl } from '../../Segmented'
import { Select } from '../../Select'
import { TextArea } from '../../TextArea'
import type { BlockDialogProps } from './DataBlockNode'

export type EventsData = { count: EventCount; whenNone: WhenNoEvents }
export type PlaceData = { placeId: string; note: string }

const EventsForm: FC<Omit<BlockDialogProps<EventsData>, 'open'>> = ({ initial, onClose, onSave }) => {
  const [count, setCount] = useState<EventCount>(initial?.count ?? 2)
  const [whenNone, setWhenNone] = useState<WhenNoEvents>(initial?.whenNone ?? 'recent')
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={initial ? 'Edit upcoming events' : 'Insert upcoming events'}
      description="The next CSEG events from PIN, kept current on their own: nothing to update when one’s added."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ count, whenNone })}>{initial ? 'Save' : 'Insert'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="How many">
          <SegmentedControl size="sm" value={String(count)} onValueChange={(v) => setCount(Number(v) as EventCount)} options={EVENT_COUNTS.map((n) => ({ value: String(n), label: String(n) }))} />
        </Field>
        <Field label="With nothing scheduled">
          <SegmentedControl
            size="sm"
            value={whenNone}
            onValueChange={(v) => setWhenNone(v === 'note' ? 'note' : 'recent')}
            options={[
              { value: 'recent', label: 'Show recent ones' },
              { value: 'note', label: 'Say so' },
            ]}
          />
        </Field>
        <p className="m-0 text-[0.8rem] font-semibold text-muted">As it looks now</p>
        <EventsBlock count={count} whenNone={whenNone} />
      </div>
    </Dialog>
  )
}

/** Picks how many events, and what shows while none are scheduled. Opens outside the editor, as ImageDialog does. */
export const EventsDialog: FC<BlockDialogProps<EventsData>> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <EventsForm {...props} />
    </Portal>
  ) : null

/** A Core values block holds nothing of its own: the values come from the site's own list */
export type CoreValuesData = Record<string, never>

/** Shows the core values as they'll look, to insert; there's nothing to set */
export const CoreValuesDialog: FC<BlockDialogProps<CoreValuesData>> = ({ open, initial, onClose, onSave }) =>
  open ? (
    <Portal>
      <Dialog
        open
        onClose={onClose}
        size="lg"
        title={initial ? 'Core values' : 'Insert the core values'}
        description="CSEG’s core values, the six that spell CAMPUS. They’re the site’s own, so a change to them shows everywhere this block is."
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              {initial ? 'Close' : 'Cancel'}
            </Button>
            {initial ? null : <Button onClick={() => onSave({})}>Insert</Button>}
          </>
        }
      >
        <CoreValues />
      </Dialog>
    </Portal>
  ) : null

/** The map's places, grouped by what they are, A to Z in each */
const PLACE_GROUPS = Object.entries(PLACE_CATEGORIES)
  .map(([category, { label }]) => ({
    label,
    options: PLACES.filter((p) => p.category === category)
      .map((p) => ({ value: p.id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }))
  .filter((g) => g.options.length)

const PlaceForm: FC<Omit<BlockDialogProps<PlaceData>, 'open'>> = ({ initial, onClose, onSave }) => {
  const [placeId, setPlaceId] = useState(initial?.placeId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={initial?.placeId ? 'Edit map place' : 'Insert a map place'}
      description="A small campus map pinned on a place, with links to it on the full map and walking directions."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!placeId} onClick={() => onSave({ placeId, note: note.trim() })}>
            {initial?.placeId ? 'Save' : 'Insert'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Place" required>
          <Select type="combobox" value={placeId || null} onValueChange={(v) => setPlaceId(v ?? '')} options={PLACE_GROUPS} placeholder="Search the map’s places" />
        </Field>
        <Field label="A line about it (optional)" description={INLINE_HINT}>
          <TextArea rows={2} value={note} maxLength={PLACE_NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="We meet in room 259, up the stairs on the left." />
        </Field>
        {placeId ? <PlaceBlock placeId={placeId} note={note} preview /> : null}
      </div>
    </Dialog>
  )
}

/** Picks a campus map place, and a line about it. Opens outside the editor, as ImageDialog does. */
export const PlaceDialog: FC<BlockDialogProps<PlaceData>> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <PlaceForm {...props} />
    </Portal>
  ) : null
