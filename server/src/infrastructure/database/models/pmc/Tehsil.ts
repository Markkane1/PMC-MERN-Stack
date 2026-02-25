import mongoose, { Schema, type Document } from 'mongoose'

export interface TehsilDocument extends Document {
  tehsilId: number
  districtId: number
  divisionId: number
  tehsilName: string
  tehsilCode: string
}

const TehsilSchema = new Schema<TehsilDocument>(
  {
    tehsilId: { type: Number, required: true, unique: true },
    districtId: { type: Number, required: true },
    divisionId: { type: Number, required: true },
    tehsilName: { type: String, required: true },
    tehsilCode: { type: String, required: true },
  },
  { timestamps: true }
)

export const TehsilModel = mongoose.model<TehsilDocument>('Tehsil', TehsilSchema, 'Tehsil')
