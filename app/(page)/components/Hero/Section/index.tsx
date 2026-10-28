import type { FC, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { HeroSectionAction, type HeroSectionActionType } from './Action'
import { HeroSectionContent, type HeroSectionContentProps } from './Content'
import { HeroSectionImage, type HeroSectionImageInterface } from './Image'

export type { HeroSectionActionInterface, HeroSectionActionType } from './Action'

/** An image, or just its src (decorative, on the right) */
export type HeroSectionImageType = HeroSectionImageInterface | string

export interface HeroSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  beforeContent?: ReactNode
  title?: ReactNode
  titleAs?: HeroSectionContentProps['titleAs']
  subtitle?: ReactNode
  description?: ReactNode
  /** After the actions */
  afterContent?: ReactNode
  image?: HeroSectionImageType
  /** Links under the text; the first is the main one */
  action?: HeroSectionActionType | HeroSectionActionType[]
  /** Fill the screen's height under the header */
  fullHeight?: boolean
}

/**
 * The big opening block of a page: title, subtitle, description, actions, and an image
 * beside, above, below, or behind the text.
 *
 *   <HeroSection
 *     title="Find your way around campus"
 *     subtitle="Maps, eats, and study spots"
 *     action={[{ href: '/map', label: 'Open the map' }, '/about']}
 *     image={{ src: '/assets/quad.jpg', alt: 'Students on the quad', imagePosition: 'right' }}
 *   />
 */
export const HeroSection: FC<HeroSectionProps> = ({
  beforeContent,
  title,
  titleAs,
  subtitle,
  description,
  afterContent,
  image: imageProp,
  action,
  fullHeight = false,
  className,
  children,
  ...props
}) => {
  const image = typeof imageProp === 'string' ? { src: imageProp } : imageProp
  const side = image?.imagePosition ?? 'right'
  const background = !!image && side === 'center'
  const beside = !!image && (side === 'left' || side === 'right')
  const actions = action === undefined ? [] : Array.isArray(action) ? action : [action]

  const content = (
    <HeroSectionContent
      beforeContent={beforeContent}
      title={title}
      titleAs={titleAs}
      subtitle={subtitle}
      description={description}
      align={beside ? 'start' : 'center'}
      inverted={background}
      className={beside ? 'max-md:items-center max-md:text-center' : 'mx-auto max-w-4xl'}
      afterContent={
        actions.length || afterContent ? (
          <>
            {actions.length ? (
              <div className="flex flex-wrap gap-3 max-[600px]:w-full max-[600px]:max-w-80 max-[600px]:flex-col">
                {actions.map((a, i) => (
                  <HeroSectionAction key={typeof a === 'string' ? a : a.href + i} action={a} primary={i === 0} inverted={background} />
                ))}
              </div>
            ) : null}
            {afterContent}
          </>
        ) : null
      }
    >
      {children}
    </HeroSectionContent>
  )

  return (
    <section
      {...props}
      className={cn(
        'relative isolate overflow-hidden px-4 py-[clamp(3.5rem,9vw,6.5rem)]',
        fullHeight && 'flex min-h-[calc(100svh-var(--header-height))] flex-col justify-center',
        background && 'bg-black',
        className
      )}
    >
      {background ? <HeroSectionImage {...image} imagePosition="center" /> : null}
      <div
        className={cn(
          'mx-auto w-full max-w-6xl',
          beside ? 'grid items-center gap-10 md:grid-cols-2 md:gap-14' : 'flex flex-col items-center gap-10'
        )}
      >
        {image && !background ? (
          <HeroSectionImage
            {...image}
            imagePosition={side}
            // Stacked on phones with the image first, except "bottom"
            className={cn(side === 'right' && 'md:order-last', side === 'bottom' && 'order-last')}
          />
        ) : null}
        {content}
      </div>
    </section>
  )
}
