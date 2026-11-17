import { slugify } from '@/components/Form/Slug/slugify'
import type { ActionResult, FieldErrors } from '@/lib/dashboard/validate'

import { FORM_FIELD_TYPES, hasOptions, LIMITS, OPPORTUNITY_KINDS, type AlbumPhoto, type ContentKind, type FormField, type FormFieldType, type OpportunityKind, type PollQuestion, type TourStopRow } from './types'

/**
 * Checks for what officers type into the dashboard's smaller kinds of content, and for what
 * visitors send to a poll or a form. Each takes the form's fields and returns either clean
 * values or a message per field, so the editor can show them in place.
 */

type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors }

const text = (v: FormDataEntryValue | null | undefined) => (typeof v === 'string' ? v.trim() : '')
const optional = (v: FormDataEntryValue | null | undefined) => text(v) || null
const done = <T>(errors: FieldErrors, data: T): Parsed<T> => (Object.keys(errors).length ? { ok: false, errors } : { ok: true, data })
const DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ID = /^[\w-]{1,64}$/
const on = (form: FormData, name: string) => form.get(name) === 'on'
const line = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const words = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
/** An image: https, or a path on this site */
const image = (v: unknown) => (typeof v === 'string' && /^(https:\/\/|\/(?!\/))/.test(v.trim()) ? v.trim() : '')
const sort = (form: FormData) => Math.trunc(Number(text(form.get('sort')) || 0)) || 0

/** A list sent as JSON: the objects in it, up to a limit; anything else is dropped */
const list = (raw: FormDataEntryValue | null, max: number): Record<string, unknown>[] => {
  try {
    const value: unknown = typeof raw === 'string' && raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)).slice(0, max) : []
  } catch {
    return []
  }
}
/** A list of options: each a line of words, none empty, none twice */
const options = (v: unknown) =>
  [...new Set((Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map((o) => line(o, 200)).filter(Boolean))].slice(0, LIMITS.options)
const id = (v: unknown, fallback: string) => (typeof v === 'string' && ID.test(v) ? v : fallback)

/** A moment sent as an ISO time (the editor converts from Atlanta's clock); null when empty */
const moment = (form: FormData, name: string, errors: FieldErrors) => {
  const v = optional(form.get(name))
  if (!v) return null
  const t = Date.parse(v)
  if (Number.isNaN(t)) {
    errors[name] = 'Pick a date and time.'
    return null
  }
  return new Date(t).toISOString()
}

const titled = (form: FormData, errors: FieldErrors, what = 'title') => {
  const title = text(form.get('title'))
  if (!title) errors.title = `Add a ${what}.`
  else if (title.length > 160) errors.title = 'Keep it under 160 characters.'
  return title
}
const slugged = (form: FormData, errors: FieldErrors, from: string) => {
  const slug = slugify(text(form.get('slug')) || from)
  if (!slug) errors.slug = 'Add a web address made of letters and numbers.'
  return slug
}
const link = (form: FormData, name: string, errors: FieldErrors, required = false) => {
  const url = optional(form.get(name))
  if (!url) {
    if (required) errors[name] = 'Add a link, or upload a file.'
    return null
  }
  if (!/^https:\/\//.test(url)) errors[name] = 'Use a full link (https://…).'
  return url
}

export function parseAlbum(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors)
  const taken = optional(form.get('taken_on'))
  if (taken && !DATE.test(taken)) errors.taken_on = 'Pick a day, or leave it empty.'
  const photos: AlbumPhoto[] = list(form.get('photos'), LIMITS.photos)
    .map((p) => ({ src: image(p.src), alt: line(p.alt, 300), caption: line(p.caption, 300) }))
    .filter((p) => p.src)
  const published = on(form, 'published')
  if (published && !photos.length) errors.photos = 'Add a photo before showing it on the site.'
  return done(errors, { title, slug: slugged(form, errors, title), description: optional(form.get('description')), taken_on: taken, cover_url: image(form.get('cover_url')) || null, photos, published })
}

export function parseTour(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors, 'name')
  const label = text(form.get('label')) || title
  if (label.length > 30) errors.label = 'Keep it to a word or two (30 characters).'
  const stops: TourStopRow[] = list(form.get('stops'), LIMITS.stops)
    .map((s) => ({ placeId: line(s.placeId, 80), title: line(s.title, 120), why: words(s.why, 600), tip: words(s.tip, 300) }))
    .filter((s) => s.placeId)
  if (stops.length < 2) errors.stops = 'A tour needs at least two stops, each at a place on the map.'
  else if (stops.some((s) => !s.title)) errors.stops = 'Give every stop a title.'
  return done(errors, { title, slug: slugged(form, errors, title), label, intro: text(form.get('intro')), stops, sort: sort(form), published: on(form, 'published') })
}

export function parseLibraryItem(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors)
  const category = optional(form.get('category'))
  if (category && category.length > 60) errors.category = 'Keep it under 60 characters.'
  return done(errors, {
    title,
    description: optional(form.get('description')),
    category,
    url: link(form, 'url', errors, true) ?? '',
    file_name: optional(form.get('file_name')),
    sort: sort(form),
    published: on(form, 'published'),
  })
}

export function parseTestimonial(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const quote = text(form.get('quote'))
  if (!name) errors.name = 'Add their name.'
  else if (name.length > 120) errors.name = 'Keep it under 120 characters.'
  if (!quote) errors.quote = 'Add what they said.'
  else if (quote.length > 600) errors.quote = 'Keep it under 600 characters.'
  return done(errors, { name, role: optional(form.get('role')), quote, photo_url: image(form.get('photo_url')) || null, sort: sort(form), published: on(form, 'published') })
}

export function parseOpportunity(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors)
  const kind = (text(form.get('kind')) || 'other') as OpportunityKind
  if (!OPPORTUNITY_KINDS.some((k) => k.value === kind)) errors.kind = 'Pick what kind it is.'
  const deadline = optional(form.get('deadline'))
  if (deadline && !DATE.test(deadline)) errors.deadline = 'Pick a day, or leave it empty.'
  return done(errors, {
    title,
    organization: optional(form.get('organization')),
    kind,
    description: optional(form.get('description')),
    url: link(form, 'url', errors),
    location: optional(form.get('location')),
    deadline,
    published: on(form, 'published'),
  })
}

/** A poll or quiz, and (for a quiz) its right answers, which are kept apart from it */
export function parsePoll(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors)
  const kind = text(form.get('kind')) === 'quiz' ? 'quiz' : 'poll'
  const correct: Record<string, string> = {}
  const questions: PollQuestion[] = list(form.get('questions'), LIMITS.questions)
    .map((q, i) => {
      const question = { id: id(q.id, `q${i + 1}`), text: line(q.text, 300), options: options(q.options) }
      const right = line(q.correct, 200)
      if (kind === 'quiz' && question.options.includes(right)) correct[question.id] = right
      return question
    })
    .filter((q) => q.text)
  const published = on(form, 'published')
  if (!questions.length) {
    if (published) errors.questions = 'Add a question before opening it.'
  } else if (questions.some((q) => q.options.length < 2)) errors.questions = 'Give every question at least two options.'
  else if (kind === 'quiz' && questions.some((q) => !correct[q.id])) errors.questions = 'Pick the right answer for every question.'
  return done(errors, {
    row: {
      title,
      slug: slugged(form, errors, title),
      kind: kind as 'poll' | 'quiz',
      description: optional(form.get('description')),
      questions,
      published,
      closes_at: moment(form, 'closes_at', errors),
      results_public: on(form, 'results_public'),
    },
    correct,
  })
}

export function parseFormDefinition(form: FormData) {
  const errors: FieldErrors = {}
  const title = titled(form, errors)
  const fields: FormField[] = list(form.get('fields'), LIMITS.fields)
    .map((f, i) => {
      const type = (FORM_FIELD_TYPES.find((t) => t.value === f.type)?.value ?? 'text') as FormFieldType
      return { id: id(f.id, `f${i + 1}`), label: line(f.label, 200), type, required: f.required === true, options: hasOptions(type) ? options(f.options) : [] }
    })
    .filter((f) => f.label)
  const published = on(form, 'published')
  if (!fields.length) {
    if (published) errors.fields = 'Add a question before opening it.'
  } else if (fields.some((f) => hasOptions(f.type) && f.options.length < 2)) errors.fields = 'Give every “pick” question at least two options.'
  return done(errors, {
    title,
    slug: slugged(form, errors, title),
    description: optional(form.get('description')),
    fields,
    success_message: optional(form.get('success_message')),
    published,
    closes_at: moment(form, 'closes_at', errors),
  })
}

/** What each kind's editor sends, checked. A poll's right answers come back beside its row. */
export function parseContent(kind: ContentKind, form: FormData): Parsed<{ row: Record<string, unknown>; correct?: Record<string, string> }> {
  const wrap = <T extends Record<string, unknown>>(parsed: Parsed<T>) => (parsed.ok ? { ok: true as const, data: { row: parsed.data } } : parsed)
  switch (kind) {
    case 'album':
      return wrap(parseAlbum(form))
    case 'tour':
      return wrap(parseTour(form))
    case 'document':
      return wrap(parseLibraryItem(form))
    case 'testimonial':
      return wrap(parseTestimonial(form))
    case 'opportunity':
      return wrap(parseOpportunity(form))
    case 'poll':
      return parsePoll(form)
    case 'form':
      return wrap(parseFormDefinition(form))
  }
}

/** A visitor's answers to a poll: one of each question's own options, for every question */
export function parsePollAnswers(questions: readonly PollQuestion[], form: FormData): Parsed<Record<string, string>> {
  const errors: FieldErrors = {}
  const answers: Record<string, string> = {}
  for (const q of questions) {
    const picked = text(form.get(q.id))
    if (q.options.includes(picked)) answers[q.id] = picked
    else errors[q.id] = 'Pick one.'
  }
  return done(errors, answers)
}

/** A visitor's answers to a form, checked against its fields: what's required, and what each type takes */
export function parseFormAnswers(fields: readonly FormField[], form: FormData): Parsed<Record<string, string | string[]>> {
  const errors: FieldErrors = {}
  const answers: Record<string, string | string[]> = {}
  for (const f of fields) {
    if (f.type === 'checkboxes') {
      const picked = form.getAll(f.id).filter((v): v is string => typeof v === 'string' && f.options.includes(v))
      if (f.required && !picked.length) errors[f.id] = 'Pick at least one.'
      if (picked.length) answers[f.id] = picked
      continue
    }
    if (f.type === 'checkbox') {
      const ticked = form.get(f.id) === 'on'
      if (f.required && !ticked) errors[f.id] = 'Tick this to go on.'
      answers[f.id] = ticked ? 'Yes' : 'No'
      continue
    }
    const value = text(form.get(f.id)).slice(0, LIMITS.answer)
    if (!value) {
      if (f.required) errors[f.id] = 'This one is needed.'
      continue
    }
    if (f.type === 'email' && !EMAIL.test(value)) errors[f.id] = 'That doesn’t look like an email address.'
    else if (f.type === 'number' && Number.isNaN(Number(value))) errors[f.id] = 'Use a number.'
    else if (f.type === 'date' && !DATE.test(value)) errors[f.id] = 'Pick a day.'
    else if (hasOptions(f.type) && !f.options.includes(value)) errors[f.id] = 'Pick one of the options.'
    else answers[f.id] = value
  }
  return done(errors, answers)
}

export type { ActionResult }
