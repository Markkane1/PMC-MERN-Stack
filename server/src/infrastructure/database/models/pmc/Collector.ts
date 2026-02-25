import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface CollectorDocument extends Document {
  numericId: number
  applicantId: number
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  selectedCategories?: any
  totalCapacityValue?: number
  numberOfVehicles?: number
  numberOfPersons?: number
  registrationRequiredForOtherOtherText?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}

const CollectorSchema = new Schema<CollectorDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, unique: true },
    registrationRequiredFor: { type: Schema.Types.Mixed },
    registrationRequiredForOther: { type: Schema.Types.Mixed },
    selectedCategories: { type: Schema.Types.Mixed },
    totalCapacityValue: { type: Number },
    numberOfVehicles: { type: Number },
    numberOfPersons: { type: Number },
    registrationRequiredForOtherOtherText: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

CollectorSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('Collector')
  }
  return next()
})

export const CollectorModel = mongoose.model<CollectorDocument>('Collector', CollectorSchema, 'Collector')
