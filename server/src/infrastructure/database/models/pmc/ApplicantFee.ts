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

export const ApplicantFeeModel = mongoose.model<ApplicantFeeDocument>('ApplicantFee', ApplicantFeeSchema, 'applicantfees')
