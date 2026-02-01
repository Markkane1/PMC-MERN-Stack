import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ConsumerDocument extends Document {
  numericId: number
  applicantId: number
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  plainPlasticSheetsForFoodWrapping?: any
  packagingItems?: any
  consumption?: string
  provisionWasteDisposalBins?: string
  noOfWasteDisposableBins?: number
  segregatedPlasticsHandedOverToRegisteredRecyclers?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
  registrationRequiredForOtherOtherText?: string
}

const ConsumerSchema = new Schema<ConsumerDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, unique: true },
    registrationRequiredFor: { type: Schema.Types.Mixed },
    registrationRequiredForOther: { type: Schema.Types.Mixed },
    plainPlasticSheetsForFoodWrapping: { type: Schema.Types.Mixed },
    packagingItems: { type: Schema.Types.Mixed },
    consumption: { type: String },
    provisionWasteDisposalBins: { type: String, default: 'No' },
    noOfWasteDisposableBins: { type: Number },
    segregatedPlasticsHandedOverToRegisteredRecyclers: { type: String, default: 'No' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    registrationRequiredForOtherOtherText: { type: String },
  },
  { timestamps: true }
)

ConsumerSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('Consumer')
  }
  return next()
})

export const ConsumerModel = mongoose.model<ConsumerDocument>('Consumer', ConsumerSchema, 'consumers')
