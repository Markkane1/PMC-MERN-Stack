import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ApplicantManualFieldsDocument extends Document {
  numericId: number
  applicantId: number
  latitude?: number
  longitude?: number
  listOfProducts?: string
  listOfByProducts?: string
  rawMaterialImported?: string
  sellerNameIfRawMaterialBought?: string
  selfImportDetails?: string
  rawMaterialUtilized?: string
  complianceThickness75?: string
  validConsentPermitBuildingBylaws?: string
  stockistDistributorList?: string
  procurementPerDay?: string
  noOfWorkers?: number
  laborDeptRegistrationStatus?: string
  occupationalSafetyAndHealthFacilities?: string
  adverseEnvironmentalImpacts?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ApplicantManualFieldsSchema = new Schema<ApplicantManualFieldsDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, unique: true },
    latitude: { type: Number },
    longitude: { type: Number },
    listOfProducts: { type: String },
    listOfByProducts: { type: String },
    rawMaterialImported: { type: String },
    sellerNameIfRawMaterialBought: { type: String },
    selfImportDetails: { type: String },
    rawMaterialUtilized: { type: String },
    complianceThickness75: { type: String },
    validConsentPermitBuildingBylaws: { type: String },
    stockistDistributorList: { type: String },
    procurementPerDay: { type: String },
    noOfWorkers: { type: Number },
    laborDeptRegistrationStatus: { type: String },
    occupationalSafetyAndHealthFacilities: { type: String },
    adverseEnvironmentalImpacts: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ApplicantManualFieldsSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicantManualFields')
  }
  return next()
})

export const ApplicantManualFieldsModel = mongoose.model<ApplicantManualFieldsDocument>('ApplicantManualFields', ApplicantManualFieldsSchema, 'ApplicantManualFields')
