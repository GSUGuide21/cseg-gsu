/** Times as 24-hour "HH:mm" strings, the format <input type="time"> sends */
export type ISOTime = string

const pad = (n: number) => String(n).padStart(2, '0')

export const toMinutes = (t: ISOTime) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (n: number): ISOTime => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`

/** How the locale tells time: 12-hour with its own AM/PM words, or 24-hour */
export const clockFor = (locale: string) => {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle
  const period = (h: number) =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' }).formatToParts(new Date(2026, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value ??
    (h < 12 ? 'AM' : 'PM')
  return { twelve: cycle === 'h11' || cycle === 'h12', am: period(9), pm: period(21) }
}

/** "9:30 AM" in en-US, "09:30" in en-GB */
export const formatTime = (t: ISOTime, locale: string) => {
  const [h, m] = t.split(':').map(Number)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m))
}

/**
 * Reads a typed time: "9:30 am", "930a", "9pm", "21:15", "2115", "noon", "midnight".
 * Without am/pm, the hour is read as 24-hour. Returns null when it isn't a time.
 */
export const parseTime = (text: string): ISOTime | null => {
  const t = text.trim().toLowerCase().replace(/\./g, '')
  if (t === 'noon') return '12:00'
  if (t === 'midnight') return '00:00'
  const m = /^(\d{1,2})(?::?(\d{2}))?\s*([ap])?m?$/.exec(t)
  if (!m) return null
  let hour = Number(m[1])
  const minute = Number(m[2] ?? 0)
  if (minute > 59) return null
  if (m[3]) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (m[3] === 'p' ? 12 : 0)
  } else if (hour > 23) return null
  return `${pad(hour)}:${pad(minute)}`
}
