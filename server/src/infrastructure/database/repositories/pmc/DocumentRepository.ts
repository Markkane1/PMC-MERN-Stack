import type { FilterQuery, Model } from 'mongoose'
import { ApplicantDocumentModel, type ApplicantDocumentDocument, DocumentStatus } from '../../models/pmc/ApplicantDocument'

/**
 * Filter options for document queries
 */
export interface DocumentFilterOptions {
  applicantId?: number
  documentType?: string
  status?: string
  startDate?: Date
  endDate?: Date
  isExpired?: boolean
  expiringWithin?: number // days
  tags?: string[]
  limit?: number
  offset?: number
  sort?: 'uploadDate' | 'expiryDate' | 'status'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Document query result
 */
export interface DocumentQueryResult {
  documents: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Specialized repository for managing ApplicantDocument operations
 * Provides pagination, filtering, analytics, and cache invalidation support
 */
export class DocumentRepository {
  constructor(private model: Model<ApplicantDocumentDocument> = ApplicantDocumentModel) {}

  /**
   * Create a new document
   */
  async create(data: Partial<ApplicantDocumentDocument>): Promise<any> {
    const document = new this.model(data)
    return document.save()
  }

  /**
   * Create multiple documents
   */
  async createMany(documents: Partial<ApplicantDocumentDocument>[]): Promise<any[]> {
    return this.model.insertMany(documents)
  }

  /**
   * Find document by ID
   */
  async findById(documentId: string): Promise<any> {
    return this.model.findById(documentId).lean().exec()
  }

  /**
   * Find documents by applicant ID
   */
  async findByApplicantId(
    applicantId: number,
    documentType?: string
  ): Promise<any[]> {
    const query: FilterQuery<ApplicantDocumentDocument> = { applicantId }

    if (documentType) {
      query.documentType = documentType
    }

    return this.model
      .find(query)
      .sort({ uploadDate: -1 })
      .lean()
      .exec()
  }

  /**
   * Find documents with pagination and filtering
   */
  async findPaginated(
    filter: DocumentFilterOptions
  ): Promise<DocumentQueryResult> {
    const {
      applicantId,
      documentType,
      status,
      startDate,
      endDate,
      isExpired,
      expiringWithin,
      tags,
      limit = 20,
      offset = 0,
      sort = 'uploadDate',
      sortOrder = 'desc'
    } = filter

    // Build MongoDB query
    const query: FilterQuery<ApplicantDocumentDocument> = {}

    if (applicantId) {
      query.applicantId = applicantId
    }

    if (documentType) {
      query.documentType = documentType
    }

    if (status) {
      query.status = status
    }

    if (startDate || endDate) {
      query.uploadDate = {}
      if (startDate) {
        (query.uploadDate as any).$gte = startDate
      }
      if (endDate) {
        (query.uploadDate as any).$lte = endDate
      }
    }

    if (isExpired !== undefined) {
      if (isExpired) {
        query.expiryDate = { $lt: new Date() }
      } else {
        query.expiryDate = { $gte: new Date() }
      }
    }

    if (expiringWithin) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + expiringWithin)
      query.expiryDate = {
        $lte: futureDate,
        $gte: new Date()
      }
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags }
    }

    // Always filter by active status
    query.isActive = true

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {}
    const sortValue = sortOrder === 'asc' ? 1 : -1
    sortObj[sort] = sortValue

    // Execute query
    const [documents, total] = await Promise.all([
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
      documents,
      total,
      page,
      pageSize,
      totalPages,
      hasMore
    }
  }

  /**
   * Find documents pending verification
   */
  async findPendingVerification(): Promise<any[]> {
    return this.model
      .find({
        status: DocumentStatus.PENDING,
        isActive: true
      })
      .sort({ uploadDate: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find documents expiring soon (within days)
   */
  async findExpiringSoon(days: number = 30): Promise<any[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return this.model
      .find({
        expiryDate: {
          $lte: futureDate,
          $gt: new Date()
        },
        isActive: true
      })
      .sort({ expiryDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find expired documents
   */
  async findExpired(): Promise<any[]> {
    return this.model
      .find({
        expiryDate: { $lt: new Date() },
        isActive: true
      })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Update document by ID
   */
  async updateById(
    documentId: string,
    updates: Partial<ApplicantDocumentDocument>
  ): Promise<any> {
    return this.model
      .findByIdAndUpdate(documentId, updates, {
        new: true,
        runValidators: true
      })
      .lean()
      .exec()
  }

  /**
   * Verify a document
   */
  async verify(
    documentId: string,
    verifiedBy: string,
    rejected: boolean = false,
    rejectionReason?: string
  ): Promise<any> {
    const status = rejected ? DocumentStatus.REJECTED : DocumentStatus.VERIFIED

    const updates: Partial<ApplicantDocumentDocument> = {
      status,
      verifiedBy: verifiedBy as any,
      verificationDate: new Date()
    }

    if (rejected && rejectionReason) {
      updates.rejectionReason = rejectionReason
    }

    return this.updateById(documentId, updates)
  }

  /**
   * Delete document by ID
   */
  async deleteById(documentId: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(documentId).exec()
    return !!result
  }

  /**
   * Soft delete (mark as inactive)
   */
  async softDelete(documentId: string): Promise<any> {
    return this.updateById(documentId, { isActive: false })
  }

  /**
   * Delete all documents for an applicant
   */
  async deleteByApplicantId(applicantId: number): Promise<number> {
    const result = await this.model.deleteMany({ applicantId }).exec()
    return result.deletedCount || 0
  }

  /**
   * Soft delete all documents for an applicant
   */
  async softDeleteByApplicantId(applicantId: number): Promise<number> {
    const result = await this.model
      .updateMany({ applicantId }, { isActive: false })
      .exec()
    return result.modifiedCount || 0
  }

  /**
   * Get statistics for an applicant
   */
  async getApplicantStatistics(applicantId: number): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    pendingVerification: number
    expiringSoon: number
    totalSize: number
  }> {
    const [total, byType, byStatus, pending, expiring, totalSize] = await Promise.all([
      this.model.countDocuments({ applicantId, isActive: true }),
      this.getCountByType(applicantId),
      this.getCountByStatus(applicantId),
      this.model.countDocuments({
        applicantId,
        status: DocumentStatus.PENDING,
        isActive: true
      }),
      this.model.countDocuments({
        applicantId,
        expiryDate: {
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date()
        },
        isActive: true
      }),
      this.getTotalFileSize(applicantId)
    ])

    return {
      total,
      byType,
      byStatus,
      pendingVerification: pending,
      expiringSoon: expiring,
      totalSize
    }
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStatistics(): Promise<{
    totalDocuments: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    pendingVerification: number
    expiringSoon: number
    totalSize: number
    averageFileSize: number
  }> {
    const pipeline = [
      {
        $facet: {
          totalDocuments: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          byType: [
            { $match: { isActive: true } },
            { $group: { _id: '$documentType', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $match: { isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          pendingVerification: [
            { $match: { status: DocumentStatus.PENDING, isActive: true } },
            { $count: 'count' }
          ],
          expiringSoon: [
            {
              $match: {
                expiryDate: {
                  $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  $gte: new Date()
                },
                isActive: true
              }
            },
            { $count: 'count' }
          ],
          totalSize: [
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$fileSize' } } }
          ],
          averageSize: [
            { $match: { isActive: true } },
            { $group: { _id: null, avg: { $avg: '$fileSize' } } }
          ]
        }
      }
    ]

    const result = await this.model.aggregate(pipeline).exec()
    const stats = result[0]

    return {
      totalDocuments: stats.totalDocuments[0]?.count || 0,
      byType: Object.fromEntries(
        stats.byType.map((t: any) => [t._id, t.count])
      ),
      byStatus: Object.fromEntries(
        stats.byStatus.map((s: any) => [s._id, s.count])
      ),
      pendingVerification: stats.pendingVerification[0]?.count || 0,
      expiringSoon: stats.expiringSoon[0]?.count || 0,
      totalSize: stats.totalSize[0]?.total || 0,
      averageFileSize: Math.round(stats.averageSize[0]?.avg || 0)
    }
  }

  /**
   * Helper: Get count by type for an applicant
   */
  private async getCountByType(applicantId: number): Promise<Record<string, number>> {
    const result = await this.model.aggregate([
      { $match: { applicantId, isActive: true } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } }
    ])

    return Object.fromEntries(
      result.map((r: any) => [r._id, r.count])
    )
  }

  /**
   * Helper: Get count by status for an applicant
   */
  private async getCountByStatus(applicantId: number): Promise<Record<string, number>> {
    const result = await this.model.aggregate([
      { $match: { applicantId, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    return Object.fromEntries(
      result.map((r: any) => [r._id, r.count])
    )
  }

  /**
   * Helper: Get total file size for an applicant
   */
  private async getTotalFileSize(applicantId: number): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { applicantId, isActive: true } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ])

    return result[0]?.total || 0
  }
}

// Export singleton instance
export const documentRepository = new DocumentRepository()
