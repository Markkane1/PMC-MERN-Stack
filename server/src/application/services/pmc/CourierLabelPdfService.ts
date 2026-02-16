import PDFDocument from 'pdfkit'
import bwipjs from 'bwip-js'

/**
 * Courier Label Data Interface
 */
export interface CourierLabelData {
  trackingNumber: string
  competitionName?: string
  participantName: string
  recipientName: string
  street: string
  city: string
  province: string
  postalCode: string
  phone: string
  courierCompany: string
  generatedDate?: Date
  registrationId?: string
}

/**
 * Courier Label PDF Service
 * Generates professional shipping labels with barcodes for competition entries
 */
export class CourierLabelPdfService {
  /**
   * Generate courier label PDF as buffer
   * @param data Courier label data
   * @returns PDF buffer
   */
  static async generateCourierLabelPdf(data: CourierLabelData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 20 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Validate input
      if (!data.trackingNumber) {
        reject(new Error('Tracking number is required'))
        return
      }

      try {
        // Header with competition info
        doc.fontSize(16).font('Helvetica-Bold').text('SHIPPING LABEL', { align: 'center' })
        if (data.competitionName) {
          doc.fontSize(11).font('Helvetica').text(`Competition: ${data.competitionName}`, { align: 'center' })
        }
        doc.moveDown(0.5)

        // Horizontal line
        doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke()
        doc.moveDown(0.3)

        // Left column - Barcode area
        doc.fontSize(9).font('Helvetica-Bold').text('BARCODE', 30, doc.y)

        // Generate barcode
        bwipjs
          .toBuffer({
            bcid: 'code128',
            text: data.trackingNumber,
            scale: 2,
            height: 8,
          } as any)
          .then((png) => {
            doc.image(png, 30, doc.y + 5, { width: 150, height: 60 })
            doc.y += 70

            // Tracking number in separate format
            doc.fontSize(10).font('Helvetica-Bold').text('Tracking #:', 30, doc.y)
            doc.fontSize(14).font('Helvetica-Bold').text(data.trackingNumber, 30, doc.y + 18, { align: 'center', width: 150 })
            doc.y += 40

            // Right column - Recipient address
            doc.fontSize(11).font('Helvetica-Bold').text('SHIP TO:', 250, 60)
            doc.fontSize(10).font('Helvetica').text(data.recipientName, 250, 80, { width: 300 })

            // Larger address area
            const addressY = doc.y + 10
            doc.fontSize(14)
              .font('Helvetica-Bold')
              .text(data.recipientName, 250, addressY, { width: 300 })

            doc.fontSize(11)
              .font('Helvetica')
              .text(data.street, 250, addressY + 20, { width: 300 })
              .text(`${data.city}, ${data.province} ${data.postalCode}`, 250, addressY + 38, { width: 300 })
              .text(`Phone: ${data.phone}`, 250, addressY + 56, { width: 300 })

            doc.y = addressY + 80

            // Separator
            doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke()
            doc.moveDown(0.3)

            // Courier and other details
            doc.fontSize(10).font('Helvetica-Bold').text('COURIER DETAILS:', 30, doc.y)
            doc.moveDown(0.2)

            doc.fontSize(10).font('Helvetica').text(`Courier Company: ${data.courierCompany}`, 50, doc.y)
            doc.moveDown(0.3)

            if (data.participantName) {
              doc.fontSize(10).font('Helvetica').text(`Participant: ${data.participantName}`, 50, doc.y)
              doc.moveDown(0.3)
            }

            if (data.registrationId) {
              doc.fontSize(9).font('Helvetica').text(`Reg ID: ${data.registrationId}`, 50, doc.y)
              doc.moveDown(0.3)
            }

            // Footer
            doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke()
            doc.moveDown(0.2)

            doc.fontSize(8).font('Helvetica').text(`Generated: ${(data.generatedDate || new Date()).toLocaleString()}`, 30, doc.y, {
              align: 'center',
            })

            // End document
            doc.end()
          })
          .catch((error) => {
            reject(new Error(`Failed to generate barcode: ${error.message}`))
          })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Generate courier label with metadata
   * @param data Courier label data
   * @returns Object with PDF buffer and metadata
   */
  static async generateCourierLabelPdfWithMetadata(
    data: CourierLabelData
  ): Promise<{ buffer: Buffer; metadata: { filename: string; generatedAt: Date; trackingNumber: string } }> {
    // Validate required fields
    this.validateLabelData(data)

    const buffer = await this.generateCourierLabelPdf(data)

    return {
      buffer,
      metadata: {
        filename: `courier-label-${data.trackingNumber}.pdf`,
        generatedAt: new Date(),
        trackingNumber: data.trackingNumber,
      },
    }
  }

  /**
   * Validate courier label data
   * @param data Data to validate
   */
  static validateLabelData(data: CourierLabelData): void {
    const requiredFields = ['trackingNumber', 'participantName', 'recipientName', 'street', 'city', 'province', 'postalCode', 'phone']

    const missingFields = requiredFields.filter((field) => !data[field as keyof CourierLabelData])

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Validate tracking number format
    if (!this.isValidTrackingNumber(data.trackingNumber)) {
      throw new Error('Invalid tracking number format')
    }

    // Validate postal code (basic check)
    if (data.postalCode && !/^\d{5}$/.test(data.postalCode)) {
      throw new Error('Postal code must be 5 digits')
    }
  }

  /**
   * Validate tracking number format
   * @param trackingNumber Tracking number to validate
   */
  private static isValidTrackingNumber(trackingNumber: string): boolean {
    // Must be non-empty string, reasonable length, and contain alphanumeric characters
    return !!(trackingNumber && trackingNumber.length >= 5 && trackingNumber.length <= 50 && /^[A-Z0-9\-]+$/.test(trackingNumber))
  }
}
