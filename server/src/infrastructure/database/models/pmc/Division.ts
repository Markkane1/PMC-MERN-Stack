import mongoose, { Schema, type Document } from 'mongoose'

export interface DivisionDocument extends Document {
  divisionId: number
  divisionName: string
  divisionCode: string
}

const DivisionSchema = new Schema<DivisionDocument>(
  {
    divisionId: { type: Number, required: true, unique: true },
    divisionName: { type: String, required: true },
    divisionCode: { type: String, required: true },
  },
  { timestamps: true }
)

export const DivisionModel = mongoose.model<DivisionDocument>('Division', DivisionSchema, 'Division')
