'use client'
/* eslint-disable @next/next/no-img-element -- logos come at any size, from Storage or public/ */

import { ArrowDownUp, BadgeDollarSign, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { DatePicker, Field, Input, Select, Switch, TextArea } from '@/components/Form'
import { deleteSponsor, reorderSponsors, saveSponsor } from '@/lib/dashboard/actions'
import { SPONSOR_TIER_LABELS, sponsorActive } from '@/lib/dashboard/terms'
import { SPONSOR_TIERS } from '@/lib/dashboard/validate'
import { atlantaToday, shortDate } from '@/lib/eateries'
import type { SponsorRow } from '@/lib/supabase/types'

import { ArrangeDialog } from '../ArrangeDialog'
import { ImageField } from '../ImageField'
import { PageTitle, useAction } from '../ui'

/** "Sep 1 to Dec 15", "From Sep 1", "Through Dec 15", or "" for no limit */
const dates = (s: SponsorRow) =>
  s.starts_on && s.ends_on ? `${shortDate(s.starts_on)} to ${shortDate(s.ends_on)}` : s.starts_on ? `From ${shortDate(s.starts_on)}` : s.ends_on ? `Through ${shortDate(s.ends_on)}` : ''

const SponsorDialog: FC<{ sponsor: SponsorRow | null; open: boolean; onClose: () => void }> = ({ sponsor, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = sponsor ? `sponsor-${sponsor.id}` : 'sponsor-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={sponsor ? `Edit ${sponsor.name}` : 'Add a sponsor'}
      description="Listed on the Affiliates page, under the affiliates."
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
          run(() => saveSponsor(sponsor?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label="Name" required error={errors.name}>
            <Input name="name" defaultValue={sponsor?.name} autoComplete="off" />
          </Field>
          <Field label="Tier" error={errors.tier}>
            <Select name="tier" defaultValue={sponsor?.tier ?? 'supporter'} options={SPONSOR_TIERS.map((t) => ({ value: t, label: SPONSOR_TIER_LABELS[t] }))} />
          </Field>
        </div>
        <Field label="Their link" error={errors.href}>
          <Input name="href" type="url" defaultValue={sponsor?.href ?? ''} autoComplete="off" placeholder="https://…" />
        </Field>
        <ImageField name="logo_url" label="Logo" shape="square" defaultValue={sponsor?.logo_url} error={errors.logo_url} description="Without one, their initial shows." />
        <Field label="A line about them" error={errors.blurb} description="What they do, or what they support.">
          <TextArea name="blurb" rows={2} maxLength={300} defaultValue={sponsor?.blurb ?? ''} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shown from" error={errors.starts_on} description="Empty: right away.">
            <DatePicker name="starts_on" size="sm" defaultValue={sponsor?.starts_on ?? null} />
          </Field>
          <Field label="Shown through" error={errors.ends_on} description="Empty: until you hide it.">
            <DatePicker name="ends_on" size="sm" defaultValue={sponsor?.ends_on ?? null} />
          </Field>
        </div>
        <Switch name="published" defaultChecked={sponsor?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

/** Who sponsors the club: listed on the Affiliates page while shown and inside their dates */
export const SponsorsView: FC<{ sponsors: SponsorRow[] }> = ({ sponsors }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<SponsorRow | 'new' | null>(null)
  const [arranging, setArranging] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const today = atlantaToday()
  const open = (s: SponsorRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(s)
  }

  return (
    <>
      <PageTitle
        icon={<BadgeDollarSign />}
        title="Sponsors"
        description="The businesses and departments that back the club. They’re listed on the Affiliates page, the highest tier first."
        actions={
          <>
            <Button href="/affiliates#sponsors" size="sm" variant="outline" external>
              Open Affiliates
            </Button>
            {sponsors.length > 1 ? (
              <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} onClick={() => setArranging(true)}>
                Arrange
              </Button>
            ) : null}
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add a sponsor
            </Button>
          </>
        }
      />
      <Table
        caption="Sponsors"
        hideCaption
        rows={sponsors}
        getRowId={(s) => s.id}
        empty={<EmptyState size="sm" icon={<BadgeDollarSign />} title="No sponsors yet" description="Add one and a Sponsors section appears on the Affiliates page." />}
        columns={[
          {
            key: 'name',
            header: 'Sponsor',
            cell: (s) => (
              <span className="flex min-w-0 items-center gap-2.5">
                {s.logo_url ? (
                  <img src={s.logo_url} alt="" className="size-8 shrink-0 rounded-lg bg-white object-contain ring-1 ring-line" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-tint text-[0.8rem] font-extrabold text-brand" aria-hidden>
                    {s.name.trim()[0]?.toUpperCase()}
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-ink">{s.name}</span>
                  {s.blurb ? <span className="truncate text-[0.8rem] text-muted">{s.blurb}</span> : null}
                </span>
              </span>
            ),
          },
          { key: 'tier', header: 'Tier', hideWhenStacked: true, cell: (s) => SPONSOR_TIER_LABELS[s.tier] },
          { key: 'dates', header: 'Dates', hideWhenStacked: true, cell: (s) => dates(s) || <span className="text-muted">No limit</span> },
          {
            key: 'published',
            header: 'On the site',
            cell: (s) =>
              !s.published ? (
                <Badge size="sm" dot tone="neutral">
                  Hidden
                </Badge>
              ) : sponsorActive(s, today) ? (
                <Badge size="sm" dot tone="success">
                  Shown
                </Badge>
              ) : (
                <Badge size="sm" dot tone="warning">
                  {s.starts_on && s.starts_on > today ? 'Not yet' : 'Ended'}
                </Badge>
              ),
          },
        ]}
        rowActions={(s) => (
          <ActionMenu
            label={`Actions for ${s.name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(s) },
              ...(s.href ? [{ label: 'Open their site', icon: <ExternalLink />, onSelect: () => window.open(s.href!, '_blank', 'noopener') }] : []),
              'separator' as const,
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Remove ${s.name}?`, message: 'They come off the Affiliates page. To keep them for later, hide them instead.', variant: 'error', confirmLabel: 'Remove' }))) return
                  const result = await deleteSponsor(s.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <SponsorDialog key={dialogKey} sponsor={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      {arranging ? (
        <ArrangeDialog
          title="Arrange sponsors"
          description="Within a tier, they show in this order."
          groupLabel="Sponsors"
          groups={[{ slug: 'all', title: 'Sponsors' }]}
          items={sponsors.map((s) => ({ id: s.id, name: s.name, group: 'all', sort: s.sort, badges: s.published ? [] : ['Hidden'] }))}
          save={reorderSponsors}
          onClose={() => setArranging(false)}
        />
      ) : null}
    </>
  )
}
