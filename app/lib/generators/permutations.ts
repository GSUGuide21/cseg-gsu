/**
 * Every ordering of `r` of the items (all of them when `r` is left out), as Python's
 * itertools.permutations: permutations('abc', 2) gives ab ac ba bc ca cb, in that order.
 * Items are told apart by their place, not their value, so repeats in the input give repeats
 * in the output. Taking more than there are gives nothing; taking 0 gives one, empty.
 *
 * `r` has to be a whole number, 0 or more: anything else throws a RangeError, as Python's
 * raises a ValueError, rather than giving nonsense or never finishing.
 */
export function* permutations<T>(iterable: Iterable<T>, r?: number): Generator<T[]> {
    const pool = [...iterable]
    const n = pool.length
    const size = r ?? n
    if (!Number.isInteger(size) || size < 0) throw new RangeError(`r must be a whole number, 0 or more (got ${size})`)
    if (size > n) return
    const indices = Array.from({ length: n }, (_, i) => i)
    // How many more turns each place has before it's been through every item left for it
    const cycles = Array.from({ length: size }, (_, i) => n - i)
    const ordered = () => indices.slice(0, size).map((at) => pool[at])
    yield ordered()
    while (true) {
        let i = size - 1
        for (; i >= 0; i--) {
            cycles[i]--
            if (cycles[i] === 0) {
                // This place has had every item: put its item at the end, and start it over
                indices.push(indices.splice(i, 1)[0])
                cycles[i] = n - i
            } else {
                const j = n - cycles[i]
                ;[indices[i], indices[j]] = [indices[j], indices[i]]
                yield ordered()
                break
            }
        }
        // Every place came round: that was the last ordering
        if (i < 0) return
    }
}
