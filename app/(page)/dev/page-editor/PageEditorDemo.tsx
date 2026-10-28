'use client'

import type { FC } from 'react'

import { NotificationProvider } from '@/components'

import { DocumentEditor } from '../../../(dashboard)/dashboard/DocumentEditor'

/** A sample page laid out in sections; each section's writing is HTML, which its editor reads in */
const SAMPLE = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'New student guide',
  slug: 'new-student-guide',
  status: 'draft' as const,
  layout: 'sections' as const,
  subtitle: 'Everything a new Panther needs in the first month.',
  description: 'A first-month guide to Georgia State: where to go, who to ask, and what to do first.',
  body: '',
  sections: [
    {
      id: 'first-week',
      title: 'Your first week',
      subtitle: 'The things worth doing before classes get busy.',
      anchor: '',
      body: '<ul><li>Get your PantherCard at the Student Center</li><li>Find your classrooms the day before</li><li>Download the PantherNav app</li></ul>',
    },
    {
      id: 'finding-help',
      title: 'Finding help',
      subtitle: 'Free support most students never use.',
      anchor: '',
      body: '<p>Tutoring, counseling, and the food pantry are all free. See <a href="/resources">Resources</a> for the full list.</p>',
    },
  ],
  updated_at: '2026-10-28T15:00:00Z',
  updated_by: 'jordan.lee@student.gsu.edu',
}

export const PageEditorDemo: FC = () => (
  <NotificationProvider>
    <DocumentEditor kind="page" doc={SAMPLE} demo />
  </NotificationProvider>
)
