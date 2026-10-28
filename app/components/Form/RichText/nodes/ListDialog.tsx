'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState, type FC, type ReactNode } from 'react'

import { INLINE_HINT } from '@/lib/richtext/blocks'
import { linkFromInput } from '@/lib/safeUrl'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { Input } from '../../Input'
import { Select } from '../../Select'
import { TextArea } from '../../TextArea'

/** One field of each item in a list block */
export interface ListField {
  key: string
  label: string
  /** "text" (one line), "long" (a few lines, with **bold** and links), "link", or "choice" */
  kind: 'text' | 'long' | 'link' | 'choice'
  max?: number
  required?: boolean
  placeholder?: string
  /** For "choice": what can be picked ("" is offered as "None") */
  options?: { value: string; label: string }[]
}

type Item = Record<string, string>
type Row = Item & { _id: string }

let nextId = 0
const rowOf = (fields: ListField[], item?: object): Row => ({
  ...Object.fromEntries(fields.map((f) => [f.key, String((item as Record<string, unknown> | undefined)?.[f.key] ?? '')])),
  _id: String(nextId++),
})

export interface ListDialogProps {
  open: boolean
  /** "FAQ", "Steps", "Cards": in the title */
  name: string
  /** What one item is called: "question", "step", "card" */
  noun: string
  fields: ListField[]
  max: number
  /** A sentence under the title */
  description?: string
  /** The block's items, when editing one that's there (each read by the fields' keys) */
  initial?: readonly object[]
  /** What the items will look like, from the ones filled in so far */
  preview: (items: Item[]) => ReactNode
  onClose: () => void
  onSave: (items: Item[]) => void
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1)

const ListForm: FC<Omit<ListDialogProps, 'open'>> = ({ name, noun, fields, max, description, initial, preview, onClose, onSave }) => {
  const [rows, setRows] = useState<Row[]>(() => (initial?.length ? initial.map((i) => rowOf(fields, i)) : [rowOf(fields)]))
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({})
  const first = fields.find((f) => f.required) ?? fields[0]

  const update = (id: string, key: string, value: string) => {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [key]: value } : r)))
    setErrors((es) => ({ ...es, [id]: { ...es[id], [key]: '' } }))
  }
  const move = (i: number, by: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })

  /** The rows as saved: trimmed, links made safe; a row left completely empty is skipped */
  const clean = (validate: boolean) => {
    const found: typeof errors = {}
    const items: Item[] = []
    for (const r of rows) {
      if (fields.every((f) => !r[f.key].trim() || f.kind === 'choice')) continue
      const item: Item = {}
      for (const f of fields) {
        const raw = r[f.key].trim()
        if (f.kind === 'link' && raw) {
          const href = linkFromInput(raw)
          if (!href) found[r._id] = { ...found[r._id], [f.key]: 'Use a web address (https://…), an email (mailto:…), or a page here (/join).' }
          item[f.key] = href ?? ''
        } else item[f.key] = raw
        if (f.required && !raw) found[r._id] = { ...found[r._id], [f.key]: `Add the ${noun}’s ${f.label.toLowerCase()}.` }
      }
      items.push(item)
    }
    if (validate) setErrors(found)
    return { items, ok: Object.keys(found).length === 0 }
  }

  const save = () => {
    const { items, ok } = clean(true)
    if (!ok) return
    if (!items.length) return setErrors({ [rows[0]._id]: { [first.key]: `Add at least one ${noun}.` } })
    onSave(items)
  }

  const shown = clean(false).items.filter((i) => i[first.key])

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={initial?.length ? `Edit ${name}` : `Insert ${name}`}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{initial?.length ? 'Save' : 'Insert'}</Button>
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
          <fieldset key={r._id} className="m-0 flex flex-col gap-3 rounded-lg border border-line p-3">
            <legend className="px-1 text-[0.8rem] font-bold text-ink">
              {capital(noun)} {i + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  error={errors[r._id]?.[f.key] || undefined}
                  description={f.kind === 'long' ? INLINE_HINT : undefined}
                  className={f.kind === 'long' ? 'sm:col-span-2' : undefined}
                >
                  {f.kind === 'long' ? (
                    <TextArea rows={3} value={r[f.key]} maxLength={f.max} placeholder={f.placeholder} onChange={(e) => update(r._id, f.key, e.target.value)} />
                  ) : f.kind === 'choice' ? (
                    <Select
                      size="sm"
                      value={r[f.key]}
                      options={[{ value: '', label: 'None' }, ...(f.options ?? [])]}
                      onValueChange={(v) => update(r._id, f.key, v ?? '')}
                    />
                  ) : (
                    <Input
                      size="sm"
                      inputMode={f.kind === 'link' ? 'url' : undefined}
                      value={r[f.key]}
                      maxLength={f.max}
                      placeholder={f.placeholder}
                      onChange={(e) => update(r._id, f.key, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button size="sm" variant="ghost" iconOnly aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={15} aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" iconOnly aria-label={`Move ${noun} ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={15} aria-hidden />
              </Button>
              {rows.length > 1 ? (
                <Button size="sm" variant="ghost" leading={<Trash2 size={14} aria-hidden />} onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))}>
                  Remove
                </Button>
              ) : null}
            </div>
          </fieldset>
        ))}
        {rows.length < max ? (
          <Button size="sm" variant="outline" className="self-start" leading={<Plus size={14} aria-hidden />} onClick={() => setRows((rs) => [...rs, rowOf(fields)])}>
            Add a {noun}
          </Button>
        ) : (
          <p className="m-0 text-[0.8rem] text-muted">
            Up to {max} {noun}s.
          </p>
        )}
        {shown.length ? (
          <section aria-label="Preview" className="rounded-lg bg-fill px-4 py-1">
            {preview(shown)}
          </section>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

/**
 * Sets up a block made of a list (questions, steps, cards): each item's fields, adding,
 * removing, and reordering them, and a preview. Opens outside the editor, as ImageDialog does.
 */
export const ListDialog: FC<ListDialogProps> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <ListForm {...props} />
    </Portal>
  ) : null
