/**
 * Spreadsheets from the dashboard: rows as a CSV file the browser downloads. Each cell is
 * quoted, and one that starts like a formula (=, +, -, @) gets a leading apostrophe, so a
 * name typed as "=HYPERLINK(…)" opens as text in Excel or Sheets, not as a formula.
 */

const cell = (value: unknown) => {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** The rows as CSV text, a header row first */
export const toCsv = (head: readonly string[], rows: readonly (readonly unknown[])[]) => [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')

/** Downloads them as `<name>-<today>.csv` */
export function downloadCsv(name: string, head: readonly string[], rows: readonly (readonly unknown[])[]) {
  // The byte-order mark tells Excel it's UTF-8, so accents and curly quotes come through
  const url = URL.createObjectURL(new Blob(['﻿', toCsv(head, rows)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}
