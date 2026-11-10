'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { Button, Dialog } from '@/components'
import { Field, Input, Select, Sortable, SortableHandle, TextArea } from '@/components/Form'
import type { ActionResult } from '@/lib/dashboard/validate'
import { cn } from '@/lib/cn'
import { CARD_ICONS } from '@/lib/richtext/blocks'

import { useAction } from './ui'

export type GroupFields = { slug: string; title: string; description: string | null; icon?: string }

type Row = { key: string; slug: string; title: string; description: string; icon: string; count: number }

const ICON_OPTIONS = [{ value: '', label: 'None' }, ...Object.entries(CARD_ICONS).map(([value, { label }]) => ({ value, label }))]

let nextKey = 0

/**
 * The groups a list is sorted into (eatery areas, resource groups): rename them, describe
 * them, add and remove them, and drag them into the page's order. A group's #link (and what
 * References point at) is made from its first name and kept, so renaming one breaks nothing.
 * One that still has things in it can't be removed until they move.
 */
export const GroupsDialog: FC<{
  title: string
  description: string
  /** "area", "group" */
  noun: string
  /** What's in them: ["eatery", "eateries"] */
  items: [string, string]
  groups: GroupFields[]
  counts: Record<string, number>
  /** Each group has an icon to pick */
  withIcon?: boolean
  save: (groups: GroupFields[]) => Promise<ActionResult>
  onClose: () => void
}> = ({ title, description, noun, items, groups, counts, withIcon = false, save, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [rows, setRows] = useState<Row[]>(() => groups.map((g) => ({ key: g.slug, slug: g.slug, title: g.title, description: g.description ?? '', icon: g.icon ?? '', count: counts[g.slug] ?? 0 })))
  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={title}
      description={description}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              run(
                () => save(rows.map(({ slug, title, description, icon }) => ({ slug, title, description, ...(withIcon ? { icon } : {}) }))),
                () => {
                  onClose()
                  router.refresh()
                }
              )
            }
          >
            Save {noun}s
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Sortable
          aria-label={`${noun[0].toUpperCase()}${noun.slice(1)}s`}
          items={rows}
          onItemsChange={setRows}
          getKey={(r) => r.key}
          getLabel={(r) => r.title || `New ${noun}`}
          renderItem={(r, { index, handleProps, active }) => (
            <div className={cn('flex items-start gap-3 rounded-lg border border-line bg-surface p-3', active && 'border-brand')}>
              <SortableHandle {...handleProps} className="mt-6" />
              <div className={cn('grid min-w-0 flex-1 gap-3', withIcon ? 'sm:grid-cols-[1fr_9rem]' : 'sm:grid-cols-2')}>
                <Field label="Name" required error={errors[`area-${index}`]} description={r.slug ? `#${r.slug} · ${r.count} ${r.count === 1 ? items[0] : items[1]}` : 'New'}>
                  <Input size="sm" value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} />
                </Field>
                {withIcon ? (
                  <Field label="Icon">
                    <Select size="sm" value={r.icon} options={ICON_OPTIONS} onValueChange={(v) => update(r.key, { icon: v ?? '' })} />
                  </Field>
                ) : null}
                <Field label="Description" className={withIcon ? 'sm:col-span-2' : undefined}>
                  <TextArea rows={2} value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Shown under its name on the page" />
                </Field>
              </div>
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                className="mt-6"
                aria-label={`Remove ${r.title || `this ${noun}`}`}
                disabled={r.count > 0}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <Trash2 size={14} aria-hidden />
              </Button>
            </div>
          )}
        />
        {errors.areas ? <p className="m-0 text-[0.8rem] font-semibold text-danger">{errors.areas}</p> : null}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          leading={<Plus size={14} aria-hidden />}
          onClick={() => setRows((rs) => [...rs, { key: `new-${nextKey++}`, slug: '', title: '', description: '', icon: '', count: 0 }])}
        >
          Add {noun === 'area' ? 'an' : 'a'} {noun}
        </Button>
      </div>
    </Dialog>
  )
}
