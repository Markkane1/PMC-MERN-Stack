import mongoose, { Schema, Document, Model } from 'mongoose'
import { CounterModel } from './Counter'

// ============ ENUMS ============

export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED'
}

export enum InspectionType {
  INITIAL = 'INITIAL',
  FOLLOW_UP = 'FOLLOW_UP',
  FINAL = 'FINAL',
  SPOT_CHECK = 'SPOT_CHECK',
  COMPLIANCE = 'COMPLIANCE'
}

export enum FindingStatus {
  COMPLIANT = 'COMPLIANT',
  MINOR_ISSUE = 'MINOR_ISSUE',
  MAJOR_ISSUE = 'MAJOR_ISSUE',
  CRITICAL_ISSUE = 'CRITICAL_ISSUE'
}

// ============ INTERFACE ============

export interface InspectionFinding {
  findingId?: string
  category: string
  description: string
  status: FindingStatus
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  evidence?: {
    imageUrls?: string[]
    videoUrl?: string
    documentUrls?: string[]
    observations?: string
  }
  recommendation?: string
  deadline?: Date
  completionStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completionNotes?: string
}

export interface InspectionReportDocument extends Document {
  numericId: number
  inspectorId: number | string
  inspectorName?: string
  applicantId: number | string
  businessId: number | string
  assignmentId?: string
  inspectionType: InspectionType
  status: InspectionStatus
  scheduledDate?: Date
  actualDate: Date
  duration?: number
  location?: {
    name?: string
    address?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  findings: InspectionFinding[]
  overallCompliance: number
  overallRecommendation: 'APPROVE' | 'CONDITIONAL_APPROVAL' | 'REJECT' | 'FURTHER_INSPECTION'
  violationsFound: boolean
  criticalIssues: number
  majorIssues: number
  minorIssues: number
  photosAttached: number
  reportsAttached: string[]
  observations?: string
  nextSteps?: string
  followUpRequired: boolean
  followUpDate?: Date
  followUpType?: InspectionType
  inspectorSignature?: string
  supervisorReview?: {
    reviewedBy: number | string
    reviewDate: Date
    comments?: string
    approved: boolean
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
  // Legacy fields for backward compatibility
  businessName?: string
  businessType?: string
  licenseNumber?: string
  plasticBagsConfiscation?: number
  totalConfiscation?: number
  latitude?: number
  longitude?: number
  inspectionDate?: Date
  fineAmount?: number
  districtId?: number
}

// ============ SCHEMA ============

const InspectionFindingSchema = new Schema({
  findingId: String,
  category: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: Object.values(FindingStatus) },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  evidence: {
    imageUrls: [String],
    videoUrl: String,
    documentUrls: [String],
    observations: String
  },
  recommendation: String,
  deadline: Date,
  completionStatus: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
  completionNotes: String
}, { _id: false })

const InspectionReportSchema = new Schema<InspectionReportDocument>({
  numericId: {
    type: Number,
    unique: true,
    sparse: true
  },
  inspectorId: {
    type: Schema.Types.Mixed,
    required: true,
    index: true
  },
  inspectorName: String,
  applicantId: {
    type: Schema.Types.Mixed,
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.Mixed,
    index: true
  },
  assignmentId: String,
  inspectionType: {
    type: String,
    enum: Object.values(InspectionType),
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(InspectionStatus),
    default: InspectionStatus.SCHEDULED,
    index: true
  },
  scheduledDate: Date,
  actualDate: {
    type: Date,
    required: true
  },
  duration: Number,
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  findings: [InspectionFindingSchema],
  overallCompliance: {
    type: Number,
    min: 0,
    max: 100
  },
  overallRecommendation: {
    type: String,
    enum: ['APPROVE', 'CONDITIONAL_APPROVAL', 'REJECT', 'FURTHER_INSPECTION']
  },
  violationsFound: { type: Boolean, default: false },
  criticalIssues: { type: Number, default: 0 },
  majorIssues: { type: Number, default: 0 },
  minorIssues: { type: Number, default: 0 },
  photosAttached: { type: Number, default: 0 },
  reportsAttached: [String],
  observations: String,
  nextSteps: String,
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,
  followUpType: { type: String, enum: Object.values(InspectionType) },
  inspectorSignature: String,
  supervisorReview: {
    reviewedBy: Schema.Types.Mixed,
    reviewDate: Date,
    comments: String,
    approved: Boolean
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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
  },
  // Legacy fields
  businessName: String,
  businessType: String,
  licenseNumber: String,
  plasticBagsConfiscation: Number,
  totalConfiscation: Number,
  latitude: Number,
  longitude: Number,
  inspectionDate: Date,
  fineAmount: Number,
  districtId: Number
}, { timestamps: true })

// ============ INDEXES ============

InspectionReportSchema.index({ inspectorId: 1, status: 1 })
InspectionReportSchema.index({ applicantId: 1, inspectionType: 1 })
InspectionReportSchema.index({ businessId: 1, status: 1 })
InspectionReportSchema.index({ actualDate: -1, status: 1 })
InspectionReportSchema.index({ overallCompliance: 1 })
InspectionReportSchema.index({ isActive: 1, status: 1 })
InspectionReportSchema.index({ followUpRequired: 1, followUpDate: 1 })

// ============ MIDDLEWARE ============

InspectionReportSchema.pre('save', async function (next) {
  if (this.isNew && !this.numericId) {
    const counter = await CounterModel.findByIdAndUpdate(
      { _id: 'inspectionReport_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    this.numericId = counter?.seq || 1
  }
  next()
})

// ============ EXPORT ============

export const InspectionReportModel: Model<InspectionReportDocument> = mongoose.model<InspectionReportDocument>(
  'InspectionReport',
  InspectionReportSchema,
  'InspectionReport'
)
