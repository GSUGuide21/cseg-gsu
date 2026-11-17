/** `value` over and over: `count` times, or forever when no count is given */
export function* repeat<T>(value: T, count?: number) {
    let iterations = 0
    while (true) {
        if (count !== undefined && iterations >= count) break
        yield value
        iterations++
    }
}
