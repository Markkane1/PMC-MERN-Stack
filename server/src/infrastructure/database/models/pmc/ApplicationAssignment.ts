import mongoose, { Schema, Document, Model } from 'mongoose'
import { CounterModel } from './Counter'

// ============ ENUMS ============

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum AssignmentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// ============ INTERFACE ============

export interface ApplicationAssignmentDocument extends Document {
  numericId: number
  applicantId: number | string
  businessId: number | string
  assignedToUserId: number | string
  assignedToName?: string
  assignedToEmail?: string
  assignmentType: 'INSPECTION' | 'VERIFICATION' | 'APPROVAL' | 'PROCESSING'
  status: AssignmentStatus
  priority: AssignmentPriority
  dueDate: Date
  assignmentDate: Date
  completionDate?: Date
  notes?: string
  instructions?: string
  attachments?: string[]
  previousAssignee?: {
    userId: number | string
    name: string
    completionDate: Date
    reason: string
  }
  escalationLevel: number
  escalatedOn?: Date
  escalationReason?: string
  performanceMetrics?: {
    averageCompletionTime: number
    completionRate: number
    qualityScore: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}

// ============ SCHEMA ============

const ApplicationAssignmentSchema = new Schema<ApplicationAssignmentDocument>({
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
    required: true,
    index: true
  },
  assignedToUserId: {
    type: Schema.Types.Mixed,
    required: true,
    index: true
  },
  assignedToName: String,
  assignedToEmail: String,
  assignmentType: {
    type: String,
    enum: ['INSPECTION', 'VERIFICATION', 'APPROVAL', 'PROCESSING'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(AssignmentStatus),
    default: AssignmentStatus.PENDING,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(AssignmentPriority),
    default: AssignmentPriority.MEDIUM,
    index: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  assignmentDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  completionDate: Date,
  notes: String,
  instructions: String,
  attachments: [String],
  previousAssignee: {
    userId: Schema.Types.Mixed,
    name: String,
    completionDate: Date,
    reason: String
  },
  escalationLevel: {
    type: Number,
    default: 0,
    index: true
  },
  escalatedOn: Date,
  escalationReason: String,
  performanceMetrics: {
    averageCompletionTime: Number,
    completionRate: Number,
    qualityScore: Number
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
  }
}, { timestamps: true })

// ============ INDEXES ============

ApplicationAssignmentSchema.index({ applicantId: 1, status: 1 })
ApplicationAssignmentSchema.index({ assignedToUserId: 1, status: 1 })
ApplicationAssignmentSchema.index({ dueDate: 1, status: 1 })
ApplicationAssignmentSchema.index({ priority: 1, status: 1 })
ApplicationAssignmentSchema.index({ businessId: 1, isActive: 1 })
ApplicationAssignmentSchema.index({ status: 1, createdAt: -1 })
ApplicationAssignmentSchema.index({ escalationLevel: 1, status: 1 })

// ============ MIDDLEWARE ============

ApplicationAssignmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.numericId) {
    const counter = await CounterModel.findByIdAndUpdate(
      { _id: 'applicationAssignment_id' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    this.numericId = counter?.seq || 1
  }
  next()
})

// ============ EXPORT ============

export const ApplicationAssignmentModel: Model<ApplicationAssignmentDocument> = mongoose.model<ApplicationAssignmentDocument>(
  'ApplicationAssignment',
  ApplicationAssignmentSchema,
  'applicationAssignments'
)
