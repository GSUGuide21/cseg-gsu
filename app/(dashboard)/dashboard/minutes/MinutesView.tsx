'use client'

import { ExternalLink, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { DatePicker, Field, Input, TagInput, TextArea } from '@/components/Form'
import { deleteMinutes, saveMinutes } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { atlantaToday } from '@/lib/eateries'
import type { MeetingMinutesRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

const MinutesDialog: FC<{ minutes: MeetingMinutesRow | null; open: boolean; onClose: () => void }> = ({ minutes, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = minutes ? `minutes-${minutes.id}` : 'minutes-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={minutes ? minutes.title : 'Write up a meeting'}
      description={minutes?.recorded_by ? `Written by ${minutes.recorded_by.split('@')[0]}.` : 'Only officers see these.'}
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
          run(() => saveMinutes(minutes?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Meeting" required error={errors.title}>
            <Input name="title" defaultValue={minutes?.title} autoComplete="off" placeholder="General body meeting" />
          </Field>
          <Field label="Held on" required error={errors.held_on}>
            <DatePicker name="held_on" size="sm" defaultValue={minutes?.held_on ?? atlantaToday()} max={atlantaToday()} />
          </Field>
        </div>
        <Field label="Who was there" description="Press Enter after each name.">
          <TagInput name="attendees" defaultValue={minutes?.attendees ?? []} />
        </Field>
        <Field label="Notes" description="What was discussed, decided, and left to do.">
          <TextArea name="notes" rows={10} defaultValue={minutes?.notes ?? ''} />
        </Field>
        <Field label="Full document" error={errors.file_url} description="A link to the write-up, if it’s kept somewhere else.">
          <Input name="file_url" type="url" defaultValue={minutes?.file_url ?? ''} autoComplete="off" placeholder="https://…" />
        </Field>
      </form>
    </Dialog>
  )
}

/** Officers' record of each meeting, newest first */
export const MinutesView: FC<{ minutes: MeetingMinutesRow[] }> = ({ minutes }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<MeetingMinutesRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (m: MeetingMinutesRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(m)
  }

  return (
    <>
      <PageTitle
        icon={<NotebookPen />}
        title="Minutes"
        description="What was said and decided at each meeting. Only officers see these."
        actions={
          <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
            Write up a meeting
          </Button>
        }
      />
      <Table
        caption="Meeting minutes"
        hideCaption
        rows={minutes}
        getRowId={(m) => m.id}
        defaultSort={{ key: 'held_on', direction: 'descending' }}
        empty={
          <EmptyState
            size="sm"
            icon={<NotebookPen />}
            title="No minutes yet"
            description="Write up a meeting and it’s here for the next officers."
            actions={
              <Button size="sm" onClick={() => open('new')}>
                Write up a meeting
              </Button>
            }
          />
        }
        columns={[
          { key: 'held_on', header: 'Held', sortable: true, cell: (m) => <span className="whitespace-nowrap">{formatDate(m.held_on)}</span> },
          {
            key: 'title',
            header: 'Meeting',
            sortable: true,
            cell: (m) => (
              <button
                type="button"
                onClick={() => open(m)}
                className="flex max-w-full min-w-0 cursor-pointer flex-col border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="truncate font-semibold text-ink">{m.title}</span>
                {m.notes ? <span className="line-clamp-1 text-[0.85rem] text-muted">{m.notes}</span> : null}
              </button>
            ),
          },
          { key: 'attendees', header: 'There', sortable: true, sortValue: (m) => m.attendees.length, hideWhenStacked: true, cell: (m) => (m.attendees.length ? `${m.attendees.length} ${m.attendees.length === 1 ? 'person' : 'people'}` : '') },
        ]}
        rowActions={(m) => (
          <ActionMenu
            label={`Actions for ${m.title}`}
            items={[
              { label: 'Open', icon: <Pencil />, onSelect: () => open(m) },
              ...(m.file_url ? [{ label: 'Open the document', icon: <ExternalLink />, onSelect: () => window.open(m.file_url!, '_blank', 'noopener') }] : []),
              'separator' as const,
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Delete the minutes for ${m.title}?`, message: 'They can’t be brought back.', variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deleteMinutes(m.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <MinutesDialog key={dialogKey} minutes={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
