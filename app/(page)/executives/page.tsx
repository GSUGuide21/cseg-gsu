import { Metadata } from "next"
import { PageHeader } from "@/globals/Page"
import { pageShell } from "@/globals/ui/styles"
import { getExecutives } from "@/lib/dashboard/public"
import { ExecutiveDirectory } from './components/ExecutiveDirectory'

export const revalidate = 60 // revalidate every 60 seconds

export const metadata: Metadata = {
  title: "Executives",
  description: "Meet the executives of our organization."
}

/** The executives officers list in the dashboard, or the built-in list until there are any */
export default async function ExecutivesPage() {
  return (
    <div className={pageShell}>
      <PageHeader eyebrow="About" title="Executives" lead="Meet the students who lead CSEG." />
      <ExecutiveDirectory executives={await getExecutives()} />
    </div>
  )
}
