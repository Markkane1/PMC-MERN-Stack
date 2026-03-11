import type { ChalanData } from './ChalanPdfService'
import { ChalanPdfService } from './ChalanPdfService'
import type { CourierLabelData } from './CourierLabelPdfService'
import { CourierLabelPdfService } from './CourierLabelPdfService'
import type { LicensePdfData } from './LicensePdfService'
import { LicensePdfService } from './LicensePdfService'
import type { ReceiptData } from './ReceiptPdfService'
import { ReceiptPdfService } from './ReceiptPdfService'

export const SMALL_PDF_THRESHOLD_BYTES = 50 * 1024

export type PdfJobType = 'chalan' | 'receipt' | 'courier-label' | 'license'

export type PdfJobPayloadMap = {
  chalan: ChalanData
  receipt: ReceiptData
  'courier-label': CourierLabelData
  license: LicensePdfData
}

export interface PdfArtifact {
  buffer: Buffer
  filename: string
  mimeType: string
  size: number
  generatedAt: Date
}

const syncFallbackTypes = new Set<PdfJobType>(['receipt', 'license'])

export async function generatePdfArtifact<T extends PdfJobType>(
  type: T,
  data: PdfJobPayloadMap[T]
): Promise<PdfArtifact> {
  switch (type) {
    case 'chalan':
      return await ChalanPdfService.generateChalanPdfWithMetadata(data as ChalanData)
    case 'receipt':
      return await ReceiptPdfService.generateReceiptPdfWithMetadata(data as ReceiptData)
    case 'courier-label': {
      const result = await CourierLabelPdfService.generateCourierLabelPdfWithMetadata(data as CourierLabelData)
      return {
        buffer: result.buffer,
        filename: result.metadata.filename,
        mimeType: 'application/pdf',
        size: result.buffer.length,
        generatedAt: result.metadata.generatedAt,
      }
    }
    case 'license':
      return await LicensePdfService.generateLicensePdfWithMetadata(data as LicensePdfData)
    default:
      throw new Error(`Unsupported PDF job type: ${String(type)}`)
  }
}

export async function generateSynchronouslyIfSmall<T extends PdfJobType>(
  type: T,
  data: PdfJobPayloadMap[T]
): Promise<PdfArtifact | null> {
  if (!syncFallbackTypes.has(type)) {
    return null
  }

  const artifact = await generatePdfArtifact(type, data)
  return artifact.size <= SMALL_PDF_THRESHOLD_BYTES ? artifact : null
}
