'use client'

import { useState, type FC } from 'react'

import { inlineLink } from '@/globals/ui/styles'
import { exportPptx } from '@/lib/pptx/export'
import type { PresentationSettings, PresentationSlide } from '@/lib/supabase/types'

/**
 * "Download as PowerPoint", on a deck's page: the slides anyone can see, as a .pptx made in
 * the browser. No speaker notes: those are for officers.
 */
export const DownloadPptx: FC<{ title: string; slides: readonly PresentationSlide[]; settings: PresentationSettings }> = ({ title, slides, settings }) => {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')
  return (
    <>
      <button
        type="button"
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy')
          try {
            await exportPptx({ title, slides, settings })
            setState('idle')
          } catch {
            setState('failed')
          }
        }}
        className={`${inlineLink} cursor-pointer border-0 bg-transparent p-0 font-[inherit] disabled:cursor-wait disabled:opacity-60`}
      >
        {state === 'busy' ? 'Making the PowerPoint file…' : 'Download as PowerPoint'}
      </button>
      {state === 'failed' ? <span role="alert"> (that didn’t work; try again)</span> : null}
    </>
  )
}
