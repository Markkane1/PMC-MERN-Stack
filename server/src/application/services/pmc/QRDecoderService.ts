import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { decode as decodeJpeg } from 'jpeg-js'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

/**
 * QR Code Decoder Service
 * Decodes QR codes from PNG and JPEG image files.
 */

export interface QRDecodeResult {
  success: boolean
  data?: string
  error?: string
  confidence?: number
}

interface DecodedImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

type SupportedImageFormat = 'png' | 'jpeg'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47])

const isPng = (imageBuffer: Buffer) =>
  imageBuffer.length >= PNG_SIGNATURE.length && imageBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)

const isJpeg = (imageBuffer: Buffer) =>
  imageBuffer.length >= 3 &&
  imageBuffer[0] === 0xff &&
  imageBuffer[1] === 0xd8 &&
  imageBuffer[2] === 0xff

const normalizeMimeType = (mimeType?: string): string =>
  mimeType?.split(';', 1)[0]?.trim().toLowerCase() || ''

const getFormatFromMimeType = (mimeType?: string): SupportedImageFormat | null => {
  const normalizedMimeType = normalizeMimeType(mimeType)

  if (normalizedMimeType === 'image/png') {
    return 'png'
  }

  if (normalizedMimeType === 'image/jpeg' || normalizedMimeType === 'image/jpg') {
    return 'jpeg'
  }

  return null
}

const getFormatFromFilePath = (filePath: string): SupportedImageFormat | null => {
  const fileExtension = path.extname(filePath).toLowerCase()

  if (fileExtension === '.png') {
    return 'png'
  }

  if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
    return 'jpeg'
  }

  return null
}

const detectImageFormat = (imageBuffer: Buffer, mimeType?: string, filePath?: string): SupportedImageFormat | null => {
  const formatFromMimeType = getFormatFromMimeType(mimeType)
  if (formatFromMimeType) {
    return formatFromMimeType
  }

  if (isPng(imageBuffer)) {
    return 'png'
  }

  if (isJpeg(imageBuffer)) {
    return 'jpeg'
  }

  if (filePath) {
    return getFormatFromFilePath(filePath)
  }

  return null
}

const decodeImageBuffer = (imageBuffer: Buffer, mimeType?: string, filePath?: string): DecodedImageData => {
  const imageFormat = detectImageFormat(imageBuffer, mimeType, filePath)

  if (imageFormat === 'png') {
    const image = PNG.sync.read(imageBuffer)
    return {
      data: new Uint8ClampedArray(image.data),
      width: image.width,
      height: image.height,
    }
  }

  if (imageFormat === 'jpeg') {
    const image = decodeJpeg(imageBuffer, {
      formatAsRGBA: true,
      useTArray: true,
    })
    return {
      data: new Uint8ClampedArray(image.data),
      width: image.width,
      height: image.height,
    }
  }

  throw new Error('Unsupported image format. Only PNG and JPEG QR images are supported.')
}

export class QRDecoderService {
  /**
   * Decode QR code from image buffer
   * @param imageBuffer - Buffer containing image data
   * @param mimeType - MIME type of the image (image/png, image/jpeg)
   * @returns Decoded QR code data
   */
  static async decodeFromBuffer(imageBuffer: Buffer, mimeType: string = 'image/png'): Promise<QRDecodeResult> {
    try {
      const { data, width, height } = decodeImageBuffer(imageBuffer, mimeType)

      // Try to decode QR code
      const code = jsQR(data, width, height)

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
      let detectedMimeType = mimeType
      if (base64String.includes(',')) {
        const prefix = base64String.split(',', 1)[0]
        const mimeTypeMatch = prefix.match(/^data:(.*?);base64$/i)
        if (mimeTypeMatch?.[1]) {
          detectedMimeType = mimeTypeMatch[1]
        }
        base64Data = base64String.split(',')[1]
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64')
      return this.decodeFromBuffer(buffer, detectedMimeType)
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
      const imageBuffer = await readFile(filePath)
      const { data, width, height } = decodeImageBuffer(imageBuffer, undefined, filePath)
      const code = jsQR(data, width, height)

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
