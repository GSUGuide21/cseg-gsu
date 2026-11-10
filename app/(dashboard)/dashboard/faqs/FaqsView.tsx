'use client'

import { ArrowDownUp, CircleHelp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Switch, TextArea } from '@/components/Form'
import { deleteFaq, reorderFaqs, saveFaq } from '@/lib/dashboard/actions'
import { FAQ_LIMITS } from '@/lib/dashboard/validate'
import type { FaqRow } from '@/lib/supabase/types'

import { ArrangeDialog } from '../ArrangeDialog'
import { PageTitle, useAction } from '../ui'

const FaqDialog: FC<{ faq: FaqRow | null; open: boolean; onClose: () => void }> = ({ faq, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const formId = faq ? `faq-${faq.id}` : 'faq-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={faq ? 'Edit question' : 'Add a question'}
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
          run(() => saveFaq(faq?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Question" required error={errors.question}>
          <Input name="question" defaultValue={faq?.question} maxLength={FAQ_LIMITS.question} autoComplete="off" placeholder="Who can join?" />
        </Field>
        <Field label="Answer" required error={errors.answer} description="Link words like [Join](/join) or [PIN](https://pin.gsu.edu/…); **bold** works too.">
          <TextArea name="answer" rows={5} defaultValue={faq?.answer} maxLength={FAQ_LIMITS.answer} />
        </Field>
        <Switch name="published" defaultChecked={faq?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site
        </Switch>
      </form>
    </Dialog>
  )
}

/** The About page's common questions, in the page's order */
export const FaqsView: FC<{ faqs: FaqRow[] }> = ({ faqs }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<FaqRow | 'new' | null>(null)
  const [arranging, setArranging] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (f: FaqRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(f)
  }

  return (
    <>
      <PageTitle
        icon={<CircleHelp />}
        title="Questions"
        description="The common questions on the About page, in this order."
        actions={
          <>
            <Button href="/about#faq" size="sm" variant="outline" external>
              Open the FAQ
            </Button>
            {faqs.length > 1 ? (
              <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} onClick={() => setArranging(true)}>
                Arrange
              </Button>
            ) : null}
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add a question
            </Button>
          </>
        }
      />
      <Table
        caption="Common questions"
        hideCaption
        rows={faqs}
        getRowId={(f) => f.id}
        empty={
          <EmptyState
            size="sm"
            icon={<CircleHelp />}
            title="No questions here yet"
            description="Until there are any shown, the About page keeps its built-in questions. Add your own to replace them."
            actions={
              <Button size="sm" onClick={() => open('new')}>
                Add the first question
              </Button>
            }
          />
        }
        columns={[
          {
            key: 'question',
            header: 'Question',
            cell: (f) => (
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{f.question}</span>
                <span className="line-clamp-2 text-[0.85rem] text-muted">{f.answer}</span>
              </span>
            ),
          },
          {
            key: 'published',
            header: 'On the site',
            cell: (f) => (
              <Badge size="sm" dot tone={f.published ? 'success' : 'neutral'}>
                {f.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(f) => (
          <ActionMenu
            label={`Actions for “${f.question}”`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(f) },
              'separator',
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: 'Remove this question?', message: `“${f.question}” comes off the About page. To keep it for later, hide it instead.`, variant: 'error', confirmLabel: 'Remove' }))) return
                  const result = await deleteFaq(f.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <FaqDialog key={dialogKey} faq={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      {arranging ? (
        <ArrangeDialog
          title="Arrange questions"
          groupLabel="Questions"
          groups={[{ slug: 'all', title: 'Questions' }]}
          items={faqs.map((f) => ({ id: f.id, name: f.question, group: 'all', sort: f.sort, badges: f.published ? [] : ['Hidden'] }))}
          save={reorderFaqs}
          onClose={() => setArranging(false)}
        />
      ) : null}
    </>
  )
}
