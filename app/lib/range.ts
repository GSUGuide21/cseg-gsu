// Yields the numbers from start up to, but not including, end, counting by step.
// Counts downwards when end is below start
export const range = (start: number, end: number | null = null, step: number = 1): Generator<number> => {
    const trueStart = end !== null ? start : 0
    const trueEnd = end !== null ? end : start

    // Checked here, not inside the generator, so that a bad call fails straight away instead of on first use
    if (!Number.isFinite(trueStart) || !Number.isFinite(trueEnd))
        throw new Error(`A range needs a finite start and end, but received ${start} and ${end}.`)
    if (!Number.isFinite(step) || step <= 0)
        throw new Error(`A range needs a step greater than 0, but received ${step}.`)

    const direction = trueEnd > trueStart ? 1 : -1
    // The small allowance stops a rounding error from adding a value at the end, as in 0.9 / 0.3
    const count = Math.ceil(Math.abs(trueEnd - trueStart) / step - 1e-9)
    
    // Multiplying by the count, instead of adding the step each time, keeps rounding errors from building up
    return (function*() {
        for (let i = 0; i < count; i++) yield trueStart + i * step * direction
    })()
}
