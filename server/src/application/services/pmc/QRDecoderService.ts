import jsQR from 'jsqr'  
import { Jimp } from 'jimp'

/**
 * QR Code Decoder Service
 * Decodes QR codes from image files (PNG, JPG, etc.)
 */

export interface QRDecodeResult {
  success: boolean
  data?: string
  error?: string
  confidence?: number
}

export class QRDecoderService {
  /**
   * Decode QR code from image buffer
   * @param imageBuffer - Buffer containing image data
   * @param mimeType - MIME type of the image (image/png, image/jpeg, etc.)
   * @returns Decoded QR code data
   */
  static async decodeFromBuffer(imageBuffer: Buffer, mimeType: string = 'image/png'): Promise<QRDecodeResult> {
    try {
      // Load image using Jimp
      const image = await Jimp.read(imageBuffer)

      // Convert to grayscale for better QR detection
      image.greyscale()

      // Get image data
      const imageData = image.bitmap.data
      const width = image.bitmap.width
      const height = image.bitmap.height

      // Convert RGBA to grayscale array expected by jsQR
      const grayScaleData = new Uint8ClampedArray(width * height)
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i]
        const g = imageData[i + 1]
        const b = imageData[i + 2]
        // Standard luminosity formula
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        grayScaleData[i / 4] = gray
      }

      // Try to decode QR code
      const code = jsQR(grayScaleData, width, height)

      if (code) {
        return {
          success: true,
          data: code.data,
          confidence: 100,
        }
      } else {
        return {
          success: false,
          error: 'No QR code found in image',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to decode QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Decode QR code from base64 encoded image
   * @param base64String - Base64 encoded image string
   * @param mimeType - MIME type of the image
   * @returns Decoded QR code data
   */
  static async decodeFromBase64(base64String: string, mimeType: string = 'image/png'): Promise<QRDecodeResult> {
    try {
      // Remove data URI prefix if present
      let base64Data = base64String
      if (base64String.includes(',')) {
        base64Data = base64String.split(',')[1]
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64')
      return this.decodeFromBuffer(buffer, mimeType)
    } catch (error) {
      return {
        success: false,
        error: `Failed to decode base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Decode QR code from file path
   * @param filePath - Path to image file
   * @returns Decoded QR code data
   */
  static async decodeFromFile(filePath: string): Promise<QRDecodeResult> {
    try {
      const image = await Jimp.read(filePath)

      // Convert to grayscale
      image.greyscale()

      const imageData = image.bitmap.data
      const width = image.bitmap.width
      const height = image.bitmap.height

      const grayScaleData = new Uint8ClampedArray(width * height)
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i]
        const g = imageData[i + 1]
        const b = imageData[i + 2]
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        grayScaleData[i / 4] = gray
      }

      const code = jsQR(grayScaleData, width, height)

      if (code) {
        return {
          success: true,
          data: code.data,
          confidence: 100,
        }
      } else {
        return {
          success: false,
          error: 'No QR code found in image',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to read image file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}
