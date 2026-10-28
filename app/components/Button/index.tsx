import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { ComponentProps, FC } from 'react'

import { Spinner } from '../Spinner'
import type { ButtonAsButtonProps, ButtonAsLinkProps, ButtonProps } from './types'
import { buttonVariants } from './variants'

/** Props this component handles itself, kept off the element */
const OWN = new Set(['variant', 'size', 'leading', 'trailing', 'block', 'iconOnly', 'className', 'children', 'href', 'external', 'loading'])
const elementProps = <T,>(props: object) => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as T

const isExternal = (href: string) => /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')

/**
 * A button, or a link that looks like one (pass `href`).
 *
 *   <Button onClick={save} loading={saving}>Save</Button>
 *   <Button href="/join" variant="outline" trailing={<ArrowRight />}>Join CSEG</Button>
 *   <Button iconOnly variant="ghost" aria-label="Close"><X /></Button>
 */
export const Button: FC<ButtonProps> = (props) => {
  const { variant = 'primary', size = 'md', leading, trailing, block, iconOnly, className, children } = props
  const classes = buttonVariants({ variant, size, block, iconOnly, className })
  const content = (
    <>
      {leading}
      {iconOnly ? children : <span>{children}</span>}
      {trailing}
    </>
  )

  if (props.href !== undefined) {
    const { href, external, disabled } = props as ButtonAsLinkProps
    // `disabled` isn't an attribute links take
    const rest = elementProps<ComponentProps<'a'> & { disabled?: boolean }>(props)
    delete rest.disabled
    const outside = external ?? isExternal(href)
    // A disabled link isn't a link: no href, not focusable, but still in place and announced
    if (disabled) {
      return (
        <a {...rest} aria-disabled className={classes} role="link">
          {content}
        </a>
      )
    }
    const opensNewTab = outside && !href.startsWith('mailto:') && !href.startsWith('tel:')
    const newTab = opensNewTab ? (
      <>
        {/* Says so, as links that open new tabs should */}
        {iconOnly ? null : <ExternalLink size={size === 'sm' ? 13 : 15} aria-hidden className="-ml-0.5 opacity-70" />}
        <span className="sr-only"> (opens in a new tab)</span>
      </>
    ) : null
    return outside ? (
      <a {...rest} href={href} target={opensNewTab ? '_blank' : rest.target} rel={opensNewTab ? 'noopener noreferrer' : rest.rel} className={classes}>
        {content}
        {newTab}
      </a>
    ) : (
      <Link {...rest} href={href} className={classes}>
        {content}
      </Link>
    )
  }

  const { loading } = props as ButtonAsButtonProps
  const rest = elementProps<ComponentProps<'button'>>(props)
  const { type = 'button', disabled } = rest
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      // Still focusable while loading, so focus isn't lost mid-action; clicks are ignored
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : rest.onClick}
      className={loading ? `${classes} relative` : classes}
    >
      {loading ? (
        <>
          {/* The label stays (invisible) to keep the width; the spinner sits over it */}
          <span className="invisible inline-flex items-center gap-2">{content}</span>
          <span className="absolute inset-0 grid place-items-center">
            <Spinner size={size === 'lg' ? 20 : 16} decorative />
          </span>
        </>
      ) : (
        content
      )}
    </button>
  )
}
