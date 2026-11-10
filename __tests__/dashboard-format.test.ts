import { dateParts, daysAway, formatToday, partOfDay } from '../app/lib/dashboard/format'

describe('Dashboard dates, on Atlanta’s clock', () => {
  it('greets by Atlanta’s hour, not the server’s', () => {
    // Nov 1, 2026 is after clocks go back: Atlanta is UTC-5
    expect(partOfDay(new Date('2026-11-01T05:00:00Z'))).toBe('morning')
    expect(partOfDay(new Date('2026-11-01T16:59:00Z'))).toBe('morning')
    expect(partOfDay(new Date('2026-11-01T17:00:00Z'))).toBe('afternoon')
    expect(partOfDay(new Date('2026-11-01T22:00:00Z'))).toBe('evening')
  })

  it('names today as Atlanta sees it', () => {
    expect(formatToday(new Date('2026-11-02T03:00:00Z'))).toBe('Sunday, November 1')
  })

  it('splits a moment into the month and day it falls on in Atlanta', () => {
    expect(dateParts('2026-11-01T02:00:00Z')).toEqual({ month: 'Oct', day: '31' })
  })

  it('counts calendar days, not 24-hour stretches', () => {
    const lateNight = new Date('2026-11-02T04:00:00Z') // 11 PM on Nov 1
    expect(daysAway('2026-11-02T04:30:00Z', lateNight)).toBe('today')
    expect(daysAway('2026-11-02T06:00:00Z', lateNight)).toBe('tomorrow')
    expect(daysAway('2026-11-06T17:00:00Z', lateNight)).toBe('in 5 days')
  })

  it('counts across the clock change', () => {
    expect(daysAway('2026-11-02T17:00:00Z', new Date('2026-10-31T17:00:00Z'))).toBe('in 2 days')
  })
})
