import { FC } from "react"
import { Badge } from "@/components/Badge"
import type { ExecIdentityProps } from './types'
import { getFullName } from '../helpers'

export const ExecIdentity: FC<ExecIdentityProps> = ({ firstName, lastName, role, isFounder, headingLevel = 3 }) => {
    const Heading = `h${headingLevel}` as const

    return (
        <div className="flex min-w-0 flex-col items-start gap-[0.3rem]">
            <Heading className="flex max-w-full flex-col items-end text-right leading-tight [overflow-wrap:anywhere]" aria-label={getFullName(firstName, lastName)}>
                <span className="max-w-full text-[clamp(1.125rem,6vw,2rem)] font-bold tracking-tight text-ink uppercase">{firstName}</span>
                <span className="yellowtail logo-shadow mt-[-0.45em] max-w-full text-[clamp(1.25rem,5vw,1.65rem)] tracking-[0.03em] text-ink/70">{lastName}</span>
            </Heading>
            <p className="text-[0.9rem] font-semibold text-brand">{role}</p>
            {isFounder ? <Badge size="sm">Founder</Badge> : null}
        </div>
    )
}
