import { FC } from "react"
import type { ExecSocialLinksProps } from './types'
import { SOCIAL_ICONS } from '../helpers'

export const ExecSocialLinks: FC<ExecSocialLinksProps> = ({ contact, fullName }) => {
    const socials = SOCIAL_ICONS.flatMap(({ key, label, Icon }) => {
        const value = contact[key]
        return value ? [{ key, label, Icon, value }] : []
    })
    if (socials.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1">
            {socials.map(({ key, label, Icon, value }) => (
                <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${fullName} on ${label}`}
                    className="grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-fill hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                >
                    <Icon size={18} aria-hidden />
                </a>
            ))}
        </div>
    )
}
