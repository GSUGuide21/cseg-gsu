import { FC } from "react"
import { Mail, Phone } from "lucide-react"
import { inlineLink } from "@/globals/ui/styles"
import { cn } from "@/lib/cn"
import type { ExecContactLinksProps } from './types'
import { mailtoHref, telHref } from '../helpers'

export const ExecContactLinks: FC<ExecContactLinksProps> = ({ email, phone }) => {
    if (!email && !phone) return null

    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9rem]">
            {email ? (
                <a href={mailtoHref(email)} className={cn(inlineLink, 'inline-flex min-w-0 items-center gap-1.5 break-all')}>
                    <Mail size={15} className="shrink-0" aria-hidden />
                    {email}
                </a>
            ) : null}
            {phone ? (
                <a href={telHref(phone)} className={cn(inlineLink, 'inline-flex items-center gap-1.5')}>
                    <Phone size={15} className="shrink-0" aria-hidden />
                    {phone}
                </a>
            ) : null}
        </div>
    )
}
