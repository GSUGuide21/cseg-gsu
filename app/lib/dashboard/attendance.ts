const DAY = 86_400_000

/** How long since a check-in before an active member is worth a second look */
export const QUIET_DAYS = 90

export interface Attendance {
  /** How many different events they came to */
  events: number
  lastSeen: string | null
}

/** Check-ins added up by member. Someone checked in twice at one event came to one event. */
export const attendanceByMember = (checkins: { member_id: string | null; event_id: string; checked_in_at: string }[]) => {
  const seen = new Map<string, { events: Set<string>; lastSeen: string }>()
  for (const { member_id, event_id, checked_in_at } of checkins) {
    if (!member_id) continue
    const member = seen.get(member_id) ?? { events: new Set<string>(), lastSeen: checked_in_at }
    member.events.add(event_id)
    if (Date.parse(checked_in_at) > Date.parse(member.lastSeen)) member.lastSeen = checked_in_at
    seen.set(member_id, member)
  }
  return Object.fromEntries([...seen].map(([id, m]) => [id, { events: m.events.size, lastSeen: m.lastSeen }])) as Record<string, Attendance>
}

/** Whether someone's gone quiet: no check-in lately, counting from when they joined if they've never come */
export const isQuiet = (lastSeen: string | null, joinedOn: string, now = Date.now()) => now - Date.parse(lastSeen ?? joinedOn) > QUIET_DAYS * DAY
