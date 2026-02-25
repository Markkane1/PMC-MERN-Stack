import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface RawMaterialDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  code?: string
  name: string
  category?: string
  description?: string
  source?: string
  sourceType?: 'SUPPLIER' | 'WASTE' | 'RECYCLED' | 'VIRGIN'
  quantity: number
  unit: string
  cost?: number
  totalCost?: number
  
  // Supplier Details
  supplier?: string
  supplierContact?: string
  supplierEmail?: string
  supplierPhone?: string
  purchaseDate?: Date
  deliveryDate?: Date
  
  // Quality Details
  qualityGrade?: string
  purityLevel?: number
  contaminants?: string[]
  testCertificate?: string
  
  // Storage
  storageLocation?: string
  storageConditions?: string
  expiryDate?: Date
  
  // Additional
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  
  // Legacy fields
  producerId?: mongoose.Types.ObjectId
  materialName?: string
  materialDescription?: string
  materialQuantityValue?: number
  materialQuantityUnit?: number
  materialUtilizedQuantityValue?: number
  materialUtilizedQuantityUnit?: number
  materialImportBought?: string
  nameSellerImporter?: string
  isImporterFormFilled?: boolean
  
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const RawMaterialSchema = new Schema<RawMaterialDocument>(
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
    code: {
      type: String,
      index: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      index: true
    },
    category: String,
    description: String,
    source: String,
    sourceType: {
      type: String,
      enum: ['SUPPLIER', 'WASTE', 'RECYCLED', 'VIRGIN'],
      default: 'SUPPLIER',
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      min: 0
    },
    totalCost: {
      type: Number,
      min: 0
    },
    
    // Supplier Details
    supplier: String,
    supplierContact: String,
    supplierEmail: String,
    supplierPhone: String,
    purchaseDate: Date,
    deliveryDate: Date,
    
    // Quality Details
    qualityGrade: String,
    purityLevel: {
      type: Number,
      min: 0,
      max: 100
    },
    contaminants: [String],
    testCertificate: String,
    
    // Storage
    storageLocation: String,
    storageConditions: String,
    expiryDate: Date,
    
    // Additional
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
    
    // Legacy fields
    producerId: {
      type: Schema.Types.ObjectId,
      ref: 'Producer',
      sparse: true
    },
    materialName: String,
    materialDescription: String,
    materialQuantityValue: Number,
    materialQuantityUnit: Number,
    materialUtilizedQuantityValue: Number,
    materialUtilizedQuantityUnit: Number,
    materialImportBought: String,
    nameSellerImporter: String,
    isImporterFormFilled: { type: Boolean, default: false },
    
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
  { timestamps: true, collection: 'RawMaterial' }
)

// Indexes
RawMaterialSchema.index({ businessId: 1, sourceType: 1 })
RawMaterialSchema.index({ businessId: 1, category: 1 })
RawMaterialSchema.index({ businessId: 1, isActive: 1 })
RawMaterialSchema.index({ expiryDate: 1 }, { sparse: true })
RawMaterialSchema.index({ name: 'text', supplier: 'text' })

// Pre-save middleware
RawMaterialSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('RawMaterial')
  }
  return next()
})

export const RawMaterialModel = mongoose.model<RawMaterialDocument>(
  'RawMaterial',
  RawMaterialSchema,
  'RawMaterial'
)
