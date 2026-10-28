'use client'

import { ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { FC } from 'react'

import { FOOTER_NAV_SECTIONS, isNavActive } from '@/globals/config/nav'
import { CLUB_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from '@/globals/config/site'
import { CONTACT_EMAIL, GSU_URL } from '@/globals/config/social'
import { LogoMark } from '@/globals/Logo'
import { SocialIcons } from '@/globals/SocialIcons'
import { button, card, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const Footer: FC = () => {
  const pathname = usePathname()
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-1 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-[clamp(1rem,5vw,4rem)] pt-12 pb-6">
        <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.2fr)_minmax(0,1fr)_minmax(15rem,0.9fr)]">
          <div className="flex max-w-96 flex-col gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 self-start text-ink no-underline transition-colors hover:text-brand"
            >
              <LogoMark size={48} />
              <span className="text-[1.15rem] font-extrabold">{SITE_SHORT_NAME}</span>
            </Link>
            <p className="text-[0.9rem] leading-relaxed text-muted">{CLUB_DESCRIPTION.oneLiner}</p>
            <SocialIcons />
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-8" aria-label="Footer navigation">
            {FOOTER_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className={cn(eyebrow, 'mb-4 text-ink-faint')}>{section.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {section.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
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

          <aside
            className={card({ accent: true, className: 'flex flex-col gap-2.5 p-5 sm:col-span-2 lg:col-span-1' })}
            aria-labelledby="footer-cta-title"
          >
            <p className={eyebrow}>Open to all Panthers</p>
            <h3 id="footer-cta-title" className="text-[1.15rem] font-bold text-ink">
              New to campus?
            </h3>
            <p className="text-sm leading-[1.55] text-muted">
              We&apos;ll help you find your way around, find your people, and find the resources you need.
            </p>
            <Link href="/join" className={button({ size: 'sm', className: 'mt-1 self-stretch sm:self-start' })}>
              Join CSEG &rarr;
            </Link>
          </aside>
        </div>

        <div className="flex flex-col items-start gap-x-6 gap-y-3 border-t border-line pt-5 text-[0.8rem] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span>
            &copy; <time dateTime={String(year)}>{year}</time> {SITE_NAME}
          </span>
          <div className="flex flex-col items-start gap-x-5 gap-y-2 sm:flex-row sm:flex-wrap sm:items-center">
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink hover:text-brand hover:underline">
                {CONTACT_EMAIL}
              </a>
            ) : null}
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
