'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Dispatch, FC, SetStateAction } from 'react'

import { Button } from '@/components'
import { RichTextEditor } from '@/components/Form'
import { parseRichText } from '@/lib/richtext'
import { sectionId } from '@/lib/richtext/blocks'
import { PAGE_SECTIONS_MAX, PAGE_SUBTITLE_MAX, SECTION_TITLE_MAX, type PageSection } from '@/lib/supabase/types'

/** A new, empty section; its id keeps its editor while sections move around */
export const newSection = (body = ''): PageSection => ({ id: crypto.randomUUID(), title: '', subtitle: '', anchor: '', body })

// ── Turning sections into one piece of writing (switching a page's layout back) ──

const textJSON = (text: string) => ({ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 })
const blockJSON = (type: string, children: object[], extra: object = {}) => ({ type, version: 1, children, direction: null, format: '', indent: 0, ...extra })

/** The sections as one document: each title a heading, its subtitle under it, then its writing */
export const joinSections = (sections: readonly PageSection[]) =>
  JSON.stringify({
    root: blockJSON(
      'root',
      sections.flatMap((s) => [
        ...(s.title ? [blockJSON('heading', [textJSON(s.title)], { tag: 'h2' })] : []),
        ...(s.subtitle ? [blockJSON('paragraph', [textJSON(s.subtitle)], { textFormat: 0, textStyle: '' })] : []),
        ...(parseRichText(s.body)?.children ?? []),
      ])
    ),
  })

const iconButton =
  'grid size-8 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

/**
 * A page's sections, each edited in place: its title (with the brand bar, as on the
 * site), its subtitle, and its own editor, with buttons to move it or take it out, and one
 * to add another. Changes go up through `setSections`; each editor's words through
 * `onText`, for the word count and the summary.
 */
export const SectionsEditor: FC<{
  sections: PageSection[]
  setSections: Dispatch<SetStateAction<PageSection[]>>
  onText: (id: string, text: string) => void
  errors: Record<string, string | undefined>
  uploadImage?: (file: File) => Promise<string>
}> = ({ sections, setSections, onText, errors, uploadImage }) => {
  const patch = (id: string, change: Partial<PageSection>) => setSections((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)))
  const move = (i: number, by: -1 | 1) =>
    setSections((all) => {
      const next = [...all]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })

  return (
    <div className="flex flex-col gap-5">
      {sections.map((s, i) => {
        const error = errors[`section-${s.id}`]
        return (
          <section key={s.id} aria-label={s.title || `Section ${i + 1}`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Section {i + 1}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <button type="button" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                  <ArrowUp aria-hidden />
                </button>
                <button type="button" aria-label={`Move section ${i + 1} down`} disabled={i === sections.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                  <ArrowDown aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Remove section ${i + 1}`}
                  onClick={() => setSections((all) => all.filter((x) => x.id !== s.id))}
                  className={`${iconButton} hover:bg-danger/10 hover:text-danger`}
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
            </div>
            {/* The title and subtitle as the site shows them: the brand bar, then the title */}
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
              <textarea
                aria-label={`Section ${i + 1} title`}
                rows={1}
                value={s.title}
                maxLength={SECTION_TITLE_MAX}
                onChange={(e) => patch(s.id, { title: e.target.value.replace(/\n/g, ' ') })}
                placeholder="Section title"
                aria-invalid={!!error || undefined}
                className="field-sizing-content min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-[1.35rem] leading-snug font-bold text-ink outline-none placeholder:text-ink-faint/60"
              />
            </div>
            {error ? (
              <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <textarea
              aria-label={`Section ${i + 1} subtitle`}
              rows={1}
              value={s.subtitle}
              maxLength={PAGE_SUBTITLE_MAX}
              onChange={(e) => patch(s.id, { subtitle: e.target.value.replace(/\n/g, ' ') })}
              placeholder="Subtitle (optional)"
              className="field-sizing-content -mt-1 w-full resize-none border-0 bg-transparent p-0 text-[0.95rem] leading-relaxed text-muted outline-none placeholder:text-ink-faint/70"
            />
            {/* Where a link to this section goes: /about#faq. Left empty, it's made from the title. */}
            <label className="flex items-center gap-2 text-[0.78rem] text-muted">
              <span className="shrink-0 font-semibold">Link</span>
              <span className="flex min-w-0 items-center rounded-md border border-line bg-fill px-2 py-1 focus-within:border-brand">
                <span aria-hidden>#</span>
                <input
                  aria-label={`Section ${i + 1} link name`}
                  value={s.anchor}
                  maxLength={60}
                  onChange={(e) => patch(s.id, { anchor: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                  onBlur={() => patch(s.id, { anchor: sectionId(s.anchor) })}
                  placeholder={sectionId(s.title) || 'from-the-title'}
                  className="w-44 min-w-0 border-0 bg-transparent p-0 text-ink outline-none placeholder:text-ink-faint"
                />
              </span>
            </label>
            <RichTextEditor
              aria-label={`Section ${i + 1} writing`}
              defaultValue={s.body}
              uploadImage={uploadImage}
              minHeight="8rem"
              placeholder="Write this section…"
              onChange={({ json, text }) => {
                patch(s.id, { body: json })
                onText(s.id, text)
              }}
            />
          </section>
        )
      })}
      {errors.sections ? (
        <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
          {errors.sections}
        </p>
      ) : null}
      {sections.length < PAGE_SECTIONS_MAX ? (
        <Button variant="outline" className="self-start" leading={<Plus size={16} aria-hidden />} onClick={() => setSections((all) => [...all, newSection()])}>
          Add a section
        </Button>
      ) : (
        <p className="m-0 text-[0.85rem] text-muted">Up to {PAGE_SECTIONS_MAX} sections.</p>
      )}
    </div>
  )
}
