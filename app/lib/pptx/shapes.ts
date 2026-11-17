/**
 * What the shapes on a slide are called (PowerPoint's Selection Pane shows them), so that the
 * file can be read back here into the same slides: see import.ts
 */
export const SHAPE = {
  title: 'Title',
  centeredTitle: 'Centered Title',
  attribution: 'Quote Attribution',
  quoteMark: 'Quote Mark',
  heading: (n: 1 | 2) => `Column Heading ${n}`,
  fullPicture: 'Full Picture',
  background: 'Background Picture',
  logo: 'Logo',
  footer: 'Footer',
  number: 'Slide Number',
} as const
