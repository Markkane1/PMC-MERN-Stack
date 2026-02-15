import mongoose, { Schema, Document, Model } from 'mongoose'
import { CounterModel } from './Counter'

// ============ ENUMS ============

export enum AlertType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AlertCategory {
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE',
  INSPECTION_REQUIRED = 'INSPECTION_REQUIRED',
  PAYMENT_DUE = 'PAYMENT_DUE',
  SUBMISSION_DEADLINE = 'SUBMISSION_DEADLINE',
  LICENSE_RENEWAL = 'LICENSE_RENEWAL',
  QUALITY_ALERT = 'QUALITY_ALERT',
  SAFETY_CONCERN = 'SAFETY_CONCERN'
}

export enum AlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// ============ INTERFACE ============

export interface AlertRecipient {
  userId: number | string
  name?: string
  email?: string
  notificationMethod?: 'EMAIL' | 'SMS' | 'IN_SYSTEM'
  acknowledged?: boolean
  acknowledgedAt?: Date
}

export interface ApplicantAlertDocument extends Document {
  numericId: number
  applicantId: number | string
  businessId?: number | string
  alertType: AlertType
  category: AlertCategory
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: AlertStatus
  source?: {
    type: 'SYSTEM' | 'MANUAL' | 'SCHEDULED'
    triggeredBy?: number | string
    automationRule?: string
  }
  relatedEntity?: {
    entityType: 'DOCUMENT' | 'BUSINESS_PROFILE' | 'INSPECTION' | 'ASSIGNMENT' | 'APPLICATION'
    entityId: string
    entityName?: string
  }
  recipients: AlertRecipient[]
  dueDate?: Date
  resolvedDate?: Date
  resolutionNotes?: string
  resolutionReason?: string
  repeating?: {
    enabled: boolean
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    endDate?: Date
    nextOccurrence?: Date
  }
  internalNotes?: string
  attachments?: string[]
  tags?: string[]
  escalatedTo?: {
    userId: number | string
    name?: string
    escalatedAt: Date
    escalationReason: string
  }
  isActive: boolean
  isArchived?: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}

// ============ SCHEMA ============

const AlertRecipientSchema = new Schema({
  userId: { type: Schema.Types.Mixed, required: true },
  name: String,
  email: String,
  notificationMethod: { type: String, enum: ['EMAIL', 'SMS', 'IN_SYSTEM'] },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date
}, { _id: false })

const ApplicantAlertSchema = new Schema<ApplicantAlertDocument>({
  numericId: {
    type: Number,
    unique: true,
    sparse: true
  },
  applicantId: {
    type: Schema.Types.Mixed,
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.Mixed,
    index: true
  },
  alertType: {
    type: String,
    enum: Object.values(AlertType),
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: Object.values(AlertCategory),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
    index: true
  },
  status: {
    type: String,
    enum: Object.values(AlertStatus),
    default: AlertStatus.OPEN,
    index: true
  },
  source: {
    type: { type: String, enum: ['SYSTEM', 'MANUAL', 'SCHEDULED'] },
    triggeredBy: Schema.Types.Mixed,
    automationRule: String
  },
  relatedEntity: {
    entityType: { type: String, enum: ['DOCUMENT', 'BUSINESS_PROFILE', 'INSPECTION', 'ASSIGNMENT', 'APPLICATION'] },
    entityId: String,
    entityName: String
  },
  recipients: [AlertRecipientSchema],
  dueDate: {
    type: Date,
    index: true
  },
  resolvedDate: Date,
  resolutionNotes: String,
  resolutionReason: String,
  repeating: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
    endDate: Date,
    nextOccurrence: Date
  },
  internalNotes: String,
  attachments: [String],
  tags: [String],
  escalatedTo: {
    userId: Schema.Types.Mixed,
    name: String,
    escalatedAt: Date,
    escalationReason: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.Mixed,
    required: true
  },
  updatedBy: {
    type: Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true })

// ============ INDEXES ============

ApplicantAlertSchema.index({ applicantId: 1, status: 1 })
ApplicantAlertSchema.index({ alertType: 1, category: 1 })
ApplicantAlertSchema.index({ status: 1, priority: 1 })
ApplicantAlertSchema.index({ dueDate: 1, status: 1 })
ApplicantAlertSchema.index({ businessId: 1, isActive: 1 })
ApplicantAlertSchema.index({ isActive: 1, isArchived: 1 })
ApplicantAlertSchema.index({ createdAt: -1, status: 1 })
ApplicantAlertSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 })

// ============ MIDDLEWARE ============

ApplicantAlertSchema.pre('save', async function (next) {
  if (this.isNew && !this.numericId) {
    const counter = await CounterModel.findByIdAndUpdate(
      { _id: 'applicantAlert_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    this.numericId = counter?.seq || 1
  }
  next()
})

// ============ EXPORT ============

export const ApplicantAlertModel: Model<ApplicantAlertDocument> = mongoose.model<ApplicantAlertDocument>(
  'ApplicantAlert',
  ApplicantAlertSchema,
  'applicantAlerts'
)
