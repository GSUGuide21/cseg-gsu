import Link from 'next/link'
import type { FC } from 'react'

import { card, eyebrow as eyebrowClass } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import type { CardProps } from './types'

/**
 * A bordered card, in the site's card style (globals/ui/styles).
 *
 *   <Card title="Study groups" description="Weekly sessions before exams" href="/events" />
 *   <Card media={<img … />} title="Fall social" footer={<Badge tone="success">Open</Badge>}>…</Card>
 *
 * With `href` the whole card is clickable, through its title link stretched over it, so
 * screen readers hear one link named by the title rather than the whole card's text.
 */
export const Card: FC<CardProps> = ({
  title,
  headingLevel = 3,
  eyebrow,
  description,
  media,
  footer,
  href,
  accent,
  as: Tag = 'article',
  className,
  children,
}) => {
  const Heading = `h${headingLevel}` as const
  return (
    <Tag
      className={card({
        accent,
        className: cn(
          'relative flex flex-col overflow-hidden',
          href && 'transition-[border-color,box-shadow] hover:border-brand/45 hover:shadow-[0_6px_20px_rgb(0_0_0/0.08)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand',
          className
        ),
      })}
    >
      {media ? <div className="overflow-hidden [&_img]:aspect-video [&_img]:w-full [&_img]:object-cover">{media}</div> : null}
      <div className="flex flex-1 flex-col gap-[0.65rem] p-6">
        {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
        {title ? (
          <Heading className="text-[1.1rem] leading-snug font-bold text-ink">
            {href ? (
              // The link covers the whole card (::after), so the card is one big target
              <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] hover:text-brand">
                {title}
              </Link>
            ) : (
              title
            )}
          </Heading>
        ) : null}
        {description ? <p className="text-[0.95rem] leading-[1.65] text-muted">{description}</p> : null}
        {children}
      </div>
      {footer ? (
        // Above the stretched link, so its own buttons and links still work
        <div className="relative z-1 flex flex-wrap items-center gap-2 border-t border-line px-6 py-3.5">{footer}</div>
      ) : null}
    </Tag>
  )
}
