'use client'

import { ArrowDown, ArrowUp, Images, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, type FC, type ReactNode } from 'react'

import { ActionMenu, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import type { TableColumn } from '@/components/Table/types'
import { DatePicker, DateTimePicker, Field, Input, Select, SlugInput, Switch, TextArea } from '@/components/Form'
import { cn } from '@/lib/cn'
import { deleteContent, saveContent } from '@/lib/content/actions'
import type { ContentKind } from '@/lib/content/types'
import { atlantaToIso, isoToAtlanta } from '@/lib/dashboard/format'
import { FILE_ACCEPT, uploadFile, uploadImage } from '@/lib/dashboard/media'

import { MediaPicker } from '../MediaPicker'
import { PageTitle, useAction } from '../ui'

/**
 * One screen for each of the dashboard's smaller kinds of content, drawn from a description
 * of it: a table of what there is, and a dialog to add or change one, with a field for each
 * thing it holds. A field can be a list (an album's photos, a tour's stops, a poll's
 * questions), whose items are added, moved, and removed in place.
 */

type Values = Record<string, unknown>
type Option = { value: string; label: string }

/** One thing an item of a list holds */
export type SubField = {
  name: string
  label: string
  /** "options" is a list of choices, each a box of its own, to add to and take from */
  type: 'text' | 'textarea' | 'select' | 'image' | 'switch' | 'options'
  options?: readonly Option[]
  /** For "options": the sub-field that holds which option is the right one, picked beside each */
  correctField?: string
  /** For "options" with a `correctField`: when the right one is asked for (a quiz, not a poll) */
  markCorrectIf?: (item: Values, values: Values) => boolean
  /** For "options": the most there can be */
  max?: number
  placeholder?: string
  description?: string
  /** Shown only when this holds, given the item and everything else in the editor */
  showIf?: (item: Values, values: Values) => boolean
}

export type FieldDef =
  | {
      name: string
      label: string
      type: 'text' | 'textarea' | 'url' | 'number' | 'date' | 'datetime' | 'switch' | 'select' | 'image' | 'file' | 'slug'
      required?: boolean
      description?: string
      placeholder?: string
      options?: readonly Option[]
      rows?: number
      maxLength?: number
      /** For "slug": the field it's made from, and what its address starts with */
      source?: string
      prefix?: string
      /** For "file": the field that takes the uploaded file's name */
      nameField?: string
      showIf?: (values: Values) => boolean
    }
  | {
      name: string
      label: string
      type: 'list'
      description?: string
      /** What one is called: "photo", "stop", "question" */
      itemLabel: string
      fields: readonly SubField[]
      max: number
      /** Whether each item needs an id of its own (answers are kept by it) */
      ids?: boolean
      showIf?: (values: Values) => boolean
    }

export interface CollectionConfig<T extends { id: string }> {
  kind: ContentKind
  /** What one is called: "album" */
  noun: string
  title: string
  description: string
  icon: ReactNode
  addLabel: string
  /** A line under the dialog's title */
  hint?: string
  fields: readonly FieldDef[]
  /** What a new one starts with */
  defaults: Values
  columns: TableColumn<T>[]
  nameOf: (row: T) => string
  /** More to do with a row, between Edit and Remove */
  actions?: (row: T) => { label: string; icon: ReactNode; href?: string; onSelect?: () => void }[]
  /** Buttons beside "Add" */
  headerActions?: ReactNode
  emptyHint: string
  /** What removing one does, said before it's done */
  removeHint: string
  /** A row, as the editor starts from it, when that isn't the row itself */
  toValues?: (row: T) => Values
}

const KEY = '_key'
const withKey = (item: Values): Values => ({ ...item, [KEY]: crypto.randomUUID() })
const str = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v))
const iconButton =
  'grid size-7 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

/** A list of options as kept (or, from older saves, typed one to a line); a new one starts with two to fill in */
const optionsOf = (v: unknown): string[] => {
  const list = Array.isArray(v) ? v.map(str) : str(v) ? str(v).split('\n') : []
  return list.length ? list : ['', '']
}

/**
 * A question's options: a box each, with a button to take one out and one to add another
 * (Enter in a box adds the next). With `correct`, each has a button to mark it as the right
 * answer, and the mark follows the option if its wording changes.
 */
const OptionsEditor: FC<{
  label: string
  description?: string
  options: string[]
  /** The right answer's words, "" for none yet; leave out when there's no right answer to mark */
  correct?: string
  max: number
  onChange: (options: string[], correct?: string) => void
}> = ({ label, description, options, correct, max, onChange }) => {
  const group = useId()
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  // The box to put the cursor in once it's on screen (after adding one)
  const [focusAt, setFocusAt] = useState<number | null>(null)
  useEffect(() => {
    if (focusAt === null) return
    boxes.current[focusAt]?.focus()
    setFocusAt(null)
  }, [focusAt])
  const marking = correct !== undefined
  // Which box is the right answer: the first whose words match (two can't both be it)
  const rightAt = marking && correct ? options.findIndex((o) => o.trim() !== '' && o.trim() === correct.trim()) : -1
  const add = (after: number) => {
    if (options.length >= max) return
    onChange([...options.slice(0, after + 1), '', ...options.slice(after + 1)], correct)
    setFocusAt(after + 1)
  }
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-[0.9rem] font-semibold text-ink">{label}</legend>
      {description || marking ? <p className="m-0 text-[0.8rem] text-muted">{[description, marking ? 'Mark the right answer with the button beside it.' : ''].filter(Boolean).join(' ')}</p> : null}
      {options.map((option, i) => (
        <div key={i} className="flex items-center gap-2">
          {marking ? (
            <input
              type="radio"
              name={group}
              aria-label={`Option ${i + 1} is the right answer`}
              checked={i === rightAt}
              disabled={!option.trim()}
              onChange={() => onChange(options, option.trim())}
              className="size-4 shrink-0 cursor-pointer accent-success disabled:cursor-not-allowed"
            />
          ) : (
            <span aria-hidden className="w-4 shrink-0 text-center text-[0.8rem] text-muted tabular-nums">
              {i + 1}
            </span>
          )}
          <Input
            ref={(el) => {
              boxes.current[i] = el
            }}
            size="sm"
            aria-label={`Option ${i + 1}`}
            value={option}
            maxLength={200}
            onChange={(e) => {
              const next = options.map((o, at) => (at === i ? e.target.value : o))
              // The right answer is kept by its words, so it goes along with a change to them
              onChange(next, i === rightAt ? e.target.value.trim() : correct)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              // Not the dialog's Save: the next option
              e.preventDefault()
              add(i)
            }}
            placeholder={`Option ${i + 1}`}
            autoComplete="off"
            className={cn('min-w-0 flex-1', i === rightAt && 'border-success')}
          />
          <button
            type="button"
            aria-label={`Remove option ${i + 1}`}
            disabled={options.length <= 2}
            onClick={() => onChange(options.filter((_, at) => at !== i), i === rightAt ? '' : correct)}
            className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}
          >
            <X aria-hidden />
          </button>
        </div>
      ))}
      {options.length < max ? (
        <Button size="sm" variant="ghost" className="self-start" leading={<Plus size={14} aria-hidden />} onClick={() => add(options.length - 1)}>
          Add an option
        </Button>
      ) : (
        <p className="m-0 text-[0.8rem] text-muted">Up to {max} options.</p>
      )}
    </fieldset>
  )
}

/** An image's address, with buttons to upload one or pick one from the library */
const ImagePick: FC<{ label: string; value: string; onChange: (src: string) => void }> = ({ label, value, onChange }) => {
  const { toast } = useNotify()
  const [picking, setPicking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploads come at any size, from Storage */}
      {value ? <img src={value} alt="" className="size-9 shrink-0 rounded-md bg-fill object-cover ring-1 ring-line" /> : null}
      <Input size="sm" type="url" aria-label={`${label} address`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="min-w-36 flex-1" />
      <Button size="sm" variant="outline" leading={<Upload size={14} aria-hidden />} loading={uploading} onClick={() => file.current?.click()}>
        Upload
      </Button>
      <Button size="sm" variant="ghost" leading={<Images size={14} aria-hidden />} onClick={() => setPicking(true)}>
        Library
      </Button>
      <MediaPicker open={picking} onClose={() => setPicking(false)} onPick={onChange} />
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const picked = e.target.files?.[0]
          e.target.value = ''
          if (!picked) return
          setUploading(true)
          try {
            onChange(await uploadImage(picked))
          } catch (err) {
            toast({ variant: 'error', title: 'That image didn’t upload', message: err instanceof Error ? err.message : undefined })
          } finally {
            setUploading(false)
          }
        }}
      />
    </div>
  )
}

/** A file's address, with a button to upload one */
const FilePick: FC<{ label: string; value: string; onChange: (url: string, name?: string) => void }> = ({ label, value, onChange }) => {
  const { toast } = useNotify()
  const [uploading, setUploading] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input size="sm" type="url" aria-label={`${label} address`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="min-w-36 flex-1" />
      <Button size="sm" variant="outline" leading={<Upload size={14} aria-hidden />} loading={uploading} onClick={() => file.current?.click()}>
        Upload a file
      </Button>
      <input
        ref={file}
        type="file"
        accept={FILE_ACCEPT}
        hidden
        onChange={async (e) => {
          const picked = e.target.files?.[0]
          e.target.value = ''
          if (!picked) return
          setUploading(true)
          try {
            const { url, name } = await uploadFile(picked)
            onChange(url, name)
          } catch (err) {
            toast({ variant: 'error', title: 'That file didn’t upload', message: err instanceof Error ? err.message : undefined })
          } finally {
            setUploading(false)
          }
        }}
      />
    </div>
  )
}

/** A list field: its items, each with its own fields, to add to, reorder, and take from */
const ListEditor: FC<{ field: Extract<FieldDef, { type: 'list' }>; items: Values[]; values: Values; onChange: (items: Values[]) => void; error?: string }> = ({ field, items, values, onChange, error }) => {
  const patch = (i: number, change: Values) => onChange(items.map((item, at) => (at === i ? { ...item, ...change } : item)))
  const move = (i: number, by: -1 | 1) => {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="p-0 text-[0.9rem] font-semibold text-ink">{field.label}</legend>
      {field.description ? <p className="m-0 text-[0.8rem] text-muted">{field.description}</p> : null}
      {items.map((item, i) => (
        <div key={str(item[KEY])} role="group" aria-label={`${field.itemLabel} ${i + 1}`} className="flex flex-col gap-3 rounded-lg border border-line bg-fill p-3">
          <div className="flex items-center gap-1">
            <span className="text-[0.72rem] font-bold tracking-wide text-muted uppercase">
              {field.itemLabel} {i + 1}
            </span>
            <button type="button" aria-label={`Move ${field.itemLabel} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={cn(iconButton, 'ml-auto')}>
              <ArrowUp aria-hidden />
            </button>
            <button type="button" aria-label={`Move ${field.itemLabel} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className={iconButton}>
              <ArrowDown aria-hidden />
            </button>
            <button type="button" aria-label={`Remove ${field.itemLabel} ${i + 1}`} onClick={() => onChange(items.filter((_, at) => at !== i))} className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}>
              <Trash2 aria-hidden />
            </button>
          </div>
          {field.fields
            .filter((sub) => !sub.showIf || sub.showIf(item, values))
            .map((sub) => {
              const value = item[sub.name]
              const set = (v: unknown) => patch(i, { [sub.name]: v })
              if (sub.type === 'switch')
                return (
                  <Switch key={sub.name} size="sm" checked={value === true} onCheckedChange={set} description={sub.description}>
                    {sub.label}
                  </Switch>
                )
              if (sub.type === 'image') return <ImagePick key={sub.name} label={sub.label} value={str(value)} onChange={set} />
              if (sub.type === 'options') {
                const marking = !!sub.correctField && (!sub.markCorrectIf || sub.markCorrectIf(item, values))
                return (
                  <OptionsEditor
                    key={sub.name}
                    label={sub.label}
                    description={sub.description}
                    options={optionsOf(value)}
                    correct={marking ? str(item[sub.correctField!]) : undefined}
                    max={sub.max ?? 12}
                    onChange={(next, right) => patch(i, { [sub.name]: next, ...(marking ? { [sub.correctField!]: right ?? '' } : {}) })}
                  />
                )
              }
              return (
                <Field key={sub.name} label={sub.label} description={sub.description}>
                  {sub.type === 'select' ? (
                    <Select size="sm" value={str(value)} onValueChange={(v) => set(v ?? '')} options={[...(sub.options ?? [])]} placeholder={sub.placeholder ?? 'Pick one'} />
                  ) : sub.type === 'textarea' ? (
                    <TextArea rows={2} value={str(value)} onChange={(e) => set(e.target.value)} placeholder={sub.placeholder} />
                  ) : (
                    <Input size="sm" value={str(value)} onChange={(e) => set(e.target.value)} placeholder={sub.placeholder} autoComplete="off" />
                  )}
                </Field>
              )
            })}
        </div>
      ))}
      {error ? (
        <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {items.length < field.max ? (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          leading={<Plus size={15} aria-hidden />}
          onClick={() => onChange([...items, withKey(field.ids ? { id: crypto.randomUUID().slice(0, 8) } : {})])}
        >
          Add a {field.itemLabel}
        </Button>
      ) : (
        <p className="m-0 text-[0.8rem] text-muted">
          Up to {field.max} {field.itemLabel}s.
        </p>
      )}
    </fieldset>
  )
}

/** What the editor starts from: the row's values (or a new one's), with times on Atlanta's clock and list items keyed */
const startValues = (fields: readonly FieldDef[], from: Values): Values =>
  Object.fromEntries(
    fields.map((f) => {
      const v = from[f.name]
      if (f.type === 'list') return [f.name, (Array.isArray(v) ? v : []).map((item) => withKey(item as Values))]
      if (f.type === 'datetime') return [f.name, isoToAtlanta(str(v) || null)]
      if (f.type === 'switch') return [f.name, v === true]
      return [f.name, v ?? '']
    })
  )

/** The editor's values as the form the server reads */
const toFormData = (fields: readonly FieldDef[], values: Values) => {
  const data = new FormData()
  for (const f of fields) {
    const v = values[f.name]
    if (f.type === 'switch') {
      if (v === true) data.set(f.name, 'on')
    } else if (f.type === 'datetime') data.set(f.name, atlantaToIso(str(v) || null) ?? '')
    else if (f.type === 'list') data.set(f.name, JSON.stringify((Array.isArray(v) ? v : []).map((item: Values) => Object.fromEntries(Object.entries(item).filter(([name]) => name !== KEY)))))
    else data.set(f.name, str(v))
    if (f.type === 'file' && f.nameField) data.set(f.nameField, str(values[f.nameField]))
  }
  return data
}

function EditDialog<T extends { id: string }>({ config, row, open, onClose }: { config: CollectionConfig<T>; row: T | null; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [values, setValues] = useState<Values>(() => startValues(config.fields, row ? (config.toValues ? config.toValues(row) : (row as unknown as Values)) : config.defaults))
  const set = (name: string, v: unknown) => setValues((all) => ({ ...all, [name]: v }))
  const formId = `${config.kind}-${row?.id ?? 'new'}`
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={row ? `Edit ${config.nameOf(row) || `this ${config.noun}`}` : config.addLabel}
      description={config.hint}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} loading={pending}>
            Save
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          run(
            () => saveContent(config.kind, row?.id ?? null, toFormData(config.fields, values)),
            () => {
              onClose()
              router.refresh()
            }
          )
        }}
      >
        {config.fields
          .filter((f) => !f.showIf || f.showIf(values))
          .map((f) => {
            const v = values[f.name]
            if (f.type === 'list') return <ListEditor key={f.name} field={f} items={(v as Values[]) ?? []} values={values} onChange={(items) => set(f.name, items)} error={errors[f.name]} />
            if (f.type === 'switch')
              return (
                <Switch key={f.name} checked={v === true} onCheckedChange={(on) => set(f.name, on)} description={f.description}>
                  {f.label}
                </Switch>
              )
            return (
              <Field key={f.name} label={f.label} required={f.required} error={errors[f.name]} description={f.description}>
                {f.type === 'textarea' ? (
                  <TextArea rows={f.rows ?? 3} maxLength={f.maxLength} value={str(v)} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
                ) : f.type === 'select' ? (
                  <Select size="sm" value={str(v)} onValueChange={(picked) => set(f.name, picked ?? '')} options={[...(f.options ?? [])]} />
                ) : f.type === 'date' ? (
                  <DatePicker size="sm" value={(str(v) || null) as never} onValueChange={(day) => set(f.name, day ?? '')} />
                ) : f.type === 'datetime' ? (
                  <DateTimePicker size="sm" value={str(v) || null} onValueChange={(when) => set(f.name, when ?? '')} />
                ) : f.type === 'image' ? (
                  <ImagePick label={f.label} value={str(v)} onChange={(src) => set(f.name, src)} />
                ) : f.type === 'file' ? (
                  <FilePick
                    label={f.label}
                    value={str(v)}
                    onChange={(url, name) => setValues((all) => ({ ...all, [f.name]: url, ...(f.nameField && name ? { [f.nameField]: name } : {}) }))}
                  />
                ) : f.type === 'slug' ? (
                  <SlugInput size="sm" value={str(v)} onValueChange={(slug) => set(f.name, slug)} source={str(values[f.source ?? 'title'])} prefix={f.prefix} />
                ) : (
                  <Input
                    size="sm"
                    type={f.type === 'url' ? 'url' : f.type === 'number' ? 'number' : 'text'}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    maxLength={f.maxLength}
                    value={str(v)}
                    onChange={(e) => set(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    autoComplete="off"
                  />
                )}
              </Field>
            )
          })}
      </form>
    </Dialog>
  )
}

/** A kind of content: what there is, in a table, and a dialog to add or change one */
export function CollectionView<T extends { id: string }>({ config, rows }: { config: CollectionConfig<T>; rows: T[] }) {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (row: T | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(row)
  }
  return (
    <>
      <PageTitle
        icon={config.icon}
        title={config.title}
        description={config.description}
        actions={
          <>
            {config.headerActions}
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              {config.addLabel}
            </Button>
          </>
        }
      />
      <Table
        caption={config.title}
        hideCaption
        rows={rows}
        getRowId={(row) => row.id}
        empty={<EmptyState size="sm" icon={config.icon} title={`No ${config.noun}s yet`} description={config.emptyHint} />}
        columns={config.columns}
        rowActions={(row) => (
          <ActionMenu
            label={`Actions for ${config.nameOf(row)}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(row) },
              ...(config.actions?.(row) ?? []),
              'separator' as const,
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Remove ${config.nameOf(row) || `this ${config.noun}`}?`, message: config.removeHint, variant: 'error', confirmLabel: 'Remove' }))) return
                  const result = await deleteContent(config.kind, row.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <EditDialog key={dialogKey} config={config} row={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
