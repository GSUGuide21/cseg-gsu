export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

export const circle = (value: number, min: number, max: number, inclusive: boolean = false): number => {
  const range = max - min
  if (range < 0) throw new Error('Invalid range: max must be greater than min')
  
  const adjustedValue = value - min
  const adjustedRange = inclusive ? range + 1 : range

  const wrappedValue = ((adjustedValue % adjustedRange) + adjustedRange) % adjustedRange

  if (inclusive) {
    if (adjustedValue < 0) return adjustedValue + adjustedRange
    if (adjustedValue >= adjustedRange) return adjustedValue - adjustedRange
  }

  if (!inclusive && wrappedValue === range) return min

  if (adjustedValue < 0) return adjustedValue + adjustedRange
  if (adjustedValue >= adjustedRange) return adjustedValue - adjustedRange
  return adjustedValue + min
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  } as T
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isEmptyObject = (obj: Record<string, unknown> | unknown[]): boolean => {
  return Object.keys(obj).length === 0
}

export const isEmptyArray = (arr: unknown[]): boolean => {
  return Array.isArray(arr) && arr.length === 0
}

export const isEmpty = (value: unknown): boolean => {
  if (Array.isArray(value)) return isEmptyArray(value)
  if (isObject(value)) isEmptyObject(value)
  if (typeof value === 'string') return value === ''
  if (value === null || value === undefined) return true
  return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deepMerge = <T extends Record<string, any> | any[], U extends Partial<T>>(
  target: T,
  source: U
): T & U => {
  if (isEmpty(source)) return target as T & U
  if (isEmpty(target)) return source as T & U
  if (isEmptyObject(target) && isEmptyObject(source)) return { ...target, ...source } as T & U

  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source] as T & U
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = { ...target }

  for (const key in source) {
    if (!source.hasOwnProperty(key)) continue
    const sourceValue = source[key]
    const targetValue = (target as unknown as U)[key]

    if (isObject(sourceValue) && sourceValue !== null && !Array.isArray(sourceValue)) {
      merged[key] = deepMerge(targetValue || {}, sourceValue)
    } else merged[key] = sourceValue
  }
  
  return merged as T & U
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
  let lastCall = 0

  return function (...args: Parameters<T>) {
    const now = Date.now()
    const elapsed = now - lastCall

    if (elapsed >= delay) {
      lastCall = now
      return fn(...args)
    }
  } as T
}

export const getPercentage = (value: number, min: number, max: number): number => {
  if (value < min) return 0
  if (value > max) return 100
  return ((value - min) / (max - min)) * 100
}

export const getValue = (percentage: number, min: number, max: number): number => {
  if (percentage < 0) return min
  if (percentage > 100) return max
  return ((percentage / 100) * (max - min)) + min
}

export const getStep = (value: number, step: number): number => {
  return Math.round(value / step) * step
}

export const getStepPercentage = (value: number, min: number, max: number, step: number): number => {
  const range = max - min
  const stepCount = Math.round((value - min) / step)
  return (stepCount / (range / step)) * 100
}

export const getStepValue = (percentage: number, min: number, max: number, step: number): number => {
  const range = max - min
  const stepCount = Math.round((percentage / 100) * (range / step))
  return (stepCount * step) + min
}

export const getClosestValue = (value: number, values: number[]): number => {
  if (values.length === 0) return value
  return values.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  }, value)
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const curry = <T extends (...args: any[]) => any>(fn: T): T => {
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= fn.length) return fn(...(args as Parameters<T>))
    return (...rest: unknown[]) => curried(...args, ...rest)
  }
  return curried as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const curryRight = <T extends (...args: any[]) => any>(fn: T): T => {
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= fn.length) return fn(...(args as Parameters<T>))
    return (...rest: unknown[]) => curried(...rest, ...args)
  }
  return curried as T
}

export const uniqueId = (prefix = ""): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)

  return `${prefix ?? ""}${timestamp}-${random}`
}