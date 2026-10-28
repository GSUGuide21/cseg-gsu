/* eslint-disable @next/next/no-img-element -- post images can be from any site, at any size */
import type { PhrasingContent, Root, RootContent } from 'mdast'
import Link from 'next/link'
import { remark } from 'remark'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { safeHref, safeSrc } from '@/lib/safeUrl'
import { inlineLink } from '@/globals/ui/styles'

/**
 * Markdown (what officers write in posts and pages) as React elements. It walks the
 * parsed tree and makes each element itself, so raw HTML in the text is shown as text,
 * never run, and links only go to http(s), mailto, tel, or paths on this site.
 */

const parser = remark()

export { safeHref } from './safeUrl'

const inline = (nodes: PhrasingContent[], key = ''): ReactNode[] => nodes.map((n, i) => phrase(n, `${key}${i}`))

function phrase(node: PhrasingContent, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return node.value
    case 'strong':
      return <strong key={key}>{inline(node.children, key)}</strong>
    case 'emphasis':
      return <em key={key}>{inline(node.children, key)}</em>
    case 'delete':
      return <del key={key}>{inline(node.children, key)}</del>
    case 'inlineCode':
      return (
        <code key={key} className="rounded bg-fill px-1.5 py-0.5 text-[0.9em]">
          {node.value}
        </code>
      )
    case 'break':
      return <br key={key} />
    case 'link': {
      const href = safeHref(node.url)
      const children = inline(node.children, key)
      if (!href) return <span key={key}>{children}</span>
      return href.startsWith('/') ? (
        <Link key={key} href={href} className={inlineLink}>
          {children}
        </Link>
      ) : (
        <a key={key} href={href} className={inlineLink} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      )
    }
    case 'image': {
      const src = safeSrc(node.url)
      return src ? <img key={key} src={src} alt={node.alt ?? ''} loading="lazy" className="my-2 h-auto max-w-full rounded-xl" /> : null
    }
    // Raw HTML is shown as typed, not run
    case 'html':
      return node.value
    default:
      return 'children' in node ? inline(node.children as PhrasingContent[], key) : null
  }
}

const HEADINGS = {
  1: 'text-[1.75rem] font-extrabold',
  2: 'text-[1.4rem] font-bold',
  3: 'text-[1.15rem] font-bold',
  4: 'text-[1rem] font-bold',
  5: 'text-[0.95rem] font-bold',
  6: 'text-[0.9rem] font-bold',
} as const

function block(node: RootContent, key: string): ReactNode {
  switch (node.type) {
    case 'heading': {
      const H = `h${node.depth}` as const
      return (
        <H key={key} className={cn('mt-6 mb-2 leading-snug text-ink first:mt-0', HEADINGS[node.depth])}>
          {inline(node.children, key)}
        </H>
      )
    }
    case 'paragraph':
      return (
        <p key={key} className="my-3 leading-[1.75]">
          {inline(node.children, key)}
        </p>
      )
    case 'list': {
      const L = node.ordered ? 'ol' : 'ul'
      return (
        <L key={key} start={node.ordered && node.start && node.start !== 1 ? node.start : undefined} className={cn('my-3 flex flex-col gap-1 pl-6', node.ordered ? 'list-decimal' : 'list-disc')}>
          {node.children.map((item, i) => (
            <li key={i} className="leading-[1.7] [&>p]:my-0">
              {item.checked !== null && item.checked !== undefined ? <input type="checkbox" checked={item.checked} readOnly disabled className="mr-2 align-middle" /> : null}
              {item.children.map((c, j) => block(c, `${key}-${i}-${j}`))}
            </li>
          ))}
        </L>
      )
    }
    case 'blockquote':
      return (
        <blockquote key={key} className="my-4 border-l-4 border-brand-edge pl-4 text-ink-soft italic">
          {node.children.map((c, i) => block(c, `${key}-${i}`))}
        </blockquote>
      )
    case 'code':
      return (
        <pre key={key} className="my-4 overflow-x-auto rounded-xl bg-fill p-4 text-[0.85rem]">
          <code>{node.value}</code>
        </pre>
      )
    case 'thematicBreak':
      return <hr key={key} className="my-6 border-0 border-t border-line" />
    case 'html':
      return (
        <p key={key} className="my-3 leading-[1.75]">
          {node.value}
        </p>
      )
    case 'table':
      return (
        <div key={key} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-[0.9rem]">
            <tbody>
              {node.children.map((row, i) => (
                <tr key={i} className="border-b border-line">
                  {row.children.map((cell, j) => {
                    const C = i === 0 ? 'th' : 'td'
                    return (
                      <C key={j} className="px-3 py-2 text-left">
                        {inline(cell.children, `${key}-${i}-${j}`)}
                      </C>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

/** The markdown's parsed tree (exported for tests) */
export const parseMarkdown = (source: string): Root => parser.parse(source)

export const Markdown: FC<{ source: string; className?: string }> = ({ source, className }) => (
  <div className={cn('text-[1rem] text-ink-soft [&>*:first-child]:mt-0', className)}>{parseMarkdown(source).children.map((n, i) => block(n, String(i)))}</div>
)
