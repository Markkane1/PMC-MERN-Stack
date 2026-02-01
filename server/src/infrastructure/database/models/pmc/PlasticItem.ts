import mongoose, { Schema, type Document } from 'mongoose'

export interface PlasticItemDocument extends Document {
  itemName: string
}

const PlasticItemSchema = new Schema<PlasticItemDocument>(
  {
    itemName: { type: String, required: true, unique: true },
  },
  { timestamps: true }
)

export const PlasticItemModel = mongoose.model<PlasticItemDocument>('PlasticItem', PlasticItemSchema, 'plasticitems')
