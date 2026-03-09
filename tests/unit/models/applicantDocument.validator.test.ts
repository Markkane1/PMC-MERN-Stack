import { describe, expect, it } from 'vitest'
import {
  ApplicantDocumentModel,
  DocumentType,
} from '../../../server/src/infrastructure/database/models/pmc/ApplicantDocument'

describe('ApplicantDocumentModel custom validators', () => {
  function createBaseDocument(overrides: Record<string, unknown> = {}) {
    return new ApplicantDocumentModel({
      applicantId: 1,
      documentType: DocumentType.CNIC,
      fileUrl: 'https://example.com/doc.pdf',
      fileName: 'doc.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      ...overrides,
    })
  }

  it('should accept fileSize exactly at 10MB boundary', () => {
    const doc = createBaseDocument({ fileSize: 10 * 1024 * 1024 })
    const validationError = doc.validateSync()
    expect(validationError).toBeUndefined()
  })

  it('should reject fileSize above 10MB with validation error', () => {
    const doc = createBaseDocument({ fileSize: 10 * 1024 * 1024 + 1 })
    const validationError = doc.validateSync()
    expect(validationError?.errors.fileSize).toBeDefined()
    expect(validationError?.errors.fileSize?.message).toContain('File size cannot exceed 10MB')
  })

  it('should reject unexpected fileSize type via mongoose cast/validation error', () => {
    const doc = createBaseDocument({ fileSize: 'not-a-number' })
    const validationError = doc.validateSync()
    expect(validationError?.errors.fileSize).toBeDefined()
  })
})
