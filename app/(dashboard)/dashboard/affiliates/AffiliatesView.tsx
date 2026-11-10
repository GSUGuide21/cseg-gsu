'use client'
/* eslint-disable @next/next/no-img-element -- logos come at any size, from Storage or public/ */

import { ArrowDownUp, ExternalLink, Handshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Switch, TextArea } from '@/components/Form'
import { deleteAffiliate, reorderAffiliates, saveAffiliate } from '@/lib/dashboard/actions'
import { affiliateHref } from '@/lib/data/affiliates'
import type { AffiliateRow } from '@/lib/supabase/types'

import { ArrangeDialog } from '../ArrangeDialog'
import { ImageField } from '../ImageField'
import { PageTitle, useAction } from '../ui'

/** Its seal as the site draws it: the logo, or the first letters of its wordmark's two lines */
const Seal: FC<{ affiliate: AffiliateRow }> = ({ affiliate: a }) =>
  a.logo_url ? (
    <img src={a.logo_url} alt="" className="size-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-line" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-tint text-[0.7rem] font-extrabold text-brand" aria-hidden>
      {`${a.wordmark_top[0] ?? ''}${a.wordmark_bottom.replace(/^\W+/, '')[0] ?? ''}`.toUpperCase()}
    </span>
  )

const AffiliateDialog: FC<{ affiliate: AffiliateRow | null; open: boolean; onClose: () => void }> = ({ affiliate, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = affiliate ? `affiliate-${affiliate.id}` : 'affiliate-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={affiliate ? `Edit ${affiliate.short_name}` : 'Add an affiliate'}
      description={affiliate ? `Its page is ${affiliateHref(affiliate)}.` : 'Listed on Affiliates, with a page of its own.'}
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
          run(() => saveAffiliate(affiliate?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Full name" required error={errors.name} description="As PIN gives it.">
          <Input name="name" defaultValue={affiliate?.name} autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What it goes by" error={errors.short_name} description={affiliate ? undefined : 'Its page’s address is made from this, and kept.'}>
            <Input name="short_name" defaultValue={affiliate?.short_name} autoComplete="off" placeholder="Same as the full name" />
          </Field>
          <Field label="Instagram" required error={errors.instagram}>
            <Input name="instagram" defaultValue={affiliate?.instagram} autoComplete="off" placeholder="leadteamgsu" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Wordmark, bold line" required error={errors.wordmark_top}>
            <Input name="wordmark_top" defaultValue={affiliate?.wordmark_top} autoComplete="off" placeholder="Lead" />
          </Field>
          <Field label="Wordmark, script line" error={errors.wordmark_bottom}>
            <Input name="wordmark_bottom" defaultValue={affiliate?.wordmark_bottom} autoComplete="off" placeholder="Team" />
          </Field>
        </div>
        <ImageField name="logo_url" label="Logo" shape="square" defaultValue={affiliate?.logo_url} error={errors.logo_url} description="A square image, shown round. Without one, its initials show." />
        <Field label="One line about it" error={errors.summary} description="For the list of affiliates.">
          <Input name="summary" defaultValue={affiliate?.summary ?? ''} autoComplete="off" />
        </Field>
        <Field label="About it" error={errors.description} description="In its own words, from its PIN page. Leave a blank line between paragraphs.">
          <TextArea name="description" rows={6} defaultValue={affiliate?.description ?? ''} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PIN page" error={errors.pin_key} description="The end of its PIN link, or the whole link.">
            <Input name="pin_key" defaultValue={affiliate?.pin_key ?? ''} autoComplete="off" placeholder="lead-team" />
          </Field>
          <Field label="Discord invite" error={errors.discord_url}>
            <Input name="discord_url" type="url" defaultValue={affiliate?.discord_url ?? ''} autoComplete="off" placeholder="https://discord.gg/…" />
          </Field>
        </div>
        <Switch name="published" defaultChecked={affiliate?.published ?? true} description="Hidden ones stay here for later, and their page goes away.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

export const AffiliatesView: FC<{ affiliates: AffiliateRow[] }> = ({ affiliates }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<AffiliateRow | 'new' | null>(null)
  const [arranging, setArranging] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (a: AffiliateRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(a)
  }

  return (
    <>
      <PageTitle
        icon={<Handshake />}
        title="Affiliates"
        description="The student organizations CSEG partners with: the Affiliates page, in this order, and a page for each."
        actions={
          <>
            <Button href="/affiliates" size="sm" variant="outline" external>
              Open Affiliates
            </Button>
            {affiliates.length > 1 ? (
              <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} onClick={() => setArranging(true)}>
                Arrange
              </Button>
            ) : null}
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add an affiliate
            </Button>
          </>
        }
      />
      <Table
        caption="Affiliates"
        hideCaption
        rows={affiliates}
        getRowId={(a) => a.id}
        empty={
          <EmptyState
            size="sm"
            icon={<Handshake />}
            title="No affiliates here yet"
            description="Until there are any, the site shows its built-in list. Run npm run affiliates:seed to copy that list in, or add them one by one."
          />
        }
        columns={[
          {
            key: 'short_name',
            header: 'Affiliate',
            cell: (a) => (
              <span className="flex min-w-0 items-center gap-2.5">
                <Seal affiliate={a} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-ink">{a.short_name}</span>
                  {a.name !== a.short_name ? <span className="truncate text-[0.8rem] text-muted">{a.name}</span> : null}
                </span>
              </span>
            ),
          },
          { key: 'instagram', header: 'Instagram', hideWhenStacked: true, cell: (a) => `@${a.instagram}` },
          {
            key: 'pin_key',
            header: 'PIN',
            hideWhenStacked: true,
            cell: (a) => (a.pin_key ? 'On PIN' : <span className="text-muted">No PIN page</span>),
          },
          {
            key: 'published',
            header: 'On the site',
            cell: (a) => (
              <Badge size="sm" dot tone={a.published ? 'success' : 'neutral'}>
                {a.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(a) => (
          <ActionMenu
            label={`Actions for ${a.short_name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(a) },
              { label: 'Open its page', icon: <ExternalLink />, onSelect: () => window.open(affiliateHref(a), '_blank', 'noopener') },
              'separator',
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Remove ${a.short_name}?`, message: 'It comes off Affiliates, and its page goes away. To keep it for later, hide it instead.', variant: 'error', confirmLabel: 'Remove' })))
                    return
                  const result = await deleteAffiliate(a.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <AffiliateDialog key={dialogKey} affiliate={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      {arranging ? (
        <ArrangeDialog
          title="Arrange affiliates"
          groupLabel="Affiliates"
          groups={[{ slug: 'all', title: 'Affiliates' }]}
          items={affiliates.map((a) => ({ id: a.id, name: a.short_name, group: 'all', sort: a.sort, badges: a.published ? [] : ['Hidden'] }))}
          save={reorderAffiliates}
          onClose={() => setArranging(false)}
        />
      ) : null}
    </>
  )
}
