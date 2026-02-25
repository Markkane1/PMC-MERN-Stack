import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ApplicantFieldResponseDocument extends Document {
  numericId: number
  applicantId: number
  fieldKey: string
  response?: string
  comment?: string
  createdBy?: mongoose.Types.ObjectId
}

const ApplicantFieldResponseSchema = new Schema<ApplicantFieldResponseDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true },
    fieldKey: { type: String, required: true },
    response: { type: String, default: 'Yes' },
    comment: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ApplicantFieldResponseSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicantFieldResponse')
  }
  return next()
})

export const ApplicantFieldResponseModel = mongoose.model<ApplicantFieldResponseDocument>('ApplicantFieldResponse', ApplicantFieldResponseSchema, 'ApplicantFieldResponse')
