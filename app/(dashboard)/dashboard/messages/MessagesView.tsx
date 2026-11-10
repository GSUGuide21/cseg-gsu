'use client'

import { CheckCheck, Inbox, Mail, MailOpen, Reply, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { deleteMessages, markMessages } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import type { ContactMessageRow } from '@/lib/supabase/types'

import { PageTitle } from '../ui'

/** A reply in the officer's own mail app, quoting what they wrote */
const replyHref = (m: ContactMessageRow) => {
  const subject = `Re: ${m.subject || 'Your message to CSEG'}`
  const quoted = m.body
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  const body = `Hi ${m.name.split(' ')[0]},\n\n\n\nOn ${formatDate(m.created_at, true)}, you wrote:\n${quoted}`
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const MessageDialog: FC<{ message: ContactMessageRow | null; onClose: () => void; onDelete: (m: ContactMessageRow) => void }> = ({ message, onClose, onDelete }) => (
  <Dialog
    open={message !== null}
    onClose={onClose}
    size="lg"
    title={message?.subject || 'A message from the Contact page'}
    description={message ? `From ${message.name} <${message.email}>, ${formatDate(message.created_at, true)}` : undefined}
    footer={
      message ? (
        <>
          <Button size="sm" variant="outline" leading={<Trash2 size={15} aria-hidden />} onClick={() => onDelete(message)}>
            Delete
          </Button>
          <Button size="sm" href={replyHref(message)} leading={<Reply size={15} aria-hidden />}>
            Reply by email
          </Button>
        </>
      ) : null
    }
  >
    {message ? <p className="m-0 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{message.body}</p> : null}
    {message?.read_by ? <p className="mt-4 mb-0 text-[0.8rem] text-muted">Opened by {message.read_by.split('@')[0]}{message.read_at ? `, ${formatDate(message.read_at, true)}` : ''}.</p> : null}
  </Dialog>
)

export const MessagesView: FC<{ messages: ContactMessageRow[] }> = ({ messages }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [reading, setReading] = useState<ContactMessageRow | null>(null)
  const unread = messages.filter((m) => !m.read_at)

  const mark = async (ids: string[], read: boolean) => {
    const result = await markMessages(ids, read)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t update', message: result.error })
    router.refresh()
  }
  const open = (m: ContactMessageRow) => {
    setReading(m)
    if (!m.read_at) void mark([m.id], true)
  }
  const remove = async (m: ContactMessageRow) => {
    if (!(await confirm({ title: 'Delete this message?', message: `From ${m.name}. It can’t be brought back.`, variant: 'error', confirmLabel: 'Delete' }))) return
    const result = await deleteMessages([m.id])
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
    setReading(null)
    router.refresh()
  }
  const removeMany = async (ids: string[]) => {
    if (!(await confirm({ title: `Delete ${ids.length === 1 ? 'this message' : `${ids.length} messages`}?`, message: 'They can’t be brought back.', variant: 'error', confirmLabel: 'Delete' }))) return
    const result = await deleteMessages(ids)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
    router.refresh()
  }

  return (
    <>
      <PageTitle
        icon={<Inbox />}
        title="Messages"
        description="What people send from the Contact page. Every officer sees the same inbox; reply from your own email."
        actions={
          unread.length ? (
            <Button size="sm" variant="outline" leading={<CheckCheck size={15} aria-hidden />} onClick={() => mark(unread.map((m) => m.id), true)}>
              Mark all read
            </Button>
          ) : null
        }
      />
      <Table
        caption="Messages"
        hideCaption
        rows={messages}
        getRowId={(m) => m.id}
        getRowLabel={(m) => `the message from ${m.name}`}
        selectable
        bulkActions={(ids) => (
          <>
            <Button size="sm" variant="outline" leading={<MailOpen size={15} aria-hidden />} onClick={() => mark(ids, true)}>
              Mark read
            </Button>
            <Button size="sm" variant="outline" leading={<Mail size={15} aria-hidden />} onClick={() => mark(ids, false)}>
              Mark unread
            </Button>
            <Button size="sm" variant="outline" leading={<Trash2 size={15} aria-hidden />} onClick={() => removeMany(ids)}>
              Delete
            </Button>
          </>
        )}
        empty={<EmptyState size="sm" icon={<Inbox />} title="No messages yet" description="When someone writes in from the Contact page, it lands here." />}
        columns={[
          {
            key: 'name',
            header: 'From',
            sortable: true,
            cell: (m) => (
              <button
                type="button"
                onClick={() => open(m)}
                className="flex max-w-full min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {m.read_at ? null : <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />}
                <span className="flex min-w-0 flex-col">
                  <span className={m.read_at ? 'truncate text-ink' : 'truncate font-bold text-ink'}>
                    {m.name}
                    {m.read_at ? null : <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="truncate text-[0.8rem] text-muted">{m.email}</span>
                </span>
              </button>
            ),
          },
          {
            key: 'subject',
            header: 'Message',
            cell: (m) => (
              <span className="flex min-w-0 flex-col">
                {m.subject ? <span className={m.read_at ? 'truncate text-ink' : 'truncate font-semibold text-ink'}>{m.subject}</span> : null}
                <span className="truncate text-[0.85rem] text-muted">{m.body}</span>
              </span>
            ),
          },
          {
            key: 'created_at',
            header: 'Sent',
            sortable: true,
            hideWhenStacked: true,
            cell: (m) => <span className="whitespace-nowrap">{formatDate(m.created_at, true)}</span>,
          },
          {
            key: 'read_at',
            header: 'Status',
            cell: (m) =>
              m.read_at ? (
                <Badge size="sm" tone="neutral">
                  Read
                </Badge>
              ) : (
                <Badge size="sm" dot tone="brand">
                  New
                </Badge>
              ),
          },
        ]}
        rowActions={(m) => (
          <ActionMenu
            label={`Actions for the message from ${m.name}`}
            items={[
              { label: 'Open', icon: <MailOpen />, onSelect: () => open(m) },
              { label: 'Reply by email', icon: <Reply />, onSelect: () => window.open(replyHref(m), '_self') },
              m.read_at ? { label: 'Mark unread', icon: <Mail />, onSelect: () => mark([m.id], false) } : { label: 'Mark read', icon: <MailOpen />, onSelect: () => mark([m.id], true) },
              'separator',
              { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => remove(m) },
            ]}
          />
        )}
      />
      <MessageDialog message={reading} onClose={() => setReading(null)} onDelete={remove} />
    </>
  )
}
