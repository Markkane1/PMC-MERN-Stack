import QRCode from 'qrcode'

/**
 * QR Code Generation Service
 * Generates QR codes for bank chalans, PSID tracking, and other verification needs
 */
export class QRCodeService {
  /**
   * Generate QR code as data URL for embedding in PDFs or web display
   * @param data - Data to encode in QR code
   * @returns Data URL string (base64 encoded PNG)
   */
  static async generateQRCodeDataUrl(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H', // High error correction (30% of code can be damaged)
        type: 'image/png' as any,
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    } catch (error) {
      throw new Error(`Failed to generate QR code data URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate QR code as Buffer for saving to files
   * @param data - Data to encode in QR code
   * @returns Buffer containing PNG image data
   */
  static async generateQRCodeBuffer(data: string): Promise<Buffer> {
    try {
      return await (QRCode.toBuffer as any)(data, {
        errorCorrectionLevel: 'H',
        type: 'png' as any,
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate small QR code for compact display
   * @param data - Data to encode
   * @returns Data URL string
   */
  static async generateSmallQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M', // Medium error correction
        type: 'image/png' as any,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    } catch (error) {
      throw new Error(`Failed to generate small QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify QR code data structure
   * @param qrData - Raw QR code data string
   * @returns Parsed and validated QR code object
   */
  static parseQRCodeData(qrData: string): Record<string, any> {
    try {
      return JSON.parse(qrData)
    } catch (error) {
      throw new Error(`Invalid QR code data: ${error instanceof Error ? error.message : 'Not valid JSON'}`)
    }
  }

  /**
   * Generate QR code for bank chalan verification
   * @param chalanNumber - Unique chalan number
   * @param applicantId - Applicant ID
   * @param amount - Payment amount
   * @returns Data URL for QR code
   */
  static async generateChalanQRCode(
    chalanNumber: string,
    applicantId: string,
    amount: number
  ): Promise<string> {
    const qrData = JSON.stringify({
      type: 'CHALAN',
      chalanNo: chalanNumber,
      applicantId,
      amount,
      timestamp: new Date().toISOString(),
      version: '1.0',
    })
    return this.generateQRCodeDataUrl(qrData)
  }

  /**
   * Generate QR code for PSID verification
   * @param psidNumber - Unique PSID number
   * @param applicantId - Applicant ID
   * @returns Data URL for QR code
   */
  static async generatePsidQRCode(psidNumber: string, applicantId: string): Promise<string> {
    const qrData = JSON.stringify({
      type: 'PSID',
      psidNumber,
      applicantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    })
    return this.generateQRCodeDataUrl(qrData)
  }

  /**
   * Generate QR code for license verification
   * @param licenseNumber - License number
   * @param applicantId - Applicant ID
   * @returns Data URL for QR code
   */
  static async generateLicenseQRCode(licenseNumber: string, applicantId: string): Promise<string> {
    const qrData = JSON.stringify({
      type: 'LICENSE',
      licenseNumber,
      applicantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    })
    return this.generateQRCodeDataUrl(qrData)
  }
}
