/**
 * Every way to choose `r` of the items, without regard to order, as Python's
 * itertools.combinations: combinations('abcd', 2) gives ab ac ad bc bd cd, in that order.
 * Items are told apart by their place, not their value, so repeats in the input give repeats
 * in the output. Choosing more than there are gives nothing; choosing 0 gives one, empty.
 *
 * `r` has to be a whole number, 0 or more: anything else throws a RangeError, as Python's
 * raises a ValueError, rather than giving nonsense or never finishing.
 */
export function* combinations<T>(iterable: Iterable<T>, r: number): Generator<T[]> {
    if (!Number.isInteger(r) || r < 0) throw new RangeError(`r must be a whole number, 0 or more (got ${r})`)
    const pool = [...iterable]
    const n = pool.length
    if (r > n) return
    // Which items are chosen, by place, always in increasing order
    const indices = Array.from({ length: r }, (_, i) => i)
    const chosen = () => indices.map((at) => pool[at])
    yield chosen()
    while (true) {
        // The rightmost place that can still move up
        let i = r - 1
        while (i >= 0 && indices[i] === i + n - r) i--
        if (i < 0) return
        indices[i]++
        for (let j = i + 1; j < r; j++) indices[j] = indices[j - 1] + 1
        yield chosen()
    }
}
