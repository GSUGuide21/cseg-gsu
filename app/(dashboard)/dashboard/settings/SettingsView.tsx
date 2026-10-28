'use client'

import { ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { Alert, Avatar, Badge, Button, Table, useNotify } from '@/components'
import { Field, Input, SegmentedControl, TextArea } from '@/components/Form'
import { removeOfficer, saveOfficer, saveSettings } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import type { ClubSettingsRow, OfficerRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

const Section: FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-[1rem] font-bold text-ink">{title}</h2>
      <p className="m-0 text-[0.85rem] text-muted">{description}</p>
    </div>
    <div className="flex min-w-0 flex-col gap-4">{children}</div>
  </section>
)

const ClubForm: FC<{ settings: ClubSettingsRow | null; isAdmin: boolean }> = ({ settings, isAdmin }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveSettings(new FormData(e.currentTarget)), () => router.refresh())
      }}
    >
      <fieldset disabled={!isAdmin} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field label="Tagline" description="A line about the club.">
          <Input name="tagline" defaultValue={settings?.tagline ?? ''} />
        </Field>
        <Field label="When and where we meet">
          <TextArea name="meeting_info" rows={2} defaultValue={settings?.meeting_info ?? ''} placeholder="Thursdays at 5 p.m., Student Center West 259" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" error={errors.contact_email}>
            <Input name="contact_email" type="email" defaultValue={settings?.contact_email ?? ''} />
          </Field>
          <Field label="Instagram" error={errors.instagram_url}>
            <Input name="instagram_url" type="url" defaultValue={settings?.instagram_url ?? ''} placeholder="https://instagram.com/cseg_gsu" />
          </Field>
        </div>
      </fieldset>
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" loading={pending}>
            Save
          </Button>
          {settings?.updated_by ? (
            <span className="text-[0.8rem] text-muted">
              Last changed by {settings.updated_by.split('@')[0]}, {formatDate(settings.updated_at)}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-[0.85rem] text-muted">Only admins can change these.</p>
      )}
    </form>
  )
}

const AddOfficer: FC = () => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [role, setRole] = useState('officer')
  const [formKey, setFormKey] = useState(0)
  return (
    <form
      key={formKey}
      className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveOfficer(new FormData(e.currentTarget)), () => {
          setFormKey((k) => k + 1)
          router.refresh()
        })
      }}
    >
      <Field label="Google email" required error={errors.email} className="sm:col-span-2">
        <Input name="email" type="email" autoComplete="off" placeholder="name@student.gsu.edu" />
      </Field>
      <Field label="Name">
        <Input name="name" autoComplete="off" />
      </Field>
      <Field label="Title">
        <Input name="title" autoComplete="off" placeholder="Treasurer" />
      </Field>
      <Field label="Role" description="Admins also manage officers and club settings." className="sm:col-span-2">
        <SegmentedControl
          name="role"
          value={role}
          onValueChange={setRole}
          options={[
            { value: 'officer', label: 'Officer' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" loading={pending} leading={<UserPlus size={15} aria-hidden />}>
          Give access
        </Button>
      </div>
    </form>
  )
}

export const SettingsView: FC<{ settings: ClubSettingsRow | null; officers: OfficerRow[]; me: string; isAdmin: boolean }> = ({ settings, officers, me, isAdmin }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  return (
    <>
      <PageTitle title="Settings" description="The club’s details, and who can use this dashboard." />
      <Section title="Club" description="Shown around the site.">
        <ClubForm settings={settings} isAdmin={isAdmin} />
      </Section>
      <Section title="Officers" description="Anyone here can sign in with Google. Officers manage members, events, and the site; admins also manage this list.">
        {isAdmin ? null : <Alert tone="info">Only admins can add or remove officers.</Alert>}
        <Table
          caption="Officers"
          hideCaption
          rows={officers}
          getRowId={(o) => o.email}
          density="compact"
          stackOnNarrow
          columns={[
            {
              key: 'email',
              header: 'Officer',
              cell: (o) => (
                <span className="flex items-center gap-3">
                  <Avatar name={o.name ?? o.email} size="sm" decorative />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {o.name ?? o.email.split('@')[0]}
                      {o.email === me ? <span className="font-normal text-muted"> (you)</span> : null}
                    </span>
                    <span className="truncate text-[0.8rem] font-normal text-muted">{o.email}</span>
                  </span>
                </span>
              ),
            },
            { key: 'title', header: 'Title' },
            {
              key: 'role',
              header: 'Role',
              cell: (o) =>
                o.role === 'admin' ? (
                  <Badge size="sm" tone="brand" icon={<ShieldCheck aria-hidden />}>
                    Admin
                  </Badge>
                ) : (
                  <Badge size="sm">Officer</Badge>
                ),
            },
          ]}
          rowActions={
            isAdmin
              ? (o) =>
                  o.email === me ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={`Remove ${o.name ?? o.email}`}
                      onClick={async () => {
                        if (!(await confirm({ title: `Remove ${o.name ?? o.email}?`, message: 'They won’t be able to sign in to the dashboard anymore.', variant: 'error', confirmLabel: 'Remove' }))) return
                        const result = await removeOfficer(o.email)
                        if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                        router.refresh()
                      }}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  )
              : undefined
          }
        />
        {isAdmin ? <AddOfficer /> : null}
      </Section>
    </>
  )
}
