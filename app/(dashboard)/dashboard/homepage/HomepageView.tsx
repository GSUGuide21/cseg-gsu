'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ban, ExternalLink, Eye, EyeOff, History, LayoutTemplate, Mail, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, Dialog, useNotify } from '@/components'
import { Checkbox, Field, Input, SegmentedControl, Switch } from '@/components/Form'
import { useClubDetails } from '@/globals/ClubDetails'
import { ConnectGrid } from '@/globals/ConnectGrid'
import { SOCIAL_META } from '@/globals/config/socialMeta'
import { HomepageHero, HomepageSection } from '@/globals/Homepage'
import { JoinSteps, OfferingCards } from '@/globals/Page'
import { CARD_ICONS } from '@/lib/richtext/blocks/cards'
import { inlineLink } from '@/globals/ui/styles'
import { useInterceptNavigation } from '@/hooks/useInterceptNavigation'
import { saveHomepage } from '@/lib/dashboard/actions'
import { clearDraft, readDraft, writeDraft, type StoredDraft } from '@/lib/dashboard/draftStore'
import { formatDate } from '@/lib/dashboard/format'
import {
  BUILT_IN_HOMEPAGE,
  HERO_LIMITS,
  HOME_CONNECT_KEYS,
  HOME_EVENTS_MAX,
  HOME_ITEMS,
  HOME_SECTIONS,
  homepageFrom,
  leadParts,
  type HeroButton,
  type HeroMedia,
  type HeroMediaKind,
  type HeroSlide,
  type HomeButton,
  type HomeHero,
  type HomeItem,
  type HomepageContent,
  type HomeSection,
} from '@/lib/homepage'
import type { HomepageRow } from '@/lib/supabase/types'
import { safeSrc } from '@/lib/safeUrl'
import { cn } from '@/lib/cn'

import { ImageField } from '../ImageField'
import { PageTitle, useAction } from '../ui'

type Errors = Record<string, string | undefined>

const LINK_HINT = 'Link words like [reach out](/contact) or [PIN](https://pin.gsu.edu/…).'
/** How long after the last change the words are kept in this browser */
const AUTOSAVE_MS = 1000
const DRAFT = ['homepage', null] as const

/** A card in the side column: a heading, then its contents (as the page editor's) */
const SideCard: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
    <h2 className="m-0 text-[0.85rem] font-bold tracking-wide text-ink">{title}</h2>
    {children}
  </section>
)

/** Words typed where they show, at the size they show: a title, a label, a line under it */
const InPlace: FC<{ label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; multiline?: boolean; className?: string }> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  multiline,
  className,
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <textarea
      aria-label={label}
      rows={1}
      value={value}
      onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\n/g, ' '))}
      placeholder={placeholder}
      aria-invalid={!!error || undefined}
      className={cn('field-sizing-content w-full resize-none rounded-md border-0 bg-transparent p-0 text-ink outline-none placeholder:text-ink-faint/60 focus-visible:bg-fill', className)}
    />
    {error ? (
      <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
        {error}
      </p>
    ) : null}
  </div>
)

/** A button's words and link, beside a look at the button; with `optional`, a switch to have none */
const ButtonFields: FC<{ label: string; value: HomeButton | null; fallback: HomeButton; onChange: (b: HomeButton | null) => void; errors: Errors; at: string; optional?: boolean; primary?: boolean }> = ({
  label,
  value,
  fallback,
  onChange,
  errors,
  at,
  optional,
  primary,
}) => (
  <div className="flex flex-col gap-3 rounded-lg border border-line bg-fill/60 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      {optional ? (
        <Switch size="sm" checked={!!value} onCheckedChange={(on) => onChange(on ? (value ?? fallback) : null)}>
          {label}
        </Switch>
      ) : (
        <p className="m-0 text-[0.85rem] font-semibold text-ink">{label}</p>
      )}
      {value?.label ? (
        <span aria-hidden className={cn('rounded-lg border-2 px-3 py-1 text-[0.8rem] font-semibold', primary ? 'border-transparent bg-brand-solid text-white' : 'border-brand text-brand')}>
          {value.label}
        </span>
      ) : null}
    </div>
    {value ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Words" error={errors[`${at}.label`]}>
          <Input size="sm" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} />
        </Field>
        <Field label="Link" error={errors[`${at}.href`]}>
          <Input size="sm" value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="/join" />
        </Field>
      </div>
    ) : null}
  </div>
)

const iconButton =
  'grid size-8 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

/** A label above a title, as the site shows it */
const eyebrowText = 'text-[0.75rem] font-bold tracking-[0.14em] text-brand uppercase'

/** Picks a card's icon from the site's card icons, or none */
const IconPicker: FC<{ value: string; onChange: (icon: string) => void; label: string }> = ({ value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
    {[['', { label: 'No icon', Icon: Ban }] as const, ...Object.entries(CARD_ICONS)].map(([key, { label: name, Icon }]) => (
      <button
        key={key}
        type="button"
        role="radio"
        aria-checked={value === key}
        aria-label={name}
        title={name}
        onClick={() => onChange(key)}
        className="grid size-8 cursor-pointer place-items-center rounded-md border border-transparent text-ink-soft transition-colors hover:bg-fill hover:text-ink aria-checked:border-brand aria-checked:bg-brand-tint aria-checked:text-brand [&>svg]:size-4"
      >
        <Icon aria-hidden />
      </button>
    ))}
  </div>
)

/**
 * A section's cards (offerings) or steps (join), each in a box shaped like it on the site,
 * with buttons to move it or take it out, and one to add another
 */
const ItemsEditor: FC<{ section: HomeSection & { id: 'offerings' | 'join' }; set: (patch: Partial<HomeSection>) => void; errors: Errors }> = ({ section: s, set, errors }) => {
  const items = s.items ?? []
  const { min, max, noun } = HOME_ITEMS[s.id]
  const cards = s.id === 'offerings'
  const Noun = noun[0].toUpperCase() + noun.slice(1)
  const patch = (i: number, change: Partial<HomeItem>) => set({ items: items.map((item, j) => (j === i ? { ...item, ...change } : item)) })
  const move = (i: number, by: -1 | 1) => {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    set({ items: next })
  }
  return (
    <div className="flex flex-col gap-3">
      <ol className={cn('m-0 grid list-none gap-3 p-0', cards ? 'sm:grid-cols-2' : 'sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]')}>
        {items.map((item, i) => {
          const Icon = CARD_ICONS[item.icon]?.Icon
          const at = `${s.id}.items.${i}`
          return (
            <li key={i} aria-label={`${Noun} ${i + 1}`} className={cn('flex flex-col gap-2 p-3', cards ? 'rounded-xl border border-line bg-surface' : 'border-t-2 border-line first:border-brand')}>
              <div className="flex items-center gap-1">
                {cards ? (
                  Icon ? (
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] bg-brand-tint text-brand [&>svg]:size-4.5">
                      <Icon />
                    </span>
                  ) : null
                ) : (
                  <span className="text-[0.8rem] font-bold text-brand">Step {i + 1}</span>
                )}
                <div className="ml-auto flex items-center">
                  <button type="button" aria-label={`Move ${noun} ${i + 1} ${cards ? 'back' : 'up'}`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                    {cards ? <ArrowLeft aria-hidden /> : <ArrowUp aria-hidden />}
                  </button>
                  <button type="button" aria-label={`Move ${noun} ${i + 1} ${cards ? 'forward' : 'down'}`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                    {cards ? <ArrowRight aria-hidden /> : <ArrowDown aria-hidden />}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${noun} ${i + 1}`}
                    disabled={items.length <= min}
                    onClick={() => set({ items: items.filter((_, j) => j !== i) })}
                    className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}
                  >
                    <Trash2 aria-hidden />
                  </button>
                </div>
              </div>
              <InPlace label={`${Noun} ${i + 1} title`} value={item.title} onChange={(title) => patch(i, { title })} error={errors[`${at}.title`]} placeholder={`${Noun} title`} className="text-[1.02rem] font-bold" />
              <InPlace
                label={`${Noun} ${i + 1} words`}
                value={item.body}
                onChange={(body) => patch(i, { body })}
                error={errors[`${at}.body`]}
                placeholder="A sentence or two (optional)"
                multiline
                className="text-[0.9rem] leading-relaxed text-muted"
              />
              {cards ? (
                <details className="group/icon">
                  <summary className="cursor-pointer list-none text-[0.78rem] font-semibold text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
                    Icon: {CARD_ICONS[item.icon]?.label ?? 'none'} <span className="text-ink-faint group-open/icon:hidden">· change</span>
                  </summary>
                  <div className="pt-2">
                    <IconPicker label={`Card ${i + 1} icon`} value={item.icon} onChange={(icon) => patch(i, { icon })} />
                  </div>
                </details>
              ) : null}
            </li>
          )
        })}
      </ol>
      {errors[`${s.id}.items`] ? (
        <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
          {errors[`${s.id}.items`]}
        </p>
      ) : null}
      {items.length < max ? (
        <Button size="sm" variant="outline" className="self-start" leading={<Plus size={15} aria-hidden />} onClick={() => set({ items: [...items, { icon: cards ? 'star' : '', title: '', body: '' }] })}>
          Add a {noun}
        </Button>
      ) : (
        <p className="m-0 text-[0.8rem] text-muted">
          Up to {max} {noun}s.
        </p>
      )}
      {s.id === 'join' ? <p className="m-0 text-[0.78rem] text-muted">The Join page shows these steps too.</p> : null}
    </div>
  )
}

/** How many events show, and whether past ones stand in while nothing's scheduled */
const EventsEditor: FC<{ section: HomeSection; set: (patch: Partial<HomeSection>) => void }> = ({ section: s, set }) => (
  <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p id="home-events-count" className="m-0 text-[0.85rem] font-semibold text-ink">
        Events to show
      </p>
      <SegmentedControl
        aria-label="Events to show"
        size="sm"
        options={Array.from({ length: HOME_EVENTS_MAX }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        value={String(s.count ?? 2)}
        onValueChange={(v) => set({ count: Number(v) })}
      />
    </div>
    <Switch size="sm" checked={s.showPast !== false} onCheckedChange={(showPast) => set({ showPast })} description="Otherwise only the words for when nothing’s scheduled show.">
      Show recent events when nothing’s coming up
    </Switch>
    <p className="m-0 text-[0.78rem] text-muted">
      The events themselves come from{' '}
      <Link href="/dashboard/events" className={inlineLink}>
        Events
      </Link>
      .
    </p>
  </div>
)

/** Which ways to connect show, each as the site has it (a network needs its link in Settings) */
const ConnectEditor: FC<{ section: HomeSection; set: (patch: Partial<HomeSection>) => void }> = ({ section: s, set }) => {
  const { links, contactEmail } = useClubDetails()
  const hidden = s.hidden ?? []
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <p className="m-0 text-[0.85rem] font-semibold text-ink">Ways to connect</p>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {HOME_CONNECT_KEYS.map((key) => {
          const meta = key === 'email' ? { label: 'Email', Icon: Mail } : SOCIAL_META[key]
          const link = key === 'email' ? contactEmail : links[key]
          return (
            <li key={key}>
              <Checkbox
                variant="card"
                checked={!hidden.includes(key)}
                disabled={!link}
                onCheckedChange={(on) => set({ hidden: on ? hidden.filter((k) => k !== key) : [...hidden, key] })}
                description={link ? link.replace(/^(https?:\/\/(www\.)?|mailto:)/, '') : 'No link yet; add one in Settings'}
              >
                <span className="inline-flex items-center gap-1.5">
                  <meta.Icon className="size-4 text-brand" aria-hidden />
                  {meta.label}
                </span>
              </Checkbox>
            </li>
          )
        })}
      </ul>
      <p className="m-0 text-[0.78rem] text-muted">
        The links themselves are set in{' '}
        <Link href="/dashboard/settings" className={inlineLink}>
          Settings
        </Link>
        .
      </p>
    </div>
  )
}

/** What a section holds under its words, edited in place */
const SectionContent: FC<{ section: HomeSection; set: (patch: Partial<HomeSection>) => void; errors: Errors }> = ({ section: s, set, errors }) => {
  if (s.id === 'offerings' || s.id === 'join') return <ItemsEditor section={s as HomeSection & { id: 'offerings' | 'join' }} set={set} errors={errors} />
  if (s.id === 'events') return <EventsEditor section={s} set={set} />
  return <ConnectEditor section={s} set={set} />
}

/**
 * One section, laid out as the site shows it: its label, its title (with the brand bar), the
 * line under it, what it holds (its cards, steps, events, or ways to connect), and its
 * button. Its header moves it, and shows or hides it.
 */
const SectionCard: FC<{ section: HomeSection; at: number; count: number; onChange: (s: HomeSection) => void; onMove: (by: -1 | 1) => void; errors: Errors }> = ({ section: s, at, count, onChange, onMove, errors }) => {
  const fallback = BUILT_IN_HOMEPAGE.sections.find((b) => b.id === s.id)
  const set = (patch: Partial<HomeSection>) => onChange({ ...s, ...patch })
  const head = `home-section-${s.id}`
  return (
    <section id={`home-${s.id}`} aria-labelledby={head} className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={head} className="m-0 flex items-center gap-2 text-[0.75rem] font-bold tracking-wide text-muted uppercase">
          Section {at + 1} · {s.name || 'Untitled section'}
          {s.shown ? null : <Badge size="sm">Hidden</Badge>}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label={`Move ${s.name || 'this section'} up`} disabled={at === 0} onClick={() => onMove(-1)} className={iconButton}>
            <ArrowUp aria-hidden />
          </button>
          <button type="button" aria-label={`Move ${s.name || 'this section'} down`} disabled={at === count - 1} onClick={() => onMove(1)} className={iconButton}>
            <ArrowDown aria-hidden />
          </button>
          <Switch size="sm" checked={s.shown} onCheckedChange={(shown) => set({ shown })}>
            Show
          </Switch>
        </div>
      </div>

      <p className="m-0 -mt-2 text-[0.8rem] text-muted">{HOME_SECTIONS[s.id].shows}</p>

      <div className={cn('flex flex-col gap-3', !s.shown && 'opacity-55')}>
        <InPlace label="Label" value={s.eyebrow} onChange={(eyebrow) => set({ eyebrow })} error={errors[`${s.id}.eyebrow`]} placeholder="Label" className={eyebrowText} />
        <div className="flex items-start gap-3">
          <span className="mt-1 h-6 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
          <InPlace
            label={s.quietTitle !== undefined ? 'Title, with events coming up' : 'Title'}
            value={s.title}
            onChange={(title) => set({ title })}
            error={errors[`${s.id}.title`]}
            placeholder="Section title"
            className="text-[1.35rem] leading-snug font-bold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <InPlace
            label={s.quietLead !== undefined ? 'Intro, with events coming up' : 'Intro'}
            value={s.lead}
            onChange={(lead) => set({ lead })}
            error={errors[`${s.id}.lead`]}
            placeholder="A line or two under the title (optional)"
            multiline
            className="text-[0.95rem] leading-relaxed text-muted"
          />
          <p className="m-0 text-[0.75rem] text-ink-faint">{LINK_HINT}</p>
        </div>

        {s.quietTitle !== undefined ? (
          <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <p className="m-0 text-[0.8rem] font-semibold text-ink">With nothing scheduled</p>
            <p className="m-0 -mt-1 text-[0.75rem] text-muted">Recent events show instead, under these words.</p>
            <InPlace label="Title, with nothing scheduled" value={s.quietTitle} onChange={(quietTitle) => set({ quietTitle })} error={errors[`${s.id}.quietTitle`]} className="text-[1.05rem] font-bold" />
            <InPlace label="Intro, with nothing scheduled" value={s.quietLead ?? ''} onChange={(quietLead) => set({ quietLead })} error={errors[`${s.id}.quietLead`]} multiline className="text-[0.9rem] leading-relaxed text-muted" />
          </div>
        ) : null}

        {/* What the section holds, under its words */}
        <SectionContent section={s} set={set} errors={errors} />

        <ButtonFields label="A button under it" optional value={s.cta} fallback={fallback?.cta ?? { label: '', href: '' }} onChange={(cta) => set({ cta })} errors={errors} at={`${s.id}.cta`} />

        <Field label="Section name" description="What it’s called here in the dashboard." error={errors[`${s.id}.name`]} className="sm:max-w-xs">
          <Input size="sm" value={s.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
      </div>
    </section>
  )
}

/** The picture the hero's words sit on in the editor: the image, the first slide, or the video's cover */
const stagePicture = (m: HeroMedia) => (m.kind === 'image' ? m.image.src : m.kind === 'slideshow' ? (m.slides[0]?.src ?? '') : m.kind === 'video' ? m.video.poster : '')

/**
 * The hero's words, typed where they show, at the size they show: the line above the title,
 * the title, the subtitle, and the description. Over the hero's picture (in white, under a
 * dark wash) once it has one, as on the site.
 */
const HeroStage: FC<{ hero: HomeHero; setHero: (patch: Partial<HomeHero>) => void; errors: Errors }> = ({ hero, setHero, errors }) => {
  const picture = stagePicture(hero.media)
  const dark = hero.media.kind !== 'none'
  return (
    <div
      className={cn(
        'relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-lg px-3 py-8 text-center [&_textarea]:text-center',
        dark ? 'bg-[#0b1530] text-white [&_textarea]:text-white [&_textarea]:placeholder:text-white/55 [&_textarea]:focus-visible:bg-white/10' : 'bg-[radial-gradient(40rem_16rem_at_50%_-20%,color-mix(in_srgb,var(--brand)_12%,transparent),transparent_70%)]'
      )}
    >
      {dark && safeSrc(picture) ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- officers' pictures, at any size */}
          <img src={safeSrc(picture) ?? ''} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-black/50" />
        </>
      ) : null}
      <InPlace label="Above the title" value={hero.eyebrow} onChange={(eyebrow) => setHero({ eyebrow })} error={errors['hero.eyebrow']} placeholder="A line above the title (optional)" className={cn(eyebrowText, dark && 'text-white/85!')} />
      <InPlace
        label="Title"
        value={hero.title}
        onChange={(title) => setHero({ title })}
        error={errors['hero.title']}
        placeholder="The homepage’s title"
        className="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-extrabold tracking-tight"
      />
      <InPlace
        label="Subtitle"
        value={hero.subtitle}
        onChange={(subtitle) => setHero({ subtitle })}
        error={errors['hero.subtitle']}
        placeholder="A subtitle (optional)"
        className={cn('text-[1.2rem] leading-snug font-semibold', dark ? 'opacity-90' : 'text-ink-soft!')}
      />
      <InPlace
        label="Description"
        value={hero.lead}
        onChange={(lead) => setHero({ lead })}
        error={errors['hero.lead']}
        placeholder="A sentence or two about the club (optional)"
        multiline
        className={cn('text-[1.02rem] leading-[1.65]', dark ? 'opacity-85' : 'text-muted!')}
      />
      <p className={cn('m-0 text-[0.75rem]', dark ? 'text-white/65' : 'text-ink-faint')}>{LINK_HINT}</p>
    </div>
  )
}

/** The hero's buttons, in order: each one's words, link, and look, with buttons to move or remove it, and one to add another */
const HeroButtonsEditor: FC<{ buttons: HeroButton[]; onChange: (b: HeroButton[]) => void; errors: Errors }> = ({ buttons, onChange, errors }) => {
  const patch = (i: number, change: Partial<HeroButton>) => onChange(buttons.map((b, j) => (j === i ? { ...b, ...change } : b)))
  const move = (i: number, by: -1 | 1) => {
    const next = [...buttons]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[0.85rem] font-semibold text-ink">Buttons</p>
        {/* How they line up on the site */}
        {buttons.length ? (
          <span aria-hidden className="flex flex-wrap gap-1.5">
            {buttons.map((b, i) => (
              <span key={i} className={cn('rounded-lg border-2 px-2.5 py-0.5 text-[0.75rem] font-semibold', b.style === 'primary' ? 'border-transparent bg-brand-solid text-white' : 'border-brand text-brand')}>
                {b.label || '…'}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      {buttons.length ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {buttons.map((b, i) => (
            <li key={i} aria-label={`Button ${i + 1}`} className="flex flex-col gap-2 rounded-lg bg-fill/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.78rem] font-bold text-muted">Button {i + 1}</span>
                <SegmentedControl
                  aria-label={`Button ${i + 1} look`}
                  size="sm"
                  options={[
                    { value: 'primary', label: 'Solid' },
                    { value: 'outline', label: 'Outlined' },
                  ]}
                  value={b.style}
                  onValueChange={(style) => patch(i, { style: style === 'primary' ? 'primary' : 'outline' })}
                />
                <div className="ml-auto flex items-center">
                  <button type="button" aria-label={`Move button ${i + 1} left`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                    <ArrowLeft aria-hidden />
                  </button>
                  <button type="button" aria-label={`Move button ${i + 1} right`} disabled={i === buttons.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                    <ArrowRight aria-hidden />
                  </button>
                  <button type="button" aria-label={`Remove button ${i + 1}`} onClick={() => onChange(buttons.filter((_, j) => j !== i))} className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}>
                    <Trash2 aria-hidden />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Words" error={errors[`hero.buttons.${i}.label`]}>
                  <Input size="sm" value={b.label} onChange={(e) => patch(i, { label: e.target.value })} />
                </Field>
                <Field label="Link" error={errors[`hero.buttons.${i}.href`]}>
                  <Input size="sm" value={b.href} onChange={(e) => patch(i, { href: e.target.value })} placeholder="/join" />
                </Field>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-[0.8rem] text-muted">No buttons: the hero ends with its words.</p>
      )}
      {errors['hero.buttons'] ? (
        <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
          {errors['hero.buttons']}
        </p>
      ) : null}
      {buttons.length < HERO_LIMITS.buttons ? (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          leading={<Plus size={15} aria-hidden />}
          onClick={() => onChange([...buttons, { label: '', href: '', style: buttons.length ? 'outline' : 'primary' }])}
        >
          Add a button
        </Button>
      ) : (
        <p className="m-0 text-[0.8rem] text-muted">Up to {HERO_LIMITS.buttons} buttons.</p>
      )}
    </div>
  )
}

const MEDIA_OPTIONS: { value: HeroMediaKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'slideshow', label: 'Slideshow' },
]

/** A picture's words for people who can't see it */
const AltField: FC<{ value: string; onChange: (alt: string) => void; error?: string; label?: string }> = ({ value, onChange, error, label = 'Describe it' }) => (
  <Field label={label} description="For people using screen readers. Leave it blank if it’s only decoration." error={error}>
    <Input size="sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Students at the fall social in the Student Center" />
  </Field>
)

/**
 * What's behind the hero's words: nothing, an image, a video, or a slideshow. Each keeps its
 * own settings, so trying another and coming back loses nothing.
 */
const HeroMediaEditor: FC<{ media: HeroMedia; onChange: (m: HeroMedia) => void; errors: Errors }> = ({ media, onChange, errors }) => {
  const set = (patch: Partial<HeroMedia>) => onChange({ ...media, ...patch })
  const slide = (i: number, change: Partial<HeroSlide>) => set({ slides: media.slides.map((s, j) => (j === i ? { ...s, ...change } : s)) })
  const move = (i: number, by: -1 | 1) => {
    const slides = [...media.slides]
    ;[slides[i], slides[i + by]] = [slides[i + by], slides[i]]
    set({ slides })
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[0.85rem] font-semibold text-ink">Background</p>
        <SegmentedControl aria-label="Background" size="sm" options={MEDIA_OPTIONS} value={media.kind} onValueChange={(kind) => set({ kind: kind as HeroMediaKind })} />
      </div>
      {media.kind === 'none' ? <p className="m-0 text-[0.8rem] text-muted">The brand glow, with the words in the site’s colors.</p> : null}
      {media.kind !== 'none' ? <p className="m-0 text-[0.8rem] text-muted">The words show in white over a dark wash, so they read on any picture.</p> : null}

      {media.kind === 'image' ? (
        <>
          <ImageField label="Image" value={media.image.src} onValueChange={(src) => set({ image: { ...media.image, src } })} error={errors['hero.media.image.src']} description="A wide photo works best: 1920 × 1080 or so." />
          <AltField value={media.image.alt} onChange={(alt) => set({ image: { ...media.image, alt } })} error={errors['hero.media.image.alt']} />
        </>
      ) : null}

      {media.kind === 'video' ? (
        <>
          <Field label="Video address" description="An .mp4 or .webm file’s https:// address. It plays muted, on a loop, with a pause button; it waits for visitors who’ve asked their device for less motion." error={errors['hero.media.video.src']}>
            <Input size="sm" inputMode="url" value={media.video.src} onChange={(e) => set({ video: { ...media.video, src: e.target.value } })} placeholder="https://…/welcome.mp4" />
          </Field>
          <ImageField
            label="Cover picture"
            value={media.video.poster}
            onValueChange={(poster) => set({ video: { ...media.video, poster } })}
            error={errors['hero.media.video.poster']}
            description="Shows while the video loads, and in its place when it isn’t playing. Optional, but recommended."
          />
        </>
      ) : null}

      {media.kind === 'slideshow' ? (
        <>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {media.slides.map((s, i) => (
              <li key={i} aria-label={`Picture ${i + 1}`} className="flex flex-col gap-2 rounded-lg bg-fill/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.78rem] font-bold text-muted">Picture {i + 1}</span>
                  <div className="ml-auto flex items-center">
                    <button type="button" aria-label={`Move picture ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                      <ArrowUp aria-hidden />
                    </button>
                    <button type="button" aria-label={`Move picture ${i + 1} down`} disabled={i === media.slides.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                      <ArrowDown aria-hidden />
                    </button>
                    <button type="button" aria-label={`Remove picture ${i + 1}`} onClick={() => set({ slides: media.slides.filter((_, j) => j !== i) })} className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}>
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </div>
                <ImageField label={`Picture ${i + 1}`} value={s.src} onValueChange={(src) => slide(i, { src })} error={errors[`hero.media.slides.${i}.src`]} />
                <AltField label={`Describe picture ${i + 1}`} value={s.alt} onChange={(alt) => slide(i, { alt })} error={errors[`hero.media.slides.${i}.alt`]} />
              </li>
            ))}
          </ol>
          {errors['hero.media.slides'] ? (
            <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
              {errors['hero.media.slides']}
            </p>
          ) : null}
          {media.slides.length < HERO_LIMITS.slides.max ? (
            <Button size="sm" variant="outline" className="self-start" leading={<Plus size={15} aria-hidden />} onClick={() => set({ slides: [...media.slides, { src: '', alt: '' }] })}>
              Add a picture
            </Button>
          ) : (
            <p className="m-0 text-[0.8rem] text-muted">Up to {HERO_LIMITS.slides.max} pictures.</p>
          )}
          <Field label="Seconds on each picture" description={`${HERO_LIMITS.interval.min} to ${HERO_LIMITS.interval.max}. It holds still for visitors who’ve asked for less motion, and has a pause button.`}>
            <Input
              size="sm"
              type="number"
              min={HERO_LIMITS.interval.min}
              max={HERO_LIMITS.interval.max}
              value={media.interval}
              onChange={(e) => set({ interval: Math.min(HERO_LIMITS.interval.max, Math.max(HERO_LIMITS.interval.min, Number(e.target.value) || HERO_LIMITS.interval.min)) })}
              className="max-w-28"
            />
          </Field>
        </>
      ) : null}
    </div>
  )
}

/** A lead's words with its [words](link) as links, for the preview */
const Lead: FC<{ text: string }> = ({ text }) => (
  <>
    {leadParts(text).map((part, i) =>
      typeof part === 'string' ? (
        part
      ) : (
        <a key={i} href={part.href} className={inlineLink} target="_blank" rel="noopener noreferrer">
          {part.text}
        </a>
      )
    )}
  </>
)

/**
 * The homepage's words, laid out like the page editor: a bar along the top that says whether
 * there are unsaved changes and holds Preview, Undo changes, and Save; the hero and each
 * section typed in place, as the site shows them, with buttons to move a section and a switch
 * to hide it; and beside them, the sections in order, links to the site, and how it was last
 * saved (with the way back to the version before). What each section shows (the cards,
 * events, steps, links) stays in code.
 *
 * ⌘/Ctrl+S saves. Leaving with unsaved changes asks first, and they're kept in this browser
 * in the meantime, to bring back next time.
 */
export const HomepageView: FC<{ row: HomepageRow | null }> = ({ row }) => {
  const router = useRouter()
  const { confirm } = useNotify()
  const { pending, errors, run } = useAction()
  const [saved, setSaved] = useState(() => homepageFrom(row?.content))
  const [content, setContent] = useState<HomepageContent>(saved)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [recovered, setRecovered] = useState<StoredDraft | null>(null)
  const snapshot = JSON.stringify(content)
  const changed = snapshot !== JSON.stringify(saved)
  const isBuiltIn = snapshot === JSON.stringify(BUILT_IN_HOMEPAGE)
  // The homepage as it was before the last save: the way back from a save that went wrong
  const hasPrevious = typeof row?.previous_content === 'object' && row.previous_content !== null
  const previous = homepageFrom(row?.previous_content)

  const setHero = (patch: Partial<HomepageContent['hero']>) => setContent((c) => ({ ...c, hero: { ...c.hero, ...patch } }))
  const setSection = (s: HomeSection) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === s.id ? s : x)) }))
  const moveSection = (at: number, by: -1 | 1) =>
    setContent((c) => {
      const sections = [...c.sections]
      ;[sections[at], sections[at + by]] = [sections[at + by], sections[at]]
      return { ...c, sections }
    })

  // Leaving with unsaved changes asks first; what's here is kept in this browser either way
  const screenRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    screenRef.current = document.body
  }, [])
  useInterceptNavigation(screenRef, {
    shouldIntercept: changed,
    onIntercept: async (destination) => {
      const ok = await confirm({
        title: 'Leave without saving?',
        message: 'Your changes aren’t saved. They’re kept in this browser, and offered back the next time you open the homepage here.',
        variant: 'warning',
        confirmLabel: 'Leave',
      })
      if (!ok) return
      writeDraft(...DRAFT, snapshot)
      if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`)
      else window.location.assign(destination.href)
    },
  })

  // What was here last time, if it never got saved
  const draftChecked = useRef(false)
  useEffect(() => {
    if (draftChecked.current) return
    draftChecked.current = true
    const stored = readDraft(...DRAFT)
    if (stored && stored.snapshot !== JSON.stringify(saved)) setRecovered(stored)
    else if (stored) clearDraft(...DRAFT)
  }, [saved])

  // Keep the words as they go, a moment after each change (not over an older copy still waiting for an answer)
  useEffect(() => {
    if (!draftChecked.current || recovered) return
    if (!changed) return clearDraft(...DRAFT)
    const timer = window.setTimeout(() => writeDraft(...DRAFT, snapshot), AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [changed, snapshot, recovered])

  const save = () =>
    run(
      () => {
        const form = new FormData()
        form.set('content', snapshot)
        return saveHomepage(form)
      },
      () => {
        setSaved(content)
        setSavedAt(new Date())
        clearDraft(...DRAFT)
        router.refresh()
      }
    )
  // ⌘/Ctrl+S saves, when there's something to save
  const saveRef = useRef(save)
  saveRef.current = changed && !pending ? save : () => undefined
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!row)
    return (
      <>
        <PageTitle icon={<LayoutTemplate />} title="Homepage" />
        <Alert tone="warning" title="The homepage table isn’t set up yet">
          Run the homepage migration (npx supabase db push), then reload. The site shows its built-in homepage until then.
        </Alert>
      </>
    )

  const lastSaved = savedAt
    ? `Saved at ${savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : row.updated_by
      ? `Last saved ${formatDate(row.updated_at, true)}`
      : 'Showing the built-in words'

  return (
    <div className="flex flex-col gap-6">
      {/* Whether there's anything to save, and what to do with it, always in view */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <h1 className="m-0 inline-flex items-center gap-2 text-[0.95rem] font-bold text-ink">
          <LayoutTemplate size={17} aria-hidden className="text-brand" /> Homepage
        </h1>
        <span className="flex items-center gap-2" aria-live="polite">
          {changed ? (
            <Badge size="sm" dot tone="warning">
              Unsaved changes
            </Badge>
          ) : (
            <Badge size="sm" dot tone="success">
              Live
            </Badge>
          )}
          <span className="text-[0.8rem] text-muted max-sm:hidden">{lastSaved}</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" leading={<Eye size={15} aria-hidden />} onClick={() => setPreviewing(true)}>
            Preview
          </Button>
          <Button size="sm" variant="outline" disabled={!changed} onClick={() => setContent(saved)}>
            Undo changes
          </Button>
          <Button size="sm" loading={pending} disabled={!changed} onClick={save}>
            Save
          </Button>
        </div>
      </div>

      {recovered ? (
        <Alert
          tone="info"
          title="You have unsaved work here"
          actions={
            <>
              <Button
                size="sm"
                onClick={() => {
                  setContent(homepageFrom(JSON.parse(recovered.snapshot)))
                  setRecovered(null)
                }}
              >
                Restore it
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearDraft(...DRAFT)
                  setRecovered(null)
                }}
              >
                Discard it
              </Button>
            </>
          }
        >
          From {formatDate(new Date(recovered.savedAt).toISOString(), true)}, in this browser.
          {Date.parse(row.updated_at) > recovered.savedAt ? ' The homepage was saved again since then, so restoring replaces the newer words.' : ''}
        </Alert>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* The hero, centered as on the site */}
          <section id="home-hero" aria-labelledby="home-hero-head" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-6">
            <div className="flex flex-col gap-0.5">
              <h2 id="home-hero-head" className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                Top of the page
              </h2>
              <p className="m-0 text-[0.8rem] text-muted">Under the logo, filling the first screen.</p>
            </div>
            <HeroStage hero={content.hero} setHero={setHero} errors={errors} />
            <HeroButtonsEditor buttons={content.hero.buttons} onChange={(buttons) => setHero({ buttons })} errors={errors} />
            <HeroMediaEditor media={content.hero.media} onChange={(media) => setHero({ media })} errors={errors} />
          </section>

          {errors.sections ? <Alert tone="danger">{errors.sections}</Alert> : null}
          {content.sections.map((s, i) => (
            <SectionCard key={s.id} section={s} at={i} count={content.sections.length} onChange={setSection} onMove={(by) => moveSection(i, by)} errors={errors} />
          ))}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <SideCard title="On the page">
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0 text-[0.85rem]">
              {[{ id: 'hero', name: 'Top of the page', shown: true }, ...content.sections].map((s, i) => (
                <li key={s.id}>
                  <a href={`#home-${s.id}`} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-ink no-underline hover:bg-fill', !s.shown && 'text-ink-faint')}>
                    <span className="w-4 shrink-0 text-[0.75rem] text-ink-faint tabular-nums">{i ? i : ''}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name || 'Untitled section'}</span>
                    {s.shown ? null : <EyeOff size={14} aria-label="(hidden)" />}
                  </a>
                </li>
              ))}
            </ol>
            <p className="m-0 text-[0.75rem] text-muted">Every other shown section gets a tinted background.</p>
          </SideCard>

          <SideCard title="On the site">
            <Button href="/" size="sm" variant="outline" block external leading={<ExternalLink size={14} aria-hidden />}>
              Open the homepage
            </Button>
            <Button href="/dashboard/titles" size="sm" variant="outline" block leading={<Search size={14} aria-hidden />}>
              Tab title and search description
            </Button>
          </SideCard>

          <SideCard title="Publishing">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-muted">Status</dt>
              <dd className="m-0 text-ink">{changed ? 'Changed here; the site has the saved words' : 'Live on the site'}</dd>
              {row.updated_by ? (
                <>
                  <dt className="text-muted">Changed by</dt>
                  <dd className="m-0 truncate text-ink">{row.updated_by.split('@')[0]}</dd>
                  <dt className="text-muted">When</dt>
                  <dd className="m-0 text-ink">{formatDate(row.updated_at)}</dd>
                </>
              ) : null}
            </dl>
            <p className="m-0 text-[0.75rem] text-muted">Saving puts the words on the site right away, and the version before is kept in case you want it back.</p>
            <Button
              size="sm"
              variant="outline"
              block
              leading={<History size={14} aria-hidden />}
              disabled={!hasPrevious || snapshot === JSON.stringify(previous)}
              title={hasPrevious ? 'The homepage as it was before the last save' : 'Kept from the next save on'}
              onClick={() => setContent(previous)}
            >
              Bring back the previous version
            </Button>
            <Button
              size="sm"
              variant="outline"
              block
              leading={<RotateCcw size={14} aria-hidden />}
              disabled={isBuiltIn}
              onClick={async () => {
                if (await confirm({ title: 'Use the built-in words?', message: 'Every field goes back to the site’s original homepage. Nothing changes on the site until you save.', confirmLabel: 'Use them' }))
                  setContent(BUILT_IN_HOMEPAGE)
              }}
            >
              Use the built-in words
            </Button>
          </SideCard>
        </aside>
      </div>

      <Dialog open={previewing} onClose={() => setPreviewing(false)} title="Preview" description="The homepage with these words. What each section holds is described in its place." size="lg">
        <div className="-mx-2 overflow-hidden rounded-xl border border-line">
          <HomepageHero compact hero={content.hero} lead={<Lead text={content.hero.lead} />} />
          {content.sections
            .filter((s) => s.shown)
            .map((s, i) => (
              <HomepageSection key={s.id} tinted={i % 2 === 1} eyebrow={s.eyebrow} title={s.title} lead={s.lead ? <Lead text={s.lead} /> : undefined} cta={s.cta ?? undefined}>
                {s.id === 'offerings' ? (
                  <OfferingCards items={s.items} className="mt-2 w-full text-left" />
                ) : s.id === 'join' ? (
                  <JoinSteps steps={s.items} className="mt-2 w-full text-left" />
                ) : s.id === 'connect' ? (
                  <ConnectGrid hidden={s.hidden} className="mt-2 text-left" />
                ) : (
                  // The events come from the Events list as the page loads: a stand-in for each
                  <div className="mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
                    {Array.from({ length: s.count ?? 2 }, (_, n) => (
                      <p key={n} className="m-0 rounded-xl border border-dashed border-line px-3 py-8 text-[0.85rem] text-muted">
                        Event {n + 1}
                      </p>
                    ))}
                  </div>
                )}
              </HomepageSection>
            ))}
        </div>
        <p className="m-0 mt-3 text-[0.8rem] text-muted">
          Events show as stand-ins here, with the words for when some are coming up.{' '}
          <Link href="/" target="_blank" className={inlineLink}>
            Open the homepage
          </Link>{' '}
          to see the saved version.
        </p>
      </Dialog>
    </div>
  )
}
