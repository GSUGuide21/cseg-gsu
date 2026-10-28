'use client'

import { ChevronDown } from 'lucide-react'
import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import type { AccordionProps } from './types'

/**
 * Sections that open and close, built on the browser's <details>/<summary>, so keyboard
 * and screen reader support come built in, and in-page search (Ctrl+F) opens a closed
 * section that matches. Sections slide open where the browser supports it.
 *
 *   <Accordion items={[{ title: 'When do we meet?', content: 'Thursdays at 5.' }]} />
 */
export const Accordion: FC<AccordionProps> = ({
  items,
  type = 'single',
  defaultOpen = [],
  appearance = 'card',
  headingLevel,
  className,
}) => {
  // One name per accordion: the browser keeps just one <details> of a name open
  const group = useId()
  const card = appearance === 'card'
  const Heading = headingLevel ? (`h${headingLevel}` as const) : null

  return (
    <div className={cn('flex flex-col', card ? 'gap-3' : 'divide-y divide-line border-y border-line', className)}>
      {items.map((item, i) => {
        const id = item.id ?? (typeof item.title === 'string' ? item.title : String(i))
        const title = <span className="flex-1 font-bold text-ink transition-colors group-hover:text-brand">{item.title}</span>
        return (
          <details
            key={id}
            name={type === 'single' ? group : undefined}
            open={defaultOpen.includes(id) || undefined}
            className={cn(
              'group transition-colors duration-200',
              card && 'rounded-xl border border-line bg-surface open:border-brand-edge open:bg-brand-wash',
              'details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:duration-300 details-content:ease-out details-content:transition-discrete',
              'open:details-content:h-auto motion-reduce:details-content:transition-none'
            )}
          >
            <summary
              className={cn(
                'flex cursor-pointer list-none items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden',
                card ? 'rounded-xl px-5 py-4' : 'px-1 py-3.5'
              )}
            >
              {Heading ? <Heading className="m-0 flex flex-1 text-[1rem]">{title}</Heading> : title}
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
            <div className={cn('max-w-2xl leading-[1.7] text-muted', card ? 'px-5 pb-5' : 'px-1 pb-4')}>{item.content}</div>
          </details>
        )
      })}
    </div>
  )
}
