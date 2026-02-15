import mongoose, { Schema, type Document } from 'mongoose'

export interface ExternalServiceTokenDocument extends Document {
  legacyId?: number
  serviceName: string
  accessToken: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const ExternalServiceTokenSchema = new Schema<ExternalServiceTokenDocument>(
  {
    legacyId: { type: Number, index: true },
    serviceName: { type: String, required: true, index: true },
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

ExternalServiceTokenSchema.methods.isExpired = function isExpired(this: ExternalServiceTokenDocument) {
  return new Date() > this.expiresAt
}

export const ExternalServiceTokenModel = mongoose.model<ExternalServiceTokenDocument>(
  'ExternalServiceToken',
  ExternalServiceTokenSchema,
  'external_service_tokens'
)
