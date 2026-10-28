'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FC } from 'react'

import { BUTTON_LABEL_MAX, BUTTONS_MAX, ButtonRow, type ButtonLink, type ButtonsAlign, type ButtonStyle } from '@/lib/richtext/blocks'
import { linkFromInput } from '@/lib/safeUrl'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { Input } from '../../Input'
import { SegmentedControl } from '../../Segmented'

export interface ButtonsData {
  buttons: ButtonLink[]
  align: ButtonsAlign
}

interface Row {
  id: number
  label: string
  href: string
  style: ButtonStyle
}

const STYLES = [
  { value: 'primary', label: 'Filled' },
  { value: 'outline', label: 'Outline' },
]
const ALIGNS = [
  { value: 'start', label: 'Left' },
  { value: 'center', label: 'Center' },
]

let nextId = 0
const row = (b?: Partial<ButtonLink>): Row => ({ id: nextId++, label: b?.label ?? '', href: b?.href ?? '', style: b?.style ?? 'primary' })

const ButtonsForm: FC<{ initial?: ButtonsData; onClose: () => void; onSave: (data: ButtonsData) => void }> = ({ initial, onClose, onSave }) => {
  const [rows, setRows] = useState<Row[]>(() => (initial?.buttons.length ? initial.buttons.map(row) : [row()]))
  const [align, setAlign] = useState<ButtonsAlign>(initial?.align ?? 'start')
  const [errors, setErrors] = useState<Record<number, { label?: string; href?: string }>>({})
  const id = useId()

  const update = (rowId: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
    setErrors((es) => ({ ...es, [rowId]: {} }))
  }

  // What the buttons look like so far: only ones with a label, linked or not yet
  const preview = rows.filter((r) => r.label.trim()).map((r) => ({ label: r.label.trim(), href: '#', style: r.style }))

  const save = () => {
    const found: typeof errors = {}
    const buttons: ButtonLink[] = []
    for (const r of rows) {
      const label = r.label.trim()
      const href = linkFromInput(r.href)
      // A row left completely empty is skipped, not an error
      if (!label && !r.href.trim()) continue
      if (!label) found[r.id] = { ...found[r.id], label: 'Give it a label.' }
      if (!href) found[r.id] = { ...found[r.id], href: 'Use a web address (https://…), an email (mailto:…), or a page here (/join).' }
      if (label && href) buttons.push({ label, href, style: r.style })
    }
    setErrors(found)
    if (Object.keys(found).length) return
    if (!buttons.length) return setErrors({ [rows[0].id]: { label: 'Give it a label.', href: 'Add where it goes.' } })
    onSave({ buttons, align })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? 'Edit buttons' : 'Insert buttons'}
      description={`Up to ${BUTTONS_MAX}, side by side: the next step for whoever's reading.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{initial ? 'Save' : 'Insert'}</Button>
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
        {rows.map((r, i) => (
          <fieldset key={r.id} className="m-0 flex flex-col gap-3 rounded-lg border border-line p-3">
            <legend className="px-1 text-[0.8rem] font-bold text-ink">Button {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Label" error={errors[r.id]?.label}>
                <Input size="sm" value={r.label} maxLength={BUTTON_LABEL_MAX} onChange={(e) => update(r.id, { label: e.target.value })} placeholder="Join on PIN" />
              </Field>
              <Field label="Link" error={errors[r.id]?.href}>
                <Input size="sm" inputMode="url" value={r.href} onChange={(e) => update(r.id, { href: e.target.value })} placeholder="https://… or /join" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl size="sm" aria-label={`Button ${i + 1} style`} options={STYLES} value={r.style} onValueChange={(v) => update(r.id, { style: v as ButtonStyle })} />
              {rows.length > 1 ? (
                <Button size="sm" variant="ghost" leading={<Trash2 size={14} aria-hidden />} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                  Remove
                </Button>
              ) : null}
            </div>
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {rows.length < BUTTONS_MAX ? (
            <Button size="sm" variant="outline" leading={<Plus size={14} aria-hidden />} onClick={() => setRows((rs) => [...rs, row({ style: 'outline' })])}>
              Add a button
            </Button>
          ) : (
            <span />
          )}
          <SegmentedControl size="sm" aria-label="Line them up" options={ALIGNS} value={align} onValueChange={(v) => setAlign(v as ButtonsAlign)} />
        </div>
        {preview.length ? (
          <div aria-labelledby={`${id}-preview`} className="rounded-lg bg-fill px-4 py-1">
            <span id={`${id}-preview`} className="sr-only">
              Preview
            </span>
            <ButtonRow buttons={preview} align={align} preview />
          </div>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

/** Sets up a row of buttons: each one's label, link, and style, and how they line up. Opens outside the editor, as ImageDialog does. */
export const ButtonsDialog: FC<{ open: boolean; initial?: ButtonsData; onClose: () => void; onSave: (data: ButtonsData) => void }> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <ButtonsForm {...props} />
    </Portal>
  ) : null
