'use client'

import { useState, type FC, type ReactNode } from 'react'

import { InlineChip } from '@/globals/InlineChip'
import { useSiteContent } from '@/globals/SiteContent'
import { NO_SITE_CONTENT, referenceOptions } from '@/lib/references'
import { INLINE_HINT } from '@/lib/richtext/blocks/inline'
import {
  BADGE_TONES,
  CHIP_KINDS,
  dateTimeText,
  FOOTNOTE_MAX,
  INLINE_BADGE_MAX,
  INLINE_BUTTON_LABEL_MAX,
  InlineBadge,
  InlineButton,
  type BadgeTone,
  type ChipData,
  type ChipKind,
  type DateTimeData,
  type InlineBadgeData,
  type InlineButtonData,
  type InlineImageData,
} from '@/lib/richtext/blocks/inlineItems'
import { linkFromInput } from '@/lib/safeUrl'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { DatePicker } from '../../Date'
import { Field } from '../../Field'
import { Input } from '../../Input'
import { SegmentedControl } from '../../Segmented'
import { Select } from '../../Select'
import { TextArea } from '../../TextArea'
import { TimeInput } from '../../Time'
import type { BlockDialogProps } from './DataBlockNode'
import { ImageDialog } from './ImageDialog'

type FormProps<T> = Omit<BlockDialogProps<T>, 'open'>

/** Opens outside the editor, as ImageDialog does, so typing in it can't reach the text */
const inDialog = <T,>(Form: FC<FormProps<T>>) => {
  // Mounted only while open, so its fields start again each time
  const InDialog: FC<BlockDialogProps<T>> = ({ open, ...props }) =>
    open ? (
      <Portal>
        <Form {...props} />
      </Portal>
    ) : null
  return InDialog
}

/** The dialog around each form: Enter in a field saves, as the button does */
const ItemDialog: FC<{ name: string; description?: string; editing: boolean; ready: boolean; onClose: () => void; onSave: () => void; children: ReactNode }> = ({ name, description, editing, ready, onClose, onSave, children }) => {
  const save = () => {
    if (ready) onSave()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${editing ? 'Edit' : 'Insert'} ${name}`}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready} onClick={save}>
            {editing ? 'Save' : 'Insert'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        {children}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

const ButtonForm: FC<FormProps<InlineButtonData>> = ({ initial, onClose, onSave }) => {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [href, setHref] = useState(initial?.href ?? '')
  const [buttonStyle, setButtonStyle] = useState(initial?.buttonStyle ?? 'primary')
  const link = linkFromInput(href)
  return (
    <ItemDialog name="an inline button" editing={!!initial} ready={!!label.trim() && !!link} onClose={onClose} onSave={() => onSave({ label: label.trim(), href: link!, buttonStyle })}>
      <Field label="Label" required>
        <Input size="sm" value={label} maxLength={INLINE_BUTTON_LABEL_MAX} onChange={(e) => setLabel(e.target.value)} placeholder="Sign up" />
      </Field>
      <Field label="Link" required error={href.trim() && !link ? 'Use a web address (https://…), an email (mailto:…), or a page here (/events).' : undefined}>
        <Input size="sm" inputMode="url" value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://… or /events" />
      </Field>
      <Field label="Style">
        <SegmentedControl
          size="sm"
          value={buttonStyle}
          onValueChange={(v) => setButtonStyle(v === 'outline' ? 'outline' : 'primary')}
          options={[
            { value: 'primary', label: 'Solid' },
            { value: 'outline', label: 'Outline' },
          ]}
        />
      </Field>
      {label.trim() ? <p className="m-0"><InlineButton label={label} href="" buttonStyle={buttonStyle} preview /></p> : null}
    </ItemDialog>
  )
}
export const InlineButtonDialog = inDialog(ButtonForm)

/** The image tools, without a caption: there's nowhere for one to go in a line of text */
export const InlineImageDialog: FC<BlockDialogProps<InlineImageData>> = ({ initial, onSave, ...props }) => (
  <ImageDialog {...props} inline initial={initial ? { src: initial.src, alt: initial.alt, caption: '' } : undefined} onSave={({ src, alt }) => onSave({ src, alt })} />
)

const BadgeForm: FC<FormProps<InlineBadgeData>> = ({ initial, onClose, onSave }) => {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [tone, setTone] = useState<BadgeTone>(initial?.tone ?? 'brand')
  return (
    <ItemDialog name="a badge" editing={!!initial} ready={!!label.trim()} onClose={onClose} onSave={() => onSave({ label: label.trim(), tone })}>
      <Field label="Label" required>
        <Input size="sm" value={label} maxLength={INLINE_BADGE_MAX} onChange={(e) => setLabel(e.target.value)} placeholder="New" />
      </Field>
      <Field label="Color">
        <SegmentedControl size="sm" value={tone} onValueChange={(v) => setTone(v as BadgeTone)} options={Object.entries(BADGE_TONES).map(([value, label]) => ({ value, label }))} />
      </Field>
      {label.trim() ? <p className="m-0"><InlineBadge label={label} tone={tone} /></p> : null}
    </ItemDialog>
  )
}
export const InlineBadgeDialog = inDialog(BadgeForm)

const DateTimeForm: FC<FormProps<DateTimeData>> = ({ initial, onClose, onSave }) => {
  const [date, setDate] = useState<string | null>(initial?.date || null)
  const [time, setTime] = useState<string | null>(initial?.time || null)
  const [dateStyle, setDateStyle] = useState(initial?.dateStyle ?? 'short')
  const data = { date: date ?? '', time: time ?? '', dateStyle }
  return (
    <ItemDialog name="a date or time" description="Shown just as you set it, to everyone, wherever they’re reading." editing={!!initial} ready={!!date} onClose={onClose} onSave={() => onSave(data)}>
      <Field label="Date" required>
        <DatePicker size="sm" value={date} onValueChange={setDate} />
      </Field>
      <Field label="Time (optional)">
        <TimeInput size="sm" value={time} onValueChange={setTime} />
      </Field>
      <Field label="Written">
        <SegmentedControl
          size="sm"
          value={dateStyle}
          onValueChange={(v) => setDateStyle(v === 'long' ? 'long' : 'short')}
          options={[
            { value: 'short', label: 'Short' },
            { value: 'long', label: 'In full' },
          ]}
        />
      </Field>
      {date ? <p className="m-0 font-semibold text-ink">{dateTimeText(data)}</p> : null}
    </ItemDialog>
  )
}
export const InlineDateTimeDialog = inDialog(DateTimeForm)

const FootnoteForm: FC<FormProps<{ note: string }>> = ({ initial, onClose, onSave }) => {
  const [note, setNote] = useState(initial?.note ?? '')
  return (
    <ItemDialog name="a footnote" description="A numbered note, listed at the end of this piece of writing. Numbers take care of themselves." editing={!!initial} ready={!!note.trim()} onClose={onClose} onSave={() => onSave({ note: note.trim() })}>
      <Field label="Note" required description={INLINE_HINT}>
        <TextArea rows={3} value={note} maxLength={FOOTNOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Open to all currently enrolled students." />
      </Field>
    </ItemDialog>
  )
}
export const FootnoteDialog = inDialog(FootnoteForm)

const KIND_OPTIONS = Object.entries(CHIP_KINDS).map(([value, label]) => ({ value, label }))

const ChipForm: FC<FormProps<ChipData>> = ({ initial, onClose, onSave }) => {
  const content = useSiteContent() ?? NO_SITE_CONTENT
  const [kind, setKind] = useState<ChipKind>(initial?.kind ?? 'place')
  const [target, setTarget] = useState(initial?.target ?? '')
  const options = kind === 'event' ? (content.events ?? []).map((e) => ({ value: e.id, label: e.name })) : referenceOptions(kind, content)
  const label = options.find((o) => o.value === target)?.label ?? initial?.label ?? ''
  return (
    <ItemDialog
      name="a chip"
      description="Names something already on the site, linked to it. Rename it, and the chip follows. If it’s ever removed, its name stays as plain words."
      editing={!!initial?.target}
      ready={!!target}
      onClose={onClose}
      onSave={() => onSave({ kind, target, label })}
    >
      <Field label="Kind">
        <Select
          size="sm"
          value={kind}
          options={KIND_OPTIONS}
          onValueChange={(v) => {
            if (!v) return
            setKind(v as ChipKind)
            setTarget('')
          }}
        />
      </Field>
      <Field label="Which one" required>
        <Select size="sm" type="combobox" value={target || null} options={options} placeholder="Search" emptyText={kind === 'event' ? 'No upcoming events' : 'Nothing published by that name'} onValueChange={(v) => setTarget(v ?? '')} />
      </Field>
      {target ? <p className="m-0"><InlineChip kind={kind} target={target} label={label} preview /></p> : null}
    </ItemDialog>
  )
}
export const ChipDialog = inDialog(ChipForm)
