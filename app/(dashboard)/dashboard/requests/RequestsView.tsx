'use client'

import { Check, RotateCcw, Trash2, UserPlus, UserRound, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { SegmentedControl } from '@/components/Form'
import { approveJoinRequest, deleteJoinRequests, setJoinRequestStatus } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import type { JoinRequestRow, JoinRequestStatus } from '@/lib/supabase/types'

import { PageTitle } from '../ui'

const STATUS: Record<JoinRequestStatus, { word: string; tone: 'brand' | 'success' | 'neutral' }> = {
  pending: { word: 'Waiting', tone: 'brand' },
  approved: { word: 'Approved', tone: 'success' },
  declined: { word: 'Declined', tone: 'neutral' },
}

const RequestDialog: FC<{ request: JoinRequestRow | null; onClose: () => void; onApprove: (r: JoinRequestRow) => void; onDecline: (r: JoinRequestRow) => void }> = ({ request, onClose, onApprove, onDecline }) => (
  <Dialog
    open={request !== null}
    onClose={onClose}
    title={request?.name ?? ''}
    description={request ? `${request.email}, ${formatDate(request.created_at, true)}` : undefined}
    footer={
      request?.status === 'pending' ? (
        <>
          <Button size="sm" variant="outline" leading={<X size={15} aria-hidden />} onClick={() => onDecline(request)}>
            Decline
          </Button>
          <Button size="sm" leading={<UserPlus size={15} aria-hidden />} onClick={() => onApprove(request)}>
            Add to Members
          </Button>
        </>
      ) : null
    }
  >
    {request ? (
      <div className="flex flex-col gap-3 text-[0.95rem] text-ink">
        <p className="m-0 text-muted">{[request.major, request.year].filter(Boolean).join(' · ') || 'No major or year given.'}</p>
        {request.message ? <p className="m-0 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{request.message}</p> : null}
        {request.handled_by ? (
          <p className="m-0 text-[0.8rem] text-muted">
            {STATUS[request.status].word} by {request.handled_by.split('@')[0]}
            {request.handled_at ? `, ${formatDate(request.handled_at, true)}` : ''}.
          </p>
        ) : null}
      </div>
    ) : null}
  </Dialog>
)

/** Requests from the Join page: approve one into Members, or decline it */
export const RequestsView: FC<{ requests: JoinRequestRow[] }> = ({ requests }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [show, setShow] = useState('pending')
  const [reading, setReading] = useState<JoinRequestRow | null>(null)
  const waiting = requests.filter((r) => r.status === 'pending').length
  const rows = requests.filter((r) => show === 'all' || r.status === show)

  const settle = async (run: () => ReturnType<typeof approveJoinRequest>, failed: string) => {
    const result = await run()
    if (!result.ok) return toast({ variant: 'error', title: failed, message: result.error })
    if (result.message) toast({ variant: 'success', title: result.message })
    setReading(null)
    router.refresh()
  }
  const approve = (r: JoinRequestRow) => settle(() => approveJoinRequest(r.id), 'Couldn’t approve')
  const setStatus = (ids: string[], status: 'declined' | 'pending') => settle(() => setJoinRequestStatus(ids, status), 'Couldn’t update')
  const remove = async (ids: string[]) => {
    if (!(await confirm({ title: `Delete ${ids.length === 1 ? 'this request' : `${ids.length} requests`}?`, message: 'Anyone already added to Members stays there.', variant: 'error', confirmLabel: 'Delete' }))) return
    await settle(() => deleteJoinRequests(ids), 'Couldn’t delete')
  }

  return (
    <>
      <PageTitle
        icon={<UserPlus />}
        title="Join requests"
        description="Who’s asked to join from the Join page. Approving one adds them to Members as new."
        actions={
          <Button href="/join#request" size="sm" variant="outline" external>
            Open the form
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <SegmentedControl
          aria-label="Show"
          size="sm"
          className="self-start"
          value={show}
          onValueChange={setShow}
          options={[
            { value: 'pending', label: waiting ? `Waiting (${waiting})` : 'Waiting' },
            { value: 'approved', label: 'Approved' },
            { value: 'declined', label: 'Declined' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Table
          caption="Join requests"
          hideCaption
          rows={rows}
          getRowId={(r) => r.id}
          getRowLabel={(r) => `the request from ${r.name}`}
          selectable
          bulkActions={(ids) => (
            <>
              <Button size="sm" variant="outline" leading={<X size={15} aria-hidden />} onClick={() => setStatus(ids, 'declined')}>
                Decline
              </Button>
              <Button size="sm" variant="outline" leading={<Trash2 size={15} aria-hidden />} onClick={() => remove(ids)}>
                Delete
              </Button>
            </>
          )}
          empty={
            <EmptyState
              size="sm"
              icon={<UserPlus />}
              title={show === 'pending' ? 'Nobody’s waiting' : 'Nothing here'}
              description={requests.length ? undefined : 'When someone asks to join from the Join page, it lands here.'}
            />
          }
          columns={[
            {
              key: 'name',
              header: 'From',
              sortable: true,
              cell: (r) => (
                <button
                  type="button"
                  onClick={() => setReading(r)}
                  className="flex max-w-full min-w-0 cursor-pointer flex-col border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className={r.status === 'pending' ? 'truncate font-bold text-ink' : 'truncate text-ink'}>{r.name}</span>
                  <span className="truncate text-[0.8rem] text-muted">{r.email}</span>
                </button>
              ),
            },
            { key: 'major', header: 'Major', hideWhenStacked: true, cell: (r) => [r.major, r.year].filter(Boolean).join(' · ') },
            { key: 'message', header: 'Message', hideWhenStacked: true, cell: (r) => <span className="line-clamp-1 text-[0.85rem] text-muted">{r.message}</span> },
            { key: 'created_at', header: 'Sent', sortable: true, hideWhenStacked: true, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at)}</span> },
            {
              key: 'status',
              header: 'Status',
              cell: (r) => (
                <Badge size="sm" dot={r.status !== 'declined'} tone={STATUS[r.status].tone}>
                  {STATUS[r.status].word}
                </Badge>
              ),
            },
          ]}
          rowActions={(r) => (
            <ActionMenu
              label={`Actions for the request from ${r.name}`}
              items={[
                ...(r.status === 'pending'
                  ? [
                      { label: 'Add to Members', icon: <Check />, onSelect: () => approve(r) },
                      { label: 'Decline', icon: <X />, onSelect: () => setStatus([r.id], 'declined') },
                    ]
                  : [
                      ...(r.member_id ? [{ label: 'View member', icon: <UserRound />, href: `/dashboard/members/${r.member_id}` }] : []),
                      ...(r.status === 'declined' ? [{ label: 'Put back to waiting', icon: <RotateCcw />, onSelect: () => setStatus([r.id], 'pending') }] : []),
                    ]),
                'separator' as const,
                { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => remove([r.id]) },
              ]}
            />
          )}
        />
      </div>
      <RequestDialog request={reading} onClose={() => setReading(null)} onApprove={approve} onDecline={(r) => setStatus([r.id], 'declined')} />
    </>
  )
}
