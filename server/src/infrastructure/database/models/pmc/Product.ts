import mongoose, { Schema, type Document } from 'mongoose'

export interface ProductDocument extends Document {
  productName: string
}

const ProductSchema = new Schema<ProductDocument>(
  {
    productName: { type: String, required: true, unique: true },
  },
  { timestamps: true }
)

export const ProductModel = mongoose.model<ProductDocument>('Product', ProductSchema, 'products')
