import PDFDocument from 'pdfkit'
import { QRCodeService } from './QRCodeService'

/**
 * Bank Chalan PDF Data Interface
 */
export interface ChalanData {
  chalanNumber: string
  applicantId: string
  applicantName: string
  amountDue: number
  dueDate: Date
  description: string
  bankName?: string
  bankBranch?: string
  accountNumber?: string
  bankCode?: string
}

/**
 * Chalan PDF Generator Service
 * Generates bank payment chalans with embedded QR codes for verification
 */
export class ChalanPdfService {
  /**
   * Generate complete bank chalan PDF document
   * @param data - Chalan payment details
   * @returns Buffer containing PDF binary data
   */
  static async generateChalanPdf(data: ChalanData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
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

        // Generate QR code
        const qrDataUrl = await QRCodeService.generateChalanQRCode(
          data.chalanNumber,
          data.applicantId,
          data.amountDue
        )

        // ==================== HEADER ====================
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('BANK CHALAN / DEPOSIT SLIP', { align: 'center' })

        doc.fontSize(10).font('Helvetica').text('For Electronic Payment of Federal/Provincial Taxes', {
          align: 'center',
        })

        // Divider
        doc.moveTo(40, 80).lineTo(555, 80).stroke()

        // ==================== CHALAN INFO ====================
        doc.fontSize(11).font('Helvetica-Bold').text('Chalan Details', 50, 100)

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Chalan Number: ${data.chalanNumber}`, 50, 125)
          .text(`Generated Date: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}`, 50, 145)
          .text(`Due Date: ${new Date(data.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}`, 50, 165)

        // QR Code (right side)
        doc.image(qrDataUrl, 380, 100, { width: 150, height: 150 })

        // ==================== APPLICANT INFO ====================
        doc.fontSize(11).font('Helvetica-Bold').text('Applicant Information', 50, 270)

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Applicant ID: ${data.applicantId}`, 50, 295)
          .text(`Name: ${data.applicantName}`, 50, 315)
          .text(`Purpose: ${data.description || 'Application Fee Payment'}`, 50, 335)

        // ==================== BANK DETAILS ====================
        doc.fontSize(11).font('Helvetica-Bold').text('Bank Details', 50, 380)

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Bank Name: ${data.bankName || 'State Bank of Pakistan (SBP)'}`, 50, 405)
          .text(`Branch: ${data.bankBranch || 'Main Office'}`, 50, 425)
          .text(`Account Number: ${data.accountNumber || '01-9900-00001-1'}`, 50, 445)
          .text(`Bank Code: ${data.bankCode || '0020'}`, 50, 465)

        // ==================== AMOUNT SECTION ====================
        doc.fontSize(11).font('Helvetica-Bold').text('Payment Amount', 50, 510)

        // Amount box
        doc
          .rect(50, 535, 515, 60)
          .stroke()

        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .text(`PKR ${data.amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 60, 545, {
            align: 'center',
          })

        // ==================== INSTRUCTIONS ====================
        doc.fontSize(10).font('Helvetica-Bold').text('Payment Instructions:', 50, 620)

        const instructions = [
          '1. Present this chalan at any branch of the mentioned bank',
          '2. Payment should be made in the exact amount shown above',
          '3. Keep the duplicate copy for your records',
          '4. Processing time: 1-3 business days',
          '5. Scan QR code below to verify chalan authenticity',
        ]

        let instructionY = 640
        instructions.forEach((instruction) => {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(instruction, 50, instructionY)
          instructionY += 18
        })

        // ==================== FOOTER ====================
        const pageHeight = doc.page.height
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#666666')
          .text(
            `Generated: ${new Date().toLocaleString()} | Document ID: ${data.chalanNumber}`,
            50,
            pageHeight - 40,
            { align: 'center' }
          )

        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            'This is a system-generated document. No signature required.',
            50,
            pageHeight - 25,
            { align: 'center' }
          )
          .fillColor('#000000')

        // Finalize PDF
        doc.end()
      } catch (error) {
        reject(new Error(`Failed to generate chalan PDF: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * Generate chalan PDF and return file information
   * @param data - Chalan payment details
   * @returns Object with PDF buffer and metadata
   */
  static async generateChalanPdfWithMetadata(data: ChalanData): Promise<{
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
    generatedAt: Date
  }> {
    const buffer = await this.generateChalanPdf(data)

    return {
      buffer,
      filename: `chalan-${data.chalanNumber}-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      size: buffer.length,
      generatedAt: new Date(),
    }
  }

  /**
   * Validate chalan data before PDF generation
   * @param data - Chalan payment details
   * @throws Error if validation fails
   */
  static validateChalanData(data: ChalanData): void {
    const errors: string[] = []

    if (!data.chalanNumber?.trim()) {
      errors.push('Chalan number is required')
    }

    if (!data.applicantId?.trim()) {
      errors.push('Applicant ID is required')
    }

    if (!data.applicantName?.trim()) {
      errors.push('Applicant name is required')
    }

    if (!Number.isFinite(data.amountDue) || data.amountDue <= 0) {
      errors.push('Amount due must be a positive number')
    }

    if (!(data.dueDate instanceof Date) || isNaN(data.dueDate.getTime())) {
      errors.push('Due date must be a valid date')
    }

    if (data.dueDate < new Date()) {
      errors.push('Due date cannot be in the past')
    }

    if (!data.description?.trim()) {
      errors.push('Description is required')
    }

    if (errors.length > 0) {
      throw new Error(`Chalan validation failed: ${errors.join('; ')}`)
    }
  }
}
