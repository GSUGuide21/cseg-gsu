import type { FC } from 'react'

import { InlineText, listOf, textOf } from './inline'

/** What members say: a quote each, with who said it under it. One on its own reads as a pull quote. */

export interface Testimonial {
  quote: string
  name: string
  /** Under the name: "Sophomore, Biology" */
  role: string
}

export const TESTIMONIALS_MAX = 6
export const TESTIMONIAL_QUOTE_MAX = 500
export const TESTIMONIAL_NAME_MAX = 80
export const TESTIMONIAL_ROLE_MAX = 80

export const parseTestimonials = (value: unknown): Testimonial[] =>
  listOf(value, TESTIMONIALS_MAX, (raw) => {
    const quote = textOf(raw.quote, TESTIMONIAL_QUOTE_MAX, true)
    return quote ? { quote, name: textOf(raw.name, TESTIMONIAL_NAME_MAX), role: textOf(raw.role, TESTIMONIAL_ROLE_MAX) } : null
  })

export const testimonialText = (t: Testimonial) => [`“${t.quote}”`, [t.name, t.role].filter(Boolean).join(', ')].filter(Boolean).join('\n')

export const TestimonialList: FC<{ items: Testimonial[] }> = ({ items }) => (
  <div className={items.length > 1 ? 'my-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4' : 'my-8'}>
    {items.map((t, i) => (
      <figure key={i} className={items.length > 1 ? 'm-0 flex flex-col gap-4 rounded-xl border border-line bg-surface p-5' : 'm-0 flex flex-col gap-4 border-l-4 border-brand py-1 pl-5'}>
        <blockquote className={items.length > 1 ? 'm-0 text-[1rem] leading-relaxed text-ink' : 'm-0 text-[clamp(1.15rem,2.2vw,1.4rem)] leading-snug font-semibold text-balance text-ink'}>
          <p className="m-0 whitespace-pre-line">
            “<InlineText text={t.quote} />”
          </p>
        </blockquote>
        {t.name || t.role ? (
          <figcaption className="mt-auto flex flex-col text-[0.88rem]">
            {t.name ? <span className="font-bold text-ink">{t.name}</span> : null}
            {t.role ? <span className="text-muted">{t.role}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    ))}
  </div>
)
