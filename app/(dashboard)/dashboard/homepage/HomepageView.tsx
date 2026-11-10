'use client'

import { LayoutTemplate } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, useNotify } from '@/components'
import { Field, Input, Sortable, SortableHandle, Switch, TextArea } from '@/components/Form'
import { saveHomepage } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { BUILT_IN_HOMEPAGE, HOME_SECTIONS, homepageFrom, type HomeButton, type HomepageContent, type HomeSection } from '@/lib/homepage'
import type { HomepageRow } from '@/lib/supabase/types'
import { cn } from '@/lib/cn'

import { PageTitle, useAction } from '../ui'

type Errors = Record<string, string | undefined>

const LINK_HINT = 'Link words like [reach out](/contact) or [PIN](https://pin.gsu.edu/…).'

const Card: FC<{ title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }> = ({ title, description, actions, children, className }) => (
  <section className={cn('flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="m-0 text-[1rem] font-bold text-ink">{title}</h2>
        {description ? <p className="m-0 text-[0.85rem] text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
    {children}
  </section>
)

/** A button's words and link; with `optional`, a switch to have none */
const ButtonFields: FC<{ label: string; value: HomeButton | null; fallback: HomeButton; onChange: (b: HomeButton | null) => void; errors: Errors; at: string; optional?: boolean }> = ({
  label,
  value,
  fallback,
  onChange,
  errors,
  at,
  optional,
}) => (
  <div className="flex flex-col gap-3">
    {optional ? (
      <Switch checked={!!value} onCheckedChange={(on) => onChange(on ? (value ?? fallback) : null)}>
        {label}
      </Switch>
    ) : (
      <p className="m-0 text-[0.9rem] font-semibold text-ink">{label}</p>
    )}
    {value ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Words" error={errors[`${at}.label`]}>
          <Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} />
        </Field>
        <Field label="Link" error={errors[`${at}.href`]}>
          <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="/join" />
        </Field>
      </div>
    ) : null}
  </div>
)

const SectionFields: FC<{ section: HomeSection; onChange: (s: HomeSection) => void; errors: Errors }> = ({ section: s, onChange, errors }) => {
  const fallback = BUILT_IN_HOMEPAGE.sections.find((b) => b.id === s.id)
  const set = (patch: Partial<HomeSection>) => onChange({ ...s, ...patch })
  return (
    <div className={cn('flex flex-col gap-4', !s.shown && 'opacity-60')}>
      <Field label="Section name" description="What it’s called here in the dashboard." error={errors[`${s.id}.name`]} className="sm:max-w-xs">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <Field label="Label" error={errors[`${s.id}.eyebrow`]}>
          <Input value={s.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} />
        </Field>
        <Field label={s.quietTitle !== undefined ? 'Title, with events coming up' : 'Title'} error={errors[`${s.id}.title`]}>
          <Input value={s.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
      </div>
      <Field label={s.quietLead !== undefined ? 'Intro, with events coming up' : 'Intro'} description={LINK_HINT} error={errors[`${s.id}.lead`]}>
        <TextArea rows={2} value={s.lead} onChange={(e) => set({ lead: e.target.value })} />
      </Field>
      {s.quietTitle !== undefined ? (
        <>
          <Field label="Title, with nothing scheduled" description="Recent events show instead." error={errors[`${s.id}.quietTitle`]}>
            <Input value={s.quietTitle} onChange={(e) => set({ quietTitle: e.target.value })} />
          </Field>
          <Field label="Intro, with nothing scheduled" error={errors[`${s.id}.quietLead`]}>
            <TextArea rows={2} value={s.quietLead ?? ''} onChange={(e) => set({ quietLead: e.target.value })} />
          </Field>
        </>
      ) : null}
      <ButtonFields label="A button under it" optional value={s.cta} fallback={fallback?.cta ?? { label: '', href: '' }} onChange={(cta) => set({ cta })} errors={errors} at={`${s.id}.cta`} />
    </div>
  )
}

/**
 * The homepage's words: the hero, and its sections, which can be hidden and put in another
 * order. What each section shows (the cards, events, steps, links) stays as it is.
 */
export const HomepageView: FC<{ row: HomepageRow | null }> = ({ row }) => {
  const router = useRouter()
  const { confirm } = useNotify()
  const { pending, errors, run } = useAction()
  const [saved, setSaved] = useState(() => homepageFrom(row?.content))
  const [content, setContent] = useState<HomepageContent>(saved)
  const changed = JSON.stringify(content) !== JSON.stringify(saved)
  const isBuiltIn = JSON.stringify(content) === JSON.stringify(BUILT_IN_HOMEPAGE)

  const setHero = (patch: Partial<HomepageContent['hero']>) => setContent((c) => ({ ...c, hero: { ...c.hero, ...patch } }))
  const setSection = (s: HomeSection) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === s.id ? s : x)) }))

  if (!row)
    return (
      <>
        <PageTitle icon={<LayoutTemplate />} title="Homepage" />
        <Alert tone="warning" title="The homepage table isn’t set up yet">
          Run the homepage migration (npx supabase db push), then reload. The site shows its built-in homepage until then.
        </Alert>
      </>
    )

  const save = () =>
    run(
      () => {
        const form = new FormData()
        form.set('content', JSON.stringify(content))
        return saveHomepage(form)
      },
      () => {
        setSaved(content)
        router.refresh()
      }
    )

  return (
    <>
      <PageTitle
        icon={<LayoutTemplate />}
        title="Homepage"
        description="The words on the homepage, and which sections it shows in what order. Saving puts them on the site right away."
        actions={
          <>
            <Button href="/dashboard/titles" size="sm" variant="ghost">
              Tab title and search description
            </Button>
            <Button href="/" size="sm" variant="outline" external>
              Open the homepage
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-6 pb-24">
        <Card title="Top of the page" description="Under the logo, filling the first screen.">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Field label="Above the title" error={errors['hero.eyebrow']}>
              <Input value={content.hero.eyebrow} onChange={(e) => setHero({ eyebrow: e.target.value })} />
            </Field>
            <Field label="Title" error={errors['hero.title']}>
              <Input value={content.hero.title} onChange={(e) => setHero({ title: e.target.value })} />
            </Field>
          </div>
          <Field label="Under the title" description={LINK_HINT} error={errors['hero.lead']}>
            <TextArea rows={3} value={content.hero.lead} onChange={(e) => setHero({ lead: e.target.value })} />
          </Field>
          <ButtonFields label="Main button" value={content.hero.primary} fallback={BUILT_IN_HOMEPAGE.hero.primary} onChange={(b) => b && setHero({ primary: b })} errors={errors} at="hero.primary" />
          <ButtonFields
            label="A second button"
            optional
            value={content.hero.secondary}
            fallback={BUILT_IN_HOMEPAGE.hero.secondary ?? { label: '', href: '' }}
            onChange={(secondary) => setHero({ secondary })}
            errors={errors}
            at="hero.secondary"
          />
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-[1rem] font-bold text-ink">Sections</h2>
          <p className="m-0 text-[0.85rem] text-muted">In the page’s order: drag the grips, or focus one and press Space, then the arrow keys. Every other shown section gets a tinted background.</p>
          {errors.sections ? <Alert tone="danger">{errors.sections}</Alert> : null}
        </div>
        <Sortable
          aria-label="Homepage sections, in order"
          items={content.sections}
          onItemsChange={(sections) => setContent((c) => ({ ...c, sections }))}
          getKey={(s) => s.id}
          getLabel={(s) => s.name}
          renderItem={(s, { handleProps, active }) => (
            <Card
              className={cn('mb-4', active && 'border-brand')}
              title={
                <span className="flex items-center gap-2">
                  <SortableHandle {...handleProps} />
                  {s.name || 'Untitled section'}
                  {s.shown ? null : <Badge size="sm">Hidden</Badge>}
                </span>
              }
              description={HOME_SECTIONS[s.id].shows}
              actions={
                <Switch size="sm" checked={s.shown} onCheckedChange={(shown) => setSection({ ...s, shown })}>
                  Show
                </Switch>
              }
            >
              <SectionFields section={s} onChange={setSection} errors={errors} />
            </Card>
          )}
        />
      </div>

      {/* Stays in reach while scrolling the long form */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button size="sm" loading={pending} disabled={!changed} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={!changed} onClick={() => setContent(saved)}>
          Undo changes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isBuiltIn}
          onClick={async () => {
            if (await confirm({ title: 'Use the built-in words?', message: 'Every field goes back to the site’s original homepage. Nothing changes on the site until you save.', confirmLabel: 'Use them' }))
              setContent(BUILT_IN_HOMEPAGE)
          }}
        >
          Use the built-in words
        </Button>
        <span className="ml-auto text-[0.8rem] text-muted">
          {changed ? 'Unsaved changes' : row.updated_by ? `Last changed by ${row.updated_by.split('@')[0]}, ${formatDate(row.updated_at)}` : 'Showing the built-in words'}
        </span>
      </div>
    </>
  )
}
