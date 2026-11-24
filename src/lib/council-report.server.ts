import PDFDocument from 'pdfkit'
import type { Glitch } from './glitch'

const title = 'Incidentrapport voor de Hoge Raad van Achrona'

export function renderCouncilReport(glitches: Glitch[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: title } })
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const fixed = glitches.filter((glitch) => glitch.status === 'FIXED').length
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#261844').text(title)
    doc.moveDown(0.5)
    doc.font('Helvetica').fontSize(11).fillColor('#24202c')
      .text(`Totaal: ${glitches.length}  ·  Actief: ${glitches.length - fixed}  ·  Opgelost: ${fixed}`)

    if (!glitches.length) doc.moveDown().text('Er zijn geen glitches geregistreerd.')
    for (const glitch of glitches) {
      if (doc.y > doc.page.height - 135) doc.addPage()
      doc.moveDown().font('Helvetica-Bold').fontSize(12).fillColor('#261844')
        .text(`${glitch.glitchId} · ${glitch.status}`)
      doc.font('Helvetica').fontSize(10).fillColor('#24202c')
        .text(glitch.description)
        .text(`Gemeld: ${glitch.timestamp} · Defender: ${glitch.assignedDefender ?? 'Niet toegewezen'}`)
      for (const update of glitch.updates ?? []) {
        doc.moveDown(0.35).text(`${update.timestamp} · ${update.author} — ${update.text}`, { indent: 12 })
      }
    }
    doc.end()
  })
}
