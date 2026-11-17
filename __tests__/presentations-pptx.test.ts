/**
 * @jest-environment jsdom
 */
import { buildPptx } from '../app/lib/pptx/export'
import { importPptx } from '../app/lib/pptx/import'
import { deckSettings } from '../app/lib/presentations'
import { plainText } from '../app/lib/richtext'
import type { PresentationSlide } from '../app/lib/supabase/types'

/** Rich text as the editor saves it, by way of Portable Text: a paragraph, then a list */
const writing = (para: string, points: string[] = []) =>
  JSON.stringify([
    { _type: 'block', _key: 'p', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's', text: para, marks: ['strong'] }] },
    ...points.map((t, i) => ({ _type: 'block', _key: `l${i}`, style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [{ _type: 'span', _key: `t${i}`, text: t, marks: [] }] })),
  ])

const deck: PresentationSlide[] = [
  { id: 'a', title: 'Welcome to CSEG', layout: 'title', body: writing('Fall kickoff') },
  { id: 'b', title: 'Who we are', body: writing('Commuters, for commuters', ['Every college', 'No dues']) },
  { id: 'c', title: 'Getting here', layout: 'two-column', body: writing('Driving'), body2: writing('MARTA') },
  { id: 'd', title: 'Backup', body: writing('Only if asked'), hidden: true, bgColor: '#0b2a6f' },
  { id: 'e', title: 'What we do', layout: 'section', body: '' },
  { id: 'f', title: 'Driving or MARTA', layout: 'comparison', label: 'Driving', label2: 'MARTA', body: writing('Decks fill early'), body2: writing('Five Points') },
  { id: 'g', title: 'A member', layout: 'quote', body: writing('CSEG is why I know where anything is.') },
]

/** The file a deck makes, read back */
const roundTrip = async (slides: PresentationSlide[], room = 50) => {
  const { pptx } = await buildPptx({ title: 'Kickoff', slides, settings: deckSettings({ footer: 'CSEG', numbers: true }), notes: { b: 'Ask who drove' } })
  const file = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer
  return importPptx(file, async () => 'https://x.test/picture.png', room)
}

describe('PowerPoint files', () => {
  it('comes back with its slides, their writing, layouts, notes, and which are hidden', async () => {
    const { slides, notes, leftOver } = await roundTrip(deck)
    expect(leftOver).toBe(0)
    expect(slides.map((s) => s.title)).toEqual(['Welcome to CSEG', 'Who we are', 'Getting here', 'Backup', 'What we do', 'Driving or MARTA', 'A member'])
    expect(slides[0]).toMatchObject({ layout: 'title' })
    expect(slides[5]).toMatchObject({ layout: 'comparison', label: 'Driving', label2: 'MARTA' })
    expect(plainText(slides[5].body2 ?? '')).toBe('Five Points')
    expect(slides[6]).toMatchObject({ layout: 'quote' })
    expect(plainText(slides[6].body)).toBe('CSEG is why I know where anything is.')
    // Points stay points; the footer and number along the bottom aren't the slide's writing
    expect(plainText(slides[1].body)).toBe('Commuters, for commuters\nEvery college\nNo dues')
    const points = JSON.parse(slides[1].body) as { listItem?: string; children: { marks: string[] }[] }[]
    expect(points.map((b) => b.listItem ?? null)).toEqual([null, 'bullet', 'bullet'])
    expect(points[0].children[0].marks).toContain('strong')
    expect(slides[2]).toMatchObject({ layout: 'two-column' })
    expect(plainText(slides[2].body)).toBe('Driving')
    expect(plainText(slides[2].body2 ?? '')).toBe('MARTA')
    expect(slides[3]).toMatchObject({ hidden: true, bgColor: '#0b2a6f' })
    expect(slides[4]).toMatchObject({ layout: 'section' })
    expect(notes[slides[1].id]).toBe('Ask who drove')
    expect(Object.keys(notes)).toHaveLength(1)
  })

  it('takes only as many slides as there’s room for, and says how many were left', async () => {
    const { slides, leftOver } = await roundTrip(deck, 2)
    expect(slides).toHaveLength(2)
    expect(leftOver).toBe(5)
  })

  it('reads a file PowerPoint made: its placeholders, points, links, pictures, hidden slides, and notes', async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const ns = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    const rels = (items: string) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`
    const shape = (ph: string, paras: string, x = 0, y = 0) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Shape"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="5000000" cy="3000000"/></a:xfrm></p:spPr><p:txBody>${paras}</p:txBody></p:sp>`
    const para = (text: string, extra = '', rPr = '') => `<a:p>${extra}<a:r>${rPr}<a:t>${text}</a:t></a:r></a:p>`
    zip.file('ppt/presentation.xml', `<p:presentation ${ns}><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`)
    zip.file('ppt/_rels/presentation.xml.rels', rels('<Relationship Id="rId1" Type="x/slide" Target="slides/slide1.xml"/><Relationship Id="rId2" Type="x/slide" Target="slides/slide2.xml"/>'))
    zip.file(
      'ppt/slides/slide1.xml',
      `<p:sld ${ns}><p:cSld><p:spTree>${shape('<p:ph type="title"/>', para('Parking'))}${shape(
        '<p:ph idx="1"/>',
        para('Decks') + para('Fill by 10am', '<a:pPr lvl="1"/>') + para('Not a point', '<a:pPr><a:buNone/></a:pPr>') + para('Map', '', '<a:rPr b="1"><a:hlinkClick r:id="rId9"/></a:rPr>'),
        0,
        1500000
      )}<p:pic><p:nvPicPr><p:cNvPr id="4" name="Picture 3"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId5"/></p:blipFill><p:spPr><a:xfrm><a:off x="7000000" y="1000000"/><a:ext cx="4000000" cy="3000000"/></a:xfrm></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`
    )
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      rels(
        '<Relationship Id="rId5" Type="x/image" Target="../media/image1.png"/><Relationship Id="rId9" Type="x/hyperlink" Target="https://cseg.test/map" TargetMode="External"/><Relationship Id="rId7" Type="x/notesSlide" Target="../notesSlides/notesSlide1.xml"/>'
      )
    )
    zip.file('ppt/media/image1.png', new Uint8Array([137, 80, 78, 71]))
    zip.file('ppt/notesSlides/notesSlide1.xml', `<p:notes ${ns}><p:cSld><p:spTree>${shape('<p:ph type="body"/>', para('Point at the map') + para('Then ask'))}</p:spTree></p:cSld></p:notes>`)
    zip.file('ppt/slides/slide2.xml', `<p:sld ${ns} show="0"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFD166"/></a:solidFill></p:bgPr></p:bg><p:spTree>${shape('<p:ph type="ctrTitle"/>', para('Thanks'))}</p:spTree></p:cSld></p:sld>`)

    const uploads: string[] = []
    const { slides, notes } = await importPptx(
      await zip.generateAsync({ type: 'arraybuffer' }),
      async (f) => {
        uploads.push(`${f.name} ${f.type}`)
        return 'https://cseg.test/uploaded.png'
      },
      50
    )
    expect(uploads).toEqual(['image1.png image/png'])
    expect(slides[0]).toMatchObject({ title: 'Parking', layout: 'image-right', image: 'https://cseg.test/uploaded.png' })
    const blocks = JSON.parse(slides[0].body) as { listItem?: string; level?: number; markDefs: { href: string }[]; children: { marks: string[] }[] }[]
    expect(blocks.map((b) => [b.listItem ?? null, b.level ?? null])).toEqual([
      ['bullet', 1],
      ['bullet', 2],
      [null, null],
      ['bullet', 1],
    ])
    expect(blocks[3].markDefs[0].href).toBe('https://cseg.test/map')
    expect(blocks[3].children[0].marks).toContain('strong')
    expect(notes[slides[0].id]).toBe('Point at the map\nThen ask')
    expect(slides[1]).toMatchObject({ title: 'Thanks', layout: 'title', hidden: true, bgColor: '#ffd166' })
  })

  it('says so when the file isn’t a PowerPoint file', async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file('word/document.xml', '<w:document/>')
    await expect(importPptx(await zip.generateAsync({ type: 'arraybuffer' }), async () => '', 50)).rejects.toThrow('That isn’t a PowerPoint file (.pptx).')
  })
})
