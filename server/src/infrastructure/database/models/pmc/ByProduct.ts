import mongoose, { Schema, type Document } from 'mongoose'

export interface ByProductDocument extends Document {
  productName: string
}

const ByProductSchema = new Schema<ByProductDocument>(
  {
    productName: { type: String, required: true, unique: true },
  },
  { timestamps: true }
)

export const ByProductModel = mongoose.model<ByProductDocument>('ByProduct', ByProductSchema, 'byproducts')
