import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'
import type { MeasurementUnit } from './PlasticItem'

export interface ProductDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  plasticItemId: mongoose.Types.ObjectId | string
  productName?: string // Legacy
  name?: string
  description?: string
  quantity: number
  unit: string
  yearlyProduction?: number
  yearlyConsumption?: number
  storageLocation?: string
  qualityStandard?: string
  certifications?: string[]
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ProductSchema = new Schema<ProductDocument>(
  {
    numericId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    businessId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true
    },
    businessIdString: {
      type: String,
      index: true,
      sparse: true
    },
    plasticItemId: {
      type: Schema.Types.ObjectId,
      ref: 'PlasticItem',
      required: true,
      index: true
    },
    productName: String, // Legacy
    name: String,
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    yearlyProduction: {
      type: Number,
      min: 0
    },
    yearlyConsumption: {
      type: Number,
      min: 0
    },
    storageLocation: String,
    qualityStandard: String,
    certifications: [String],
    specifications: {
      type: Schema.Types.Mixed,
      default: {}
    },
    notes: String,
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    }
  },
  { timestamps: true, collection: 'products' }
)

// Indexes
ProductSchema.index({ businessId: 1, plasticItemId: 1 })
ProductSchema.index({ businessId: 1, isActive: 1 })
ProductSchema.index({ plasticItemId: 1, businessId: 1 })

// Pre-save middleware
ProductSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('Product')
  }
  return next()
})

export const ProductModel = mongoose.model<ProductDocument>(
  'Product',
  ProductSchema,
  'products'
)
