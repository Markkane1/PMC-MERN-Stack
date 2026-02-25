import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'
import { v4 as uuidv4 } from 'uuid'

export interface ApplicantDetailDocument extends Document {
  numericId: number
  registrationFor?: string
  firstName: string
  lastName?: string
  applicantDesignation?: string
  gender?: string
  cnic?: string
  email?: string
  mobileOperator?: string
  mobileNo?: string
  applicationStatus?: string
  trackingNumber?: string
  remarks?: string
  createdBy?: mongoose.Types.ObjectId
  assignedGroup?: string
  trackingHash?: string
  createdAt: Date
  updatedAt: Date
}

const ApplicantDetailSchema = new Schema<ApplicantDetailDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    registrationFor: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String },
    applicantDesignation: { type: String },
    gender: { type: String },
    cnic: { type: String },
    email: { type: String },
    mobileOperator: { type: String },
    mobileNo: { type: String },
    applicationStatus: { type: String, default: 'Created' },
    trackingNumber: { type: String },
    remarks: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedGroup: { type: String },
    trackingHash: { type: String, default: uuidv4 },
  },
  { timestamps: true }
)

// Dashboard and list endpoints filter on group/status and sort by creation time.
ApplicantDetailSchema.index({ assignedGroup: 1, createdAt: -1 })
ApplicantDetailSchema.index({ applicationStatus: 1, createdAt: -1 })
ApplicantDetailSchema.index({ assignedGroup: 1, applicationStatus: 1, createdAt: -1 })
ApplicantDetailSchema.index({ assigned_group: 1, created_at: -1 })
ApplicantDetailSchema.index({ application_status: 1, created_at: -1 })
ApplicantDetailSchema.index({ assigned_group: 1, application_status: 1, created_at: -1 })

ApplicantDetailSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicantDetail')
  }
  return next()
})

export const ApplicantDetailModel = mongoose.model<ApplicantDetailDocument>('ApplicantDetail', ApplicantDetailSchema, 'ApplicantDetail')
