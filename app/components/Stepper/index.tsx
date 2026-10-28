import { AlertCircle, Check } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { StepStatus, StepperProps } from './types'

const SAY: Record<StepStatus, string> = { complete: 'Completed', current: 'Current step', upcoming: 'Not started', error: 'Needs attention' }

/**
 * Where someone is in a process of several steps: creating an event, finishing a profile.
 *
 *   <Stepper aria-label="Create an event" current={1} onStepChange={setStep} steps={[
 *     { label: 'Details' }, { label: 'Date & place' }, { label: 'Tickets', optional: true }, { label: 'Review' },
 *   ]} />
 *
 * It's an ordered list; the current step is marked aria-current="step", and each step's
 * status is said in words. Completed steps are buttons when `onStepChange` is set.
 * Horizontal steppers turn vertical when there isn't room (below 36rem of width).
 */
export const Stepper: FC<StepperProps> = ({ steps, current, navigable, onStepChange, orientation = 'horizontal', 'aria-label': ariaLabel, className }) => {
  const canGo = navigable ?? (onStepChange ? 'complete' : undefined)
  const vertical = orientation === 'vertical'
  // Horizontal until the container is too narrow, then the vertical layout
  const h = (classes: string) => (vertical ? '' : classes)

  return (
    <div className={cn('@container', className)}>
      <ol aria-label={ariaLabel} className={cn('m-0 flex list-none flex-col p-0', h('@xl:flex-row'))}>
        {steps.map((step, i) => {
          const status: StepStatus = step.status ?? (i < current ? 'complete' : i === current ? 'current' : 'upcoming')
          const clickable = !!onStepChange && i !== current && (canGo === 'all' || (canGo === 'complete' && status === 'complete'))
          const last = i === steps.length - 1
          const done = status === 'complete'

          const marker = (
            <span
              className={cn(
                'relative z-1 grid size-8 shrink-0 place-items-center rounded-full border-2 text-[0.85rem] font-bold transition-colors',
                done && 'border-brand-solid bg-brand-solid text-white',
                status === 'current' && 'border-brand bg-surface text-brand ring-4 ring-brand/15',
                status === 'upcoming' && 'border-line bg-surface text-muted',
                status === 'error' && 'border-danger bg-surface text-danger'
              )}
            >
              {done ? <Check size={16} strokeWidth={3} aria-hidden /> : status === 'error' ? <AlertCircle size={16} strokeWidth={2.5} aria-hidden /> : i + 1}
            </span>
          )
          const text = (
            <span className={cn('flex min-w-0 flex-col gap-0.5 pb-6', h('@xl:items-center @xl:px-2 @xl:pb-0 @xl:text-center'), last && 'pb-0')}>
              <span className="sr-only">{SAY[status]}: </span>
              <span className={cn('text-[0.9rem] font-semibold group-hover:text-brand', status === 'upcoming' ? 'text-ink-soft' : status === 'error' ? 'text-danger' : 'text-ink')}>
                {step.label}
              </span>
              {step.description ? <span className="text-[0.8rem] text-muted">{step.description}</span> : null}
              {step.optional ? <span className="text-[0.75rem] text-muted italic">Optional</span> : null}
            </span>
          )
          const body = (
            <>
              {marker}
              {text}
            </>
          )
          const layout = cn('flex gap-3 text-left', h('@xl:flex-col @xl:items-center @xl:gap-2'))

          return (
            <li key={i} aria-current={status === 'current' ? 'step' : undefined} className={cn('relative flex-1', h('@xl:min-w-0'))}>
              {/* The line to the next step: down the side when stacked, across when in a row */}
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-9 bottom-1 left-[15px] w-0.5 rounded-full',
                    h('@xl:top-[15px] @xl:right-[calc(-50%+1.25rem)] @xl:bottom-auto @xl:left-[calc(50%+1.25rem)] @xl:h-0.5 @xl:w-auto'),
                    done ? 'bg-brand-solid' : 'bg-line'
                  )}
                />
              ) : null}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepChange?.(i)}
                  className={cn(layout, 'group w-full cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand')}
                >
                  {body}
                </button>
              ) : (
                <div className={layout}>{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
