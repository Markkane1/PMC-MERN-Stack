import mongoose, { Schema, type Document } from 'mongoose'

export interface ApplicantFeeDocument extends Document {
  applicantId: number
  feeAmount: number
  isSettled?: boolean
  reason?: string
}

const ApplicantFeeSchema = new Schema<ApplicantFeeDocument>(
  {
    applicantId: { type: Number, required: true },
    feeAmount: { type: Number, required: true },
    isSettled: { type: Boolean, default: false },
    reason: { type: String },
  },
  { timestamps: true }
)

ApplicantFeeSchema.index({ applicantId: 1, createdAt: -1 })
ApplicantFeeSchema.index({ applicantId: 1, isSettled: 1 })
ApplicantFeeSchema.index({ isSettled: 1, createdAt: -1 })

export const ApplicantFeeModel = mongoose.model<ApplicantFeeDocument>('ApplicantFee', ApplicantFeeSchema, 'applicantfees')
