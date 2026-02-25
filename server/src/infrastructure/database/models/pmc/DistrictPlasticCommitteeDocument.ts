import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface DistrictPlasticCommitteeDocumentDocument extends Document {
  numericId: number
  districtId: number
  documentType: string
  title?: string
  documentPath: string
  uploadedBy?: mongoose.Types.ObjectId
  documentDate?: Date
}

const DistrictPlasticCommitteeDocumentSchema = new Schema<DistrictPlasticCommitteeDocumentDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    districtId: { type: Number, required: true },
    documentType: { type: String, required: true },
    title: { type: String },
    documentPath: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    documentDate: { type: Date },
  },
  { timestamps: true }
)

DistrictPlasticCommitteeDocumentSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('DistrictPlasticCommitteeDocument')
  }
  return next()
})

export const DistrictPlasticCommitteeDocumentModel = mongoose.model<DistrictPlasticCommitteeDocumentDocument>(
  'DistrictPlasticCommitteeDocument',
  DistrictPlasticCommitteeDocumentSchema
, 'DistrictPlasticCommitteeDocument')
