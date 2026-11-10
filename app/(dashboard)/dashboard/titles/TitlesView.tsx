'use client'

import { FileText, PanelTop, RotateCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { Alert, Badge, Button } from '@/components'
import { Field, Input, TextArea } from '@/components/Form'
import { SITE_NAME } from '@/globals/config/site'
import { LogoMark } from '@/globals/Logo'
import { savePageMeta } from '@/lib/dashboard/actions'
import { BUILT_IN_PAGE_META, META_LIMITS, withSaved } from '@/lib/pageMeta'
import type { PageMetaRow } from '@/lib/supabase/types'

import { PageTitle, Panel, useAction } from '../ui'

/** What app/layout.tsx puts after every title */
const SUFFIX = ` | ${SITE_NAME}`

/** Where search results tend to cut a title off, the club's name included */
const SEARCH_TITLE_CUT = 60

type Draft = Record<string, { title: string; description: string }>
type Managed = { id: string; slug: string; title: string; description?: string | null }

/** The fields as officers last saved them; blank where the site's own is used */
const draftFrom = (rows: PageMetaRow[]): Draft =>
  Object.fromEntries(BUILT_IN_PAGE_META.map((m) => [m.path, { title: rows.find((r) => r.path === m.path)?.title ?? '', description: rows.find((r) => r.path === m.path)?.description ?? '' }]))

/** Spaces as the server keeps them, so what's saved and what's on screen stay the same */
const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()

/** A browser tab, roughly: what the title looks like cut down to size */
const TabPreview: FC<{ title: string }> = ({ title }) => (
  <div aria-hidden className="border-b border-line">
    <div className="-mb-px flex w-full max-w-64 items-center gap-2 rounded-t-lg border border-b-surface border-line bg-surface px-3 py-1.5 text-[0.78rem] text-ink">
      <LogoMark size={16} />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <X size={12} className="shrink-0 text-muted" />
    </div>
  </div>
)

/** A search result, roughly */
const SearchPreview: FC<{ title: string; description: string; label: string }> = ({ title, description, label }) => (
  <div aria-label={label} className="rounded-lg bg-fill px-3 py-2">
    <p className="m-0 truncate text-[0.92rem] font-semibold text-brand">{title}</p>
    <p className="m-0 line-clamp-2 text-[0.8rem] text-muted">{description}</p>
  </div>
)

/**
 * What the site's own pages are called in the browser tab and in search. Blank keeps the
 * site's own (shown as the placeholder). A page published from Pages sets its own, so those
 * are listed apart, with where to change them: typing here wouldn't show anywhere.
 */
export const TitlesView: FC<{ rows: PageMetaRow[] | null; managed: Managed[] }> = ({ rows, managed }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [saved, setSaved] = useState(() => draftFrom(rows ?? []))
  const [draft, setDraft] = useState(saved)
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)

  if (!rows)
    return (
      <>
        <PageTitle icon={<PanelTop />} title="Tab titles" />
        <Alert tone="warning" title="The page titles table isn’t set up yet">
          Run the page titles migration (npx supabase db push), then reload. Pages keep their own titles until then.
        </Alert>
      </>
    )

  const set = (path: string, patch: Partial<Draft[string]>) => setDraft((d) => ({ ...d, [path]: { ...d[path], ...patch } }))
  const pageFor = (sitePage: string | undefined) => managed.find((p) => p.slug === sitePage)
  const editable = BUILT_IN_PAGE_META.filter((m) => !pageFor(m.sitePage))
  const elsewhere = BUILT_IN_PAGE_META.filter((m) => pageFor(m.sitePage))

  const tooLong = (path: string, key: keyof typeof META_LIMITS) => tidy(draft[path][key]).length > META_LIMITS[key]
  const overLimit = editable.flatMap((m) => (['title', 'description'] as const).filter((key) => tooLong(m.path, key))).length

  const save = () => {
    const clean = Object.fromEntries(Object.entries(draft).map(([path, d]) => [path, { title: tidy(d.title), description: tidy(d.description) }]))
    run(
      () => {
        const form = new FormData()
        form.set('meta', JSON.stringify(Object.entries(clean).map(([path, d]) => ({ path, ...d }))))
        return savePageMeta(form)
      },
      () => {
        setDraft(clean)
        setSaved(clean)
        router.refresh()
      }
    )
  }

  return (
    <>
      <PageTitle icon={<PanelTop />} title="Tab titles" description="What the site’s own pages are called in the browser tab and in search results. Leave a field blank to keep the site’s own." />
      <div className="flex flex-col gap-6 pb-6">
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {editable.map((m) => {
            const fields = draft[m.path]
            const shown = withSaved(m, fields)
            const custom = !!(fields.title || fields.description)
            const unsaved = JSON.stringify(fields) !== JSON.stringify(saved[m.path])
            const fullTitle = `${tidy(shown.title)}${SUFFIX}`
            return (
              <section key={m.path} aria-label={m.name} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 text-[1rem] font-bold text-ink">{m.name}</h2>
                  <span className="text-[0.85rem] text-muted">{m.path}</span>
                  {unsaved ? (
                    <Badge size="sm" dot tone="warning">
                      Unsaved
                    </Badge>
                  ) : custom ? (
                    <Badge size="sm" tone="brand">
                      Changed
                    </Badge>
                  ) : null}
                  {custom ? (
                    <button
                      type="button"
                      onClick={() => set(m.path, { title: '', description: '' })}
                      className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md text-[0.8rem] font-semibold text-ink-soft hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <RotateCcw size={13} aria-hidden /> Use the site’s own
                    </button>
                  ) : null}
                </div>
                <TabPreview title={fullTitle} />
                <Field
                  label="Title"
                  error={errors[`${m.path}.title`] ?? (tooLong(m.path, 'title') ? `Keep it under ${META_LIMITS.title} characters.` : undefined)}
                  description={`${fields.title.length}/${META_LIMITS.title}${fullTitle.length > SEARCH_TITLE_CUT ? '. Long enough that search results may cut it off.' : ''}`}
                >
                  <Input value={fields.title} placeholder={m.title} onChange={(e) => set(m.path, { title: e.target.value })} />
                </Field>
                <Field
                  label="Search description"
                  error={errors[`${m.path}.description`] ?? (tooLong(m.path, 'description') ? `Keep it under ${META_LIMITS.description} characters.` : undefined)}
                  description={`${fields.description.length}/${META_LIMITS.description}`}
                >
                  <TextArea rows={2} value={fields.description} placeholder={m.description} onChange={(e) => set(m.path, { description: e.target.value })} />
                </Field>
                <SearchPreview title={fullTitle} description={shown.description} label={`How ${m.name} shows in search`} />
              </section>
            )
          })}
        </div>

        {elsewhere.length ? (
          <Panel title="Set in Pages" icon={<FileText />}>
            <p className="m-0 text-[0.85rem] text-muted">These are published from Pages, so the title and description there are what show in the tab and in search. Change them on the page itself.</p>
            <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-2">
              {elsewhere.map((m) => {
                const page = pageFor(m.sitePage)!
                return (
                  <li key={m.path} className="min-w-0">
                    <section aria-label={m.name} className="flex h-full flex-col gap-2 rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-baseline gap-2">
                          <span className="font-bold text-ink">{m.name}</span>
                          <span className="text-[0.85rem] text-muted">{m.path}</span>
                        </span>
                        <Button href={`/dashboard/pages/${page.id}`} size="sm" variant="outline">
                          Edit in Pages
                        </Button>
                      </div>
                      <SearchPreview title={`${page.title}${SUFFIX}`} description={page.description ?? withSaved(m, saved[m.path]).description} label={`How ${m.name} shows in search`} />
                    </section>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button size="sm" loading={pending} disabled={!changed || overLimit > 0} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={!changed} onClick={() => setDraft(saved)}>
          Undo changes
        </Button>
        {errors.meta ? (
          <span role="alert" className="ml-auto text-[0.8rem] font-semibold text-danger">
            {errors.meta}
          </span>
        ) : overLimit ? (
          <span role="status" className="ml-auto text-[0.8rem] font-semibold text-danger">
            {overLimit === 1 ? 'Shorten 1 field to save' : `Shorten ${overLimit} fields to save`}
          </span>
        ) : changed ? (
          <span className="ml-auto text-[0.8rem] text-muted">Unsaved changes</span>
        ) : null}
      </div>
    </>
  )
}
