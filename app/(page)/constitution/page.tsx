import type { Metadata } from 'next'
import Link from 'next/link'
import type { FC } from 'react'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { TableOfContents, type TocEntry } from '@/globals/Page/TableOfContents'
import { getPublishedPage, pageMetadata } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { SOCIAL_LINKS } from '@/globals/config/social'
import { button, inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dashboard/format'
import {
  articleHeading,
  articleId,
  articleSectionId,
  CONSTITUTION_ARTICLES,
  CONSTITUTION_GLOSSARY,
  CONSTITUTION_HISTORY,
  CONSTITUTION_TERM,
  type ConstitutionBlock,
  type ConstitutionItem,
  GLOSSARY_ID,
  HISTORY_ID,
  sectionHeading,
  toRoman,
  withLinks,
} from '@/lib/data/constitution'

/** The club's documents on PIN, where the constitution on file with Georgia State lives */
const PIN_DOCUMENTS = `${SOCIAL_LINKS.pin}/documents`

/** 1., then a., then i., as the document numbers its lists */
const LIST_STYLES = ['list-decimal', 'list-[lower-alpha]', 'list-[lower-roman]']

const Words: FC<{ text: string }> = ({ text }) => (
  <>
    {withLinks(text).map((part, i) =>
      typeof part === 'string' ? (
        part
      ) : (
        <a key={i} href={part[1]} className={cn(inlineLink, 'break-all')} target="_blank" rel="noopener noreferrer">
          {part[0]}
        </a>
      )
    )}
  </>
)

const Items: FC<{ items: readonly ConstitutionItem[]; depth?: number }> = ({ items, depth = 0 }) => (
  <ol className={cn('my-2 flex flex-col gap-1 pl-6 marker:text-muted', LIST_STYLES[depth % LIST_STYLES.length])}>
    {items.map((item, i) =>
      typeof item === 'string' ? (
        <li key={i} className="pl-1 leading-[1.7]">
          <Words text={item} />
        </li>
      ) : (
        <li key={i} className="pl-1 leading-[1.7]">
          <Words text={item.text} />
          <Items items={item.items} depth={depth + 1} />
        </li>
      )
    )}
  </ol>
)

const Blocks: FC<{ blocks: readonly ConstitutionBlock[] }> = ({ blocks }) => (
  <div className="flex flex-col gap-2 text-[1rem] text-ink-soft">
    {blocks.map((b, i) =>
      typeof b === 'string' ? (
        <p key={i} className="m-0 leading-[1.7]">
          <Words text={b} />
        </p>
      ) : (
        <Items key={i} items={b.items} />
      )
    )}
  </div>
)

const TOC: readonly TocEntry[] = [
  ...CONSTITUTION_ARTICLES.map((a, i) => ({
    id: articleId(i),
    marker: toRoman(i + 1),
    label: a.title,
    children: a.sections?.map((s, j) => ({ id: articleSectionId(i, j), label: s.title })),
  })),
  { id: GLOSSARY_ID, label: 'Glossary' },
  { id: HISTORY_ID, label: 'Amendments and history' },
]

function ConstitutionContent() {
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="About"
        title="Constitution"
        lead={`The document that sets out how CSEG is organized and run, as registered with Georgia State. This is the ${CONSTITUTION_TERM} constitution.`}
      >
        <a href={PIN_DOCUMENTS} className={button({ variant: 'outline' })} target="_blank" rel="noopener noreferrer">
          See it on PIN &rarr;
        </a>
      </PageHeader>

      <div className="grid items-start gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <TableOfContents entries={TOC} />

        <div className="flex max-w-3xl min-w-0 flex-col gap-[clamp(2.5rem,5vw,3.5rem)]">
          {CONSTITUTION_ARTICLES.map((article, i) => (
            <PageBlock key={article.title} id={articleId(i)} title={articleHeading(i, article)}>
              {article.blocks ? <Blocks blocks={article.blocks} /> : null}
              {article.sections?.map((section, j) => (
                <section key={section.title} id={articleSectionId(i, j)} className="flex scroll-mt-6 flex-col gap-1">
                  <h3 className="m-0 text-[1.1rem] leading-snug font-bold text-ink">{sectionHeading(j, section)}</h3>
                  <Blocks blocks={section.blocks} />
                </section>
              ))}
            </PageBlock>
          ))}

          <PageBlock id={GLOSSARY_ID} title="Glossary">
            <dl className="m-0 flex flex-col gap-3">
              {CONSTITUTION_GLOSSARY.map(({ term, definition }) => (
                <div key={term}>
                  <dt className="font-bold text-ink">{term}</dt>
                  <dd className="m-0 leading-[1.7] text-ink-soft">
                    <Words text={definition} />
                  </dd>
                </div>
              ))}
            </dl>
          </PageBlock>

          <PageBlock id={HISTORY_ID} title="Amendments and history">
            <ol className="m-0 flex list-none flex-col gap-3 border-l-2 border-line p-0 pl-5">
              {CONSTITUTION_HISTORY.map(({ date, note }) => (
                <li key={date} className="leading-[1.7] text-ink-soft">
                  <time dateTime={date} className="block text-[0.85rem] font-semibold text-muted">
                    {formatDate(date)}
                  </time>
                  {note}
                </li>
              ))}
            </ol>
          </PageBlock>

          <PageCallout
            title="Have a question about it?"
            actions={
              <Link href="/contact" className={button({ variant: 'outline' })}>
                Contact us
              </Link>
            }
          >
            The officers are happy to explain any part of the constitution. Any active member can propose an amendment to the Executive Council.
          </PageCallout>
        </div>
      </div>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('constitution')
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/constitution')
  return page ? managedPageMetadata(page, meta.description) : meta
}

/** The constitution officers published from the dashboard, once there is one; the one above until then */
export default async function ConstitutionPage() {
  const page = await getPublishedPage('constitution')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.constitution.eyebrow} /> : <ConstitutionContent />
}
