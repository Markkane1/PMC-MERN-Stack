import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface BusinessProfileDocument extends Document {
  numericId: number
  applicantId?: number
  entityType?: string
  trackingNumber?: string
  name?: string
  ntnStrnPraNoIndividual?: string
  businessName?: string
  businessRegistrationType?: string
  businessRegistrationNo?: string
  ntnStrnPraNoCompany?: string
  workingDays?: number
  commencementDate?: Date
  noOfWorkers?: number
  districtId?: number
  tehsilId?: number
  cityTownVillage?: string
  postalAddress?: string
  postalCode?: string
  locationLatitude?: number
  locationLongitude?: number
  email?: string
  mobileOperator?: string
  mobileNo?: string
  phoneNo?: string
  websiteAddress?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}

const BusinessProfileSchema = new Schema<BusinessProfileDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, unique: true },
    entityType: { type: String, default: 'Individual' },
    trackingNumber: { type: String },
    name: { type: String },
    ntnStrnPraNoIndividual: { type: String },
    businessName: { type: String },
    businessRegistrationType: { type: String },
    businessRegistrationNo: { type: String },
    ntnStrnPraNoCompany: { type: String },
    workingDays: { type: Number },
    commencementDate: { type: Date },
    noOfWorkers: { type: Number },
    districtId: { type: Number, index: true },
    tehsilId: { type: Number },
    cityTownVillage: { type: String },
    postalAddress: { type: String },
    postalCode: { type: String },
    locationLatitude: { type: Number },
    locationLongitude: { type: Number },
    email: { type: String },
    mobileOperator: { type: String },
    mobileNo: { type: String },
    phoneNo: { type: String },
    websiteAddress: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

BusinessProfileSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('BusinessProfile')
  }
  return next()
})

export const BusinessProfileModel = mongoose.model<BusinessProfileDocument>('BusinessProfile', BusinessProfileSchema, 'businessprofiles')
