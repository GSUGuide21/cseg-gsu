'use client'
/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */

import { Pencil, Plus, Trash2, UserRoundCog } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Select, Switch, TextArea } from '@/components/Form'
import { deleteExecutive, saveExecutive } from '@/lib/dashboard/actions'
import { OFFICER_TITLES } from '@/lib/data/constitution'
import { CONTACT_FIELDS, executiveFromRow, serviceText, sortExecutives } from '@/lib/executives'
import type { ExecutiveRow } from '@/lib/supabase/types'

import { ImageField } from '../ImageField'
import { PageTitle, useAction } from '../ui'

const isServing = (r: ExecutiveRow) => r.service.some((s) => s.endYear == null)

const ExecutiveDialog: FC<{ executive: ExecutiveRow | null; open: boolean; onClose: () => void }> = ({ executive, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = executive ? `executive-${executive.id}` : 'executive-new'
  // The constitution's offices, and theirs if it's another (an office since renamed)
  const roles = [...OFFICER_TITLES, ...(executive && !(OFFICER_TITLES as readonly string[]).includes(executive.role) ? [executive.role] : [])]
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={executive ? `Edit ${executive.first_name} ${executive.last_name}` : 'Add an executive'}
      description="Shown on Executives: under Current executives while they’re serving, then under Past executives."
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
          run(() => saveExecutive(executive?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required error={errors.first_name}>
            <Input name="first_name" defaultValue={executive?.first_name} autoComplete="off" />
          </Field>
          <Field label="Last name" required error={errors.last_name}>
            <Input name="last_name" defaultValue={executive?.last_name} autoComplete="off" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Office" required error={errors.role}>
            <Select name="role" defaultValue={executive?.role ?? null} options={roles.map((r) => ({ value: r, label: r }))} placeholder="Pick an office" />
          </Field>
          <Field label="Years served" required error={errors.service} description="Like 2025–present, or 2022–2024, 2025–present.">
            <Input name="service" defaultValue={executive ? serviceText(executive.service) : `${new Date().getFullYear()}–present`} />
          </Field>
        </div>
        <ImageField name="avatar_url" label="Photo" shape="square" defaultValue={executive?.avatar_url} error={errors.avatar_url} description="A square photo works best. Without one, their initials show." />
        <Field label="About them" description="A few lines, in their own words if they like.">
          <TextArea name="bio" rows={4} defaultValue={executive?.bio ?? ''} />
        </Field>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 text-[0.9rem] font-semibold text-ink">What they share on the page</legend>
          <p className="m-0 text-[0.8rem] text-muted">Everything here is public. Leave blank what they’d rather not share.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map(({ key, label, placeholder }) => (
              <Field key={key} label={label} error={errors[`contact.${key}`]}>
                <Input
                  name={`contact.${key}`}
                  type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'url'}
                  defaultValue={executive?.contact[key] ?? ''}
                  placeholder={placeholder}
                  autoComplete="off"
                />
              </Field>
            ))}
          </div>
        </fieldset>
        <Switch name="is_founder" defaultChecked={executive?.is_founder ?? false} description="A Founder badge beside their office.">
          A founder of CSEG
        </Switch>
        <Switch name="published" defaultChecked={executive?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

export const ExecutivesView: FC<{ executives: ExecutiveRow[] }> = ({ executives }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<ExecutiveRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (r: ExecutiveRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(r)
  }
  // In the page's order
  const rows = useMemo(() => {
    const order = sortExecutives(executives.map((r) => ({ ...executiveFromRow(r), id: r.id })))
    return order.map((e) => executives.find((r) => r.id === e.id)!)
  }, [executives])

  return (
    <>
      <PageTitle
        icon={<UserRoundCog />}
        title="Executives"
        description="Who’s on the Executive Council, and who has been: the Executives page, in office order."
        actions={
          <>
            <Button href="/executives" size="sm" variant="outline" external>
              Open Executives
            </Button>
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add an executive
            </Button>
          </>
        }
      />
      <Table
        caption="Executives"
        hideCaption
        rows={rows}
        getRowId={(r) => r.id}
        empty={<EmptyState size="sm" icon={<UserRoundCog />} title="No executives here yet" description="Add the Executive Council, and past executives if you like. Until there are any, the Executives page says the team is coming soon." />}
        columns={[
          {
            key: 'last_name',
            header: 'Name',
            sortable: true,
            sortValue: (r) => `${r.last_name} ${r.first_name}`,
            cell: (r) => (
              <span className="flex min-w-0 items-center gap-2.5">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-tint text-[0.75rem] font-bold text-brand" aria-hidden>
                    {r.first_name[0]}
                    {r.last_name[0]}
                  </span>
                )}
                {r.first_name} {r.last_name}
              </span>
            ),
          },
          { key: 'role', header: 'Office', sortable: true, cell: (r) => r.role },
          {
            key: 'service',
            header: 'Served',
            hideWhenStacked: true,
            cell: (r) => (
              <span className="flex flex-wrap items-center gap-2">
                {serviceText(r.service)}
                {isServing(r) ? (
                  <Badge size="sm" tone="brand">
                    Serving
                  </Badge>
                ) : null}
              </span>
            ),
          },
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
            label={`Actions for ${r.first_name} ${r.last_name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(r) },
              'separator',
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  const name = `${r.first_name} ${r.last_name}`
                  if (!(await confirm({ title: `Remove ${name}?`, message: 'They come off the Executives page right away. To keep them as a past executive, give their years an end instead.', variant: 'error', confirmLabel: 'Remove' })))
                    return
                  const result = await deleteExecutive(r.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <ExecutiveDialog key={dialogKey} executive={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
