import { 
  Accordion
} from "@/app-old/components/ui/Accordion"
import { PageSwitch } from "./page/Switch"
import { PageSlider } from "./page/Slider"
import { CalendarContainer } from "./page/Calendar"

export default function Home() {
  return (
    <div>
      <PageSlider initialValue={50} />
      <PageSwitch />
      <CalendarContainer />
      <Accordion title="Welcome to Campus Survival and Engagement Group" disabled={false}>
        <p>Your one-stop solution for campus survival and engagement.</p>
      </Accordion>
      <h1>Welcome to the Campus Survival and Engagement Group</h1>
    </div>
  )
}