import mongoose, { Schema, type Document } from 'mongoose'

export interface ServiceConfigurationDocument extends Document {
  legacyId?: number
  serviceName: string
  baseUrl?: string
  authEndpoint?: string
  generatePsidEndpoint?: string
  transactionStatusEndpoint?: string
  clientId?: string
  clientSecret?: string
  createdAt: Date
  updatedAt: Date
}

const ServiceConfigurationSchema = new Schema<ServiceConfigurationDocument>(
  {
    legacyId: { type: Number, index: true },
    serviceName: { type: String, required: true, unique: true, index: true },
    baseUrl: { type: String },
    authEndpoint: { type: String },
    generatePsidEndpoint: { type: String },
    transactionStatusEndpoint: { type: String },
    clientId: { type: String },
    clientSecret: { type: String },
  },
  { timestamps: true }
)

export const ServiceConfigurationModel = mongoose.model<ServiceConfigurationDocument>(
  'ServiceConfiguration',
  ServiceConfigurationSchema,
  'ServiceConfiguration'
)
