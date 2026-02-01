import mongoose, { Schema, type Document } from 'mongoose'

export interface LicenseDocument extends Document {
  licenseFor?: string
  licenseNumber: string
  licenseDuration?: string
  ownerName?: string
  businessName?: string
  typesOfPlastics?: string
  particulars?: string
  feeAmount?: number
  address?: string
  dateOfIssue?: Date
  applicantId?: number
  isActive?: boolean
  createdBy?: mongoose.Types.ObjectId
}

const LicenseSchema = new Schema<LicenseDocument>(
  {
    licenseFor: { type: String, default: 'producer' },
    licenseNumber: { type: String },
    licenseDuration: { type: String },
    ownerName: { type: String },
    businessName: { type: String },
    typesOfPlastics: { type: String },
    particulars: { type: String },
    feeAmount: { type: Number },
    address: { type: String },
    dateOfIssue: { type: Date },
    applicantId: { type: Number },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const LicenseModel = mongoose.model<LicenseDocument>('License', LicenseSchema, 'licenses')
