'use client'

import { ArrowDownUp, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Alert, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Select, Switch, TextArea } from '@/components/Form'
import { deleteGuidePick, reorderGuidePicks, saveGuidePick } from '@/lib/dashboard/actions'
import { GUIDE_KINDS, PICK_LIMITS } from '@/lib/dashboard/validate'
import { CARD_ICONS } from '@/lib/richtext/blocks'
import type { GuideKind, GuidePickRow } from '@/lib/supabase/types'

import { ArrangeDialog } from '../ArrangeDialog'
import { PageTitle, useAction } from '../ui'

/** What each guide's picks can hold: an eatery, a resource, or a place, by its id and name */
export type PickChoices = Record<GuideKind, { value: string; label: string }[]>

const GUIDES = Object.keys(GUIDE_KINDS) as GuideKind[]
const GUIDE_OPTIONS = GUIDES.map((g) => ({ value: g, label: GUIDE_KINDS[g].label, description: GUIDE_KINDS[g].shown }))
const ICON_OPTIONS = Object.entries(CARD_ICONS).map(([value, { label }]) => ({ value, label }))

const PickDialog: FC<{ pick: GuidePickRow | null; choices: PickChoices; open: boolean; onClose: () => void }> = ({ pick, choices, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  // What can go in it depends on the guide; switching guides starts the list over
  const [guide, setGuide] = useState<GuideKind>(pick?.guide ?? 'eat')
  const [items, setItems] = useState<string[]>(pick?.items ?? [])
  const formId = pick ? `pick-${pick.id}` : 'pick-new'
  const kind = GUIDE_KINDS[guide]
  // Something picked earlier that's since left the site still shows here, so it can be taken out
  const known = new Set(choices[guide].map((c) => c.value))
  const options = [...choices[guide], ...items.filter((i) => !known.has(i)).map((i) => ({ value: i, label: `${i} (no longer on the site)` }))]
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={pick ? 'Edit picks' : 'Add picks'}
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
          run(() => saveGuidePick(pick?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Guide" required error={errors.guide} description={`${kind.shown}.`}>
          <Select
            name="guide"
            value={guide}
            options={GUIDE_OPTIONS}
            onValueChange={(v) => {
              if (!v || v === guide) return
              setGuide(v as GuideKind)
              setItems([])
            }}
          />
        </Field>
        <Field label="Name" required error={errors.title}>
          <Input name="title" defaultValue={pick?.title} maxLength={PICK_LIMITS.title} autoComplete="off" placeholder={guide === 'eat' ? 'Cheap eats under $10' : guide === 'resources' ? 'First-week essentials' : 'Quiet corners'} />
        </Field>
        <Field label="A line about it" error={errors.description}>
          <TextArea name="description" rows={2} defaultValue={pick?.description ?? ''} maxLength={PICK_LIMITS.description} />
        </Field>
        <Field label={`The ${kind.items} in it`} required error={errors.items} description={`Up to ${PICK_LIMITS.items}, shown in the order you pick them.`}>
          <Select type="tags" name="items" value={items} onValueChange={setItems} options={options} placeholder={`Search the ${kind.items}…`} />
        </Field>
        <Field label="Icon">
          <Select name="icon" defaultValue={pick?.icon ?? 'star'} options={ICON_OPTIONS} />
        </Field>
        <Switch name="published" defaultChecked={pick?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

/**
 * The campus guides' curated picks: short collections officers put together, featured at the
 * top of Places to eat and Resources and under the campus map. `picks` is null before the
 * migration that adds them has run.
 */
export const PicksView: FC<{ picks: GuidePickRow[] | null; choices: PickChoices }> = ({ picks, choices }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<GuidePickRow | 'new' | null>(null)
  const [arranging, setArranging] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const rows = picks ?? []
  const open = (p: GuidePickRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(p)
  }
  const nameOf = (guide: GuideKind, id: string) => choices[guide].find((c) => c.value === id)?.label

  return (
    <>
      <PageTitle
        icon={<Star />}
        title="Picks"
        description="Short collections for the campus guides, like “First-week essentials” or “Open late”. Until a guide has any of yours, it shows the site’s built-in ones."
        actions={
          picks ? (
            <>
              {rows.length > 1 ? (
                <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} onClick={() => setArranging(true)}>
                  Arrange
                </Button>
              ) : null}
              <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
                Add picks
              </Button>
            </>
          ) : null
        }
      />
      {picks ? (
        <Table
          caption="Curated picks"
          hideCaption
          rows={rows}
          getRowId={(p) => p.id}
          empty={
            <EmptyState
              size="sm"
              icon={<Star />}
              title="No picks of your own yet"
              description="The guides are showing the site’s built-in picks. Add one for a guide and yours take their place there."
              actions={
                <Button size="sm" onClick={() => open('new')}>
                  Add the first
                </Button>
              }
            />
          }
          columns={[
            {
              key: 'title',
              header: 'Picks',
              cell: (p) => (
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink">{p.title}</span>
                  {p.description ? <span className="line-clamp-1 text-[0.85rem] text-muted">{p.description}</span> : null}
                </span>
              ),
            },
            { key: 'guide', header: 'Guide', cell: (p) => GUIDE_KINDS[p.guide].label },
            {
              key: 'items',
              header: 'In it',
              cell: (p) => {
                const live = p.items.filter((i) => nameOf(p.guide, i))
                return (
                  <span className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 text-[0.85rem] text-ink-soft">{live.map((i) => nameOf(p.guide, i)).join(', ') || 'Nothing that’s on the site'}</span>
                    {live.length < p.items.length ? <span className="text-[0.78rem] text-warning">{p.items.length - live.length} no longer on the site</span> : null}
                  </span>
                )
              },
            },
            {
              key: 'published',
              header: 'On the site',
              cell: (p) => (
                <Badge size="sm" dot tone={p.published ? 'success' : 'neutral'}>
                  {p.published ? 'Shown' : 'Hidden'}
                </Badge>
              ),
            },
          ]}
          rowActions={(p) => (
            <ActionMenu
              label={`Actions for “${p.title}”`}
              items={[
                { label: 'Edit', icon: <Pencil />, onSelect: () => open(p) },
                'separator',
                {
                  label: 'Remove',
                  icon: <Trash2 />,
                  danger: true,
                  onSelect: async () => {
                    if (!(await confirm({ title: 'Remove these picks?', message: `“${p.title}” comes off ${GUIDE_KINDS[p.guide].label}. To keep it for later, hide it instead.`, variant: 'error', confirmLabel: 'Remove' }))) return
                    const result = await deleteGuidePick(p.id)
                    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                    router.refresh()
                  },
                },
              ]}
            />
          )}
        />
      ) : (
        <Alert tone="warning" title="Picks aren’t set up yet">
          The database needs its latest migration (pages_menu_guide_picks) before picks can be saved. Until then the guides show the site’s built-in picks.
        </Alert>
      )}
      <PickDialog key={dialogKey} pick={editing === 'new' ? null : editing} choices={choices} open={editing !== null} onClose={() => setEditing(null)} />
      {arranging ? (
        <ArrangeDialog
          title="Arrange picks"
          groupLabel="Guide"
          groups={GUIDES.filter((g) => rows.some((p) => p.guide === g)).map((g) => ({ slug: g, title: GUIDE_KINDS[g].label }))}
          items={rows.map((p) => ({ id: p.id, name: p.title, group: p.guide, sort: p.sort, badges: p.published ? [] : ['Hidden'] }))}
          save={reorderGuidePicks}
          onClose={() => setArranging(false)}
        />
      ) : null}
    </>
  )
}
