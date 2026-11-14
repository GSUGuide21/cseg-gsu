'use client'

import { $isMarkNode, $unwrapMarkNode, $wrapSelectionInMarkNode, MarkNode } from '@lexical/mark'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $dfs } from '@lexical/utils'
import { $getRoot, $getSelection, $isRangeSelection, type LexicalNode } from 'lexical'
import { Check, MessageSquare, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Avatar } from '../../Avatar'
import { Button } from '../../Button'
import { TextArea } from '../TextArea'

/** One comment, as the page gives it to the editor */
export interface EditorComment {
  id: string
  threadId: string
  /** The words the thread is on; only its first comment has them */
  quote: string | null
  body: string
  authorName: string
  createdAt: string
  resolved: boolean
  /** Written by whoever's signed in, so they can take it back */
  mine: boolean
}

/** How the editor reads and writes a document's comments; the page keeps them */
export interface CommentsAdapter {
  comments: readonly EditorComment[]
  add: (threadId: string, quote: string | null, body: string) => Promise<void>
  resolve: (threadId: string, resolved: boolean) => Promise<void>
  remove: (commentId: string) => Promise<void>
}

export const COMMENT_MAX = 2000
const QUOTE_MAX = 500

/** A new thread's id: what marks its words in the writing */
export const newThreadId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

/** Marks the selected words with a thread, and gives back what they say; null when nothing's selected */
export const $markSelectionForComment = (threadId: string): string | null => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || selection.isCollapsed()) return null
  const quote = selection.getTextContent().replace(/\s+/g, ' ').trim().slice(0, QUOTE_MAX)
  if (!quote) return null
  $wrapSelectionInMarkNode(selection, selection.isBackward(), threadId)
  return quote
}

const $marksOf = (threadId: string): MarkNode[] =>
  $dfs($getRoot())
    .map(({ node }) => node)
    .filter((n): n is MarkNode => $isMarkNode(n) && n.hasID(threadId))

/** Takes a thread's mark off its words (they stay as they are) */
export const $unmarkComment = (threadId: string) => {
  for (const mark of $marksOf(threadId)) {
    mark.deleteID(threadId)
    if (!mark.getIDs().length) $unwrapMarkNode(mark)
  }
}

/** Selects a thread's words; false if they're gone */
export const $selectComment = (threadId: string) => {
  const [first] = $marksOf(threadId)
  if (!first) return false
  first.select(0, first.getChildrenSize())
  return true
}

/** The threads the cursor's in */
const $threadsAtSelection = (): string[] => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return []
  const ids = new Set<string>()
  for (let at: LexicalNode | null = selection.anchor.getNode(); at; at = at.getParent()) if ($isMarkNode(at)) at.getIDs().forEach((id) => ids.add(id))
  return [...ids]
}

/** The threads still marked in the writing */
const $markedThreads = () => new Set($dfs($getRoot()).flatMap(({ node }) => ($isMarkNode(node) ? node.getIDs() : [])))

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** A comment being written: the first of a new thread, or a reply */
const Composer: FC<{ label: string; submit: string; onSubmit: (body: string) => Promise<void>; onCancel?: () => void; autoFocus?: boolean }> = ({ label, submit, onSubmit, onCancel, autoFocus }) => {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t send. Try again?')
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <TextArea
        aria-label={label}
        rows={2}
        maxLength={COMMENT_MAX}
        autoFocus={autoFocus}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // ⌘/Ctrl+Enter sends, as in most chat boxes
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            send()
          }
          if (e.key === 'Escape' && onCancel) {
            e.preventDefault()
            onCancel()
          }
        }}
        placeholder={label}
      />
      {error ? (
        <p role="alert" className="m-0 text-[0.8rem] font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" loading={sending} disabled={!body.trim()} onClick={send}>
          {submit}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The document's comments, under the writing: each open thread with the words it's on,
 * its comments, a reply box, and Resolve. Clicking a thread selects its words; putting the
 * cursor in marked words picks out its thread. A new comment (from the toolbar, or the
 * right-click menu) is written at the top.
 */
export const CommentsPanel: FC<{ adapter: CommentsAdapter; pending: { threadId: string; quote: string } | null; onPendingDone: (posted: boolean) => void }> = ({ adapter, pending, onPendingDone }) => {
  const [editor] = useLexicalComposerContext()
  const [active, setActive] = useState<string[]>([])
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [showResolved, setShowResolved] = useState(false)
  const [open, setOpen] = useState(true)

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) =>
        editorState.read(() => {
          setActive($threadsAtSelection())
          setMarked($markedThreads())
        })
      ),
    [editor]
  )

  // Comments in threads, in the order they were started
  const threads = useMemo(() => {
    const byId = new Map<string, EditorComment[]>()
    for (const c of adapter.comments) byId.set(c.threadId, [...(byId.get(c.threadId) ?? []), c])
    return [...byId.entries()].map(([id, comments]) => ({ id, comments, quote: comments.find((c) => c.quote)?.quote ?? null, resolved: comments.every((c) => c.resolved) }))
  }, [adapter.comments])
  const openThreads = threads.filter((t) => !t.resolved)
  const resolved = threads.filter((t) => t.resolved)
  const shown = showResolved ? threads : openThreads

  const select = (threadId: string) => {
    let found = false
    editor.update(() => {
      found = $selectComment(threadId)
    })
    if (found) {
      editor.focus()
      requestAnimationFrame(() => editor.getRootElement()?.querySelector('mark')?.scrollIntoView?.({ block: 'nearest' }))
    }
  }

  const resolve = async (threadId: string, to: boolean) => {
    await adapter.resolve(threadId, to)
    // A resolved thread's words aren't highlighted any more
    if (to) editor.update(() => $unmarkComment(threadId))
  }

  const remove = async (thread: (typeof threads)[number], comment: EditorComment) => {
    await adapter.remove(comment.id)
    if (thread.comments.length === 1) editor.update(() => $unmarkComment(thread.id))
  }

  return (
    <section aria-label="Comments" className="border-t border-line bg-fill/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-[0.85rem] font-semibold text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <MessageSquare size={15} aria-hidden />
        Comments
        <span className="rounded-full bg-fill px-1.5 text-[0.75rem] tabular-nums">{openThreads.length}</span>
        <span className="ml-auto text-[0.75rem] font-normal text-muted">Only officers see these</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {pending ? (
            <div className="flex flex-col gap-2 rounded-lg border border-brand bg-surface p-3">
              <blockquote className="m-0 border-l-2 border-warning pl-2 text-[0.85rem] text-muted">{pending.quote}</blockquote>
              <Composer
                label="Write a comment"
                submit="Comment"
                autoFocus
                onSubmit={async (body) => {
                  await adapter.add(pending.threadId, pending.quote, body)
                  onPendingDone(true)
                }}
                onCancel={() => onPendingDone(false)}
              />
            </div>
          ) : null}
          {shown.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {shown.map((thread) => {
                const here = marked.has(thread.id)
                return (
                  <li
                    key={thread.id}
                    className={cn('flex flex-col gap-2 rounded-lg border bg-surface p-3', active.includes(thread.id) ? 'border-brand shadow-card' : 'border-line', thread.resolved && 'opacity-70')}
                  >
                    {thread.quote ? (
                      <button
                        type="button"
                        onClick={() => select(thread.id)}
                        disabled={!here}
                        className="cursor-pointer border-0 border-l-2 border-warning bg-transparent p-0 pl-2 text-left text-[0.85rem] text-muted hover:text-ink disabled:cursor-default disabled:hover:text-muted"
                        title={here ? 'Select these words in the writing' : undefined}
                      >
                        {thread.quote}
                        {!here && !thread.resolved ? <span className="mt-0.5 block text-[0.75rem] italic">Those words aren’t in the writing any more.</span> : null}
                      </button>
                    ) : null}
                    <ol className="m-0 flex list-none flex-col gap-2 p-0">
                      {thread.comments.map((c) => (
                        <li key={c.id} className="flex gap-2">
                          <Avatar name={c.authorName} size="sm" decorative />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="m-0 text-[0.8rem]">
                              <span className="font-semibold text-ink">{c.authorName}</span> <span className="text-muted">{when(c.createdAt)}</span>
                            </p>
                            <p className="m-0 text-[0.88rem] whitespace-pre-wrap text-ink">{c.body}</p>
                          </div>
                          {c.mine ? (
                            <Button size="sm" variant="ghost" aria-label="Delete comment" onClick={() => remove(thread, c)}>
                              <Trash2 size={14} aria-hidden />
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                    {thread.resolved ? (
                      <Button size="sm" variant="ghost" className="self-start" leading={<RotateCcw size={14} aria-hidden />} onClick={() => resolve(thread.id, false)}>
                        Reopen
                      </Button>
                    ) : (
                      <>
                        <Composer label="Reply" submit="Reply" onSubmit={(body) => adapter.add(thread.id, null, body)} />
                        <Button size="sm" variant="outline" className="self-start" leading={<Check size={14} aria-hidden />} onClick={() => resolve(thread.id, true)}>
                          Resolve
                        </Button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : pending ? null : (
            <p className="m-0 text-[0.85rem] text-muted">Select some words and choose Comment to start a thread.</p>
          )}
          {resolved.length ? (
            <button type="button" onClick={() => setShowResolved((s) => !s)} className="cursor-pointer self-start border-0 bg-transparent p-0 text-[0.8rem] font-semibold text-brand hover:underline">
              {showResolved ? 'Hide resolved' : `Show resolved (${resolved.length})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
