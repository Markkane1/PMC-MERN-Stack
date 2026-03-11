import PDFDocument from 'pdfkit'

export interface LicensePdfData {
  license_number: string
  license_duration?: string
  owner_name?: string
  business_name?: string
  address?: string
  cnic_number?: string
  district_name?: string | null
  tehsil_name?: string | null
  date_of_issue?: string | null
}

export class LicensePdfService {
  static async generateLicensePdf(data: LicensePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
        const chunks: Buffer[] = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const pageWidth = doc.page.width
        const pageHeight = doc.page.height
        const left = doc.page.margins.left
        const right = pageWidth - doc.page.margins.right

        doc.rect(left, 30, right - left, pageHeight - 60).lineWidth(1).stroke()

        doc.fontSize(22).text('Plastic Management License', left, 48, {
          align: 'center',
        })
        doc.moveDown(1.5)

        const startY = 110
        const colGap = 30
        const colWidth = (right - left - colGap) / 2

        const rows: Array<[string, string]> = [
          ['License Number', data.license_number || ''],
          ['License Duration', data.license_duration || ''],
          ['Owner Name', data.owner_name || ''],
          ['Business Name', data.business_name || ''],
          ['CNIC', data.cnic_number || ''],
          ['Address', data.address || ''],
          ['District', data.district_name || ''],
          ['Tehsil', data.tehsil_name || ''],
          ['Date of Issue', data.date_of_issue || ''],
        ]

        doc.fontSize(12)
        let y = startY
        rows.forEach(([label, value], index) => {
          const x = index % 2 === 0 ? left + 20 : left + colWidth + colGap + 20
          if (index % 2 === 0 && index > 0) y += 26
          doc.font('Helvetica-Bold').text(`${label}:`, x, y, { width: 110 })
          doc.font('Helvetica').text(value, x + 120, y, { width: colWidth - 120 })
        })

        doc.moveTo(left + 20, pageHeight - 120).lineTo(left + 300, pageHeight - 120).stroke()
        doc.fontSize(10).text('Authorized Signature', left + 20, pageHeight - 110)

        doc.end()
      } catch (error) {
        reject(
          new Error(
            `Failed to generate license PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        )
      }
    })
  }

  static async generateLicensePdfWithMetadata(data: LicensePdfData): Promise<{
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
    generatedAt: Date
  }> {
    const buffer = await this.generateLicensePdf(data)

    return {
      buffer,
      filename: `license-${data.license_number || Date.now()}.pdf`,
      mimeType: 'application/pdf',
      size: buffer.length,
      generatedAt: new Date(),
    }
  }
}
