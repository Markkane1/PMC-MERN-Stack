import mongoose, { Schema, type Document } from 'mongoose'

export interface ApplicationSubmittedDocument extends Document {
  applicantId: number
  status?: string
  applicant_id?: number | string
  created_at?: Date
}

const ApplicationSubmittedSchema = new Schema<ApplicationSubmittedDocument>(
  {
    applicantId: { type: Number, required: true, unique: true },
    applicant_id: { type: Schema.Types.Mixed },
    status: { type: String },
    created_at: { type: Date },
  },
  { timestamps: true }
)

ApplicationSubmittedSchema.index({ applicantId: 1, createdAt: -1 })
ApplicationSubmittedSchema.index({ applicantId: 1, status: 1, createdAt: -1 })
ApplicationSubmittedSchema.index({ applicant_id: 1, created_at: -1 })
ApplicationSubmittedSchema.index({ applicant_id: 1, status: 1, created_at: -1 })

export const ApplicationSubmittedModel = mongoose.model<ApplicationSubmittedDocument>('ApplicationSubmitted', ApplicationSubmittedSchema, 'ApplicationSubmitted')
