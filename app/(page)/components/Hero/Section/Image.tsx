import Image from 'next/image'
import type { FC, HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export type PositionType = 'left' | 'right' | 'center' | 'top' | 'bottom'

export interface HeroSectionImageInterface {
  src: string
  /** Leave empty ('') when the image is decoration. Default ''. */
  alt?: string
  /** The image's own size, for its shape while it loads. Default 450 × 275. */
  width?: number | `${number}`
  height?: number | `${number}`
  /** Fill the hero's image column across (keeping height from the aspect of width × height) */
  isFullWidth?: boolean
  /** Fill the hero's full height, cropping to fit */
  isFullHeight?: boolean
  /**
   * Where the image sits next to the text: "left" or "right" (side by side on wider
   * screens, above the text on phones), "top" or "bottom", or "center" behind the text
   * as a background. Default "right".
   */
  imagePosition?: PositionType
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Which part of the image to keep when it's cropped (object-position). Default "center". */
  position?: PositionType
  /** Load it right away: for a hero at the top of the page */
  priority?: boolean
}

export type HeroSectionImageProps = Omit<HTMLAttributes<HTMLElement>, keyof HeroSectionImageInterface> & HeroSectionImageInterface

export const HeroSectionImage: FC<HeroSectionImageProps> = ({
  src,
  alt = '',
  width = 450,
  height = 275,
  isFullWidth = false,
  isFullHeight = false,
  imagePosition = 'right',
  fit = 'cover',
  position = 'center',
  priority = false,
  children,
  className,
  ...props
}) => {
  const background = imagePosition === 'center'
  const style = { objectFit: fit, objectPosition: position }

  // Behind the text: fills the section, under a scrim that keeps the text readable
  if (background) {
    return (
      <div aria-hidden={alt ? undefined : true} className={cn('absolute inset-0 -z-10', className)}>
        <Image src={src} alt={alt} fill priority={priority} sizes="100vw" style={style} />
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-black/70" />
      </div>
    )
  }

  // Full height crops into whatever height the hero has; otherwise it keeps its own shape
  const fill = isFullHeight
  return (
    <figure {...props} className={cn('m-0 flex flex-col gap-2', isFullHeight && 'h-full min-h-64', isFullWidth && 'w-full', className)}>
      <div className={cn('overflow-hidden rounded-2xl', fill && 'relative flex-1')}>
        {fill ? (
          <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 768px) 50vw, 100vw" style={style} />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={Number(width)}
            height={Number(height)}
            priority={priority}
            sizes="(min-width: 768px) 50vw, 100vw"
            className={cn('h-auto max-w-full', isFullWidth && 'w-full')}
            style={style}
          />
        )}
      </div>
      {children ? <figcaption className="text-[0.85rem] text-muted">{children}</figcaption> : null}
    </figure>
  )
}
