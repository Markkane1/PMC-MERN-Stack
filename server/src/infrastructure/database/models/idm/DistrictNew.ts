import mongoose, { Schema, type Document } from 'mongoose'

export interface DistrictNewDocument extends Document {
  name?: string
  shortName?: string
  divisionName?: string
  districtId?: number
  divisionId?: number
  extent?: string
  geom?: Record<string, unknown>
}

const DistrictNewSchema = new Schema<DistrictNewDocument>(
  {
    name: { type: String },
    shortName: { type: String },
    divisionName: { type: String },
    districtId: { type: Number },
    divisionId: { type: Number },
    extent: { type: String },
    geom: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const DistrictNewModel = mongoose.model<DistrictNewDocument>('DistrictNew', DistrictNewSchema, 'DistrictNew')
