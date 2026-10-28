// Minimum and maximum functions
export const min = (...values: number[]): number => Math.min(...values)
export const max = (...values: number[]): number => Math.max(...values)

// Random number generation
export const random = (min: number, max: number): number => Math.random() * (max - min) + min
export const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
export const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min

export const randomChoice = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
export const randomSample = <T>(array: T[], size: number): T[] => {
  if (size > array.length) throw new Error('Sample size cannot be larger than the array size')
  const shuffled = array.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}
export const randomShuffle = <T>(array: T[]): T[] => {
  const shuffled = array.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}