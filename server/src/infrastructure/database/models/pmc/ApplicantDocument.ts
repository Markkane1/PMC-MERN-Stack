import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

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
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  RESUBMIT_REQUIRED = 'RESUBMIT_REQUIRED'
}

export interface ApplicantDocumentDocument extends Document {
  numericId: number
  applicantId: number
  applicantIdString?: string // For UUID references if needed
  documentType: DocumentType | string
  fileUrl: string
  fileName: string
  fileSize: number // in bytes
  mimeType: string
  uploadDate: Date
  expiryDate?: Date
  status: DocumentStatus | string
  documentPath?: string // Legacy field
  documentDescription?: string // Legacy field
  verifiedBy?: mongoose.Types.ObjectId
  verificationDate?: Date
  rejectionReason?: string
  notes?: string
  isActive: boolean
  tags?: string[]
  metadata?: {
    uploadedFrom?: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
    deviceInfo?: string
    [key: string]: any
  }
  versioning?: {
    version: number
    previousVersionUrl?: string
    changeReason?: string
    changedBy?: mongoose.Types.ObjectId
    changedAt?: Date
  }
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ApplicantDocumentSchema = new Schema<ApplicantDocumentDocument>(
  {
    numericId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    applicantId: {
      type: Number,
      required: true,
      index: true
    },
    applicantIdString: {
      type: String,
      index: true,
      sparse: true
    },
    documentType: {
      type: String,
      enum: Object.values(DocumentType),
      required: true,
      index: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => v <= 10485760, // 10MB
        message: 'File size cannot exceed 10MB'
      }
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiryDate: {
      type: Date,
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.PENDING,
      index: true
    },
    documentPath: String, // Legacy
    documentDescription: String, // Legacy
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    verificationDate: Date,
    rejectionReason: String,
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    tags: [String],
    metadata: {
      uploadedFrom: {
        type: String,
        enum: ['web', 'mobile', 'api'],
        default: 'web'
      },
      ipAddress: String,
      userAgent: String,
      deviceInfo: String,
      type: Schema.Types.Mixed
    },
    versioning: {
      version: { type: Number, default: 1 },
      previousVersionUrl: String,
      changeReason: String,
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      changedAt: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true, collection: 'applicantdocuments' }
)

// Compound indexes for common queries
ApplicantDocumentSchema.index({ applicantId: 1, documentType: 1 })
ApplicantDocumentSchema.index({ applicantId: 1, status: 1 })
ApplicantDocumentSchema.index({ status: 1, uploadDate: -1 })
ApplicantDocumentSchema.index({ expiryDate: 1 }, { sparse: true })
ApplicantDocumentSchema.index({ isActive: 1, status: 1 })

// TTL index for automatic expiry marking (optional)
// ApplicantDocumentSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0, sparse: true })

// Pre-save middleware to generate numericId
ApplicantDocumentSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicantDocument')
  }
  return next()
})

// Virtual for checking if document is expired
ApplicantDocumentSchema.virtual('isExpired').get(function (this: ApplicantDocumentDocument) {
  if (!this.expiryDate) return false
  return new Date() > this.expiryDate
})

// Virtual for checking if document is expiring soon (30 days)
ApplicantDocumentSchema.virtual('isExpiringSoon').get(function (this: ApplicantDocumentDocument) {
  if (!this.expiryDate) return false
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > new Date()
})

// Method to verify document
ApplicantDocumentSchema.methods.verify = function (
  this: ApplicantDocumentDocument,
  verifiedBy: mongoose.Types.ObjectId,
  rejected: boolean = false,
  reason?: string
) {
  this.verifiedBy = verifiedBy
  this.verificationDate = new Date()
  this.status = rejected ? DocumentStatus.REJECTED : DocumentStatus.VERIFIED
  if (rejected && reason) {
    this.rejectionReason = reason
  }
  return this.save()
}

// Method to mark as expired
ApplicantDocumentSchema.methods.markAsExpired = function (this: ApplicantDocumentDocument) {
  this.status = DocumentStatus.EXPIRED
  return this.save()
}

export const ApplicantDocumentModel = mongoose.model<ApplicantDocumentDocument>(
  'ApplicantDocument',
  ApplicantDocumentSchema,
  'applicantdocuments'
)
