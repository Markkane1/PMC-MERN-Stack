import mongoose, { Schema, type Document } from 'mongoose'

export interface RawMaterialDocument extends Document {
  producerId: mongoose.Types.ObjectId
  materialName: string
  materialDescription?: string
  materialQuantityValue?: number
  materialQuantityUnit?: number
  materialUtilizedQuantityValue?: number
  materialUtilizedQuantityUnit?: number
  materialImportBought?: string
  nameSellerImporter?: string
  isImporterFormFilled?: boolean
}

const RawMaterialSchema = new Schema<RawMaterialDocument>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: 'Producer', required: true },
    materialName: { type: String, required: true },
    materialDescription: { type: String },
    materialQuantityValue: { type: Number },
    materialQuantityUnit: { type: Number },
    materialUtilizedQuantityValue: { type: Number },
    materialUtilizedQuantityUnit: { type: Number },
    materialImportBought: { type: String },
    nameSellerImporter: { type: String },
    isImporterFormFilled: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const RawMaterialModel = mongoose.model<RawMaterialDocument>('RawMaterial', RawMaterialSchema, 'rawmaterials')
