/**
 * `n` separate iterators over one iterable, as Python's itertools.tee: each gives every item,
 * in order, at its own pace. The source is read once, as far as the furthest one has got;
 * what that one has read is kept until the others catch up (so the further apart they get,
 * the more is held). After a tee, use the copies, not the source: reading the source moves it
 * on without them.
 *
 * `n` has to be a whole number, 0 or more: anything else throws a RangeError.
 */
export function tee<T>(iterable: Iterable<T>, n = 2): Generator<T, void, unknown>[] {
    if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a whole number, 0 or more (got ${n})`)
    const source = iterable[Symbol.iterator]()
    // What each copy has still to give: read from the source, not yet taken by that copy
    const buffers: T[][] = Array.from({ length: n }, () => [])
    let finished = false

    function* copy(buffer: T[]): Generator<T, void, unknown> {
        while (true) {
            if (!buffer.length) {
                if (finished) return
                const next = source.next()
                if (next.done) {
                    finished = true
                    return
                }
                for (const b of buffers) b.push(next.value)
            }
            yield buffer.shift() as T
        }
    }

    return buffers.map(copy)
}
