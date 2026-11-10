'use client'

import { Download, Pencil, Trash2, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Avatar, Badge, Button, Dialog, EmptyState, Stat, Table, useNotify } from '@/components'
import { DatePicker, Field, Input, SegmentedControl, Select } from '@/components/Form'
import { formatDollars } from '@/lib/clubDetails'
import { downloadCsv } from '@/lib/csv'
import { deleteDues, saveDues } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { currentTerm, DUES_METHOD_LABELS, duesSummary } from '@/lib/dashboard/terms'
import { DUES_METHODS } from '@/lib/dashboard/validate'
import { atlantaToday } from '@/lib/eateries'
import type { DuesPaymentRow, MemberRow, TermRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

type DuesMember = Pick<MemberRow, 'id' | 'name' | 'email' | 'status'>
type Row = DuesMember & { payment: DuesPaymentRow | null }

/** Records a member's dues for the term, or changes what was recorded */
const DuesDialog: FC<{ row: Row | null; term: TermRow; duesAmount: number | null; onClose: () => void }> = ({ row, term, duesAmount, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [method, setMethod] = useState<string | null>(row?.payment?.method ?? 'cash')
  const payment = row?.payment ?? null
  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      closeOnBackdrop={false}
      title={row ? (payment ? `${row.name}’s dues` : `Record ${row.name}’s dues`) : ''}
      description={term.name}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form="dues-form" loading={pending}>
            {payment ? 'Save' : 'Record'}
          </Button>
        </>
      }
    >
      {row ? (
        <form
          id="dues-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            data.set('member_id', row.id)
            data.set('term_id', term.id)
            run(() => saveDues(payment?.id ?? null, data), () => {
              onClose()
              router.refresh()
            })
          }}
        >
          {errors.member_id || errors.term_id ? (
            <p role="alert" className="m-0 text-[0.9rem] text-danger">
              {errors.member_id ?? errors.term_id}
            </p>
          ) : null}
          <Field label="How they paid" error={errors.method} description="Waived counts as paid, at nothing.">
            <Select name="method" value={method} onValueChange={setMethod} options={DUES_METHODS.map((m) => ({ value: m, label: DUES_METHOD_LABELS[m] }))} />
          </Field>
          {method === 'waived' ? null : (
            <Field label="Amount" required error={errors.amount}>
              <Input name="amount" inputMode="decimal" autoComplete="off" leading={<span aria-hidden>$</span>} defaultValue={payment ? payment.amount : (duesAmount ?? '')} />
            </Field>
          )}
          <Field label={method === 'waived' ? 'Waived on' : 'Paid on'} error={errors.paid_on}>
            <DatePicker name="paid_on" size="sm" defaultValue={payment?.paid_on ?? atlantaToday()} max={atlantaToday()} />
          </Field>
          <Field label="Note" description="Only officers see it.">
            <Input name="note" autoComplete="off" defaultValue={payment?.note ?? ''} />
          </Field>
        </form>
      ) : null}
    </Dialog>
  )
}

/**
 * Who's paid dues, a term at a time. Everyone who isn't inactive is expected to; someone
 * inactive who paid anyway is listed too.
 */
export const DuesView: FC<{ members: DuesMember[]; terms: TermRow[]; payments: DuesPaymentRow[]; duesAmount: number | null; isAdmin: boolean }> = ({ members, terms, payments, duesAmount, isAdmin }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [termId, setTermId] = useState<string | null>(() => currentTerm(terms, atlantaToday())?.id ?? null)
  const [show, setShow] = useState('all')
  const [editing, setEditing] = useState<Row | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const term = terms.find((t) => t.id === termId) ?? null

  const title = <PageTitle icon={<Wallet />} title="Dues" description="Who’s paid, a term at a time. Record a payment when someone hands it over." />
  if (!term)
    return (
      <>
        {title}
        <EmptyState
          icon={<Wallet />}
          title="Add a term first"
          description={isAdmin ? 'Dues are tracked by term. Add this semester under Settings, and it shows up here.' : 'Dues are tracked by term. Ask an admin to add this semester under Settings.'}
          actions={
            isAdmin ? (
              <Button size="sm" href="/dashboard/settings">
                Open Settings
              </Button>
            ) : null
          }
        />
      </>
    )

  const inTerm = payments.filter((p) => p.term_id === term.id)
  const byMember = new Map(inTerm.map((p) => [p.member_id, p]))
  const everyone: Row[] = members.filter((m) => m.status !== 'inactive' || byMember.has(m.id)).map((m) => ({ ...m, payment: byMember.get(m.id) ?? null }))
  const rows = everyone.filter((r) => show === 'all' || (show === 'paid') === (r.payment !== null))
  const summary = duesSummary(
    members.filter((m) => m.status !== 'inactive').map((m) => m.id),
    inTerm
  )

  const open = (row: Row) => {
    setDialogKey((k) => k + 1)
    setEditing(row)
  }
  const remove = async (row: Row) => {
    if (!row.payment) return
    if (!(await confirm({ title: `Remove ${row.name}’s payment?`, message: `They’ll show as unpaid for ${term.name}.`, variant: 'error', confirmLabel: 'Remove' }))) return
    const result = await deleteDues(row.payment.id)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
    router.refresh()
  }

  return (
    <>
      <PageTitle
        icon={<Wallet />}
        title="Dues"
        description="Who’s paid, a term at a time. Record a payment when someone hands it over."
        actions={
          <Button
            size="sm"
            variant="outline"
            leading={<Download size={15} aria-hidden />}
            disabled={!everyone.length}
            onClick={() =>
              downloadCsv(
                `cseg-dues-${term.name.toLowerCase().replace(/\W+/g, '-')}`,
                ['Name', 'Email', 'Paid', 'Amount', 'Paid on', 'How', 'Note'],
                everyone.map((r) => [r.name, r.email, r.payment ? 'Yes' : 'No', r.payment?.amount, r.payment?.paid_on, r.payment ? DUES_METHOD_LABELS[r.payment.method] : null, r.payment?.note])
              )
            }
          >
            Export CSV
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Paid" value={`${summary.paid} of ${summary.expected}`} description={summary.waived ? `${summary.waived} waived` : term.name} />
          <Stat label="Still to pay" value={summary.expected - summary.paid} description={duesAmount ? `${formatDollars(duesAmount)} each` : undefined} />
          <Stat label="Collected" value={formatDollars(summary.collected)} description={term.name} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label="Term" className="w-full max-w-64">
            <Select size="sm" value={termId} onValueChange={(v) => setTermId(v ?? term.id)} options={terms.map((t) => ({ value: t.id, label: t.name }))} />
          </Field>
          <SegmentedControl
            aria-label="Show"
            size="sm"
            value={show}
            onValueChange={setShow}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'paid', label: 'Paid' },
              { value: 'unpaid', label: 'Unpaid' },
            ]}
          />
        </div>
        <Table
          caption={`Dues for ${term.name}`}
          hideCaption
          rows={rows}
          getRowId={(r) => r.id}
          getRowLabel={(r) => r.name}
          defaultSort={{ key: 'name', direction: 'ascending' }}
          empty={
            <EmptyState
              size="sm"
              icon={<Wallet />}
              title={everyone.length ? (show === 'paid' ? 'Nobody has paid yet' : 'Everyone has paid') : 'No members yet'}
              description={everyone.length ? undefined : 'Add the people in the club under Members, and they show up here.'}
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Member',
              sortable: true,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <Avatar name={r.name} size="sm" decorative />
                  <span className="flex min-w-0 flex-col">
                    <Link href={`/dashboard/members/${r.id}`} className="truncate text-ink no-underline hover:text-brand hover:underline">
                      {r.name}
                    </Link>
                    {r.email ? <span className="truncate text-[0.8rem] font-normal text-muted">{r.email}</span> : null}
                  </span>
                </span>
              ),
            },
            {
              key: 'paid',
              header: 'Dues',
              sortable: true,
              sortValue: (r) => (r.payment ? 1 : 0),
              cell: (r) =>
                r.payment ? (
                  <Badge size="sm" dot tone="success">
                    {r.payment.method === 'waived' ? 'Waived' : 'Paid'}
                  </Badge>
                ) : (
                  <Badge size="sm" dot tone="warning">
                    Unpaid
                  </Badge>
                ),
            },
            { key: 'amount', header: 'Amount', sortable: true, sortValue: (r) => r.payment?.amount ?? null, hideWhenStacked: true, cell: (r) => (r.payment ? formatDollars(Number(r.payment.amount)) : '') },
            { key: 'paid_on', header: 'When', sortable: true, sortValue: (r) => r.payment?.paid_on ?? null, hideWhenStacked: true, cell: (r) => (r.payment ? formatDate(r.payment.paid_on) : '') },
            { key: 'method', header: 'How', hideWhenStacked: true, cell: (r) => (r.payment ? DUES_METHOD_LABELS[r.payment.method] : '') },
          ]}
          rowActions={(r) =>
            r.payment ? (
              <ActionMenu
                label={`Actions for ${r.name}`}
                items={[
                  { label: 'Edit payment', icon: <Pencil />, onSelect: () => open(r) },
                  'separator',
                  { label: 'Remove payment', icon: <Trash2 />, danger: true, onSelect: () => remove(r) },
                ]}
              />
            ) : (
              <Button size="sm" variant="outline" aria-label={`Record ${r.name}’s dues`} onClick={() => open(r)}>
                Record
              </Button>
            )
          }
        />
      </div>
      <DuesDialog key={dialogKey} row={editing} term={term} duesAmount={duesAmount} onClose={() => setEditing(null)} />
    </>
  )
}
