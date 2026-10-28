import { ChevronDown } from 'lucide-react'
import type { FC, ReactNode } from 'react'

import { CLUB_OFFERINGS, JOIN_STEPS } from '@/globals/config/club'
import { card, eyebrow, iconTile } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export type PageHeaderProps = {
  /** Short label above the title */
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  /** Action buttons under the lead */
  children?: ReactNode
}

export const PageHeader: FC<PageHeaderProps> = ({ eyebrow: label, title, lead, children }) => (
  <header className="flex max-w-[46rem] animate-fade-in flex-col gap-4 motion-reduce:animate-none">
    <p className={eyebrow}>{label}</p>
    <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">
      {title}
    </h1>
    {lead ? (
      <p className="text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-pretty text-muted">{lead}</p>
    ) : null}
    {children ? (
      <div className="mt-2 flex flex-wrap items-center gap-3 max-[559px]:[&>*]:flex-auto">{children}</div>
    ) : null}
  </header>
)

export type PageBlockProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  /** Anchor id, e.g. "faq" for /about#faq */
  id?: string
}

/** A titled content section inside a page. */
export const PageBlock: FC<PageBlockProps> = ({ id, title, description, children }) => (
  <section id={id} className="flex scroll-mt-6 flex-col gap-5">
    <div className="flex max-w-2xl flex-col gap-1.5">
      <h2 className="flex items-center gap-3 text-[1.35rem] font-bold text-ink">
        <span className="h-6 w-1 rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      {description ? <p className="text-[0.95rem] leading-relaxed text-muted">{description}</p> : null}
    </div>
    {children}
  </section>
)

export type PageCalloutProps = {
  title: string
  children: ReactNode
  /** Buttons/links */
  actions: ReactNode
}

/** Closing call-to-action banner for a page. */
export const PageCallout: FC<PageCalloutProps> = ({ title, children, actions }) => (
  <aside
    className={card({
      accent: true,
      className: 'flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-2xl p-[clamp(1.5rem,4vw,2.25rem)]',
    })}
  >
    <div className="flex max-w-[34rem] flex-col gap-1.5">
      <h2 className="text-[clamp(1.15rem,2.5vw,1.4rem)] font-bold text-ink">{title}</h2>
      <p className="leading-relaxed text-muted">{children}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">{actions}</div>
  </aside>
)

export type FaqItem = { q: string; a: ReactNode }

/**
 * Accordion built on native <details>/<summary>: keyboard and screen-reader
 * support for free. Answers slide open where ::details-content is supported.
 */
export const Faq: FC<{ items: readonly FaqItem[]; group?: string; className?: string }> = ({
  items,
  group = 'faq',
  className,
}) => (
  <div className={cn('flex flex-col gap-3', className)}>
    {items.map(({ q, a }) => (
      <details
        key={q}
        name={group}
        className={cn(
          'group rounded-xl border border-line bg-surface transition-colors duration-200',
          'open:border-brand-edge open:bg-brand-wash',
          'details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:duration-300 details-content:ease-out details-content:transition-discrete',
          'open:details-content:h-auto motion-reduce:details-content:transition-none'
        )}
      >
        <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
          <span className="flex-1 font-bold text-ink transition-colors group-hover:text-brand">{q}</span>
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted',
              'transition-[transform,background-color,border-color,color] duration-200 motion-reduce:transition-none',
              'group-open:rotate-180 group-open:border-brand-solid group-open:bg-brand-solid group-open:text-white'
            )}
            aria-hidden
          >
            <ChevronDown size={16} strokeWidth={2.25} />
          </span>
        </summary>
        <p className="max-w-2xl px-5 pb-5 leading-[1.7] text-muted">{a}</p>
      </details>
    ))}
  </div>
)

export const OfferingCards: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4', className)}>
    {CLUB_OFFERINGS.map(({ Icon, title, body }) => (
      <article key={title} className={card({ padded: true })}>
        <span className={iconTile} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <h3 className="text-[1.05rem] font-bold text-ink">{title}</h3>
        <p className="text-[0.95rem] leading-[1.65] text-muted">{body}</p>
      </article>
    ))}
  </div>
)

export const JoinSteps: FC<{ className?: string }> = ({ className }) => (
  <ol className={cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-x-6 gap-y-4', className)}>
    {JOIN_STEPS.map((step, i) => (
      <li key={step.title} className="flex flex-col gap-2 border-t-2 border-line pt-4 first:border-brand">
        <span className="text-[0.8rem] font-bold text-brand" aria-hidden>
          Step {i + 1}
        </span>
        <h3 className="text-[1.05rem] font-bold text-ink">{step.title}</h3>
        <p className="leading-relaxed text-muted">{step.body}</p>
      </li>
    ))}
  </ol>
)
