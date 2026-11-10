'use client'

import { CalendarOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Checkbox, DateRangePicker, Field, Input } from '@/components/Form'
import { deleteClosure, saveClosure } from '@/lib/dashboard/actions'
import { atlantaToday, shortDate } from '@/lib/eateries'
import type { EateryAreaRow, EateryClosureRow, EateryRow } from '@/lib/supabase/types'

import { useAction } from '../ui'

/** Where a closure stands today */
const stateOf = (c: EateryClosureRow, today: string) => (c.ends_on < today ? 'past' : c.starts_on > today ? 'upcoming' : 'now')
const STATE = { now: { label: 'Closed now', tone: 'warning' }, upcoming: { label: 'Upcoming', tone: 'info' }, past: { label: 'Over', tone: 'neutral' } } as const

const ClosureDialog: FC<{ closure: EateryClosureRow | null; eateries: EateryRow[]; areas: EateryAreaRow[]; open: boolean; onClose: () => void }> = ({ closure, eateries, areas, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [picked, setPicked] = useState<Set<string>>(() => new Set(closure?.eateries ?? []))
  const toggle = (slugs: string[], on: boolean) =>
    setPicked((p) => {
      const next = new Set(p)
      for (const s of slugs) if (on) next.add(s)
      else next.delete(s)
      return next
    })
  const formId = closure ? `closure-${closure.id}` : 'closure-new'
  // Areas the page has, then any eateries whose area is gone
  const groups = [...areas.map((a) => ({ slug: a.slug, title: a.title })), ...[...new Set(eateries.map((e) => e.area))].filter((s) => !areas.some((a) => a.slug === s)).map((s) => ({ slug: s, title: s }))]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={closure ? `Edit ${closure.label}` : 'Add a closure'}
      description="For a break or holiday: from the first day through the last, these eateries show “Closed for …” instead of their hours, and the map shows them closed."
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
          run(() => saveClosure(closure?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What for" required error={errors.label} description="Reads “Closed for winter break through Jan 10”.">
            <Input name="label" defaultValue={closure?.label} placeholder="winter break" />
          </Field>
          <Field label="Closed" required error={errors.dates} description="The first and last days, both included.">
            <DateRangePicker name="dates" size="sm" defaultValue={closure ? { start: closure.starts_on, end: closure.ends_on } : null} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[0.85rem] font-semibold text-ink">Eateries</legend>
          {[...picked].map((s) => (
            <input key={s} type="hidden" name="eateries" value={s} />
          ))}
          {groups.map((g) => {
            const list = eateries.filter((e) => e.area === g.slug)
            if (!list.length) return null
            const all = list.every((e) => picked.has(e.slug))
            const some = list.some((e) => picked.has(e.slug))
            return (
              <div key={g.slug} className="rounded-lg border border-line p-3">
                <Checkbox checked={all} indeterminate={some && !all} onCheckedChange={(on) => toggle(list.map((e) => e.slug), on)}>
                  <span className="font-semibold">{g.title}</span> <span className="text-muted">(all {list.length})</span>
                </Checkbox>
                <div className="mt-2 grid gap-1.5 pl-6 sm:grid-cols-2">
                  {list.map((e) => (
                    <Checkbox key={e.id} checked={picked.has(e.slug)} onCheckedChange={(on) => toggle([e.slug], on)}>
                      {e.name}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )
          })}
          {errors.eateries ? <p className="m-0 text-[0.8rem] font-semibold text-danger">{errors.eateries}</p> : null}
        </fieldset>
      </form>
    </Dialog>
  )
}

/** Breaks and holidays: when they are, which eateries close, and whether they're on now */
export const ClosuresPanel: FC<{ closures: EateryClosureRow[]; eateries: EateryRow[]; areas: EateryAreaRow[] }> = ({ closures, eateries, areas }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<EateryClosureRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (c: EateryClosureRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(c)
  }
  const today = atlantaToday()
  return (
    <section aria-labelledby="closures-title" className="mt-10 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="closures-title" className="m-0 text-[1.15rem] font-bold text-ink">
            Closures
          </h2>
          <p className="m-0 text-[0.88rem] text-muted">Breaks and holidays, when eateries close for days at a time.</p>
        </div>
        <Button size="sm" variant="outline" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
          Add a closure
        </Button>
      </div>
      <Table
        caption="Closures"
        hideCaption
        rows={closures}
        getRowId={(c) => c.id}
        empty={<EmptyState size="sm" icon={<CalendarOff />} title="No closures" description="Add one before a break, and the site shows those eateries closed through it." />}
        columns={[
          { key: 'label', header: 'For', cell: (c) => c.label },
          { key: 'starts_on', header: 'Dates', cell: (c) => `${shortDate(c.starts_on)} – ${shortDate(c.ends_on)}, ${c.ends_on.slice(0, 4)}` },
          { key: 'eateries', header: 'Eateries', hideWhenStacked: true, cell: (c) => c.eateries.length },
          {
            key: 'ends_on',
            header: 'Now',
            cell: (c) => {
              const s = STATE[stateOf(c, today)]
              return (
                <Badge size="sm" dot tone={s.tone}>
                  {s.label}
                </Badge>
              )
            },
          },
        ]}
        rowActions={(c) => (
          <ActionMenu
            label={`Actions for ${c.label}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(c) },
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Delete ${c.label}?`, message: 'Its eateries show their usual hours right away.', variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deleteClosure(c.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <ClosureDialog key={dialogKey} closure={editing === 'new' ? null : editing} eateries={eateries} areas={areas} open={editing !== null} onClose={() => setEditing(null)} />
    </section>
  )
}
