import PDFDocument from 'pdfkit'

/**
 * Receipt PDF Data Interface
 */
export interface ReceiptData {
  receiptNumber: string
  applicantId: string
  applicantName: string
  applicantEmail?: string
  applicantPhone?: string
  cnic?: string
  trackingNumber?: string
  amountPaid: number
  amountDue?: number
  paymentDate: Date
  description: string
  paymentMethod?: string
  referenceNumber?: string
  remarks?: string
}

/**
 * Receipt PDF Generator Service
 * Generates payment receipt PDFs with detailed transaction information
 */
export class ReceiptPdfService {
  /**
   * Generate complete receipt PDF document
   * @param data - Receipt payment details
   * @returns Buffer containing PDF binary data
   */
  static async generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          bufferPages: true,
          size: 'A4',
          margin: 40,
        })

        const chunks: Buffer[] = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        doc.on('error', reject)

        // Document header
        const left = doc.page.margins.left
        const right = doc.page.width - doc.page.margins.right
        const width = right - left

        // Border
        doc.rect(left, 25, width, doc.page.height - 50).lineWidth(2).stroke()

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('PAYMENT RECEIPT', left, 35, {
          align: 'center',
        })

        doc.fontSize(10).font('Helvetica').text('Punjab Plastic Management Commission', left, 60, {
          align: 'center',
        })

        // Separator
        doc.moveTo(left + 20, 80).lineTo(right - 20, 80).stroke()

        // Receipt details section
        let y = 95

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Receipt Details', left + 20, y, { width: 150 })

        y += 25

        const receiptInfo = [
          ['Receipt Number:', data.receiptNumber],
          ['Date:', data.paymentDate.toLocaleDateString('en-US')],
          ['Time:', data.paymentDate.toLocaleTimeString('en-US')],
        ]

        doc.fontSize(10)
        for (const [label, value] of receiptInfo) {
          doc.font('Helvetica-Bold').text(label, left + 20, y, { width: 140 })
          doc.font('Helvetica').text(String(value), left + 170, y, { width: right - left - 190 })
          y += 18
        }

        // Applicant details section
        y += 10
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Applicant Details', left + 20, y, { width: 150 })

        y += 25

        const applicantInfo = [
          ['Name:', data.applicantName],
          ['ID:', data.applicantId],
          ['CNIC:', data.cnic || 'N/A'],
          ['Email:', data.applicantEmail || 'N/A'],
          ['Phone:', data.applicantPhone || 'N/A'],
          ['Tracking:', data.trackingNumber || 'N/A'],
        ]

        doc.fontSize(10)
        for (const [label, value] of applicantInfo) {
          doc.font('Helvetica-Bold').text(label, left + 20, y, { width: 140 })
          doc.font('Helvetica').text(String(value), left + 170, y, { width: right - left - 190 })
          y += 18
        }

        // Payment details section
        y += 10
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Payment Details', left + 20, y, { width: 150 })

        y += 25

        const paymentInfo = [
          ['Amount Paid:', `PKR ${data.amountPaid.toFixed(2)}`],
          ['Amount Due:', data.amountDue ? `PKR ${data.amountDue.toFixed(2)}` : 'N/A'],
          ['Payment Method:', data.paymentMethod || 'Bank Transfer'],
          ['Reference Number:', data.referenceNumber || 'N/A'],
          ['Description:', data.description],
        ]

        doc.fontSize(10)
        for (const [label, value] of paymentInfo) {
          doc.font('Helvetica-Bold').text(label, left + 20, y, { width: 140 })
          const valueYPosition = y
          doc
            .font('Helvetica')
            .text(String(value), left + 170, valueYPosition, { width: right - left - 190 })
          y += 18
        }

        // Remarks if present
        if (data.remarks) {
          y += 10
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Remarks:', left + 20, y, { width: 150 })
          y += 18
          doc
            .font('Helvetica')
            .text(data.remarks, left + 20, y, { width: width - 40, align: 'left' })
          y += 30
        }

        // Footer section
        y = doc.page.height - 120

        doc.moveTo(left + 20, y).lineTo(right - 20, y).stroke()

        y += 15

        doc
          .fontSize(9)
          .font('Helvetica')
          .text('This is a computer-generated receipt. No signature is required.', left + 20, y, {
            align: 'center',
            width: width - 40,
          })

        y += 20

        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Generated on: ${new Date().toLocaleString()} | Document ID: ${data.receiptNumber}`,
            left + 20,
            y,
            { align: 'center', width: width - 40 }
          )

        doc.end()
      } catch (error) {
        reject(
          new Error(
            `Failed to generate receipt PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        )
      }
    })
  }

  /**
   * Generate receipt PDF with metadata
   * @param data - Receipt data
   * @returns PDF buffer and metadata
   */
  static async generateReceiptPdfWithMetadata(
    data: ReceiptData
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string; size: number; generatedAt: Date }> {
    const buffer = await this.generateReceiptPdf(data)

    return {
      buffer,
      filename: `Receipt-${data.receiptNumber}.pdf`,
      mimeType: 'application/pdf',
      size: buffer.length,
      generatedAt: new Date(),
    }
  }

  /**
   * Validate receipt data
   * @param data - Receipt data to validate
   * @throws Error if validation fails
   */
  static validateReceiptData(data: ReceiptData): void {
    const errors: string[] = []

    if (!data.receiptNumber || data.receiptNumber.trim() === '') {
      errors.push('Receipt number is required')
    }

    if (!data.applicantId || data.applicantId.trim() === '') {
      errors.push('Applicant ID is required')
    }

    if (!data.applicantName || data.applicantName.trim() === '') {
      errors.push('Applicant name is required')
    }

    if (data.amountPaid <= 0) {
      errors.push('Amount paid must be greater than zero')
    }

    if (!data.paymentDate) {
      errors.push('Payment date is required')
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Description is required')
    }

    if (errors.length > 0) {
      throw new Error(`Receipt validation failed: ${errors.join(', ')}`)
    }
  }
}
