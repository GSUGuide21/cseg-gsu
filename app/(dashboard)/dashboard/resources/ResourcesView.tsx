'use client'

import { ArrowDownUp, BookOpen, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Select, Switch, TextArea } from '@/components/Form'
import { TIP_MAX } from '@/lib/dashboard/validate'
import { deleteResource, reorderResources, saveResource, saveResourceGroups } from '@/lib/dashboard/actions'
import { PLACES } from '@/lib/data/places'
import type { ResourceGroupRow, ResourceRow } from '@/lib/supabase/types'

import { ArrangeDialog } from '../ArrangeDialog'
import { GroupsDialog } from '../GroupsDialog'
import { PageTitle, useAction } from '../ui'

const PLACE_OPTIONS = [...PLACES].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.id, label: p.name }))

const ResourceDialog: FC<{ resource: ResourceRow | null; groups: ResourceGroupRow[]; nextSort: number; open: boolean; onClose: () => void }> = ({ resource, groups, nextSort, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = resource ? `resource-${resource.id}` : 'resource-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={resource ? `Edit ${resource.label}` : 'Add a resource'}
      description="Shown on Student resources in its group, and wherever a page’s References point at it."
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
          run(() => saveResource(resource?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.label}>
          <Input name="label" defaultValue={resource?.label} placeholder="Panther Pantry" />
        </Field>
        <Field label="Group" required error={errors.group_slug}>
          <Select name="group_slug" defaultValue={resource?.group_slug ?? null} options={groups.map((g) => ({ value: g.slug, label: g.title }))} placeholder="Pick a group" />
        </Field>
        <Field label="Link" required error={errors.href}>
          <Input name="href" inputMode="url" defaultValue={resource?.href} placeholder="https://…" />
        </Field>
        <Field label="What it’s for" description="One line, shown under its name.">
          <TextArea name="description" rows={2} defaultValue={resource?.description ?? ''} />
        </Field>
        <Field label="Insider tip" error={errors.tip} description="Optional. A line of advice in a student’s voice, set apart on its card.">
          <Input name="tip" defaultValue={resource?.tip ?? ''} maxLength={TIP_MAX} placeholder="Book early in the term; appointments fill up by midterms." />
        </Field>
        <Field label="In a building" description="Adds “Show on map” to its card.">
          <Select name="place_id" type="combobox" defaultValue={resource?.place_id ?? null} options={PLACE_OPTIONS} placeholder="None" />
        </Field>
        {/* Its place in its group; a new one goes last. Arrange changes it. */}
        <input type="hidden" name="sort" value={resource?.sort ?? nextSort} />
        <Switch name="published" defaultChecked={resource?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

export const ResourcesView: FC<{ resources: ResourceRow[]; groups: ResourceGroupRow[] }> = ({ resources, groups }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<ResourceRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [tool, setTool] = useState<'groups' | 'arrange' | null>(null)
  const open = (r: ResourceRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(r)
  }
  // In the page's order: by group as the page lists them, then each group's order
  const rows = useMemo(() => {
    const at = (slug: string) => groups.findIndex((g) => g.slug === slug)
    return [...resources].sort((a, b) => at(a.group_slug) - at(b.group_slug) || a.sort - b.sort)
  }, [resources, groups])
  const groupTitle = (slug: string) => groups.find((g) => g.slug === slug)?.title ?? slug
  const counts = Object.fromEntries(groups.map((g) => [g.slug, resources.filter((r) => r.group_slug === g.slug).length]))
  const nextSort = Math.max(0, ...resources.map((r) => r.sort)) + 10

  return (
    <>
      <PageTitle
        icon={<BookOpen />}
        title="Resources"
        description="The links on Student resources, by group, and what a page’s References can point at."
        actions={
          <>
            <Button href="/resources" size="sm" variant="outline" external>
              Open Student resources
            </Button>
            <Button size="sm" variant="outline" leading={<Layers size={15} aria-hidden />} disabled={!groups.length} onClick={() => setTool('groups')}>
              Groups
            </Button>
            <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} disabled={!resources.length} onClick={() => setTool('arrange')}>
              Arrange
            </Button>
            <Button size="sm" leading={<Plus size={15} aria-hidden />} disabled={!groups.length} onClick={() => open('new')}>
              Add a resource
            </Button>
          </>
        }
      />
      <Table
        caption="Resources"
        hideCaption
        rows={rows}
        getRowId={(r) => r.id}
        empty={
          <EmptyState
            size="sm"
            icon={<BookOpen />}
            title="No resources here yet"
            description="Until there are, the site shows its built-in list. Run npm run resources:seed -- --write to copy that list (and its groups) here."
          />
        }
        columns={[
          {
            key: 'label',
            header: 'Name',
            sortable: true,
            cell: (r) => (
              <span className="flex min-w-0 flex-col">
                {r.label}
                <span className="truncate text-[0.8rem] font-normal text-muted">{r.href}</span>
              </span>
            ),
          },
          { key: 'group_slug', header: 'Group', sortable: true, cell: (r) => groupTitle(r.group_slug) },
          { key: 'place_id', header: 'Map', hideWhenStacked: true, cell: (r) => (r.place_id ? (PLACES.find((p) => p.id === r.place_id)?.name ?? r.place_id) : <span className="text-muted">None</span>) },
          {
            key: 'published',
            header: 'On the site',
            sortable: true,
            cell: (r) => (
              <Badge size="sm" dot tone={r.published ? 'success' : 'neutral'}>
                {r.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(r) => (
          <ActionMenu
            label={`Actions for ${r.label}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(r) },
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Delete ${r.label}?`, message: 'It comes off the site right away, and References to it drop out.', variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deleteResource(r.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <ResourceDialog key={dialogKey} resource={editing === 'new' ? null : editing} groups={groups} nextSort={nextSort} open={editing !== null} onClose={() => setEditing(null)} />
      {tool === 'groups' ? (
        <GroupsDialog
          title="Groups"
          description="How Student resources groups its links, in the page’s order. Drag the grips to reorder. A group with resources can’t be removed until they move."
          noun="group"
          items={['resource', 'resources']}
          groups={groups}
          counts={counts}
          withIcon
          save={saveResourceGroups}
          onClose={() => setTool(null)}
        />
      ) : null}
      {tool === 'arrange' ? (
        <ArrangeDialog
          title="Arrange resources"
          groupLabel="Group"
          groups={groups}
          items={resources.map((r) => ({ id: r.id, name: r.label, group: r.group_slug, sort: r.sort, badges: r.published ? [] : ['Hidden'] }))}
          save={reorderResources}
          onClose={() => setTool(null)}
        />
      ) : null}
    </>
  )
}
