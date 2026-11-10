import { FC } from "react"
import { card, cardText } from "@/globals/ui/styles"
import { cn } from "@/lib/cn"
import type { ExecutiveItemProps } from '../types'
import { getFullName, serviceLine } from '../helpers'
import { ExecAvatar } from './Avatar'
import { ExecIdentity } from './Identity'
import { ExecContactLinks } from './ContactLinks'
import { ExecSocialLinks } from './SocialLinks'

/** An executive across the full width: who they are on the left, then their words and links */
export const ExecutiveItem: FC<ExecutiveItemProps> = ({
    member,
    headingLevel = 3,
    className,
    ...props
}) => {
    const serviceLineText = serviceLine(member.serviceIntervals)
    const contact = member.contact ?? {}

    return (
        <li
            {...props}
            className={card({
                padded: true,
                className: cn('min-w-0 md:grid md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:items-start md:gap-x-8', className),
            })}
        >
            <div className="flex items-center gap-[1.1rem]">
                <ExecAvatar {...member} />
                <ExecIdentity {...member} headingLevel={headingLevel} />
            </div>
            <div className="flex min-w-0 flex-col gap-[0.65rem] md:border-l md:border-line md:pl-8">
                {serviceLineText ? <p className="text-[0.8rem] font-semibold text-muted">{serviceLineText}</p> : null}
                <p className={cardText}>{member.bio}</p>
                <ExecContactLinks email={contact.email} phone={contact.phone} />
                <ExecSocialLinks contact={contact} fullName={getFullName(member.firstName, member.lastName)} />
            </div>
        </li>
    )
}
