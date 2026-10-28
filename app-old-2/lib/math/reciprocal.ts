// Reciprocal function
export const reciprocal = (value: number): number => {
  if (value === 0) throw new Error('Division by zero is not allowed')
  return 1 / value
}