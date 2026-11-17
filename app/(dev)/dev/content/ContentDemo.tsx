'use client'

import type { FC } from 'react'

import { PollForm } from '@/(page)/polls/PollForm'
import { ResultsBars } from '@/(page)/polls/ResultsBars'
import { PublicForm } from '@/(page)/forms/[slug]/PublicForm'
import { NotificationProvider } from '@/components'
import type { FormRow, OpportunityRow, PollRow } from '@/lib/content/types'

import { FormsView, OpportunitiesView, PollsView } from '../../../(dashboard)/dashboard/content/views'

const stamps = { created_at: '2026-11-14T15:00:00Z', updated_at: '2026-11-14T15:00:00Z' }

const QUIZ: PollRow & { correct: Record<string, string>; responses: number } = {
  ...stamps,
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'campus-trivia',
  kind: 'quiz',
  title: 'Campus trivia',
  description: 'How well do you know downtown?',
  published: true,
  closes_at: null,
  results_public: true,
  responses: 12,
  questions: [
    { id: 'marta', text: 'Which MARTA line stops at Georgia State Station?', options: ['Red and Gold', 'Blue and Green', 'Only the Streetcar'] },
    { id: 'library', text: 'Where is Saxbys?', options: ['Library North', 'Student Center East', 'Langdale Hall'] },
  ],
  correct: { marta: 'Blue and Green', library: 'Library North' },
}

const FORM: FormRow & { responses: number } = {
  ...stamps,
  id: '00000000-0000-0000-0000-000000000002',
  slug: 'volunteer-sign-up',
  title: 'Volunteer sign-up',
  description: 'Help out at the spring welcome table.',
  success_message: 'Thanks! We’ll email you the schedule.',
  published: true,
  closes_at: null,
  responses: 4,
  fields: [
    { id: 'name', label: 'Your name', type: 'text', required: true, options: [] },
    { id: 'email', label: 'Your email', type: 'email', required: true, options: [] },
    { id: 'shift', label: 'Which shift?', type: 'radio', required: true, options: ['Morning', 'Afternoon'] },
    { id: 'days', label: 'Days you can help', type: 'checkboxes', required: false, options: ['Monday', 'Tuesday', 'Wednesday'] },
    { id: 'notes', label: 'Anything else?', type: 'textarea', required: false, options: [] },
  ],
}

const OPPORTUNITIES: OpportunityRow[] = [
  { ...stamps, id: '00000000-0000-0000-0000-000000000003', title: 'Commuter Student Scholarship', organization: 'GSU Foundation', kind: 'scholarship', description: 'For students who commute more than 10 miles.', url: 'https://example.com', location: null, deadline: '2026-12-15', published: true },
  { ...stamps, id: '00000000-0000-0000-0000-000000000004', title: 'Welcome Week volunteers', organization: 'CSEG', kind: 'volunteer', description: null, url: null, location: 'Student Center East', deadline: null, published: false },
]

/**
 * The dashboard's shared editor (the same screen for albums, tours, the library, testimonials,
 * opportunities, polls and quizzes, and forms), with samples, and a poll and a form as the
 * site shows them. Nothing is saved: saving asks for an officer sign-in.
 */
export const ContentDemo: FC = () => (
  <NotificationProvider>
    <div className="flex flex-col gap-14">
      <section>
        <PollsView rows={[QUIZ]} />
      </section>
      <section>
        <FormsView rows={[FORM]} />
      </section>
      <section>
        <OpportunitiesView rows={OPPORTUNITIES} />
      </section>
      <section className="flex max-w-3xl flex-col gap-4">
        <h2 className="m-0 text-[1.3rem] font-extrabold text-ink">On the site: a quiz</h2>
        <PollForm pollId={QUIZ.id} kind="quiz" questions={QUIZ.questions} />
      </section>
      <section className="flex max-w-3xl flex-col gap-4">
        <h2 className="m-0 text-[1.3rem] font-extrabold text-ink">On the site: results</h2>
        <ResultsBars questions={QUIZ.questions} results={{ total: 12, counts: { marta: { 'Red and Gold': 2, 'Blue and Green': 9, 'Only the Streetcar': 1 }, library: { 'Library North': 7, 'Student Center East': 5 } } }} correct={QUIZ.correct} />
      </section>
      <section className="flex max-w-2xl flex-col gap-4">
        <h2 className="m-0 text-[1.3rem] font-extrabold text-ink">On the site: a form</h2>
        <PublicForm formId={FORM.id} fields={FORM.fields} />
      </section>
    </div>
  </NotificationProvider>
)
