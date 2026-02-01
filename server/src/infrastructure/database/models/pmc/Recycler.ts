import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface RecyclerDocument extends Document {
  numericId: number
  applicantId: number
  selectedCategories?: any
  plasticWasteAcquiredThrough?: any
  hasAdequatePollutionControlSystems?: string
  pollutionControlDetails?: string
  registrationRequiredForOtherOtherText?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}

const RecyclerSchema = new Schema<RecyclerDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, unique: true },
    selectedCategories: { type: Schema.Types.Mixed, default: [] },
    plasticWasteAcquiredThrough: { type: Schema.Types.Mixed, default: [] },
    hasAdequatePollutionControlSystems: { type: String, default: 'No' },
    pollutionControlDetails: { type: String },
    registrationRequiredForOtherOtherText: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

RecyclerSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('Recycler')
  }
  return next()
})

export const RecyclerModel = mongoose.model<RecyclerDocument>('Recycler', RecyclerSchema, 'recyclers')
