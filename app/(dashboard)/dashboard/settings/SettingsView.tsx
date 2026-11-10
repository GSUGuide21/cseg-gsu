'use client'

import { Building2, CalendarRange, Check, DoorOpen, Instagram, Link2, Lock, Mail, Megaphone, MessageSquare, Pencil, Plus, Search, Settings, ShieldCheck, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ChangeEvent, type FC, type ReactNode } from 'react'

import { Alert, Avatar, Badge, Button, Dialog, useNotify } from '@/components'
import { DatePicker, DateRangePicker, Field, Input, SegmentedControl, Switch, TextArea } from '@/components/Form'
import { deleteTerm, removeOfficer, saveOfficer, saveSettings, saveTerm, updateOfficer } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { currentTerm } from '@/lib/dashboard/terms'
import { SETTINGS_LIMITS, type FieldErrors, type SettingsSection } from '@/lib/dashboard/validate'
import { atlantaToday, shortDate } from '@/lib/eateries'
import type { ClubSettingsRow, OfficerRole, OfficerRow, TermRow } from '@/lib/supabase/types'

import { ImageField } from '../ImageField'
import { PageTitle, Panel, useAction } from '../ui'

const nameOf = (o: OfficerRow) => o.name ?? o.email.split('@')[0]

const RoleBadge: FC<{ role: OfficerRole }> = ({ role }) =>
  role === 'admin' ? (
    <Badge size="sm" tone="brand" icon={<ShieldCheck aria-hidden />}>
      Admin
    </Badge>
  ) : role === 'editor' ? (
    <Badge size="sm" appearance="outline">
      Editor
    </Badge>
  ) : (
    <Badge size="sm">Officer</Badge>
  )

/** What each role can manage: an editor the site only, an officer people too, an admin everything */
const ACCESS: { label: string; roles: OfficerRole[] }[] = [
  { label: 'The site: posts, pages, and the campus guide', roles: ['editor', 'officer', 'admin'] },
  { label: 'Members, messages, dues, and check-ins', roles: ['officer', 'admin'] },
  { label: 'Officers and club settings', roles: ['admin'] },
]

/** Who's signed in, and what their role lets them do */
const YourAccess: FC<{ officer?: OfficerRow; email: string; isAdmin: boolean }> = ({ officer, email, isAdmin }) => {
  const role: OfficerRole = isAdmin ? 'admin' : (officer?.role ?? 'officer')
  return (
  <Panel className="gap-4 bg-linear-to-br from-brand-tint to-surface sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3.5">
      <Avatar name={officer ? nameOf(officer) : email} size="lg" decorative />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 flex flex-wrap items-center gap-2 font-bold text-ink">
          {officer ? nameOf(officer) : email}
          <RoleBadge role={role} />
        </p>
        <p className="m-0 truncate text-[0.85rem] text-muted">{[officer?.title, email].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
    <ul aria-label="What you can manage" className="m-0 flex list-none flex-col gap-1 p-0 text-[0.85rem]">
      {ACCESS.map(({ label, roles }) => {
        const allowed = roles.includes(role)
        return (
          <li key={label} className={allowed ? 'flex items-center gap-2 text-ink' : 'flex items-center gap-2 text-muted'}>
            {allowed ? <Check size={15} aria-hidden className="shrink-0 text-success" /> : <Lock size={15} aria-hidden className="shrink-0" />}
            {label}
            {allowed ? null : <span className="sr-only">(not with your role)</span>}
          </li>
        )
      })}
    </ul>
  </Panel>
  )
}

const ClubForm: FC<{ settings: ClubSettingsRow | null; isAdmin: boolean }> = ({ settings, isAdmin }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const saved = {
    tagline: settings?.tagline ?? '',
    meeting_info: settings?.meeting_info ?? '',
    contact_email: settings?.contact_email ?? '',
    instagram_url: settings?.instagram_url ?? '',
  }
  const [draft, setDraft] = useState(saved)
  const changed = (Object.keys(saved) as (keyof typeof saved)[]).some((k) => draft[k] !== saved[k])
  const field = (name: keyof typeof saved) => ({
    name,
    value: draft[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [name]: e.target.value })),
  })
  const lastChanged = settings?.updated_by ? `Last changed by ${settings.updated_by.split('@')[0]}, ${formatDate(settings.updated_at)}` : null
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveSettings(new FormData(e.currentTarget)), () => router.refresh())
      }}
    >
      <fieldset disabled={!isAdmin} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field label="Tagline" description="A line about the club, in the site’s footer.">
          <Input {...field('tagline')} />
        </Field>
        <Field label="When and where we meet" description="On the Contact and Join pages.">
          <TextArea {...field('meeting_info')} rows={2} placeholder="Thursdays at 5 p.m., Student Center West 259" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" description="In the footer and on Contact." error={errors.contact_email}>
            <Input {...field('contact_email')} type="email" leading={<Mail size={16} aria-hidden />} />
          </Field>
          <Field label="Instagram" description="Everywhere the site links to it." error={errors.instagram_url}>
            <Input {...field('instagram_url')} type="url" leading={<Instagram size={16} aria-hidden />} placeholder="https://instagram.com/cseg_gsu" />
          </Field>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {isAdmin ? (
          <>
            <Button type="submit" size="sm" loading={pending} disabled={!changed}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!changed} onClick={() => setDraft(saved)}>
              Undo changes
            </Button>
          </>
        ) : (
          <span className="text-[0.85rem] text-muted">Only admins can change these.</span>
        )}
        <span className="ml-auto text-[0.8rem] text-muted">{changed ? 'Unsaved changes' : lastChanged}</span>
      </div>
    </form>
  )
}

/** Adds an officer, or edits one. Your own role stays put, like removing yourself. */
const OfficerDialog: FC<{ officer: OfficerRow | null; isMe: boolean; open: boolean; onClose: () => void }> = ({ officer, isMe, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [role, setRole] = useState<string>(officer?.role ?? 'officer')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={officer ? `Edit ${nameOf(officer)}` : 'Give someone access'}
      description={officer ? undefined : 'They sign in with this Google account.'}
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {officer ? (
            <Button size="sm" type="submit" form="officer-form" loading={pending}>
              Save
            </Button>
          ) : (
            <Button size="sm" type="submit" form="officer-form" loading={pending} leading={<UserPlus size={15} aria-hidden />}>
              Give access
            </Button>
          )}
        </>
      }
    >
      <form
        id="officer-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => (officer ? updateOfficer(officer.email, data) : saveOfficer(data)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field
          label="Google email"
          required={!officer}
          error={errors.email}
          description={isMe ? 'It’s how you sign in.' : officer ? 'It’s how they sign in. To use a different one, remove them and give that one access.' : undefined}
          className="sm:col-span-2"
        >
          <Input
            name="email"
            type="email"
            autoComplete="off"
            placeholder="name@student.gsu.edu"
            defaultValue={officer?.email}
            readOnly={!!officer}
            className={officer ? 'bg-fill' : undefined}
            inputClassName={officer ? 'cursor-default text-muted' : undefined}
          />
        </Field>
        <Field label="Name">
          <Input name="name" autoComplete="off" defaultValue={officer?.name ?? ''} />
        </Field>
        <Field label="Title">
          <Input name="title" autoComplete="off" placeholder="Treasurer" defaultValue={officer?.title ?? ''} />
        </Field>
        {isMe && officer ? (
          <div className="flex flex-col items-start gap-1.5 sm:col-span-2">
            <span className="text-[0.9rem] font-semibold text-ink">Role</span>
            <input type="hidden" name="role" value={officer.role} />
            <RoleBadge role={officer.role} />
            <p className="m-0 text-[0.85rem] text-muted">You can’t change your own role; ask another admin.</p>
          </div>
        ) : (
          <Field label="Role" error={errors.role} description="Editors write the site and never see members or messages. Admins also manage officers and club settings." className="sm:col-span-2">
            <SegmentedControl
              name="role"
              value={role}
              onValueChange={setRole}
              options={[
                { value: 'editor', label: 'Editor' },
                { value: 'officer', label: 'Officer' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </Field>
        )}
      </form>
    </Dialog>
  )
}

/**
 * One part of Settings as its own form: saving it leaves the rest alone. Everyone on the
 * dashboard can read it; only admins can change it.
 */
const SectionForm: FC<{ section: SettingsSection; isAdmin: boolean; children: (errors: FieldErrors) => ReactNode }> = ({ section, isAdmin, children }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveSettings(new FormData(e.currentTarget)), () => router.refresh())
      }}
    >
      <input type="hidden" name="section" value={section} />
      <fieldset disabled={!isAdmin} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        {children(errors)}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {isAdmin ? (
          <Button type="submit" size="sm" loading={pending}>
            Save
          </Button>
        ) : (
          <span className="text-[0.85rem] text-muted">Only admins can change these.</span>
        )}
      </div>
    </form>
  )
}

const LINKS = [
  { name: 'pin_url', label: 'PIN', placeholder: 'https://pin.gsu.edu/organization/cseg' },
  { name: 'x_url', label: 'X (Twitter)', placeholder: 'https://x.com/cseg_gsu' },
  { name: 'groupme_url', label: 'GroupMe', placeholder: 'https://groupme.com/join_group/…' },
  { name: 'discord_url', label: 'Discord', placeholder: 'https://discord.gg/…' },
  { name: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/…' },
  { name: 'youtube_url', label: 'YouTube', placeholder: 'https://www.youtube.com/@…' },
  { name: 'linktree_url', label: 'Linktree', placeholder: 'https://linktr.ee/…' },
] as const

/** The notice's look is picked, so it's kept here; the rest of its form is as typed */
const BannerFields: FC<{ settings: ClubSettingsRow | null; errors: FieldErrors }> = ({ settings, errors }) => {
  const [tone, setTone] = useState<string>(settings?.banner_tone ?? 'info')
  return (
    <>
      <Field label="What it says" error={errors.banner_message} description="One line, across the top of every page. Leave it empty for no notice.">
        <Input name="banner_message" defaultValue={settings?.banner_message ?? ''} maxLength={SETTINGS_LIMITS.banner} placeholder="Tonight’s meeting moved to Student Center West 260" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where it links" error={errors.banner_href} description="A page here (/events) or a full link. Optional.">
          <Input name="banner_href" defaultValue={settings?.banner_href ?? ''} autoComplete="off" />
        </Field>
        <Field label="Last day it shows" error={errors.banner_until} description="Empty keeps it up until you clear it.">
          <DatePicker name="banner_until" size="sm" defaultValue={settings?.banner_until ?? null} min={atlantaToday()} />
        </Field>
      </div>
      <Field label="How it looks" error={errors.banner_tone}>
        <SegmentedControl
          name="banner_tone"
          value={tone}
          onValueChange={setTone}
          options={[
            { value: 'info', label: 'News' },
            { value: 'success', label: 'Good news' },
            { value: 'warning', label: 'Heads-up' },
          ]}
        />
      </Field>
    </>
  )
}

/** Adds a term, or edits one: its name and its first and last days */
const TermDialog: FC<{ term: TermRow | null; open: boolean; onClose: () => void }> = ({ term, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = term ? `term-${term.id}` : 'term-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={term ? `Edit ${term.name}` : 'Add a term'}
      description="Dues are collected by term, and no two terms share a day."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
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
          run(() => saveTerm(term?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.name}>
          <Input name="name" defaultValue={term?.name} autoComplete="off" placeholder="Fall 2026" />
        </Field>
        <Field label="Runs" required error={errors.dates} description="Its first and last days, both included.">
          <DateRangePicker name="dates" size="sm" defaultValue={term ? { start: term.starts_on, end: term.ends_on } : null} />
        </Field>
      </form>
    </Dialog>
  )
}

/** The terms, newest first, with the one today falls in marked */
const TermsPanel: FC<{ terms: TermRow[]; isAdmin: boolean }> = ({ terms, isAdmin }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<TermRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (t: TermRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(t)
  }
  const current = currentTerm(terms, atlantaToday())
  return (
    <Panel
      title="Terms"
      icon={<CalendarRange />}
      action={
        isAdmin ? (
          <Button size="sm" variant="outline" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
            Add a term
          </Button>
        ) : null
      }
    >
      <p className="m-0 text-[0.85rem] text-muted">Semesters, by date. Dues are tracked for each one.</p>
      {terms.length ? (
        <ul aria-label="Terms" className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {terms.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3 last:pb-0">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-ink">
                  {t.name}
                  {t.id === current?.id ? (
                    <Badge size="sm" dot tone="success">
                      Current
                    </Badge>
                  ) : null}
                </span>
                <span className="text-[0.8rem] text-muted">
                  {shortDate(t.starts_on)} to {shortDate(t.ends_on)}, {t.ends_on.slice(0, 4)}
                </span>
              </span>
              {isAdmin ? (
                <>
                  <Button size="sm" variant="ghost" iconOnly aria-label={`Edit ${t.name}`} onClick={() => open(t)}>
                    <Pencil size={15} aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label={`Remove ${t.name}`}
                    className="hover:text-danger"
                    onClick={async () => {
                      if (!(await confirm({ title: `Remove ${t.name}?`, message: 'A term with dues recorded can’t be removed until those payments are.', variant: 'error', confirmLabel: 'Remove' }))) return
                      const result = await deleteTerm(t.id)
                      if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                      router.refresh()
                    }}
                  >
                    <Trash2 size={15} aria-hidden />
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[0.9rem] text-muted">No terms yet. {isAdmin ? 'Add this semester to start tracking dues.' : 'An admin adds them here.'}</p>
      )}
      <TermDialog key={dialogKey} term={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Panel>
  )
}

export const SettingsView: FC<{ settings: ClubSettingsRow | null; officers: OfficerRow[]; terms?: TermRow[]; me: string; isAdmin: boolean }> = ({ settings, officers, terms = [], me, isAdmin }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<OfficerRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (officer: OfficerRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(officer)
  }
  // Admins first, then by name
  const roster = [...officers].sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin') || nameOf(a).localeCompare(nameOf(b)))
  return (
    <>
      <PageTitle icon={<Settings />} title="Settings" description="Who can use this dashboard, the club’s details, and how the site and check-ins behave." />
      <div className="flex flex-col gap-6">
        <YourAccess officer={officers.find((o) => o.email === me)} email={me} isAdmin={isAdmin} />
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Panel
            title={
              <>
                Officers <Badge size="sm">{officers.length}</Badge>
              </>
            }
            icon={<Users />}
            action={
              isAdmin ? (
                <Button size="sm" leading={<UserPlus size={15} aria-hidden />} onClick={() => open('new')}>
                  Give access
                </Button>
              ) : null
            }
          >
            <p className="m-0 text-[0.85rem] text-muted">Anyone here can sign in with Google.</p>
            {isAdmin ? null : <Alert tone="info">Only admins can add or remove officers.</Alert>}
            <ul aria-label="Officers" className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {roster.map((o) => (
                <li key={o.email} className="flex items-center gap-3 py-3 last:pb-0">
                  <Avatar name={nameOf(o)} size="sm" decorative />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="min-w-0 truncate font-semibold text-ink">
                        {nameOf(o)}
                        {o.email === me ? <span className="font-normal text-muted"> (you)</span> : null}
                      </span>
                      <RoleBadge role={o.role} />
                    </span>
                    <span className="truncate text-[0.8rem] text-muted">{[o.title, o.email].filter(Boolean).join(' · ')}</span>
                  </span>
                  {isAdmin ? (
                    <Button size="sm" variant="ghost" iconOnly aria-label={`Edit ${nameOf(o)}`} onClick={() => open(o)}>
                      <Pencil size={15} aria-hidden />
                    </Button>
                  ) : null}
                  {isAdmin && o.email !== me ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={`Remove ${nameOf(o)}`}
                      className="hover:text-danger"
                      onClick={async () => {
                        if (!(await confirm({ title: `Remove ${nameOf(o)}?`, message: 'They won’t be able to sign in to the dashboard anymore.', variant: 'error', confirmLabel: 'Remove' }))) return
                        const result = await removeOfficer(o.email)
                        if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                        router.refresh()
                      }}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Club details" icon={<Building2 />}>
            <p className="m-0 text-[0.85rem] text-muted">Saving puts these on the site right away. Leave one blank to keep the site’s own.</p>
            <ClubForm key={settings?.updated_at} settings={settings} isAdmin={isAdmin} />
          </Panel>
          <Panel title="Find us online" icon={<Link2 />}>
            <p className="m-0 text-[0.85rem] text-muted">Everywhere the site lists the club’s links. One left blank keeps the site’s own, or stays off the site if it has none.</p>
            <SectionForm key={settings?.updated_at} section="links" isAdmin={isAdmin}>
              {(errors) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  {LINKS.map(({ name, label, placeholder }) => (
                    <Field key={name} label={label} error={errors[name]}>
                      <Input name={name} type="url" defaultValue={settings?.[name] ?? ''} placeholder={placeholder} autoComplete="off" />
                    </Field>
                  ))}
                </div>
              )}
            </SectionForm>
          </Panel>
          <Panel title="Notice across the site" icon={<Megaphone />}>
            <SectionForm key={settings?.updated_at} section="banner" isAdmin={isAdmin}>
              {(errors) => <BannerFields settings={settings} errors={errors} />}
            </SectionForm>
          </Panel>
          <Panel title="Membership and dues" icon={<Wallet />}>
            <SectionForm key={settings?.updated_at} section="membership" isAdmin={isAdmin}>
              {(errors) => (
                <>
                  <Switch name="accepting_members" defaultChecked={settings?.accepting_members ?? true} description="Off: the Join page says membership is closed, and takes no requests.">
                    Taking new members
                  </Switch>
                  <Field label="Dues for a term" error={errors.dues_amount} description="In dollars. Shown on the Join page, and filled in when you record a payment.">
                    <Input name="dues_amount" inputMode="decimal" defaultValue={settings?.dues_amount ?? ''} leading={<span aria-hidden>$</span>} placeholder="15" autoComplete="off" />
                  </Field>
                </>
              )}
            </SectionForm>
          </Panel>
          <TermsPanel terms={terms} isAdmin={isAdmin} />
          <Panel title="Contact form" icon={<MessageSquare />}>
            <SectionForm key={settings?.updated_at} section="contact" isAdmin={isAdmin}>
              {(errors) => (
                <>
                  <Switch name="contact_form_open" defaultChecked={settings?.contact_form_open ?? true} description="Off: the Contact page shows the club’s email and links only.">
                    Take messages from the Contact page
                  </Switch>
                  <Field label="What it says after someone writes in" error={errors.contact_reply} description="Empty keeps the site’s own: an officer will reply, usually within a few days.">
                    <TextArea name="contact_reply" rows={2} maxLength={SETTINGS_LIMITS.reply} defaultValue={settings?.contact_reply ?? ''} />
                  </Field>
                </>
              )}
            </SectionForm>
          </Panel>
          <Panel title="Check-in at events" icon={<DoorOpen />}>
            <SectionForm key={settings?.updated_at} section="checkin" isAdmin={isAdmin}>
              {() => (
                <>
                  <Switch name="walkins_allowed" defaultChecked={settings?.walkins_allowed ?? true} description="Off: only people on the roster can be checked in.">
                    Let guests check in
                  </Switch>
                  <Switch name="walkins_become_members" defaultChecked={settings?.walkins_become_members ?? false} description="A guest who gives an email is added to Members as new, and the check-in counts for them.">
                    Add guests to the roster
                  </Switch>
                </>
              )}
            </SectionForm>
          </Panel>
          <Panel title="Search and link previews" icon={<Search />}>
            <p className="m-0 text-[0.85rem] text-muted">What a page falls back to when it has none of its own.</p>
            <SectionForm key={settings?.updated_at} section="sharing" isAdmin={isAdmin}>
              {(errors) => (
                <>
                  <Field label="About the site" error={errors.site_description} description="A sentence or two, for search results.">
                    <TextArea name="site_description" rows={2} maxLength={SETTINGS_LIMITS.description} defaultValue={settings?.site_description ?? ''} />
                  </Field>
                  <ImageField name="share_image_url" label="Preview image" defaultValue={settings?.share_image_url} error={errors.share_image_url} description="Shown when a link to the site is shared. Wide images work best." />
                </>
              )}
            </SectionForm>
          </Panel>
        </div>
      </div>
      <OfficerDialog
        key={dialogKey}
        officer={editing === 'new' ? null : editing}
        isMe={editing !== 'new' && editing?.email === me}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
