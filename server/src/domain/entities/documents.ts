import type { Id, Timestamped } from '../types'

/**
 * Document Types supported by the system
 */
export enum DocumentType {
  CNIC = 'CNIC',
  PASSPORT = 'PASSPORT',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  UTILITY_BILL = 'UTILITY_BILL',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  BANK_CHALAN = 'BANK_CHALAN',
  LICENSE = 'LICENSE',
  NRSL_CERTIFICATE = 'NRSL_CERTIFICATE',
  SERAI_CERTIFICATE = 'SERAI_CERTIFICATE',
  ECP_CERTIFICATE = 'ECP_CERTIFICATE',
  WASTE_MANAGEMENT_PLAN = 'WASTE_MANAGEMENT_PLAN',
  POLLUTION_CONTROL_CERT = 'POLLUTION_CONTROL_CERT'
}

/**
 * Document verification status
 */
export enum DocumentStatus {
  PENDING = 'PENDING',           // Awaiting verification
  VERIFIED = 'VERIFIED',         // Approved by authorized user
  REJECTED = 'REJECTED',         // Rejected with reason
  EXPIRING_SOON = 'EXPIRING_SOON', // Within 30 days of expiry
  EXPIRED = 'EXPIRED',           // Past expiry date
  RESUBMIT_REQUIRED = 'RESUBMIT_REQUIRED' // Re-submission requested
}

/**
 * Document metadata for tracking and analytics
 */
export interface DocumentMetadata {
  uploadedFrom: 'web' | 'mobile' | 'api'
  ipAddress?: string
  userAgent?: string
  deviceInfo?: string
  [key: string]: any
}

/**
 * Document versioning for maintaining change history
 */
export interface DocumentVersion {
  version: number
  previousVersionUrl?: string
  changeReason?: string
  changedBy?: string
  changedAt?: Date
}

/**
 * Core ApplicantDocument entity
 */
export type ApplicantDocument = Timestamped & {
  id?: Id
  applicantId: string
  documentType: DocumentType | string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadDate: Date
  expiryDate?: Date
  status: DocumentStatus | string
  verifiedBy?: Id
  verificationDate?: Date
  rejectionReason?: string
  notes?: string
  metadata?: DocumentMetadata
  versioning?: DocumentVersion
  isActive: boolean
  tags?: string[]
}

/**
 * Document statistics for dashboard
 */
export interface DocumentStatistics {
  totalDocuments: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  pendingVerification: number
  expiringSoon: number
  totalSize: number
  averageFileSize: number
}

/**
 * Document upload request payload
 */
export interface DocumentUploadRequest {
  applicantId: string
  documentType: DocumentType | string
  expiryDate?: Date
  notes?: string
  metadata?: DocumentMetadata
}

/**
 * Document verification payload
 */
export interface DocumentVerificationRequest {
  documentId: string
  verifiedBy: string
  status: 'VERIFIED' | 'REJECTED'
  rejectionReason?: string
  notes?: string
}

/**
 * Document filter options for queries
 */
export interface DocumentFilterOptions {
  applicantId?: string
  documentType?: DocumentType | string
  status?: DocumentStatus | string
  startDate?: Date
  endDate?: Date
  isExpired?: boolean
  expiringWithin?: number // days
  tags?: string[]
  limit?: number
  offset?: number
  sort?: 'uploadDate' | 'expiryDate' | 'status'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Document query result
 */
export interface DocumentQueryResult {
  documents: ApplicantDocument[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}
