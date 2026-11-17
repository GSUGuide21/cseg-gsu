/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */
import { PageBlock } from '@/globals/Page'
import { getTestimonials } from '@/lib/content/public'

/** What members say about the club, from the dashboard's Testimonials. Nothing when there are none. */
export async function Testimonials({ title = 'What members say' }: { title?: string }) {
  const testimonials = await getTestimonials()
  if (!testimonials.length) return null
  return (
    <PageBlock id="testimonials" title={title}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-4 p-0">
        {testimonials.map((t) => (
          <li key={t.id}>
            <figure className="m-0 flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
              <blockquote className="m-0 text-[1.02rem] leading-relaxed text-ink">“{t.quote}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                {t.photo_url ? (
                  <img src={t.photo_url} alt="" loading="lazy" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-line" />
                ) : (
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-tint text-[0.95rem] font-extrabold text-brand">
                    {t.name.trim()[0]?.toUpperCase()}
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold text-ink">{t.name}</span>
                  {t.role ? <span className="text-[0.85rem] text-muted">{t.role}</span> : null}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </PageBlock>
  )
}
