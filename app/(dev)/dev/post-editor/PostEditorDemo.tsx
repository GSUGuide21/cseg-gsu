'use client'

import type { FC } from 'react'

import { NotificationProvider } from '@/components'

import { DocumentEditor } from '../../../(dashboard)/dashboard/DocumentEditor'

/** A sample post, in markdown as older posts were, so it also shows them opening in the editor */
const SAMPLE = {
  id: '00000000-0000-0000-0000-000000000000',
  title: 'Welcome Week recap',
  slug: 'welcome-week-recap',
  status: 'draft' as const,
  body: '## Thanks for coming!\n\nOver **200 students** stopped by the table this week. Here’s what happened:\n\n- Campus tours, both days\n- Free food at the [Student Center](/map)\n- A *lot* of new members\n\n> “Best first week I could have asked for.”\n\nSee you at the next event.',
  excerpt: null,
  cover_image_url: null,
  published_at: null,
  updated_at: '2026-10-27T15:00:00Z',
  author_email: 'jordan.lee@student.gsu.edu',
}

export const PostEditorDemo: FC = () => (
  <NotificationProvider>
    <DocumentEditor kind="post" doc={SAMPLE} demo />
  </NotificationProvider>
)
