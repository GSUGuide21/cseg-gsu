'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState, type FC } from 'react'

import { ReferenceGrid } from '@/globals/References'
import { useSiteContent } from '@/globals/SiteContent'
import { NO_SITE_CONTENT, REFERENCE_KINDS, REFERENCES_MAX, referenceOptions, type ReferenceItem, type ReferenceKind } from '@/lib/references'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Select } from '../../Select'

export type ReferencesData = { items: ReferenceItem[] }

const KIND_OPTIONS = Object.entries(REFERENCE_KINDS).map(([value, label]) => ({ value, label }))

type Row = { key: number; kind: ReferenceKind; ref: string }
let nextKey = 0

const ReferencesForm: FC<{ initial?: ReferencesData; onClose: () => void; onSave: (data: ReferencesData) => void }> = ({ initial, onClose, onSave }) => {
  const content = useSiteContent() ?? NO_SITE_CONTENT
  const [rows, setRows] = useState<Row[]>(() => (initial?.items.length ? initial.items : [{ kind: 'eatery' as const, ref: '' }]).map((i) => ({ key: nextKey++, ...i })))
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const picked = rows.filter((r) => r.ref).map(({ kind, ref }) => ({ kind, ref }))
  const edit = !!initial?.items.length
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={edit ? 'Edit references' : 'Insert references'}
      description="Point at things already on the site. Each shows as a card that stays up to date: rename an eatery or a post, and the card follows. Only published posts and pages can be picked."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ items: picked })} disabled={!picked.length}>
            {edit ? 'Save' : 'Insert'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={r.key} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <Select size="sm" aria-label={`Reference ${i + 1}: kind`} value={r.kind} options={KIND_OPTIONS} onValueChange={(v) => v && update(r.key, { kind: v as ReferenceKind, ref: '' })} />
            <Select
              size="sm"
              type="combobox"
              aria-label={`Reference ${i + 1}: which one`}
              value={r.ref || null}
              options={referenceOptions(r.kind, content)}
              placeholder={r.kind === 'eateries' ? 'Pick an area' : 'Pick one'}
              emptyText="Nothing published by that name"
              onValueChange={(v) => update(r.key, { ref: v ?? '' })}
            />
            <Button size="sm" variant="ghost" iconOnly aria-label={`Remove reference ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
              <Trash2 size={14} aria-hidden />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="self-start" leading={<Plus size={14} aria-hidden />} disabled={rows.length >= REFERENCES_MAX} onClick={() => setRows((rs) => [...rs, { key: nextKey++, kind: rs.at(-1)?.kind ?? 'eatery', ref: '' }])}>
          Add another
        </Button>
        {picked.length ? <ReferenceGrid items={picked} preview /> : null}
      </div>
    </Dialog>
  )
}

/** Picks what a References block points at. Opens outside the editor, as VideoDialog does. */
export const ReferencesDialog: FC<{ open: boolean; initial?: ReferencesData; onClose: () => void; onSave: (data: ReferencesData) => void }> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <ReferencesForm {...props} />
    </Portal>
  ) : null
