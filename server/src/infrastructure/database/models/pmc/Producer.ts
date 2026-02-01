import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ProducerDocument extends Document {
  numericId: number
  applicantId: number
  trackingNumber?: string
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  plainPlasticSheetsForFoodWrapping?: any
  packagingItems?: any
  numberOfMachines?: string
  totalCapacityValue?: number
  dateOfSettingUp?: Date
  totalWasteGeneratedValue?: number
  hasWasteStorageCapacity?: string
  wasteDisposalProvision?: string
  registrationRequiredForOtherOtherText?: string
  createdBy?: mongoose.Types.ObjectId
}

const ProducerSchema = new Schema<ProducerDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, unique: true },
    trackingNumber: { type: String },
    registrationRequiredFor: { type: Schema.Types.Mixed },
    registrationRequiredForOther: { type: Schema.Types.Mixed },
    plainPlasticSheetsForFoodWrapping: { type: Schema.Types.Mixed },
    packagingItems: { type: Schema.Types.Mixed },
    numberOfMachines: { type: String },
    totalCapacityValue: { type: Number },
    dateOfSettingUp: { type: Date },
    totalWasteGeneratedValue: { type: Number },
    hasWasteStorageCapacity: { type: String },
    wasteDisposalProvision: { type: String },
    registrationRequiredForOtherOtherText: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ProducerSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('Producer')
  }
  return next()
})

export const ProducerModel = mongoose.model<ProducerDocument>('Producer', ProducerSchema, 'producers')
