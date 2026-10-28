import type { Tone } from '../tones'
import type { MeterStatus } from './types'

/** Which part of the range a value falls in */
const part = (n: number, low: number, high: number) => (n < low ? 0 : n > high ? 2 : 1)

/**
 * The HTML <meter> rule: with no optimum, there's no good or bad. Otherwise the part the
 * optimum is in is best ("good"), the one beside it "fair", and two parts away "poor".
 */
export function meterStatus(value: number, min: number, max: number, low?: number, high?: number, optimum?: number): MeterStatus | null {
  if (optimum === undefined || (low === undefined && high === undefined)) return null
  const lo = Math.max(min, low ?? min)
  const hi = Math.min(max, Math.max(lo, high ?? max))
  const distance = Math.abs(part(value, lo, hi) - part(optimum, lo, hi))
  return distance === 0 ? 'good' : distance === 1 ? 'fair' : 'poor'
}

export const STATUS_TONE: Record<MeterStatus, Tone> = { good: 'success', fair: 'warning', poor: 'danger' }

/** Said after the value, since the color alone can't say it */
export const STATUS_WORD: Record<MeterStatus, string> = { good: 'good', fair: 'fair', poor: 'poor' }

/** The ARIA a meter needs: its range, value, and a reading that includes the status */
export const meterAria = (value: number, min: number, max: number, text: string, status: MeterStatus | null) => ({
  role: 'meter' as const,
  'aria-valuemin': min,
  'aria-valuemax': max,
  'aria-valuenow': value,
  'aria-valuetext': status ? `${text}, ${STATUS_WORD[status]}` : text,
})

/** Everything the three meter shapes work out the same way */
export function meterState(p: { value: number; min?: number; max?: number; low?: number; high?: number; optimum?: number; tone?: Tone; formatValue?: (v: number, min: number, max: number) => string }) {
  const min = p.min ?? 0
  const max = p.max ?? 100
  const status = meterStatus(p.value, min, max, p.low, p.high, p.optimum)
  const tone: Tone = p.tone ?? (status ? STATUS_TONE[status] : 'brand')
  const text = (p.formatValue ?? String)(p.value, min, max)
  return { min, max, status, tone, text, aria: meterAria(p.value, min, max, text, status) }
}
