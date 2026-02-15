import type { FilterQuery, Model } from 'mongoose'
import { PlasticItemModel, type PlasticItemDocument } from '../../models/pmc/PlasticItem'
import { ProductModel, type ProductDocument } from '../../models/pmc/Product'
import { ByProductModel, type ByProductDocument } from '../../models/pmc/ByProduct'
import { RawMaterialModel, type RawMaterialDocument } from '../../models/pmc/RawMaterial'

/**
 * Filter options for inventory queries
 */
export interface InventoryFilterOptions {
  businessId?: number | string
  category?: string
  itemType?: 'PLASTIC_ITEM' | 'PRODUCT' | 'BY_PRODUCT' | 'RAW_MATERIAL'
  hazardLevel?: string
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
 * Query result for inventory
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
 * Specialized repository for managing inventory (PlasticItem, Product, ByProduct, RawMaterial)
 */
export class InventoryRepository {
  private plasticItemModel: Model<PlasticItemDocument> = PlasticItemModel
  private productModel: Model<ProductDocument> = ProductModel
  private byProductModel: Model<ByProductDocument> = ByProductModel
  private rawMaterialModel: Model<RawMaterialDocument> = RawMaterialModel

  // ============ PLASTIC ITEMS ============

  /**
   * Create a new plastic item (master catalog)
   */
  async createPlasticItem(data: Partial<PlasticItemDocument>): Promise<any> {
    const item = new this.plasticItemModel(data)
    return item.save()
  }

  /**
   * Find plastic item by ID
   */
  async findPlasticItemById(id: string): Promise<any> {
    return this.plasticItemModel.findById(id).lean().exec()
  }

  /**
   * Find plastic item by code
   */
  async findPlasticItemByCode(code: string): Promise<any> {
    return this.plasticItemModel.findOne({ code }).lean().exec()
  }

  /**
   * List all plastic items
   */
  async findAllPlasticItems(category?: string): Promise<any[]> {
    const query: FilterQuery<PlasticItemDocument> = { isActive: true }
    if (category) query.category = category

    return this.plasticItemModel
      .find(query)
      .sort({ name: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get plastic items by category
   */
  async getPlasticItemsByCategory(category: string): Promise<any[]> {
    return this.plasticItemModel
      .find({ category, isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Count plastic items by hazard level
   */
  async countHazardousItems(hazardLevel: string): Promise<number> {
    return this.plasticItemModel.countDocuments({ hazardLevel, isActive: true })
  }

  // ============ PRODUCTS ============

  /**
   * Create a new product
   */
  async createProduct(data: Partial<ProductDocument>): Promise<any> {
    const product = new this.productModel(data)
    return product.save()
  }

  /**
   * Find products by business ID
   */
  async findProductsByBusiness(businessId: number | string): Promise<any[]> {
    return this.productModel
      .find({ businessId, isActive: true })
      .populate('plasticItemId', 'name code category')
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get business product statistics
   */
  async getBusinessProductStats(businessId: number | string): Promise<any> {
    const pipeline: any[] = [
      { $match: { businessId, isActive: true } },
      {
        $facet: {
          totalProducts: [{ $count: 'count' }],
          totalQuantity: [{ $group: { _id: null, total: { $sum: '$quantity' } } }],
          byPlacticItem: [{ $group: { _id: '$plasticItemId', count: { $sum: 1 }, quantity: { $sum: '$quantity' } } }],
          topCertifications: [
            { $unwind: { path: '$certifications', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$certifications', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]

    const result = await this.productModel.aggregate(pipeline).exec()
    return result[0]
  }

  // ============ BY-PRODUCTS ============

  /**
   * Create a new by-product
   */
  async createByProduct(data: Partial<ByProductDocument>): Promise<any> {
    const byProduct = new this.byProductModel(data)
    return byProduct.save()
  }

  /**
   * Find by-products by business ID
   */
  async findByProductsByBusiness(businessId: number | string): Promise<any[]> {
    return this.byProductModel
      .find({ businessId, isActive: true })
      .sort({ hazardLevel: -1, createdAt: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get hazardous by-products
   */
  async getHazardousByProducts(businessId?: number | string): Promise<any[]> {
    const query: FilterQuery<ByProductDocument> = { hazardLevel: { $in: ['HIGH', 'CRITICAL'] }, isActive: true }
    if (businessId) query.businessId = businessId

    return this.byProductModel
      .find(query)
      .sort({ hazardLevel: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get by-product disposal statistics
   */
  async getDisposalStats(businessId?: number | string): Promise<any> {
    const matchStage: any = { isActive: true }
    if (businessId) matchStage.businessId = businessId

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$disposalMethod',
          count: { $sum: 1 },
          totalCost: { $sum: '$disposalCost' },
          hazardousItems: {
            $sum: { $cond: [{ $in: ['$hazardLevel', ['HIGH', 'CRITICAL']] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]

    return this.byProductModel.aggregate(pipeline).exec()
  }

  // ============ RAW MATERIALS ============

  /**
   * Create a new raw material
   */
  async createRawMaterial(data: Partial<RawMaterialDocument>): Promise<any> {
    const material = new this.rawMaterialModel(data)
    return material.save()
  }

  /**
   * Find raw materials by business ID
   */
  async findRawMaterialsByBusiness(businessId: number | string): Promise<any[]> {
    return this.rawMaterialModel
      .find({ businessId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find raw materials by source type
   */
  async findBySourceType(businessId: number | string, sourceType: string): Promise<any[]> {
    return this.rawMaterialModel
      .find({ businessId, sourceType, isActive: true })
      .sort({ supplier: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get raw materials expiring soon
   */
  async getExpiringRawMaterials(businessId?: number | string, days: number = 30): Promise<any[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const query: FilterQuery<RawMaterialDocument> = {
      expiryDate: { $lte: futureDate, $gte: new Date() },
      isActive: true
    }

    if (businessId) query.businessId = businessId

    return this.rawMaterialModel
      .find(query)
      .sort({ expiryDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get raw material supplier statistics
   */
  async getSupplierStats(businessId: number | string): Promise<any> {
    const pipeline: any[] = [
      { $match: { businessId, isActive: true } },
      {
        $group: {
          _id: '$supplier',
          count: { $sum: 1 },
          materials: { $push: '$name' },
          totalCost: { $sum: '$totalCost' },
          avgQuality: { $avg: '$purityLevel' }
        }
      },
      { $sort: { count: -1 } }
    ]

    return this.rawMaterialModel.aggregate(pipeline).exec()
  }

  // ============ UNIFIED QUERIES ============

  /**
   * Search across all inventory types
   */
  async searchInventory(filter: InventoryFilterOptions): Promise<InventoryQueryResult> {
    const {
      businessId,
      category,
      itemType,
      hazardLevel,
      isActive = true,
      startDate,
      endDate,
      searchText,
      limit = 20,
      offset = 0,
      sort = 'createdAt',
      sortOrder = 'desc'
    } = filter

    const sortObj: Record<string, 1 | -1> = {}
    const sortValue = sortOrder === 'asc' ? 1 : -1
    sortObj[sort] = sortValue

    let results: any[] = []
    let total = 0

    // Search PlasticItem
    if (!itemType || itemType === 'PLASTIC_ITEM') {
      const plasticQuery: FilterQuery<PlasticItemDocument> = { isActive }
      if (category) plasticQuery.category = category
      if (hazardLevel) plasticQuery.hazardousLevel = hazardLevel
      if (searchText) plasticQuery.$text = { $search: searchText }

      const plasticItems = await this.plasticItemModel
        .find(plasticQuery)
        .select({ numericId: 1, code: 1, name: 1, category: 1, hazardousLevel: 1, createdAt: 1, itemType: { $literal: 'PLASTIC_ITEM' } })
        .lean()
        .exec()

      results.push(...plasticItems)
      total += plasticItems.length
    }

    // Search Product
    if (!itemType || itemType === 'PRODUCT') {
      const productQuery: FilterQuery<ProductDocument> = { isActive }
      if (businessId) productQuery.businessId = businessId

      const products = await this.productModel
        .find(productQuery)
        .select({ numericId: 1, businessId: 1, name: 1, quantity: 1, createdAt: 1, itemType: { $literal: 'PRODUCT' } })
        .lean()
        .exec()

      results.push(...products)
      total += products.length
    }

    // Search ByProduct
    if (!itemType || itemType === 'BY_PRODUCT') {
      const byProductQuery: FilterQuery<ByProductDocument> = { isActive }
      if (businessId) byProductQuery.businessId = businessId
      if (category) byProductQuery.category = category
      if (hazardLevel) byProductQuery.hazardLevel = hazardLevel

      const byProducts = await this.byProductModel
        .find(byProductQuery)
        .select({ numericId: 1, businessId: 1, name: 1, hazardLevel: 1, createdAt: 1, itemType: { $literal: 'BY_PRODUCT' } })
        .lean()
        .exec()

      results.push(...byProducts)
      total += byProducts.length
    }

    // Search RawMaterial
    if (!itemType || itemType === 'RAW_MATERIAL') {
      const rawMaterialQuery: FilterQuery<RawMaterialDocument> = { isActive }
      if (businessId) rawMaterialQuery.businessId = businessId
      if (category) rawMaterialQuery.category = category

      const rawMaterials = await this.rawMaterialModel
        .find(rawMaterialQuery)
        .select({ numericId: 1, businessId: 1, name: 1, quantity: 1, createdAt: 1, itemType: { $literal: 'RAW_MATERIAL' } })
        .lean()
        .exec()

      results.push(...rawMaterials)
      total += rawMaterials.length
    }

    // Apply date filtering if needed
    if (startDate || endDate) {
      results = results.filter((r: any) => {
        const createdAt = new Date(r.createdAt)
        if (startDate && createdAt < startDate) return false
        if (endDate && createdAt > endDate) return false
        return true
      })
      total = results.length
    }

    // Sort and paginate
    results = results
      .sort((a: any, b: any) => {
        if (sortValue === 1) {
          return (a[sort] || 0) - (b[sort] || 0)
        } else {
          return (b[sort] || 0) - (a[sort] || 0)
        }
      })
      .slice(offset, offset + limit)

    const page = Math.floor(offset / limit) + 1
    const pageSize = limit
    const totalPages = Math.ceil(total / pageSize)
    const hasMore = offset + limit < total

    return {
      items: results,
      total,
      page,
      pageSize,
      totalPages,
      hasMore
    }
  }

  /**
   * Get comprehensive inventory statistics for a business
   */
  async getBusinessInventoryStats(businessId: number | string): Promise<any> {
    const [products, rawMaterials, byProducts] = await Promise.all([
      this.getBusinessProductStats(businessId),
      this.rawMaterialModel.countDocuments({ businessId, isActive: true }),
      this.byProductModel.countDocuments({ businessId, isActive: true })
    ])

    return {
      products: products || {},
      rawMaterialsCount: rawMaterials,
      byProductsCount: byProducts,
      summary: {
        totalItems: (products?.totalProducts?.[0]?.count || 0) + rawMaterials + byProducts,
        totalProductQuantity: products?.totalQuantity?.[0]?.total || 0
      }
    }
  }
}

// Export singleton instance
export const inventoryRepository = new InventoryRepository()
