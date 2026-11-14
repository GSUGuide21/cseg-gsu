'use client'

import { ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { FC } from 'react'

import { useClubDetails } from '@/globals/ClubDetails'
import { footerWithPages, isNavActive, type FooterNavSection, type NavLink } from '@/globals/config/nav'
import { SITE_NAME } from '@/globals/config/site'
import { GSU_URL } from '@/globals/config/social'
import { Wordmark } from '@/globals/Logo'
import { SocialIcons } from '@/globals/SocialIcons'
import { button, card, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { BUILT_IN_CHROME, footerColumns, type FooterContent } from '@/lib/siteChrome'
import { siteHref } from '@/lib/siteUrl'

/** The dashboard's links go to the live site's address in production, wherever this build is served */
const hrefOf = (href: string) => (href === '/dashboard' || href.startsWith('/dashboard/') ? siteHref(href) : href)

export type FooterProps = {
  /** The pages officers listed in the footer from the dashboard */
  pages?: readonly NavLink[]
  /** The link columns: the menus the dashboard gave the footer; the built-in ones when left out */
  sections?: readonly FooterNavSection[]
  /** The bottom bar's links, if the dashboard gave it a menu */
  bottomLinks?: readonly NavLink[]
  /** The card across the top, as the dashboard has it; the built-in one when left out */
  cta?: FooterContent['cta']
}

const BUILT_IN_SECTIONS = footerColumns(BUILT_IN_CHROME)

export const Footer: FC<FooterProps> = ({ pages = [], sections = BUILT_IN_SECTIONS, bottomLinks = [], cta = BUILT_IN_CHROME.footer.cta }) => {
  const pathname = usePathname()
  const { tagline, contactEmail } = useClubDetails()
  const year = new Date().getFullYear()
  const columns = footerWithPages(pages, sections)

  return (
    <footer className="relative z-1 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-[clamp(1rem,5vw,4rem)] pt-12 pb-6">
        {cta.shown ? (
          <aside
            className={card({ accent: true, className: 'flex flex-col gap-x-8 gap-y-4 p-5 sm:flex-row sm:items-center sm:justify-between' })}
            aria-labelledby="footer-cta-title"
          >
            <div className="flex flex-col gap-1.5">
              {cta.eyebrow ? <p className={eyebrow}>{cta.eyebrow}</p> : null}
              <h3 id="footer-cta-title" className="text-[1.15rem] font-bold text-ink">
                {cta.title}
              </h3>
              {cta.text ? <p className="text-sm leading-[1.55] text-muted">{cta.text}</p> : null}
            </div>
            {cta.button ? (
              <Link href={hrefOf(cta.button.href)} className={button({ size: 'sm', className: 'shrink-0 self-stretch sm:self-center' })}>
                {cta.button.label}
              </Link>
            ) : null}
          </aside>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2.4fr)]">
          <div className="flex max-w-96 flex-col gap-4">
            <Wordmark size="lg" className="self-start" />
            <p className="text-[0.9rem] leading-relaxed text-muted">{tagline}</p>
            <SocialIcons />
          </div>

          {/* As many columns as fit, so a More section (or one fewer) still fills the row */}
          <nav className={cn('grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]', !columns.length && 'hidden')} aria-label="Footer navigation">
            {columns.map((section) => (
              <div key={section.title}>
                <h3 className={cn(eyebrow, 'mb-4 text-ink-faint')}>{section.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {section.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={hrefOf(href)}
                        className="text-[0.9rem] font-medium text-muted no-underline transition-colors hover:text-brand aria-[current=page]:text-brand"
                        aria-current={isNavActive(pathname, href) ? 'page' : undefined}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-start gap-x-6 gap-y-3 border-t border-line pt-5 text-[0.8rem] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span>
            &copy; <time dateTime={String(year)}>{year}</time> {SITE_NAME}
          </span>
          <div className="flex flex-col items-start gap-x-5 gap-y-2 sm:flex-row sm:flex-wrap sm:items-center">
            {bottomLinks.map(({ href, label }) => (
              <Link key={href} href={hrefOf(href)} className="text-ink hover:text-brand hover:underline">
                {label}
              </Link>
            ))}
            <a href={`mailto:${contactEmail}`} className="text-ink hover:text-brand hover:underline">
              {contactEmail}
            </a>
            <span>
              A{' '}
              <a
                href={GSU_URL}
                className="text-ink underline-offset-[0.15em] hover:text-brand hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Georgia State University
              </a>{' '}
              student organization
            </span>
            <a
              href="#"
              className="inline-flex items-center gap-1 font-semibold text-ink no-underline transition-colors hover:text-brand"
            >
              Back to top
              <ArrowUp size={14} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
