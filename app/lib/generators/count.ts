export function* count(start = 0, by = 1) {
    let i = start
    while (true) {
        yield i
        i += by
    }
}