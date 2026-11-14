/**
 * Writing side by side: two or three columns, each holding its own paragraphs, lists,
 * images, and so on. On a phone they stack, in order.
 */

export const COLUMN_LAYOUTS = {
  '1-1': { label: 'Two columns', hint: 'Equal halves', count: 2, grid: 'sm:grid-cols-2' },
  '1-1-1': { label: 'Three columns', hint: 'Equal thirds', count: 3, grid: 'sm:grid-cols-3' },
  '2-1': { label: 'Wide and narrow', hint: 'Two thirds, then one', count: 2, grid: 'sm:grid-cols-[2fr_1fr]' },
  '1-2': { label: 'Narrow and wide', hint: 'One third, then two', count: 2, grid: 'sm:grid-cols-[1fr_2fr]' },
} as const

export type ColumnsLayout = keyof typeof COLUMN_LAYOUTS

export const COLUMN_LAYOUT_LIST = Object.keys(COLUMN_LAYOUTS) as ColumnsLayout[]

export const parseColumnsLayout = (value: unknown): ColumnsLayout => (typeof value === 'string' && Object.hasOwn(COLUMN_LAYOUTS, value) ? (value as ColumnsLayout) : '1-1')

/** The row of columns, and one column; `editing` outlines each column so an empty one can be found */
export const columnsClasses = (layout: ColumnsLayout, editing = false) => ({
  row: `my-5 grid grid-cols-1 gap-x-8 gap-y-2 ${COLUMN_LAYOUTS[layout].grid}`,
  column: `min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0${editing ? ' rounded-lg outline-1 outline-offset-4 outline-dashed outline-line' : ''}`,
})
