'use client'

import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { Badge, Button, Dialog } from '@/components'
import { Field, Select, Sortable, SortableHandle } from '@/components/Form'
import type { ActionResult } from '@/lib/dashboard/validate'
import { cn } from '@/lib/cn'

import { useAction } from './ui'

export type ArrangeItem = { id: string; name: string; group: string; sort: number; badges?: string[] }

const byOrder = (a: ArrangeItem, b: ArrangeItem) => a.sort - b.sort || a.name.localeCompare(b.name)

/**
 * Drag a group's things (an area's eateries, a group's resources) into the order the page
 * lists them; picking another group starts over there. Saves that group's order, first to last.
 */
export const ArrangeDialog: FC<{
  title: string
  description?: string
  /** "Area", "Group" */
  groupLabel: string
  groups: { slug: string; title: string }[]
  items: ArrangeItem[]
  /** A line under the list, like how dining halls are placed */
  note?: string
  save: (ids: string[]) => Promise<ActionResult>
  onClose: () => void
}> = ({ title, description, groupLabel, groups, items, note, save, onClose }) => {
  const router = useRouter()
  const { pending, run } = useAction()
  const inGroup = (slug: string) => items.filter((i) => i.group === slug).sort(byOrder)
  const [group, setGroup] = useState(groups[0]?.slug ?? '')
  const [order, setOrder] = useState<ArrangeItem[]>(() => inGroup(group))
  const changed = order.some((item, i) => item.id !== inGroup(group)[i]?.id)

  return (
    <Dialog
      open
      onClose={onClose}
      closeOnBackdrop={false}
      title={title}
      description={description ?? 'Drag the grips, or focus one and press Space, then the arrow keys.'}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" loading={pending} disabled={!changed} onClick={() => run(() => save(order.map((i) => i.id)), () => router.refresh())}>
            Save order
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* One list (the affiliates, say) has nothing to pick between */}
        {groups.length > 1 ? (
          <Field label={groupLabel}>
            <Select
              size="sm"
              value={group}
              options={groups.map((g) => ({ value: g.slug, label: g.title, description: `${inGroup(g.slug).length}` }))}
              onValueChange={(v) => {
                if (!v) return
                setGroup(v)
                setOrder(inGroup(v))
              }}
            />
          </Field>
        ) : null}
        {order.length ? (
          <Sortable
            aria-label="In order"
            items={order}
            onItemsChange={setOrder}
            getKey={(i) => i.id}
            getLabel={(i) => i.name}
            renderItem={(item, { index, handleProps, active }) => (
              <div className={cn('flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2', active && 'border-brand')}>
                <SortableHandle {...handleProps} />
                <span className="w-5 text-[0.8rem] font-semibold text-muted tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[0.9rem] text-ink">{item.name}</span>
                {item.badges?.map((b) => (
                  <Badge key={b} size="sm">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
          />
        ) : (
          <p className="m-0 text-[0.9rem] text-muted">Nothing here yet.</p>
        )}
        {note ? <p className="m-0 text-[0.8rem] text-muted">{note}</p> : null}
      </div>
    </Dialog>
  )
}
