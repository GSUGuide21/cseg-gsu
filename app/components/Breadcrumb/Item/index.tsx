import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import type { BreadcrumbItemProps } from '../types'

/** The › between items; decorative, since the list itself says they're in order */
export const BreadcrumbSeparator: FC = () => <ChevronRight size={14} aria-hidden className="shrink-0 text-ink-faint" />

/** One step in the trail: a link, or the current page as plain text */
export const BreadcrumbItem: FC<BreadcrumbItemProps> = ({ item, current, separated }) => (
  <BreadcrumbLi separated={separated}>
    {current || !item.href ? (
      <span aria-current={current ? 'page' : undefined} className="truncate font-semibold text-ink">
        {item.label}
      </span>
    ) : (
      <Link href={item.href} className="truncate rounded text-muted underline-offset-[0.2em] transition-colors hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
        {item.label}
      </Link>
    )}
  </BreadcrumbLi>
)

/** The list item every step sits in, with its separator */
export const BreadcrumbLi: FC<{ separated: boolean; children: ReactNode }> = ({ separated, children }) => (
  <li className="flex min-w-0 items-center gap-1.5">
    {separated ? <BreadcrumbSeparator /> : null}
    {children}
  </li>
)
