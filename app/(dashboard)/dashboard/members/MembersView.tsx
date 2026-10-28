'use client'

import { Download, Pencil, Trash2, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FC } from 'react'

import { ActionMenu, Avatar, Badge, Button, Dialog, EmptyState, FilterBar, Table, useNotify, type FilterValues } from '@/components'
import { DatePicker, Field, Input, SegmentedControl, Select, TextArea } from '@/components/Form'
import { removeMembers, saveMember, setMemberStatus } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { STATUSES, YEARS } from '@/lib/dashboard/validate'
import type { MemberRow, MemberStatus } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

const STATUS: Record<MemberStatus, { word: string; tone: 'success' | 'brand' | 'neutral' }> = {
  active: { word: 'Active', tone: 'success' },
  new: { word: 'New', tone: 'brand' },
  inactive: { word: 'Inactive', tone: 'neutral' },
}

/** The selected members as a CSV file, downloaded in the browser */
const downloadCsv = (rows: MemberRow[]) => {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Name', 'Email', 'Major', 'Year', 'Status', 'Joined']
  const lines = [head, ...rows.map((m) => [m.name, m.email, m.major, m.year, STATUS[m.status].word, m.joined_on])].map((r) => r.map(cell).join(','))
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `cseg-members-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}

/** Add or edit one member */
const MemberDialog: FC<{ member: MemberRow | null; open: boolean; onClose: () => void }> = ({ member, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [status, setStatus] = useState<string>(member?.status ?? 'new')
  const formId = member ? `member-${member.id}` : 'member-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={member ? `Edit ${member.name}` : 'Add a member'}
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} loading={pending}>
            {member ? 'Save' : 'Add member'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => saveMember(member?.id ?? null, data), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.name}>
          <Input name="name" defaultValue={member?.name} autoComplete="off" />
        </Field>
        <Field label="Email" error={errors.email} description="Their GSU email, if you have it.">
          <Input name="email" type="email" defaultValue={member?.email ?? ''} autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Major">
            <Input name="major" defaultValue={member?.major ?? ''} />
          </Field>
          <Field label="Year" error={errors.year}>
            <Select name="year" placeholder="Pick one" defaultValue={member?.year ?? null} options={YEARS.map((y) => ({ value: y, label: y }))} />
          </Field>
        </div>
        <Field label="Status" error={errors.status}>
          <SegmentedControl name="status" value={status} onValueChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: STATUS[s].word }))} />
        </Field>
        <Field label="Joined" error={errors.joined_on}>
          <DatePicker name="joined_on" defaultValue={member?.joined_on ?? null} />
        </Field>
        <Field label="Notes" description="Only officers see these.">
          <TextArea name="notes" rows={2} defaultValue={member?.notes ?? ''} />
        </Field>
      </form>
    </Dialog>
  )
}

export const MembersView: FC<{ members: MemberRow[]; startAdding: boolean }> = ({ members, startAdding }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [filters, setFilters] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  // The dialog shows `editing`; "new" is the empty form. The key gives each open a fresh form.
  const [editing, setEditing] = useState<MemberRow | 'new' | null>(startAdding ? 'new' : null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (m: MemberRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(m)
  }

  const majors = useMemo(() => [...new Set(members.map((m) => m.major).filter((m): m is string => !!m))].sort(), [members])
  const q = query.trim().toLowerCase()
  const rows = members.filter(
    (m) =>
      (!filters.status?.length || filters.status.includes(m.status)) &&
      (!filters.year?.length || (m.year && filters.year.includes(m.year))) &&
      (!filters.major?.length || (m.major && filters.major.includes(m.major))) &&
      (!q || m.name.toLowerCase().includes(q) || m.email?.includes(q) || m.major?.toLowerCase().includes(q))
  )

  const bulk = async (ids: string[], status: MemberStatus) => {
    const result = await setMemberStatus(ids, status)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t update', message: result.error })
    toast({ variant: 'success', title: `Marked ${ids.length} ${STATUS[status].word.toLowerCase()}` })
    setSelected([])
    router.refresh()
  }

  const remove = async (ids: string[]) => {
    const names = members.filter((m) => ids.includes(m.id)).map((m) => m.name)
    const ok = await confirm({
      title: ids.length === 1 ? `Remove ${names[0]}?` : `Remove ${ids.length} members?`,
      message: 'Their check-ins stay, without the link to them. This can’t be undone.',
      variant: 'error',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    const result = await removeMembers(ids)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
    toast({ variant: 'success', title: ids.length === 1 ? `Removed ${names[0]}` : `Removed ${ids.length} members` })
    setSelected((s) => s.filter((id) => !ids.includes(id)))
    router.refresh()
  }

  return (
    <>
      <PageTitle
        title="Members"
        description="Everyone in the club. Check-ins at events link to these records."
        actions={
          <Button size="sm" leading={<UserPlus size={15} aria-hidden />} onClick={() => open('new')}>
            Add member
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <FilterBar
          filters={[
            { id: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: STATUS[s].word, count: members.filter((m) => m.status === s).length })) },
            { id: 'year', label: 'Year', options: YEARS.map((y) => ({ value: y, label: y })) },
            ...(majors.length ? [{ id: 'major', label: 'Major', options: majors.map((m) => ({ value: m, label: m })) }] : []),
          ]}
          value={filters}
          onValueChange={setFilters}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search members"
          resultCount={rows.length}
        />
        <Table
          caption="Members"
          hideCaption
          rows={rows}
          getRowId={(m) => m.id}
          getRowLabel={(m) => m.name}
          defaultSort={{ key: 'name', direction: 'ascending' }}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          bulkActions={(ids) => (
            <>
              <Button size="sm" variant="outline" leading={<UserCheck size={15} aria-hidden />} onClick={() => bulk(ids, 'active')}>
                Mark active
              </Button>
              <Button size="sm" variant="outline" leading={<UserMinus size={15} aria-hidden />} onClick={() => bulk(ids, 'inactive')}>
                Mark inactive
              </Button>
              <Button size="sm" variant="outline" leading={<Download size={15} aria-hidden />} onClick={() => downloadCsv(members.filter((m) => ids.includes(m.id)))}>
                Export CSV
              </Button>
              <Button size="sm" variant="danger" leading={<Trash2 size={15} aria-hidden />} onClick={() => remove(ids)}>
                Remove
              </Button>
            </>
          )}
          empty={
            members.length ? (
              <EmptyState
                size="sm"
                icon={<Users />}
                title="No members match"
                actions={
                  <Button size="sm" variant="outline" onClick={() => (setFilters({}), setQuery(''))}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                size="sm"
                icon={<Users />}
                title="No members yet"
                description="Add the people in the club to track who comes to events."
                actions={
                  <Button size="sm" onClick={() => open('new')}>
                    Add the first member
                  </Button>
                }
              />
            )
          }
          columns={[
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              cell: (m) => (
                <span className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" decorative />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{m.name}</span>
                    {m.email ? <span className="truncate text-[0.8rem] font-normal text-muted">{m.email}</span> : null}
                  </span>
                </span>
              ),
            },
            { key: 'major', header: 'Major', sortable: true },
            { key: 'year', header: 'Year', sortable: true, sortValue: (m) => (m.year ? YEARS.indexOf(m.year) : null), hideWhenStacked: true },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              cell: (m) => (
                <Badge size="sm" dot tone={STATUS[m.status].tone}>
                  {STATUS[m.status].word}
                </Badge>
              ),
            },
            { key: 'joined_on', header: 'Joined', sortable: true, cell: (m) => formatDate(m.joined_on) },
          ]}
          rowActions={(m) => (
            <ActionMenu
              label={`Actions for ${m.name}`}
              items={[
                { label: 'Edit', icon: <Pencil />, onSelect: () => open(m) },
                {
                  label: 'Change status',
                  items: STATUSES.filter((s) => s !== m.status).map((s) => ({ label: `Mark ${STATUS[s].word.toLowerCase()}`, onSelect: () => bulk([m.id], s) })),
                },
                'separator',
                { label: 'Remove', icon: <Trash2 />, danger: true, onSelect: () => remove([m.id]) },
              ]}
            />
          )}
        />
      </div>
      <MemberDialog key={dialogKey} member={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
