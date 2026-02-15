import type { Id, Timestamped } from '../types'

/**
 * Plastic item categories for classification
 */
export enum PlasticCategory {
  SINGLE_USE = 'SINGLE_USE',
  MULTI_USE = 'MULTI_USE',
  MICROPLASTIC = 'MICROPLASTIC',
  POLYMER = 'POLYMER',
  COMPOSITE = 'COMPOSITE',
  WASTE = 'WASTE'
}

/**
 * Hazard levels for plastic items
 */
export enum HazardLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Measurement units
 */
export enum MeasurementUnit {
  KG = 'KG',
  TON = 'TON',
  LITER = 'LITER',
  PIECE = 'PIECE',
  BAG = 'BAG',
  ROLL = 'ROLL'
}

/**
 * Plastic Item - Master catalog of all plastic types
 */
export type PlasticItem = Timestamped & {
  id?: Id
  numericId?: number
  code: string // Unique item code
  name: string
  category: PlasticCategory | string
  description?: string
  hsnCode?: string // Harmonized System Nomenclature
  unit: MeasurementUnit | string
  density?: number // kg/m³
  recyclingRate?: number // percentage
  hazardousLevel: HazardLevel | string
  isActive: boolean
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  createdBy?: Id
  updatedBy?: Id
}

/**
 * Product - Finished products produced/consumed by business
 */
export type Product = Timestamped & {
  id?: Id
  numericId?: number
  businessId: number | string
  plasticItemId: string // Reference to PlasticItem
  productName?: string
  description?: string
  quantity: number
  unit: MeasurementUnit | string
  yearlyProduction?: number // For producers
  yearlyConsumption?: number // For consumers
  storageLocation?: string
  qualityStandard?: string
  certifications?: string[]
  specifications?: Record<string, any>
  notes?: string
  isActive: boolean
  createdBy?: Id
  updatedBy?: Id
}

/**
 * By-Product - Waste byproducts generated during operations
 */
export type ByProduct = Timestamped & {
  id?: Id
  numericId?: number
  businessId: number | string
  code?: string
  name: string
  description?: string
  category?: string
  quantity?: number
  unit?: MeasurementUnit | string
  disposalMethod?: string // Landfill, Incineration, Recycling, etc
  disposalCost?: number
  environmentalImpact?: string
  harmfulSubstances?: string[]
  hazardLevel?: HazardLevel | string
  recommendations?: string
  notes?: string
  isActive: boolean
  createdBy?: Id
  updatedBy?: Id
}

/**
 * Raw Material - Input materials for business operations
 */
export type RawMaterial = Timestamped & {
  id?: Id
  numericId?: number
  businessId: number | string
  code?: string
  name: string
  category?: string
  description?: string
  source?: string // Supplier name or material source
  sourceType?: 'SUPPLIER' | 'WASTE' | 'RECYCLED' | 'VIRGIN'
  quantity: number
  unit: MeasurementUnit | string
  cost?: number // Cost per unit or batch
  totalCost?: number
  
  // Supplier Details
  supplier?: string
  supplierContact?: string
  supplierEmail?: string
  supplierPhone?: string
  purchaseDate?: Date
  deliveryDate?: Date
  
  // Quality Details
  qualityGrade?: string // A, B, C grades
  purityLevel?: number // percentage
  contaminants?: string[]
  testCertificate?: string
  
  // Storage
  storageLocation?: string
  storageConditions?: string // Temperature, humidity, etc
  expiryDate?: Date
  
  // Additional
  specifications?: Record<string, any>
  notes?: string
  isActive: boolean
  createdBy?: Id
  updatedBy?: Id
}

/**
 * Inventory Transaction - Track movements of inventory
 */
export type InventoryTransaction = Timestamped & {
  id?: Id
  numericId?: number
  businessId: number | string
  itemId: string // Can be PlasticItem, Product, ByProduct, or RawMaterial
  transactionType: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT' | 'CONSUMPTION'
  quantity: number
  unit: MeasurementUnit | string
  price?: number // Per unit
  totalValue?: number
  reference?: string // Invoice, PO, etc
  notes?: string
  approvedBy?: Id
  approvedDate?: Date
  createdBy?: Id
}

/**
 * Filter options for inventory queries
 */
export interface InventoryFilterOptions {
  businessId?: number | string
  category?: string
  itemType?: 'PLASTIC_ITEM' | 'PRODUCT' | 'BY_PRODUCT' | 'RAW_MATERIAL'
  hazardLevel?: HazardLevel | string
  isActive?: boolean
  startDate?: Date
  endDate?: Date
  searchText?: string
  limit?: number
  offset?: number
  sort?: 'name' | 'createdAt' | 'quantity'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Query result for inventory items
 */
export interface InventoryQueryResult {
  items: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Inventory statistics
 */
export interface InventoryStatistics {
  totalItems: number
  itemsByCategory: Record<string, number>
  totalQuantity: number
  totalValue?: number
  hazardousItems: number
  inactiveItems: number
  transactionCount?: number
}
