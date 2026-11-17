'use client'

import type { FC } from 'react'

import { NotificationProvider } from '@/components'
import type { PresentationRow } from '@/lib/supabase/types'

import { PresentationEditor } from '../../../(dashboard)/dashboard/presentations/PresentationEditor'

/** A sample deck, its slides in markdown, with one of each kind of slide */
const SAMPLE: PresentationRow = {
  id: '00000000-0000-0000-0000-000000000000',
  slug: 'fall-kickoff',
  title: 'Fall kickoff',
  description: 'What CSEG is, what we do, and how to join.',
  status: 'draft',
  visibility: 'public',
  settings: { theme: 'brand', transition: 'slide', autoplay: 0 },
  published_at: null,
  publish_at: null,
  unpublish_at: null,
  author_email: 'jordan.lee@student.gsu.edu',
  author_name: 'Jordan Lee',
  updated_by: 'jordan.lee@student.gsu.edu',
  created_at: '2026-11-14T15:00:00Z',
  updated_at: '2026-11-14T15:00:00Z',
  slides: [
    { id: 'welcome', layout: 'title', title: 'Welcome to CSEG', body: 'The Campus Survival and Engagement Group at Georgia State\n\n**Fall 2026 kickoff** · Student Center East' },
    { id: 'who', title: 'Who we are', body: '- Students who commute, for students who commute\n- Officers from every college on campus\n- Open to everyone: no dues to come to a meeting' },
    { id: 'part', layout: 'section', title: 'What we do', body: 'Guides, events, and a voice for commuters.' },
    { id: 'guides', layout: 'image-right', title: 'Campus guides', body: '1. **Where to park**, and what it costs\n2. **Where to eat** between classes\n3. **Where to study** when the library is full' },
    { id: 'backup', title: 'Budget (backup)', body: 'Only if someone asks.', hidden: true },
    { id: 'join', title: 'Join us', body: 'Meetings are every other Thursday at 12:30.' },
  ],
}

export const PresentationEditorDemo: FC = () => (
  <NotificationProvider>
    <PresentationEditor doc={SAMPLE} notes={{ welcome: 'Thank everyone for coming; introduce the officers.' }} demo />
  </NotificationProvider>
)
