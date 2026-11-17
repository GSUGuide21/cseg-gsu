/**
 * The site's smaller kinds of content, each kept in the dashboard: photo albums, the map's
 * tours, the library of documents, testimonials, opportunities, polls and quizzes, and forms.
 * One row type per table, and the lists (kinds of opportunity, types of form field) the
 * dashboard and the site both read.
 */

type Stamps = { created_at: string; updated_at: string }

export type AlbumPhoto = { src: string; alt: string; caption: string }
export type AlbumRow = Stamps & {
  id: string
  slug: string
  title: string
  description: string | null
  /** The day the photos are from */
  taken_on: string | null
  /** The picture the list shows; without one, the first photo */
  cover_url: string | null
  photos: AlbumPhoto[]
  published: boolean
}

export type TourStopRow = { placeId: string; title: string; why: string; tip: string }
export type TourRow = Stamps & {
  id: string
  /** Its id in links: /map?tour=commuter */
  slug: string
  title: string
  /** A word or two for the tour switcher */
  label: string
  intro: string
  stops: TourStopRow[]
  sort: number
  published: boolean
}

export type DocumentRow = Stamps & {
  id: string
  title: string
  description: string | null
  category: string | null
  url: string
  file_name: string | null
  sort: number
  published: boolean
}

export type TestimonialRow = Stamps & {
  id: string
  name: string
  /** Who they are: "Junior, Biology" */
  role: string | null
  quote: string
  photo_url: string | null
  sort: number
  published: boolean
}

export const OPPORTUNITY_KINDS = [
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'job', label: 'Job' },
  { value: 'internship', label: 'Internship' },
  { value: 'volunteer', label: 'Volunteering' },
  { value: 'event', label: 'Event or program' },
  { value: 'other', label: 'Other' },
] as const
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number]['value']
export const opportunityKindLabel = (kind: string) => OPPORTUNITY_KINDS.find((k) => k.value === kind)?.label ?? 'Other'

export type OpportunityRow = Stamps & {
  id: string
  title: string
  organization: string | null
  kind: OpportunityKind
  description: string | null
  url: string | null
  location: string | null
  /** The last day to apply; null stays up until it's hidden */
  deadline: string | null
  published: boolean
}

/** A question and its options; an answer is the option's own words */
export type PollQuestion = { id: string; text: string; options: string[] }
export type PollRow = Stamps & {
  id: string
  slug: string
  kind: 'poll' | 'quiz'
  title: string
  description: string | null
  questions: PollQuestion[]
  published: boolean
  closes_at: string | null
  /** Whether people see how everyone answered once they have */
  results_public: boolean
}
/** A quiz's right answers, by question id. Officers only. */
export type PollKeyRow = { poll_id: string; correct: Record<string, string> }
export type PollResponseRow = { id: string; poll_id: string; voter: string; answers: Record<string, string>; score: number | null; created_at: string }
/** How everyone answered: per question, how many picked each option */
export type PollResults = { total: number; counts: Record<string, Record<string, number>> }

export const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Short answer' },
  { value: 'textarea', label: 'Long answer' },
  { value: 'email', label: 'Email address' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Pick one (menu)' },
  { value: 'radio', label: 'Pick one (buttons)' },
  { value: 'checkboxes', label: 'Pick any' },
  { value: 'checkbox', label: 'A single tick box' },
] as const
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]['value']
/** Field types that choose from a list of options */
export const hasOptions = (type: string) => type === 'select' || type === 'radio' || type === 'checkboxes'

export type FormField = { id: string; label: string; type: FormFieldType; required: boolean; options: string[] }
export type FormRow = Stamps & {
  id: string
  slug: string
  title: string
  description: string | null
  fields: FormField[]
  /** What people read after sending it */
  success_message: string | null
  published: boolean
  closes_at: string | null
}
export type FormResponseRow = { id: string; form_id: string; answers: Record<string, string | string[]>; created_at: string }

/** The kinds the dashboard saves the same way, and the table each lives in */
export const CONTENT_TABLES = {
  album: 'albums',
  tour: 'tours',
  document: 'documents',
  testimonial: 'testimonials',
  opportunity: 'opportunities',
  poll: 'polls',
  form: 'forms',
} as const
export type ContentKind = keyof typeof CONTENT_TABLES

export const LIMITS = { photos: 200, stops: 30, questions: 40, options: 12, fields: 40, answer: 4000 } as const

/** Whether something with a closing time is still open */
export const isOpen = (row: { closes_at: string | null }, now = Date.now()) => !row.closes_at || Date.parse(row.closes_at) > now
