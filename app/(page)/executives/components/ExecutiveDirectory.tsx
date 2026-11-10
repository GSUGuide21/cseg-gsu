import { FC } from "react"
import { Users } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/EmptyState"
import { button } from "@/globals/ui/styles"
import { ExecutiveList } from "./ExecList"
import { isCurrent } from './helpers'
import type { ExecutiveDirectoryProps } from './types'

/** The executives serving now, grouped by what they do, then those who have served before, or a note while there are none */
export const ExecutiveDirectory: FC<ExecutiveDirectoryProps> = ({ executives }) => 
    executives.length === 0 ? (
        <EmptyState
            bordered
            headingLevel={2}
            icon={<Users />}
            title="Meet the team soon"
            description="Our executives will be listed here. Until then, you can reach the officers directly."
            actions={
                <Link href="/contact" className={button({ variant: 'outline' })}>
                    Contact us
                </Link>
            }
        />
    ) : (
        <>
            <ExecutiveList title="Current executives" categorized executives={executives.filter(isCurrent)} />
            <ExecutiveList title="Past executives" executives={executives.filter((member) => !isCurrent(member))} />
        </>
    )