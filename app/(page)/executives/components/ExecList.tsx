import type { FC } from 'react'
import type { Executive, ExecutiveListProps } from './types'
import { PageBlock } from '@/globals/Page'
import { eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { ExecutiveItem } from './ExecItem'
import { categorize } from './helpers'

const keyOf = (member: Executive) => `${member.firstName} ${member.lastName} ${member.role}`

/** One full-width card under another */
const Cards: FC<{ executives: readonly Executive[]; headingLevel: 3 | 4 }> = ({ executives, headingLevel }) => (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {executives.map((member) => (
            <ExecutiveItem key={keyOf(member)} member={member} headingLevel={headingLevel} />
        ))}
    </ul>
)

/**
 * A section of executives, one card per row. Categorized, they're grouped by what they do
 * (Leadership, Operations, …) under a heading each, and their names drop a heading level
 * to sit under it.
 */
export const ExecutiveList: FC<ExecutiveListProps> =({ title, executives, categorized }) =>
    executives.length > 0 ? (
        <PageBlock title={title}>
            {categorized ? (
                <div className="flex flex-col gap-8">
                    {categorize(executives).map((group) => (
                        <section key={group.title} className="flex flex-col gap-3">
                            <h3 className={cn(eyebrow, 'm-0')}>{group.title}</h3>
                            <Cards executives={group.executives} headingLevel={4} />
                        </section>
                    ))}
                </div>
            ) : (
                <Cards executives={executives} headingLevel={3} />
            )}
        </PageBlock>
    ) : null
