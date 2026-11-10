'use client'

import { ArrowRight, CornerUpRight, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input } from '@/components/Form'
import { deleteRedirect, saveRedirect } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import type { RedirectRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

const RedirectDialog: FC<{ redirect: RedirectRow | null; open: boolean; onClose: () => void }> = ({ redirect, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = redirect ? `redirect-${redirect.id}` : 'redirect-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={redirect ? `Edit ${redirect.from_path}` : 'Forward an address'}
      description="For a link on a flyer or a page that moved. An address a page already answers keeps showing that page."
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
          run(() => saveRedirect(redirect?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="From" required error={errors.from_path} description="An address on this site: letters, numbers, and hyphens.">
          <Input name="from_path" defaultValue={redirect?.from_path} autoComplete="off" placeholder="/welcome-week" />
        </Field>
        <Field label="To" required error={errors.to_path} description="A page here (/events) or a full link (https://…).">
          <Input name="to_path" defaultValue={redirect?.to_path} autoComplete="off" placeholder="/events" />
        </Field>
        <Field label="Note" description="What it’s for. Only officers see it.">
          <Input name="note" defaultValue={redirect?.note ?? ''} autoComplete="off" placeholder="On the fall flyers" />
        </Field>
      </form>
    </Dialog>
  )
}

/** Old addresses on the site, and where each goes now */
export const RedirectsView: FC<{ redirects: RedirectRow[] }> = ({ redirects }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<RedirectRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (r: RedirectRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(r)
  }

  return (
    <>
      <PageTitle
        icon={<CornerUpRight />}
        title="Redirects"
        description="Short or old addresses that forward somewhere else, like /welcome-week to an event’s page. A renamed page forwards on its own."
        actions={
          <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
            Forward an address
          </Button>
        }
      />
      <Table
        caption="Redirects"
        hideCaption
        rows={redirects}
        getRowId={(r) => r.id}
        defaultSort={{ key: 'from_path', direction: 'ascending' }}
        empty={<EmptyState size="sm" icon={<CornerUpRight />} title="Nothing forwards yet" description="Add one for a short link on a flyer, or for an address that used to work." />}
        columns={[
          {
            key: 'from_path',
            header: 'From',
            sortable: true,
            cell: (r) => (
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink [overflow-wrap:anywhere]">{r.from_path}</span>
                {r.note ? <span className="truncate text-[0.8rem] text-muted">{r.note}</span> : null}
              </span>
            ),
          },
          {
            key: 'to_path',
            header: 'To',
            sortable: true,
            cell: (r) => (
              <span className="flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                <ArrowRight size={14} className="shrink-0 text-muted" aria-hidden />
                {r.to_path}
              </span>
            ),
          },
          { key: 'updated_at', header: 'Changed', sortable: true, hideWhenStacked: true, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.updated_at)}</span> },
        ]}
        rowActions={(r) => (
          <ActionMenu
            label={`Actions for ${r.from_path}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(r) },
              { label: 'Try it', icon: <ExternalLink />, onSelect: () => window.open(r.from_path, '_blank', 'noopener') },
              'separator',
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Stop forwarding ${r.from_path}?`, message: 'Anyone following that address gets “page not found” instead.', variant: 'error', confirmLabel: 'Remove' }))) return
                  const result = await deleteRedirect(r.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <RedirectDialog key={dialogKey} redirect={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
