import type { FilterQuery, Model } from 'mongoose'
import { BusinessProfileModel, type BusinessProfileDocument, BusinessStatus, EntityType } from '../../models/pmc/BusinessProfile'

/**
 * Filter options for business queries
 */
export interface BusinessFilterOptions {
  applicantId?: number | string
  entityType?: EntityType | string
  status?: BusinessStatus | string
  districtId?: number
  businessSize?: string
  startDate?: Date
  endDate?: Date
  tags?: string[]
  searchText?: string
  isActive?: boolean
  limit?: number
  offset?: number
  sort?: 'createdAt' | 'businessName' | 'status'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Business query result with pagination
 */
export interface BusinessQueryResult {
  businesses: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Specialized repository for managing BusinessProfile operations
 */
export class BusinessProfileRepository {
  constructor(private model: Model<BusinessProfileDocument> = BusinessProfileModel) {}

  /**
   * Create a new business profile
   */
  async create(data: Partial<BusinessProfileDocument>): Promise<any> {
    const profile = new this.model(data)
    return profile.save()
  }

  /**
   * Create multiple business profiles
   */
  async createMany(profiles: Partial<BusinessProfileDocument>[]): Promise<any[]> {
    return this.model.insertMany(profiles)
  }

  /**
   * Find business by ID
   */
  async findById(businessId: string): Promise<any> {
    return this.model.findById(businessId).lean().exec()
  }

  /**
   * Find business by applicant ID
   */
  async findByApplicantId(applicantId: number | string): Promise<any> {
    return this.model
      .findOne({ applicantId })
      .lean()
      .exec()
  }

  /**
   * Find businesses with pagination and filtering
   */
  async findPaginated(filter: BusinessFilterOptions): Promise<BusinessQueryResult> {
    const {
      applicantId,
      entityType,
      status,
      districtId,
      businessSize,
      startDate,
      endDate,
      tags,
      searchText,
      isActive = true,
      limit = 20,
      offset = 0,
      sort = 'createdAt',
      sortOrder = 'desc'
    } = filter

    // Build MongoDB query
    const query: FilterQuery<BusinessProfileDocument> = {}

    if (applicantId) {
      query.applicantId = applicantId
    }

    if (entityType) {
      query.entityType = entityType
    }

    if (status) {
      query.status = status
    }

    if (districtId) {
      query.$or = [
        { districtId },
        { 'location.districtId': districtId }
      ]
    }

    if (businessSize) {
      query.businessSize = businessSize
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        (query.createdAt as any).$gte = startDate
      }
      if (endDate) {
        (query.createdAt as any).$lte = endDate
      }
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags }
    }

    if (searchText) {
      query.$text = { $search: searchText }
    }

    query.isActive = isActive

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {}
    const sortValue = sortOrder === 'asc' ? 1 : -1
    sortObj[sort] = sortValue

    // Execute query
    const [businesses, total] = await Promise.all([
      this.model
        .find(query)
        .sort(sortObj)
        .skip(offset)
        .limit(limit)
        .lean()
        .exec() as Promise<any[]>,
      this.model.countDocuments(query)
    ])

    const page = Math.floor(offset / limit) + 1
    const pageSize = limit
    const totalPages = Math.ceil(total / pageSize)
    const hasMore = offset + limit < total

    return {
      businesses,
      total,
      page,
      pageSize,
      totalPages,
      hasMore
    }
  }

  /**
   * Find all businesses by entity type
   */
  async findByEntityType(entityType: EntityType | string): Promise<any[]> {
    return this.model
      .find({ entityType, isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find all businesses by district
   */
  async findByDistrict(districtId: number): Promise<any[]> {
    return this.model
      .find({
        $or: [
          { districtId },
          { 'location.districtId': districtId }
        ],
        isActive: true
      })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find businesses pending verification
   */
  async findPendingVerification(): Promise<any[]> {
    return this.model
      .find({
        status: { $in: [BusinessStatus.NEW, BusinessStatus.SUBMITTED, BusinessStatus.UNDER_REVIEW] },
        isActive: true
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find businesses with expiring licenses
   */
  async findExpiringLicenses(days: number = 30): Promise<any[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return this.model
      .find({
        'registration.licenseExpiryDate': {
          $lte: futureDate,
          $gte: new Date()
        },
        isActive: true
      })
      .sort({ 'registration.licenseExpiryDate': 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find businesses with expired licenses
   */
  async findExpiredLicenses(): Promise<any[]> {
    return this.model
      .find({
        'registration.licenseExpiryDate': { $lt: new Date() },
        isActive: true
      })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Update business by ID
   */
  async updateById(
    businessId: string,
    updates: Partial<BusinessProfileDocument>
  ): Promise<any> {
    return this.model
      .findByIdAndUpdate(businessId, updates, {
        new: true,
        runValidators: true
      })
      .lean()
      .exec()
  }

  /**
   * Verify a business
   */
  async verify(
    businessId: string,
    verifiedBy: string,
    rejected: boolean = false,
    rejectionReason?: string
  ): Promise<any> {
    const status = rejected ? BusinessStatus.REJECTED : BusinessStatus.VERIFIED

    const updates: Partial<BusinessProfileDocument> = {
      status,
      verifiedBy: verifiedBy as any,
      verificationDate: new Date()
    }

    if (rejected && rejectionReason) {
      updates.rejectionReason = rejectionReason
    }

    return this.updateById(businessId, updates)
  }

  /**
   * Activate a business (after approval)
   */
  async activateBusiness(businessId: string): Promise<any> {
    return this.updateById(businessId, {
      status: BusinessStatus.ACTIVE,
      isActive: true
    })
  }

  /**
   * Suspend a business
   */
  async suspendBusiness(businessId: string, reason?: string): Promise<any> {
    return this.updateById(businessId, {
      status: BusinessStatus.SUSPENDED,
      remarks: reason
    })
  }

  /**
   * Delete business by ID
   */
  async deleteById(businessId: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(businessId).exec()
    return !!result
  }

  /**
   * Soft delete (mark as inactive)
   */
  async softDelete(businessId: string): Promise<any> {
    return this.updateById(businessId, { isActive: false })
  }

  /**
   * Get business statistics
   */
  async getStatistics(applicantId?: number | string): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    byDistrict: Record<string, number>
    activeCount: number
    inactiveCount: number
    pendingVerification: number
  }> {
    const matchStage: any = {}
    if (applicantId) {
      matchStage.applicantId = applicantId
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [{ $group: { _id: '$entityType', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byDistrict: [
            { $group: { _id: { $ifNull: ['$location.districtId', '$districtId'] }, count: { $sum: 1 } } }
          ],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
          pendingVerification: [
            {
              $match: {
                status: { $in: [BusinessStatus.NEW, BusinessStatus.SUBMITTED, BusinessStatus.UNDER_REVIEW] }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]

    const result = await this.model.aggregate(pipeline).exec()
    const stats = result[0]

    return {
      total: stats.total[0]?.count || 0,
      byType: Object.fromEntries(
        stats.byType.map((t: any) => [t._id, t.count])
      ),
      byStatus: Object.fromEntries(
        stats.byStatus.map((s: any) => [s._id, s.count])
      ),
      byDistrict: Object.fromEntries(
        stats.byDistrict.map((d: any) => [d._id, d.count])
      ),
      activeCount: stats.active[0]?.count || 0,
      inactiveCount: stats.inactive[0]?.count || 0,
      pendingVerification: stats.pendingVerification[0]?.count || 0
    }
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStatistics(): Promise<any> {
    const pipeline = [
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [{ $group: { _id: '$entityType', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byDistrict: [
            { $group: { _id: { $ifNull: ['$location.districtId', '$districtId'] }, count: { $sum: 1 } } }
          ],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
          bySize: [{ $group: { _id: '$businessSize', count: { $sum: 1 } } }]
        }
      }
    ]

    const result = await this.model.aggregate(pipeline).exec()
    return result[0]
  }

  /**
   * Count businesses by entity type
   */
  async countByEntityType(entityType: EntityType | string): Promise<number> {
    return this.model.countDocuments({ entityType, isActive: true })
  }

  /**
   * Count businesses by district
   */
  async countByDistrict(districtId: number): Promise<number> {
    return this.model.countDocuments({
      $or: [
        { districtId },
        { 'location.districtId': districtId }
      ],
      isActive: true
    })
  }

  /**
   * Count businesses by status
   */
  async countByStatus(status: BusinessStatus | string): Promise<number> {
    return this.model.countDocuments({ status, isActive: true })
  }
}

// Export singleton instance
export const businessProfileRepository = new BusinessProfileRepository()
