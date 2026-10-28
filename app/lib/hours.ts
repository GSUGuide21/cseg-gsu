/**
 * Opening hours, evaluated in Atlanta time no matter where the viewer is.
 *
 * A schedule is a list of ranges. `days` uses 0 = Sunday … 6 = Saturday.
 * `close` may be "24:00", or earlier than `open` for ranges that run past midnight
 * (e.g. open "12:00", close "02:00" on Friday means Friday noon to 2 a.m. Saturday).
 */
export type HoursRange = {
  readonly days: readonly number[]
  readonly open: string
  readonly close: string
}

export type Schedule = readonly HoursRange[]

export type OpenStatus = {
  readonly open: boolean
  /** e.g. "Open · until 7 p.m.", "Closed · opens Mon 8 a.m." */
  readonly label: string
}

const TIME_ZONE = 'America/New_York'
const DAY = 24 * 60
const WEEK = 7 * DAY
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutes since Sunday 00:00, Atlanta time. */
export function weekMinute(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return DAY_NAMES.indexOf(get('weekday')) * DAY + Number(get('hour')) * 60 + Number(get('minute'))
}

/** Every range as [start, end) minutes within the week; overnight ranges extend past their day. */
function intervals(schedule: Schedule): [number, number][] {
  return schedule.flatMap((r) =>
    r.days.map((d): [number, number] => {
      const start = d * DAY + toMinutes(r.open)
      let end = d * DAY + toMinutes(r.close)
      if (end <= start) end += DAY
      return [start, end]
    })
  )
}

/** 7:00 → "7 a.m.", 19:30 → "7:30 p.m.", 0:00 → "midnight", 12:00 → "noon". */
export function formatTime(minuteOfDay: number): string {
  const m = ((minuteOfDay % DAY) + DAY) % DAY
  if (m === 0) return 'midnight'
  if (m === 12 * 60) return 'noon'
  const h = Math.floor(m / 60)
  const min = m % 60
  const h12 = h % 12 || 12
  return `${h12}${min ? `:${String(min).padStart(2, '0')}` : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

export function getOpenStatus(schedule: Schedule, now = new Date()): OpenStatus {
  const t = weekMinute(now)
  // Repeat the week on both sides so ranges crossing Saturday night → Sunday line up
  const all = intervals(schedule)
    .flatMap(([s, e]) => [[s - WEEK, e - WEEK], [s, e], [s + WEEK, e + WEEK]] as [number, number][])
    .sort((a, b) => a[0] - b[0])

  const current = all.find(([s, e]) => s <= t && t < e)
  if (current) {
    // Follow back-to-back ranges (e.g. Mon–Thu "24 hours") to the real closing time
    let end = current[1]
    for (let guard = 0; guard < 14; guard++) {
      const next = all.find(([s, e]) => s <= end && e > end)
      if (!next) break
      end = next[1]
    }
    if (end - t >= WEEK) return { open: true, label: 'Open 24/7' }
    // A midnight close belongs to the day that's ending ("until midnight", not "until Wed midnight")
    const closeDay = Math.floor((end - 1) / DAY)
    const sameDay = closeDay === Math.floor(t / DAY) || end - t <= 6 * 60
    return {
      open: true,
      label: `Open · until ${sameDay ? '' : `${DAY_NAMES[((closeDay % 7) + 7) % 7]} `}${formatTime(end)}`,
    }
  }

  const next = all.find(([s]) => s > t)
  if (!next) return { open: false, label: 'Closed' }
  const nextDay = (((Math.floor(next[0] / DAY)) % 7) + 7) % 7
  const today = Math.floor(t / DAY) % 7
  return {
    open: false,
    label: `Closed · opens ${nextDay === today && next[0] - t < DAY ? '' : `${DAY_NAMES[nextDay]} `}${formatTime(next[0])}`,
  }
}

/** Shorthand for building schedules. */
export const WEEKDAYS = [1, 2, 3, 4, 5] as const
export const MON_THU = [1, 2, 3, 4] as const
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const
