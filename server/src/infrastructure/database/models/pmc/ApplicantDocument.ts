import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ApplicantDocumentDocument extends Document {
  numericId: number
  applicantId: number
  documentPath: string
  documentDescription?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ApplicantDocumentSchema = new Schema<ApplicantDocumentDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true },
    documentPath: { type: String, required: true },
    documentDescription: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ApplicantDocumentSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicantDocument')
  }
  return next()
})

export const ApplicantDocumentModel = mongoose.model<ApplicantDocumentDocument>('ApplicantDocument', ApplicantDocumentSchema, 'applicantdocuments')
