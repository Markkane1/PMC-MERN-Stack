import mongoose, { Schema, type Document } from 'mongoose'

export interface ApplicationSubmittedDocument extends Document {
  applicantId: number
}

const ApplicationSubmittedSchema = new Schema<ApplicationSubmittedDocument>(
  {
    applicantId: { type: Number, required: true, unique: true },
  },
  { timestamps: true }
)

export const ApplicationSubmittedModel = mongoose.model<ApplicationSubmittedDocument>('ApplicationSubmitted', ApplicationSubmittedSchema, 'ApplicationSubmitted')
