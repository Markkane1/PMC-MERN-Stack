import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { QRDecoderService } from '../../services/pmc/QRDecoderService'
import { QRCodeService } from '../../services/pmc/QRCodeService'

export const ping = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ message: 'pong' })
})

/**
 * Verify Chalan QR Code
 * POST /api/pmc/verify-chalan/
 * Accepts uploaded image file or base64 encoded image, decodes QR code, and verifies
 */
export const verifyChalan = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get the uploaded file from multipart form data
    const file = (req as any).file
    const { qrData, chalanNumber } = req.body
    let decodedQrData: string | null = null

    // If file is uploaded, decode QR from image
    if (file && file.buffer) {
      const mimeType = file.mimetype || 'image/png'
      const decodeResult = await QRDecoderService.decodeFromBuffer(file.buffer, mimeType)

      if (!decodeResult.success) {
        return res.status(400).json({
          success: false,
          message: decodeResult.error || 'Failed to decode QR code from image',
          code: 'QR_DECODE_FAILED',
        })
      }

      decodedQrData = decodeResult.data || null
    }

    // Use provided QR data or decoded data from image
    const finalQrData = qrData || decodedQrData

    if (!finalQrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data or image file is required',
        code: 'QR_DATA_MISSING',
      })
    }

    if (!chalanNumber) {
      return res.status(400).json({
        success: false,
        message: 'Chalan number is required for verification',
        code: 'CHALAN_NUMBER_MISSING',
      })
    }

    try {
      // Parse and validate QR code data
      const qrContent = QRCodeService.parseQRCodeData(finalQrData)

      // Verify it's a chalan QR code
      if (qrContent.type !== 'CHALAN') {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code type (expected CHALAN)',
          code: 'INVALID_QR_TYPE',
          data: {
            receivedType: qrContent.type,
            expectedType: 'CHALAN',
          },
        })
      }

      // Verify chalan number matches
      if (qrContent.chalanNo !== chalanNumber) {
        return res.status(400).json({
          success: false,
          message: 'Chalan number does not match QR code data',
          code: 'CHALAN_MISMATCH',
          data: {
            qrChalanNo: qrContent.chalanNo,
            providedChalanNo: chalanNumber,
          },
        })
      }

      // Verification successful
      res.json({
        success: true,
        message: 'Chalan verified successfully',
        code: 'CHALAN_VERIFIED',
        data: {
          chalanNumber: qrContent.chalanNo,
          applicantId: qrContent.applicantId,
          amount: qrContent.amount,
          timestamp: qrContent.timestamp,
          verifiedAt: new Date().toISOString(),
          qrType: qrContent.type,
        },
      })
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: `Invalid QR code data format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        code: 'INVALID_QR_FORMAT',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to verify chalan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'VERIFICATION_ERROR',
    })
  }
})

export const confiscationLookup = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ items: [] })
})

