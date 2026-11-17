import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getForm } from '@/lib/content/public'
import { isOpen } from '@/lib/content/types'
import { formatDate } from '@/lib/dashboard/format'

import { PublicForm } from './PublicForm'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await getForm((await params).slug)
  // Forms are for whoever has the link, not for search engines
  return { title: form?.title ?? 'Not found', description: form?.description ?? undefined, robots: { index: false, follow: false } }
}

/** A form officers built, at its own address: what it's for, then its questions */
export default async function FormPage({ params }: Props) {
  const form = await getForm((await params).slug)
  if (!form) notFound()
  const open = isOpen(form)
  return (
    <article className={cn(pageShell, 'max-w-2xl gap-6')}>
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{form.title}</h1>
        {form.description ? <p className="m-0 text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] whitespace-pre-line text-muted">{form.description}</p> : null}
        {form.closes_at && open ? <p className="m-0 text-[0.9rem] text-muted">Open until {formatDate(form.closes_at, true)}.</p> : null}
      </header>
      {open ? <PublicForm formId={form.id} fields={form.fields} /> : <p className="m-0 font-semibold text-ink">This form has closed.</p>}
    </article>
  )
}
