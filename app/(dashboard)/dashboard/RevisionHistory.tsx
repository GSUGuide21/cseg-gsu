'use client'

import { History, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FC } from 'react'

import { Badge, Button, Dialog, EmptyState, Spinner, useNotify } from '@/components'
import { getRevision, listRevisions, restoreRevision, type RevisionSummary } from '@/lib/dashboard/actions'
import { cn } from '@/lib/cn'
import { DocumentBody, PageSections } from '@/lib/richtext'
import { upgradeEateriesBlocks } from '@/lib/richtext/blocks'
import type { PageSection } from '@/lib/supabase/types'

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(iso))

/** A saved version, read as it would show */
const Snapshot: FC<{ snap: Record<string, unknown> }> = ({ snap }) => {
  const str = (k: string) => (typeof snap[k] === 'string' ? (snap[k] as string) : '')
  const sections = Array.isArray(snap.sections) ? (snap.sections as PageSection[]) : []
  return (
    <article className="flex flex-col gap-3">
      <h2 className="m-0 text-[1.4rem] leading-tight font-extrabold text-ink">{str('title') || 'Untitled'}</h2>
      {str('subtitle') || str('description') || str('excerpt') ? <p className="m-0 text-muted">{str('subtitle') || str('description') || str('excerpt')}</p> : null}
      {snap.layout === 'sections' ? (
        <PageSections sections={sections.map((s) => ({ ...s, body: upgradeEateriesBlocks(s.body) }))} />
      ) : str('body').trim() ? (
        <DocumentBody source={upgradeEateriesBlocks(str('body'))} />
      ) : (
        <p className="m-0 text-muted">Nothing written.</p>
      )}
    </article>
  )
}

/**
 * A page's or post's saved versions: pick one to read it, and restore its writing (title,
 * summary, sections, and body; not the web address or whether it's published). Restoring
 * is a save of its own, so it can be undone the same way.
 */
export const RevisionHistory: FC<{ kind: 'page' | 'post'; docId: string; open: boolean; onClose: () => void; dirty: boolean }> = ({ kind, docId, open, onClose, dirty }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [list, setList] = useState<RevisionSummary[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [snap, setSnap] = useState<Record<string, unknown> | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (!open) return
    let stale = false
    listRevisions(kind, docId).then((l) => {
      if (stale) return
      setList(l)
      setPicked(l[1]?.id ?? l[0]?.id ?? null)
    })
    return () => {
      stale = true
    }
  }, [open, kind, docId])

  useEffect(() => {
    if (!picked) return setSnap(null)
    let stale = false
    setSnap(null)
    getRevision(kind, picked).then((s) => !stale && setSnap(s))
    return () => {
      stale = true
    }
  }, [kind, picked])

  const restore = async () => {
    if (!picked) return
    if (dirty && !(await confirm({ title: 'Restore this version?', message: 'Your unsaved changes here will be lost.', variant: 'warning', confirmLabel: 'Restore' }))) return
    setRestoring(true)
    const result = await restoreRevision(kind, docId, picked)
    setRestoring(false)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t restore', message: result.error })
    toast({ variant: 'success', title: 'Restored. It’s saved; publish it when it looks right.' })
    onClose()
    router.refresh()
  }

  const current = list?.[0]?.id
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="History"
      description="Every save, newest first (the newest 50 are kept). Restoring brings back the writing; the web address and whether it’s published stay as they are."
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" leading={<RotateCcw size={14} aria-hidden />} disabled={!picked || picked === current} loading={restoring} onClick={restore}>
            Restore this version
          </Button>
        </>
      }
    >
      {list === null ? (
        <div className="grid place-items-center py-10">
          <Spinner label="Loading the history" />
        </div>
      ) : !list.length ? (
        <EmptyState size="sm" icon={<History />} title="No history yet" description="Each save from now on is kept here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
          <ol aria-label="Saved versions" className="m-0 flex max-h-[60vh] list-none flex-col gap-1 overflow-y-auto p-0">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={picked === r.id}
                  onClick={() => setPicked(r.id)}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand',
                    picked === r.id && 'bg-brand-tint'
                  )}
                >
                  <span className="flex items-center gap-2 text-[0.85rem] font-semibold text-ink">
                    {when(r.saved_at)}
                    {r.id === current ? (
                      <Badge size="sm" tone="success">
                        Now
                      </Badge>
                    ) : null}
                  </span>
                  <span className="truncate text-[0.78rem] text-muted">
                    {r.saved_by?.split('@')[0] ?? 'Someone'} · {r.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="max-h-[60vh] min-w-0 overflow-y-auto rounded-lg border border-line p-4">
            {snap ? <Snapshot snap={snap} /> : picked ? <Spinner label="Loading this version" /> : null}
          </div>
        </div>
      )}
    </Dialog>
  )
}
