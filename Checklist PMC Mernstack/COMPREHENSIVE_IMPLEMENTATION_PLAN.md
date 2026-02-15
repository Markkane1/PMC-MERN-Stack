# Comprehensive Implementation Plan: Missing Features for PMC MERN Stack

**Project:** PMC (Plastic Management Commission) MERN Application  
**Created:** February 17, 2026  
**Status:** Planning Phase  
**Total Duration:** 14 weeks  
**Team Size:** 2-3 developers + 1 QA  
**Objective:** Implement 50+ missing API endpoints, 20+ models, and 25+ React components

---

## 📋 Table of Contents

1. Executive Summary
2. Phase Breakdown (14 Weeks)
3. Detailed Feature Specifications
4. Architecture & Design Decisions
5. Database Schema Design
6. API Endpoint Specifications
7. Frontend Component Specifications
8. Testing Strategy
9. Risk Management
10. Success Metrics

---

## 🎯 Executive Summary

### Current State
- ✅ Infrastructure complete (8 weeks of optimization done)
- ✅ Basic CRUD scaffolding for ApplicantDetail
- ❌ Missing 20+ models
- ❌ Missing 50+ API endpoints
- ❌ Missing 25+ React pages/components
- ❌ Missing 3+ integrations (PDF, Payment, GIS)

### End State
- ✅ Complete PMC application with all features
- ✅ Full CRUD for all entity types
- ✅ Multi-step workflow implementation
- ✅ Payment integration (PITB/PLMIS)
- ✅ PDF generation (receipt, chalan, license)
- ✅ Location mapping (OpenLayers)
- ✅ Role-based dashboards (6 roles)
- ✅ Analytics & reporting
- ✅ Full test coverage (70%+)

### Resource Allocation
- **Backend Developer:** 50% time (14 weeks)
- **Frontend Developer:** 40% time (14 weeks)
- **Full Stack Developer:** 30% time (14 weeks) - Optional for sprint coverage
- **QA/Testing:** 20% time (14 weeks)
- **Scrum Master/PM:** 10% time (14 weeks)

---

# PHASE 1: FOUNDATION & CORE MODELS
**Duration:** Weeks 1-2  
**Focus:** Database schema, repositories, basic services  
**Output:** 12 models, 8 repositories, 4 services

## Week 1: Core Data Models & Schema Design

### Day 1-2: Database Schema Design

#### Task 1.1.1: Design Document Upload System
```typescript
// server/src/domain/models/ApplicantDocument.ts

import { Schema, Document } from 'mongoose'

export enum DocumentType {
  CNIC = 'CNIC',
  PASSPORT = 'PASSPORT',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  UTILITY_BILL = 'UTILITY_BILL',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  BANK_CHALAN = 'BANK_CHALAN',
  LICENSE = 'LICENSE'
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED'
}

export interface IApplicantDocument extends Document {
  _id: string
  applicantId: string
  documentType: DocumentType
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadDate: Date
  expiryDate?: Date
  status: DocumentStatus
  verifiedBy?: string
  verificationDate?: Date
  rejectionReason?: string
  notes?: string
  metadata?: {
    uploadedFrom: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
    deviceInfo?: string
  }
  versioning?: {
    version: number
    previousVersionUrl?: string
    changeReason?: string
  }
  createdAt: Date
  updatedAt: Date
}

export const ApplicantDocumentSchema = new Schema<IApplicantDocument>({
  applicantId: {
    type: String,
    required: [true, 'Applicant ID is required'],
    index: true,
    sparse: true
  },
  documentType: {
    type: String,
    enum: Object.values(DocumentType),
    required: [true, 'Document type is required'],
    index: true
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB limit
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  uploadDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiryDate: {
    type: Date,
    sparse: true
  },
  status: {
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.PENDING,
    index: true
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  verificationDate: Date,
  rejectionReason: String,
  notes: String,
  metadata: {
    uploadedFrom: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String,
    deviceInfo: {}
  },
  versioning: {
    version: { type: Number, default: 1 },
    previousVersionUrl: String,
    changeReason: String
  }
}, {
  timestamps: true,
  collection: 'applicant_documents'
})

// Compound indexes for common queries
ApplicantDocumentSchema.index({ applicantId: 1, documentType: 1 })
ApplicantDocumentSchema.index({ applicantId: 1, status: 1 })
ApplicantDocumentSchema.index({ status: 1, uploadDate: -1 })
ApplicantDocumentSchema.index({ expiryDate: 1 }, { sparse: true })

// TTL index for automatic expiry cleanup (optional)
ApplicantDocumentSchema.index({ expiryDate: 1 }, { 
  expireAfterSeconds: 0,
  sparse: true 
})

// Geospatial index if coordinates added
ApplicantDocumentSchema.index({ 'metadata.location': '2dsphere' }, { sparse: true })

export interface IDocumentMetrics {
  totalDocuments: number
  byType: Record<DocumentType, number>
  byStatus: Record<DocumentStatus, number>
  pendingVerification: number
  expiringSoon: number
  totalSize: number
}
```

**Deliverable:** Complete Mongoose schema with validation, indexes, and virtual fields

#### Task 1.1.2: Design Business Profile Models
```typescript
// server/src/domain/models/BusinessProfile.ts

export enum BusinessType {
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
  COLLECTOR = 'COLLECTOR',
  RECYCLER = 'RECYCLER'
}

export enum BusinessSize {
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

export interface IBusinessProfile extends Document {
  applicantId: string
  businessName: string
  businessType: BusinessType
  businessSize: BusinessSize
  registrationNumber: string
  registrationDate: Date
  taxId: string
  ntnNumber?: string
  seraNumber?: string
  
  // Physical details
  facilityLocation: {
    address: string
    district: string
    tehsil: string
    latitude: number
    longitude: number
  }
  
  // Operational details
  operationalSince: Date
  employees: number
  productionCapacity?: number // for producers
  consumptionCapacity?: number // for consumers
  collectionArea?: string // for collectors
  recyclingCapacity?: number // for recyclers
  
  // Contact & person in charge
  contactPerson: {
    name: string
    designation: string
    phone: string
    email: string
  }
  
  // Certifications
  certifications: [{
    name: string
    issuedDate: Date
    expiryDate?: Date
    certificateUrl: string
  }]
  
  // Environmental compliance
  environmentalCompliance: {
    wasteManagementPlan: boolean
    wasteManagementPlanUrl?: string
    efflunetTreatment: boolean
    efflunetTreatmentUrl?: string
    pollutionControlCertificate?: string
  }
  
  // Financial
  yearlyRevenue?: number
  bankDetails?: {
    accountNumber: string
    bankName: string
    ifscCode: string
  }
  
  status: 'VERIFIED' | 'PENDING' | 'REJECTED'
  verifiedBy?: string
  verificationDate?: Date
  
  createdAt: Date
  updatedAt: Date
}

export const BusinessProfileSchema = new Schema<IBusinessProfile>({
  applicantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessType: {
    type: String,
    enum: Object.values(BusinessType),
    required: true,
    index: true
  },
  businessSize: {
    type: String,
    enum: Object.values(BusinessSize),
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  registrationDate: Date,
  taxId: {
    type: String,
    required: true,
    unique: true
  },
  ntnNumber: String,
  seraNumber: String,
  
  facilityLocation: {
    address: String,
    district: String,
    tehsil: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  
  operationalSince: Date,
  employees: Number,
  productionCapacity: Number,
  consumptionCapacity: Number,
  collectionArea: String,
  recyclingCapacity: Number,
  
  contactPerson: {
    name: String,
    designation: String,
    phone: String,
    email: String
  },
  
  certifications: [{
    name: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  
  environmentalCompliance: {
    wasteManagementPlan: Boolean,
    wasteManagementPlanUrl: String,
    efflunetTreatment: Boolean,
    efflunetTreatmentUrl: String,
    pollutionControlCertificate: String
  },
  
  yearlyRevenue: Number,
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  
  status: {
    type: String,
    enum: ['VERIFIED', 'PENDING', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date
}, {
  timestamps: true,
  collection: 'business_profiles'
})

// Indexes
BusinessProfileSchema.index({ applicantId: 1, businessType: 1 })
BusinessProfileSchema.index({ businessType: 1, status: 1 })
BusinessProfileSchema.index({ 'facilityLocation.latitude': 1, 'facilityLocation.longitude': 1 })
```

**Deliverable:** BusinessProfile schema with comprehensive fields for 4 entity types

#### Task 1.1.3: Design Inventory Models
```typescript
// server/src/domain/models/PlasticInventory.ts

export interface IPlasticItem extends Document {
  code: string
  name: string
  category: string // 'SINGLE_USE' | 'MULTI_USE' | 'MICROPLASTIC' etc
  description: string
  hsn_code: string
  unit: string // kg, liters, pieces
  density?: number
  recyclingRate?: number
  hazardousLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IProduct extends Document {
  businessId: string
  plasticItemId: string
  quantity: number
  unit: string
  yearlyProduction?: number
  storageLocation?: string
  qualityStandard?: string
  certifications?: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface IByProduct extends Document {
  businessId: string
  name: string
  code: string
  description: string
  quantity?: number
  unit?: string
  disposalMethod: string
  environmentalImpact?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface IRawMaterial extends Document {
  businessId: string
  name: string
  code: string
  source: string // supplier, etc
  quantity: number
  unit: string
  cost: number
  supplier?: string
  supplierContact?: string
  purityLevel?: number // percentage
  contaminants?: string[]
  storageConditions?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Schemas
export const PlasticItemSchema = new Schema<IPlasticItem>({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  description: String,
  hsn_code: String,
  unit: { type: String, required: true },
  density: Number,
  recyclingRate: Number,
  hazardousLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true })

export const ProductSchema = new Schema<IProduct>({
  businessId: { type: String, required: true, index: true },
  plasticItemId: { type: Schema.Types.ObjectId, ref: 'PlasticItem', required: true },
  quantity: { type: Number, required: true },
  unit: String,
  yearlyProduction: Number,
  storageLocation: String,
  qualityStandard: String,
  certifications: [String],
  notes: String
}, { timestamps: true })

export const ByProductSchema = new Schema<IByProduct>({
  businessId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  description: String,
  quantity: Number,
  unit: String,
  disposalMethod: String,
  environmentalImpact: String,
  notes: String
}, { timestamps: true })

export const RawMaterialSchema = new Schema<IRawMaterial>({
  businessId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: String,
  source: String,
  quantity: { type: Number, required: true },
  unit: String,
  cost: Number,
  supplier: String,
  supplierContact: String,
  purityLevel: Number,
  contaminants: [String],
  storageConditions: String,
  notes: String
}, { timestamps: true })

// Indexes
ProductSchema.index({ businessId: 1, plasticItemId: 1 })
ByProductSchema.index({ businessId: 1, code: 1 })
RawMaterialSchema.index({ businessId: 1, source: 1 })
```

**Deliverable:** 4 inventory models with validation and relationships

#### Task 1.1.4: Design Workflow & Process Models
```typescript
// server/src/domain/models/ApplicationWorkflow.ts

export interface IApplicationAssignment extends Document {
  applicantId: string
  assignedToGroup: 'LSO' | 'DISTRICT_OFFICER' | 'DPC' | 'LICENSE_ADMIN'
  assignedToUser?: string // specific user
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETURNED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  
  assignedDate: Date
  deadline: Date
  completedDate?: Date
  
  checklist?: {
    item: string
    completed: boolean
    completedBy?: string
    completedDate?: Date
  }[]
  
  comments: {
    author: string
    content: string
    timestamp: Date
  }[]
  
  attachments?: string[]
  
  createdAt: Date
  updatedAt: Date
}

export interface IInspectionReport extends Document {
  applicantId: string
  inspectionType: 'INITIAL' | 'FOLLOW_UP' | 'COMPLIANCE_CHECK' | 'LICENSE_RENEWAL'
  inspector: string // user ID
  
  inspectionDate: Date
  inspectionTime: string
  location: {
    address: string
    coordinates: {
      latitude: number
      longitude: number
    }
  }
  
  // Facilities inspected
  facilities: {
    name: string
    condition: 'GOOD' | 'ACCEPTABLE' | 'POOR'
    issues?: string[]
  }[]
  
  // Observations
  observations: {
    category: string // 'EQUIPMENT' | 'SAFETY' | 'ENVIRONMENTAL' etc
    finding: string
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL'
    recommendations?: string
  }[]
  
  // Photos/Evidence
  evidence: {
    title: string
    url: string
    uploadDate: Date
    metadata?: any
  }[]
  
  // Conclusion
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT'
  compliancePercentage?: number
  
  recommendations: string
  nextInspectionDueDate?: Date
  
  statusBeforeInspection: string
  proposedStatusAfterInspection: string
  
  signedBy?: string
  signatureDate?: Date
  
  createdAt: Date
  updatedAt: Date
}

export interface IApplicantAlert extends Document {
  applicantId: string
  alertType: 'DOCUMENT_EXPIRING' | 'DEADLINE' | 'STATUS_CHANGE' | 'VERIFICATION' | 'PAYMENT_DUE' | 'INSPECTION_DUE'
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  
  isRead: boolean
  readDate?: Date
  
  actionRequired: boolean
  actionType?: string // 'UPLOAD_DOCUMENT' | 'PAY_FEE' | etc
  actionUrl?: string
  
  expiresAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// Schemas
export const ApplicationAssignmentSchema = new Schema<IApplicationAssignment>({
  applicantId: { type: String, required: true, index: true },
  assignedToGroup: { type: String, required: true, index: true },
  assignedToUser: String,
  status: { type: String, enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED'], default: 'ASSIGNED', index: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  
  assignedDate: { type: Date, default: Date.now },
  deadline: Date,
  completedDate: Date,
  
  checklist: [{
    item: String,
    completed: Boolean,
    completedBy: String,
    completedDate: Date
  }],
  
  comments: [{
    author: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  attachments: [String]
}, { timestamps: true })

export const InspectionReportSchema = new Schema<IInspectionReport>({
  applicantId: { type: String, required: true, index: true },
  inspectionType: { type: String, required: true },
  inspector: { type: String, required: true },
  
  inspectionDate: Date,
  inspectionTime: String,
  location: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  facilities: [{
    name: String,
    condition: String,
    issues: [String]
  }],
  
  observations: [{
    category: String,
    finding: String,
    severity: String,
    recommendations: String
  }],
  
  evidence: [{
    title: String,
    url: String,
    uploadDate: Date,
    metadata: {}
  }],
  
  overallStatus: { type: String, required: true, index: true },
  compliancePercentage: Number,
  recommendations: String,
  nextInspectionDueDate: Date,
  
  statusBeforeInspection: String,
  proposedStatusAfterInspection: String,
  
  signedBy: String,
  signatureDate: Date
}, { timestamps: true })

export const ApplicantAlertSchema = new Schema<IApplicantAlert>({
  applicantId: { type: String, required: true, index: true },
  alertType: { type: String, required: true, index: true },
  title: String,
  message: String,
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  
  isRead: { type: Boolean, default: false, index: true },
  readDate: Date,
  
  actionRequired: Boolean,
  actionType: String,
  actionUrl: String,
  
  expiresAt: Date
}, { timestamps: true })

// Indexes
ApplicationAssignmentSchema.index({ applicantId: 1, status: 1 })
ApplicationAssignmentSchema.index({ assignedToGroup: 1, deadline: 1 })
InspectionReportSchema.index({ inspectionType: 1, inspectionDate: -1 })
ApplicantAlertSchema.index({ applicantId: 1, isRead: 1 })
ApplicantAlertSchema.index({ priority: 1, expiresAt: 1 })
```

**Deliverable:** 3 workflow management models with comprehensive validation

**Time Estimate:** 2 days  
**Owner:** Backend Lead  
**Deliverables:**
- [ ] 8 complete MongoDB schemas
- [ ] All indexes defined
- [ ] Validation rules documented
- [ ] Relationship diagram created

---

### Day 3-4: Repository Layer Implementation

#### Task 1.2.1: Create Document Repository
```typescript
// server/src/infrastructure/database/repositories/DocumentRepository.ts

import { ApplicantDocument, IApplicantDocument } from '@/domain/models'
import { CacheManager } from '@/infrastructure/cache'
import { QueryBuilder, PaginationOptions } from '@/shared/types'

export class DocumentRepository {
  constructor(private cache: CacheManager) {}

  // CREATE
  async create(data: Partial<IApplicantDocument>): Promise<IApplicantDocument> {
    const document = new ApplicantDocument(data)
    await document.save()
    
    // Invalidate applicant's document cache
    await this.invalidateApplicantCache(data.applicantId)
    
    return document.toObject()
  }

  async createMany(documents: Partial<IApplicantDocument>[]): Promise<IApplicantDocument[]> {
    const created = await ApplicantDocument.insertMany(documents)
    
    // Invalidate caches
    const applicantIds = [...new Set(documents.map(d => d.applicantId))]
    await Promise.all(applicantIds.map(id => this.invalidateApplicantCache(id)))
    
    return created.map(d => d.toObject())
  }

  // READ
  async findById(documentId: string): Promise<IApplicantDocument | null> {
    return ApplicantDocument.findById(documentId).lean().exec()
  }

  async findByApplicantId(
    applicantId: string,
    options?: { documentType?: string }
  ): Promise<IApplicantDocument[]> {
    const cacheKey = `documents:${applicantId}:${options?.documentType || 'all'}`
    
    // Try cache first
    const cached = await this.cache.get<IApplicantDocument[]>(cacheKey)
    if (cached) return cached
    
    // Query database
    const query = ApplicantDocument.find({ applicantId })
    if (options?.documentType) {
      query.where('documentType').equals(options.documentType)
    }
    
    const documents = await query.lean().exec()
    
    // Cache for 1 hour
    await this.cache.set(cacheKey, documents, { ttl: 3600 })
    
    return documents
  }

  async findPaginated(
    filter: any,
    options: PaginationOptions
  ): Promise<{ documents: IApplicantDocument[], total: number, pages: number }> {
    const skip = (options.page - 1) * options.limit
    
    const [documents, total] = await Promise.all([
      ApplicantDocument.find(filter)
        .sort(options.sort || { uploadDate: -1 })
        .skip(skip)
        .limit(options.limit)
        .lean()
        .exec(),
      ApplicantDocument.countDocuments(filter)
    ])
    
    return {
      documents,
      total,
      pages: Math.ceil(total / options.limit)
    }
  }

  async findPendingVerification(): Promise<IApplicantDocument[]> {
    return ApplicantDocument.find({ status: 'PENDING' })
      .sort({ uploadDate: -1 })
      .lean()
      .exec()
  }

  async findExpiringSoon(days: number = 30): Promise<IApplicantDocument[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    return ApplicantDocument.find({
      expiryDate: { $lte: futureDate, $gte: new Date() }
    }).lean().exec()
  }

  // UPDATE
  async updateById(
    documentId: string,
    updates: Partial<IApplicantDocument>
  ): Promise<IApplicantDocument | null> {
    const document = await ApplicantDocument.findByIdAndUpdate(
      documentId,
      updates,
      { new: true, runValidators: true }
    ).lean().exec()
    
    if (document) {
      await this.invalidateApplicantCache(document.applicantId)
    }
    
    return document
  }

  async verify(
    documentId: string,
    verifiedBy: string,
    rejectionReason?: string
  ): Promise<IApplicantDocument | null> {
    const status = rejectionReason ? 'REJECTED' : 'VERIFIED'
    
    const updateData: any = {
      status,
      verifiedBy,
      verificationDate: new Date(),
      ...(rejectionReason && { rejectionReason })
    }
    
    return this.updateById(documentId, updateData)
  }

  async updateStatus(
    documentId: string,
    status: string
  ): Promise<IApplicantDocument | null> {
    return this.updateById(documentId, { status })
  }

  // DELETE
  async deleteById(documentId: string): Promise<boolean> {
    const result = await ApplicantDocument.findByIdAndDelete(documentId).exec()
    
    if (result) {
      await this.invalidateApplicantCache(result.applicantId)
    }
    
    return !!result
  }

  async deleteByApplicant(applicantId: string): Promise<number> {
    const result = await ApplicantDocument.deleteMany({ applicantId }).exec()
    await this.invalidateApplicantCache(applicantId)
    return result.deletedCount || 0
  }

  // ANALYTICS
  async getStatistics(applicantId: string) {
    const [total, byType, byStatus, pending] = await Promise.all([
      ApplicantDocument.countDocuments({ applicantId }),
      ApplicantDocument.aggregate([
        { $match: { applicantId } },
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ]),
      ApplicantDocument.aggregate([
        { $match: { applicantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ApplicantDocument.countDocuments({ applicantId, status: 'PENDING' })
    ])
    
    return {
      total,
      byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      pendingVerification: pending
    }
  }

  async getSystemStatistics() {
    return ApplicantDocument.aggregate([
      {
        $facet: {
          totalDocuments: [{ $count: 'count' }],
          byType: [{ $group: { _id: '$documentType', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          pendingVerification: [
            { $match: { status: 'PENDING' } },
            { $count: 'count' }
          ],
          totalSize: [
            { $group: { _id: null, total: { $sum: '$fileSize' } } }
          ],
          expiringSoon: [
            { $match: { expiryDate: { $exists: true } } },
            { $count: 'count' }
          ]
        }
      }
    ])
  }

  // CACHE MANAGEMENT
  private async invalidateApplicantCache(applicantId: string) {
    const patterns = [
      `documents:${applicantId}:*`,
      `applicant:${applicantId}:*`
    ]
    
    for (const pattern of patterns) {
      await this.cache.delPattern(pattern)
    }
  }
}

export default DocumentRepository
```

**Deliverable:** Complete repository with CRUD, pagination, filtering, and analytics

#### Task 1.2.2: Create Business & Inventory Repositories
```typescript
// server/src/infrastructure/database/repositories/index.ts

export { DocumentRepository }
export { BusinessProfileRepository }
export { PlasticItemRepository }
export { ProductRepository }
export { ByProductRepository }
export { RawMaterialRepository }
export { ApplicationAssignmentRepository }
export { InspectionReportRepository }
export { ApplicantAlertRepository }

// Factory
export class RepositoryFactory {
  constructor(private cache: CacheManager) {}

  createDocumentRepository() {
    return new DocumentRepository(this.cache)
  }

  createBusinessProfileRepository() {
    return new BusinessProfileRepository(this.cache)
  }

  // ... other repositories
}
```

**Time Estimate:** 2 days  
**Owner:** Backend Lead  
**Deliverables:**
- [ ] 8 complete repositories
- [ ] Transaction support implemented
- [ ] Error handling standardized
- [ ] Cache invalidation patterns defined

---

### Day 5: Service Layer Implementation

#### Task 1.3.1: Create Core Services

```typescript
// server/src/application/services/DocumentService.ts

import { DocumentRepository } from '@/infrastructure/database/repositories'
import { StorageService } from '@/infrastructure/storage'
import { MetricsCollector } from '@/infrastructure/monitoring'
import { RateLimiter } from '@/infrastructure/resilience'
import { Logger } from '@/shared/utils'

export class DocumentService {
  constructor(
    private documentRepo: DocumentRepository,
    private storage: StorageService,
    private metrics: MetricsCollector,
    private rateLimiter: RateLimiter,
    private logger: Logger
  ) {}

  async uploadDocument(
    applicantId: string,
    file: Express.Multer.File,
    documentType: string,
    metadata?: any
  ) {
    const startTime = Date.now()
    
    try {
      // Rate limit check (10 uploads per hour per applicant)
      await this.rateLimiter.checkLimit(
        `document_upload:${applicantId}`,
        10,
        3600
      )

      // Validate file
      this.validateFile(file)

      // Upload to storage
      const fileUrl = await this.storage.upload({
        file,
        path: `documents/${applicantId}/${Date.now()}`,
        metadata
      })

      // Save to database
      const document = await this.documentRepo.create({
        applicantId,
        documentType,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        metadata: {
          uploadedFrom: 'web',
          ...metadata
        }
      })

      // Track metrics
      this.metrics.track('document_uploaded', {
        documentType,
        fileSize: file.size,
        applicantId
      })

      this.logger.info(`Document uploaded: ${document._id}`)

      return {
        success: true,
        documentId: document._id,
        url: fileUrl,
        size: file.size
      }
    } catch (error) {
      this.logger.error(`Document upload failed: ${error.message}`)
      throw error
    } finally {
      const duration = Date.now() - startTime
      this.metrics.trackLatency('document_upload', duration)
    }
  }

  async getDocuments(applicantId: string) {
    return this.documentRepo.findByApplicantId(applicantId)
  }

  async verifyDocument(
    documentId: string,
    verifiedBy: string,
    rejected: boolean = false,
    reason?: string
  ) {
    const document = await this.documentRepo.verify(
      documentId,
      verifiedBy,
      rejected ? reason : undefined
    )

    if (!document) {
      throw new Error('Document not found')
    }

    // Metrics
    this.metrics.track('document_verified', {
      status: rejected ? 'rejected' : 'approved',
      documentType: document.documentType
    })

    return document
  }

  async deleteDocument(applicantId: string, documentId: string) {
    const document = await this.documentRepo.findById(documentId)
    
    if (!document) {
      throw new Error('Document not found')
    }

    if (document.applicantId !== applicantId) {
      throw new Error('Unauthorized')
    }

    // Delete from storage
    await this.storage.delete(document.fileUrl)

    // Delete from database
    await this.documentRepo.deleteById(documentId)

    this.metrics.track('document_deleted', {
      documentType: document.documentType,
      fileSize: document.fileSize
    })
  }

  private validateFile(file: Express.Multer.File) {
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 10MB limit')
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error('Invalid file type')
    }
  }
}
```

**Deliverable:** Business logic layer with error handling and metrics

**Time Estimate:** 1 day  
**Owner:** Backend Lead  
**Deliverables:**
- [ ] DocumentService complete
- [ ] BusinessProfileService complete
- [ ] ValidationService complete
- [ ] Unit tests written (50%+)

---

## Week 2: API Endpoints & Frontend Integration

### Day 1-2: REST API Controllers

#### Task 1.4.1: Create Document API Endpoints

```typescript
// server/src/interfaces/rest/controllers/DocumentController.ts

import { Router, Request, Response } from 'express'
import { DocumentService } from '@/application/services'
import { authenticate, authorize } from '@/shared/middleware'
import { validate } from '@/shared/validation'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/documents - Upload document
router.post(
  '/',
  authenticate,
  authorize(['APPLICANT', 'ADMIN', 'LSO', 'DISTRICT_OFFICER']),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { applicantId, documentType } = req.body
      const { file } = req

      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      const result = await documentService.uploadDocument(
        applicantId,
        file,
        documentType,
        { uploadedBy: req.user?.id, ipAddress: req.ip }
      )

      res.status(201).json(result)
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  }
)

// GET /api/documents/:applicantId - List documents
router.get(
  '/:applicantId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { applicantId } = req.params
      const { documentType, status } = req.query

      // Authorization check
      if (req.user?.id !== applicantId && !req.user?.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const documents = await documentService.getDocuments(applicantId)
      
      let filtered = documents
      if (documentType) {
        filtered = filtered.filter(d => d.documentType === documentType)
      }
      if (status) {
        filtered = filtered.filter(d => d.status === status)
      }

      res.json({ success: true, data: filtered })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// GET /api/documents/:applicantId/:documentId - Get single document
router.get(
  '/:applicantId/:documentId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { applicantId, documentId } = req.params

      const document = await documentService.getDocument(documentId)
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' })
      }

      if (document.applicantId !== applicantId) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      res.json({ success: true, data: document })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// DELETE /api/documents/:applicantId/:documentId - Delete document
router.delete(
  '/:applicantId/:documentId',
  authenticate,
  authorize(['APPLICANT', 'ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { applicantId, documentId } = req.params

      await documentService.deleteDocument(applicantId, documentId)

      res.json({ success: true, message: 'Document deleted' })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  }
)

// PUT /api/documents/:documentId/verify - Verify document
router.put(
  '/:documentId/verify',
  authenticate,
  authorize(['ADMIN', 'LSO', 'DISTRICT_OFFICER']),
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params
      const { rejected, reason } = req.body

      const result = await documentService.verifyDocument(
        documentId,
        req.user?.id,
        rejected,
        reason
      )

      res.json({ success: true, data: result })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  }
)

// GET /api/documents/stats/:applicantId - Document statistics
router.get(
  '/stats/:applicantId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { applicantId } = req.params
      const stats = await documentService.getStatistics(applicantId)
      res.json({ success: true, data: stats })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

export default router
```

**Deliverable:** Complete REST API with authentication, validation, and error handling

#### Task 1.4.2: Create Business Profile API

```typescript
// server/src/interfaces/rest/controllers/BusinessController.ts

// Similar structure with endpoints:
// POST /api/business-profiles - Create
// GET /api/business-profiles/:id - Get
// PUT /api/business-profiles/:id - Update
// DELETE /api/business-profiles/:id - Delete
// GET /api/business-profiles - List with filtering
// POST /api/business-profiles/:id/verify - Verify
// GET /api/business-profiles/stats - Statistics
```

**Deliverable:** 7 complete REST controllers (Document, Business, Product, ByProduct, RawMaterial, Assignment, Inspection)

**Time Estimate:** 2 days  
**Owner:** Backend Developer  
**Deliverables:**
- [ ] 7 REST controllers (50+ endpoints)
- [ ] Request validation schemas
- [ ] Error handling standardized
- [ ] API documentation updated
- [ ] Postman collection created

---

### Day 3-5: Frontend Integration & Components

#### Task 1.5.1: Create Document Upload Component

```typescript
// client/src/components/DocumentUpload.tsx

import React, { useCallback, useState, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { useApi } from '@/api/hooks'
import axios from 'axios'
import { useQueryClient } from 'react-query'

interface DocumentUploadProps {
  applicantId: string
  documentType: 'CNIC' | 'BUSINESS_REGISTRATION' | 'TAX_CERTIFICATE' | 'UTILITY_BILL'
  label: string
  required?: boolean
  expiryRequired?: boolean
  onUploadComplete?: (documentId: string) => void
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  applicantId,
  documentType,
  label,
  required = false,
  expiryRequired = false,
  onUploadComplete
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [progress, setProgress] = useState(0)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF, JPG, and PNG files are allowed')
      }

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicantId', applicantId)
      formData.append('documentType', documentType)

      const response = await axios.post(
        '/api/documents',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            )
            setProgress(percentCompleted)
          }
        }
      )

      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        onUploadComplete?.(response.data.documentId)

        // Invalidate cache
        queryClient.invalidateQueries(['documents', applicantId])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [applicantId, documentType, onUploadComplete, queryClient])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          dropZoneRef.current?.classList.add('border-blue-500', 'bg-blue-50')
        }}
        onDragLeave={() => {
          dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50')
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed border-gray-300 rounded-lg p-8
          text-center cursor-pointer transition-colors
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          disabled={loading}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
        />

        {loading ? (
          <div className="space-y-3">
            <div className="text-gray-600">Uploading... {progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-12-8l-4-4m0 0l-4 4m4-4v16" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop your file here, or click to select
            </p>
            <p className="text-xs text-gray-500">PDF, JPG or PNG (Max 10MB)</p>
          </>
        )}
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          ✓ Document uploaded successfully
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          ✗ {error}
        </div>
      )}
    </div>
  )
}
```

**Deliverable:** Reusable document upload component with drag-drop, validation, and progress

#### Task 1.5.2: Create Document List Component

```typescript
// client/src/components/DocumentList.tsx

import React from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { formatDate, formatBytes } from '@/utils'

interface DocumentListProps {
  applicantId: string
  editable?: boolean
  onStatusChange?: (documentId: string, status: string) => void
}

export const DocumentList: React.FC<DocumentListProps> = ({
  applicantId,
  editable = false,
  onStatusChange
}) => {
  const queryClient = useQueryClient()

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery(
    ['documents', applicantId],
    () => axios.get(`/api/documents/${applicantId}`).then(r => r.data.data),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  )

  // Delete mutation
  const deleteMutation = useMutation(
    (documentId: string) =>
      axios.delete(`/api/documents/${applicantId}/${documentId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['documents', applicantId])
      }
    }
  )

  // Verify mutation
  const verifyMutation = useMutation(
    ({ documentId, rejected, reason }: any) =>
      axios.put(`/api/documents/${documentId}/verify`, { rejected, reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['documents', applicantId])
        onStatusChange?.('', '')
      }
    }
  )

  if (isLoading) return <div>Loading documents...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Documents</h3>

      {documents.length === 0 ? (
        <p className="text-gray-500">No documents uploaded</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div
              key={doc._id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{doc.fileName}</p>
                <div className="text-sm text-gray-500">
                  <span>{doc.documentType}</span>
                  <span className="mx-2">•</span>
                  <span>{formatBytes(doc.fileSize)}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(doc.uploadDate)}</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    doc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                    doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  View
                </a>

                {editable && (
                  <>
                    <button
                      onClick={() => deleteMutation.mutate(doc._id)}
                      disabled={deleteMutation.isLoading}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>

                    {doc.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => verifyMutation.mutate({
                            documentId: doc._id,
                            rejected: false
                          })}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection:')
                            if (reason) {
                              verifyMutation.mutate({
                                documentId: doc._id,
                                rejected: true,
                                reason
                              })
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Deliverable:** Document management UI with list, upload, delete, and verification

**Time Estimate:** 2 days  
**Owner:** Frontend Developer  
**Deliverables:**
- [ ] DocumentUpload component
- [ ] DocumentList component
- [ ] DocumentDetail component (view/download)
- [ ] Integrated with ApplicantForm
- [ ] Responsive design verified
- [ ] Accessibility (a11y) checked

---

## Summary: Phase 1 (Weeks 1-2)

**Team Effort:** 4 developer-weeks  
**Code Added:** ~3,000 lines  
**Tests Written:** ~500 lines  

**Deliverables:**
- ✅ 8 MongoDB schemas (Document, BusinessProfile, PlasticItem, Product, ByProduct, RawMaterial, Assignment, Inspection, Alert)
- ✅ 8 Repository classes with CRUD, filtering, and analytics
- ✅ 4 Service classes with business logic
- ✅ 7 REST API controllers (50+ endpoints)
- ✅ 2-3 React components for file upload and management
- ✅ Integration tests (50%+)

**Quality Metrics:**
- Code coverage: 50%+
- API documentation: 100%
- Component documentation: 100%

---

# PHASE 2: WORKFLOW & PAYMENTS
**Duration:** Weeks 3-4  
**Focus:** Application workflow, payment integration, PDF generation  
**Output:** Complete workflow pipeline + payment system

## Week 3: Application Workflow Implementation

### Day 1-2: Assignment & Approval Workflow

#### Task 2.1: ApplicationAssignmentService

```typescript
// server/src/application/services/ApplicationAssignmentService.ts

export class ApplicationAssignmentService {
  constructor(
    private assignmentRepo: ApplicationAssignmentRepository,
    private applicantRepo: ApplicantDetailRepository,
    private notificationService: NotificationService
  ) {}

  // Create assignment
  async assignApplication(
    applicantId: string,
    toGroup: string,
    priority: string = 'MEDIUM',
    deadline: Date
  ): Promise<IApplicationAssignment> {
    // Check if application exists
    const applicant = await this.applicantRepo.findById(applicantId)
    if (!applicant) {
      throw new Error('Applicant not found')
    }

    // Create assignment
    const assignment = await this.assignmentRepo.create({
      applicantId,
      assignedToGroup: toGroup,
      status: 'ASSIGNED',
      priority,
      assignedDate: new Date(),
      deadline
    })

    // Send notification
    await this.notificationService.sendAssignmentNotification(
      applicantId,
      assignment._id,
      toGroup
    )

    return assignment
  }

  // Complete assignment
  async completeAssignment(
    assignmentId: string,
    completedBy: string,
    comments?: string
  ): Promise<IApplicationAssignment> {
    const assignment = await this.assignmentRepo.updateById(assignmentId, {
      status: 'COMPLETED',
      completedDate: new Date(),
      ...(comments && {
        comments: [{
          author: completedBy,
          content: comments,
          timestamp: new Date()
        }]
      })
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    return assignment
  }

  // Reassign
  async reassignApplication(
    assignmentId: string,
    toGroup: string,
    reason: string
  ): Promise<IApplicationAssignment> {
    const assignment = await this.assignmentRepo.updateById(assignmentId, {
      assignedToGroup: toGroup,
      status: 'ASSIGNED',
      comments: [{
        author: 'SYSTEM',
        content: `Reassigned: ${reason}`,
        timestamp: new Date()
      }]
    })

    return assignment!
  }

  // Get workflow status
  async getWorkflowStatus(applicantId: string): Promise<any> {
    const assignments = await this.assignmentRepo.findByApplicant(applicantId)
    const applicant = await this.applicantRepo.findById(applicantId)

    return {
      applicantId,
      currentStatus: applicant?.application_status,
      assignments,
      completionPercentage: this.calculateCompletion(assignments),
      overallHealth: this.calculateHealth(applicant, assignments)
    }
  }

  private calculateCompletion(assignments: any[]): number {
    if (assignments.length === 0) return 0
    const completed = assignments.filter(a => a.status === 'COMPLETED').length
    return Math.round((completed / assignments.length) * 100)
  }

  private calculateHealth(applicant: any, assignments: any[]): string {
    const pendingCount = assignments.filter(a => a.status === 'ASSIGNED').length
    const overdeCount = assignments.filter(a => new Date(a.deadline) < new Date()).length

    if (overdeCount > 0) return 'CRITICAL'
    if (pendingCount > 3) return 'WARNING'
    return 'OK'
  }
}
```

**Deliverable:** Complete workflow orchestration service

### Day 3-4: Inspection Workflow

```typescript
// server/src/application/services/InspectionService.ts

export class InspectionService {
  constructor(
    private inspectionRepo: InspectionReportRepository,
    private documentRepo: DocumentRepository,
    private notificationService: NotificationService,
    private storage: StorageService
  ) {}

  async createInspection(
    applicantId: string,
    inspectionData: Partial<IInspectionReport>
  ): Promise<IInspectionReport> {
    const report = await this.inspectionRepo.create({
      ...inspectionData,
      applicantId,
      inspectionDate: new Date()
    })

    // Send notification to applicant
    await this.notificationService.sendInspectionNotification(
      applicantId,
      report._id
    )

    return report
  }

  async addPhotos(
    inspectionId: string,
    files: Express.Multer.File[]
  ): Promise<string[]> {
    const urls: string[] = []

    for (const file of files) {
      const url = await this.storage.upload({
        file,
        path: `inspections/${inspectionId}`
      })
      urls.push(url)
    }

    // Save evidence to inspection report
    const inspection = await this.inspectionRepo.findById(inspectionId)
    if (inspection) {
      const evidence = urls.map(url => ({
        title: 'Inspection Photo',
        url,
        uploadDate: new Date()
      }))

      await this.inspectionRepo.updateById(inspectionId, {
        evidence: [...(inspection.evidence || []), ...evidence]
      })
    }

    return urls
  }

  async completeInspection(
    inspectionId: string,
    overallStatus: string,
    recommendations: string
  ): Promise<IInspectionReport> {
    const inspection = await this.inspectionRepo.updateById(inspectionId, {
      overallStatus,
      recommendations,
      compliancePercentage: this.calculateCompliance(
        inspection?.observations || []
      )
    })

    // Update applicant status if inspection passed
    if (overallStatus === 'COMPLIANT') {
      // Trigger next workflow step
      await this.notificationService.sendInspectionResultNotification(
        inspection!.applicantId,
        overallStatus
      )
    }

    return inspection!
  }

  private calculateCompliance(observations: any[]): number {
    if (observations.length === 0) return 100

    const criticalItems = observations.filter(o => o.severity === 'CRITICAL').length
    const majorItems = observations.filter(o => o.severity === 'MAJOR').length

    const complianceScore = Math.max(0, 100 - (criticalItems * 20 + majorItems * 10))
    return complianceScore
  }
}
```

**Deliverable:** Complete inspection workflow service with photo upload

### Day 5: REST API for Workflows

```typescript
// Routes
POST /api/assignments - Create assignment
PUT /api/assignments/:id - Update assignment
GET /api/assignments/:applicantId - Get applicant's assignments
POST /api/assignments/:id/complete - Complete assignment

POST /api/inspections - Create inspection
POST /api/inspections/:id/photos - Upload photos
PUT /api/inspections/:id/complete - Complete inspection
GET /api/inspections/:applicantId - Get inspections
```

**Deliverable:** 8 workflow API endpoints

---

## Week 4: Payment Integration & PDF Generation

### Day 1-2: Payment Integration (PITB/PLMIS)

```typescript
// server/src/application/services/PaymentService.ts

export class PaymentService {
  constructor(
    private pitbClient: PITBClient,
    private paymentRepo: PaymentRepository,
    private applicantRepo: ApplicantDetailRepository,
    private notificationService: NotificationService
  ) {}

  // Generate PSID (Pakistan Single Invoice Deposit)
  async generatePSID(
    applicantId: string,
    amount: number,
    feeType: string
  ): Promise<{ psid: string; qrCode: string; bankDetails: any }> {
    // Get applicant details
    const applicant = await this.applicantRepo.findById(applicantId)
    if (!applicant) {
      throw new Error('Applicant not found')
    }

    // Call PITB API to generate PSID
    const psidResponse = await this.pitbClient.generatePSID({
      cnic: applicant.cnic,
      amount,
      feeType,
      applicantName: `${applicant.first_name} ${applicant.last_name}`,
      email: applicant.email,
      mobile: applicant.mobile_no
    })

    // Save payment record
    const paymentRecord = await this.paymentRepo.create({
      applicantId,
      psidNumber: psidResponse.psid,
      amount,
      feeType,
      status: 'PSID_GENERATED',
      generatedDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    })

    // Send notification
    await this.notificationService.sendPaymentNotification(
      applicantId,
      paymentRecord._id,
      'PSID_GENERATED',
      {
        psid: psidResponse.psid,
        amount,
        bankDetails: psidResponse.bankDetails
      }
    )

    return {
      psid: psidResponse.psid,
      qrCode: psidResponse.qrCode,
      bankDetails: psidResponse.bankDetails
    }
  }

  // Check payment status
  async checkPaymentStatus(psidNumber: string): Promise<{ status: string; transactionId?: string }> {
    const pitbStatus = await this.pitbClient.checkPSIDStatus(psidNumber)
    
    if (pitbStatus.paid) {
      // Update payment record
      const paymentRecord = await this.paymentRepo.findByPSID(psidNumber)
      if (paymentRecord) {
        await this.paymentRepo.updateById(paymentRecord._id, {
          status: 'PAID',
          transactionId: pitbStatus.transactionId,
          paidDate: new Date()
        })

        // Trigger post-payment workflow
        await this.notificationService.sendPaymentConfirmation(
          paymentRecord.applicantId
        )
      }
    }

    return {
      status: pitbStatus.paid ? 'PAID' : 'PENDING',
      transactionId: pitbStatus.transactionId
    }
  }

  // Handle payment webhook
  async handlePaymentWebhook(webhookData: any): Promise<void> {
    const { psid, transactionId, amount, status } = webhookData

    // Find payment record
    const paymentRecord = await this.paymentRepo.findByPSID(psid)
    if (!paymentRecord) {
      console.error(`Payment record not found for PSID: ${psid}`)
      return
    }

    // Update payment status
    if (status === 'SUCCESS') {
      await this.paymentRepo.updateById(paymentRecord._id, {
        status: 'PAID',
        transactionId,
        paidDate: new Date()
      })

      // Mark application as payment received
      const applicant = await this.applicantRepo.findById(paymentRecord.applicantId)
      if (applicant) {
        // Possibly trigger next workflow step
        await this.notificationService.sendPaymentConfirmation(paymentRecord.applicantId)
      }
    }
  }
}
```

**Deliverable:** Complete PITB/PLMIS integration service

### Day 3-4: PDF Generation

```typescript
// server/src/application/services/PDFService.ts

import PDFDocument from 'pdfkit'
import { PassThrough } from 'stream'

export class PDFService {
  constructor(
    private applicantRepo: ApplicantDetailRepository,
    private businessRepo: BusinessProfileRepository,
    private documentRepo: DocumentRepository,
    private storage: StorageService
  ) {}

  // Generate Receipt PDF
  async generateReceiptPDF(paymentId: string): Promise<Buffer> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) throw new Error('Payment not found')

    const applicant = await this.applicantRepo.findById(payment.applicantId)
    if (!applicant) throw new Error('Applicant not found')

    const doc = new PDFDocument()
    const buffers: Buffer[] = []

    doc.on('data', chunk => buffers.push(chunk))
    doc.on('end', () => {})

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', { align: 'center' })
      .moveDown()

    // Receipt details
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Receipt Number: ${payment._id}`, { underline: true })
      .text(`Date: ${new Date().toLocaleDateString()}`)
      .text(`PSID: ${payment.psidNumber}`)
      .moveDown()

    // Applicant details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Applicant Information', { underline: true })
      .moveDown()

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Name: ${applicant.first_name} ${applicant.last_name}`)
      .text(`CNIC: ${applicant.cnic}`)
      .text(`Email: ${applicant.email}`)
      .text(`Mobile: ${applicant.mobile_no}`)
      .moveDown()

    // Payment details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Payment Details', { underline: true })
      .moveDown()

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Fee Type: ${payment.feeType}`)
      .text(`Amount: PKR ${payment.amount}`)
      .text(`Status: ${payment.status}`)
      .text(`Transaction ID: ${payment.transactionId || 'Pending'}`)
      .moveDown()

    // Footer
    doc
      .fontSize(9)
      .text('This is an electronically generated receipt. No signature required.', {
        align: 'center'
      })

    doc.end()

    return Buffer.concat(buffers)
  }

  // Generate License PDF
  async generateLicensePDF(applicantId: string): Promise<Buffer> {
    const applicant = await this.applicantRepo.findById(applicantId)
    const business = await this.businessRepo.findByApplicant(applicantId)

    if (!applicant || !business) {
      throw new Error('Data not found')
    }

    const doc = new PDFDocument()
    const buffers: Buffer[] = []

    doc.on('data', chunk => buffers.push(chunk))
    doc.on('end', () => {})

    // License header with styling
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('PLASTIC MANAGEMENT LICENSE', { align: 'center' })
      .moveDown(0.5)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Reference No: ${applicant.tracking_number}`, { align: 'center' })
      .text(`Date of Issue: ${new Date().toLocaleDateString()}`, { align: 'center' })
      .moveDown()

    // License details table
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('LICENSE HOLDER DETAILS')
      .moveDown(0.3)

    const detailsTable = [
      ['Name', `${applicant.first_name} ${applicant.last_name}`],
      ['CNIC', applicant.cnic],
      ['Business Name', business.businessName],
      ['Business Type', business.businessType],
      ['Registration No', business.registrationNumber],
      ['Facility Address', business.facilityLocation.address]
    ]

    this.drawTable(doc, detailsTable)

    // Conditions
    doc
      .moveDown()
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TERMS & CONDITIONS')
      .moveDown(0.3)
      .fontSize(9)
      .font('Helvetica')
      .text('1. Licensee must maintain environmental compliance standards.', { width: 500 })
      .text('2. License is valid for 2 years from date of issue.', { width: 500 })
      .text('3. Renewal must be applied 30 days before expiry.', { width: 500 })

    doc.end()

    return Buffer.concat(buffers)
  }

  // Generate Bank Chalan PDF (with QR code)
  async generateChalanPDF(paymentId: string, qrCodeUrl?: string): Promise<Buffer> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) throw new Error('Payment not found')

    // Similar structure with bank chalan format
    // Include QR code, PSID, bank account details
  }

  private drawTable(doc: any, data: string[][], startX = 50, startY = doc.y) {
    const cellHeight = 25
    const cellWidth = 250
    const rowHeight = cellHeight

    data.forEach((row, i) => {
      doc.rect(startX, startY + i * rowHeight, cellWidth, rowHeight).stroke()
      doc.rect(startX + cellWidth, startY + i * rowHeight, cellWidth, rowHeight).stroke()

      doc.fontSize(10)
      doc.text(row[0], startX + 5, startY + i * rowHeight + 5, { width: cellWidth - 10 })
      doc.text(row[1], startX + cellWidth + 5, startY + i * rowHeight + 5, { width: cellWidth - 10 })
    })
  }
}
```

**Deliverable:** Complete PDF generation service with multiple document types

### Day 5: Payment & PDF API Endpoints

```typescript
// Routes
POST /api/payments/generate-psid - Generate PSID
GET /api/payments/:psid/status - Check payment status
POST /api/payments/webhook/intimation - Payment webhook
GET /api/pdf/receipt/:paymentId - Download receipt
GET /api/pdf/license/:applicantId - Download license
GET /api/pdf/chalan/:paymentId - Download bank chalan
```

**Deliverable:** 6 payment/PDF API endpoints

---

## Summary: Phase 2 (Weeks 3-4)

**Deliverables:**
- ✅ Application workflow orchestration
- ✅ Assignment & approval system
- ✅ Inspection workflow with photo upload
- ✅ PITB/PLMIS payment integration
- ✅ Webhook handler for payment notifications
- ✅ PDF generation (receipt, license, chalan)
- ✅ 14+ REST API endpoints
- ✅ Notification system integration

**Code Added:** ~2,500 lines  
**Tests:** ~400 lines  

---

# PHASE 3: LOCATION & ANALYTICS
**Duration:** Weeks 5-6  
**Focus:** GIS/location features, analytics dashboards  
**Output:** Location mapping, MIS dashboards

## Week 5: Location Picker & GIS Integration

### Task 3.1: Location/GIS Service

```typescript
// server/src/application/services/LocationService.ts

export class LocationService {
  constructor(
    private locationRepo: LocationRepository,
    private districtRepo: DistrictRepository,
    private geospatialService: GeospatialService
  ) {}

  // Save location for applicant
  async saveApplicantLocation(
    applicantId: string,
    latitude: number,
    longitude: number,
    address: string
  ): Promise<IApplicantLocation> {
    // Validate coordinates
    this.validateCoordinates(latitude, longitude)

    // Find district from coordinates
    const district = await this.geospatialService.getDistrictFromCoordinates(
      latitude,
      longitude
    )

    const location = await this.locationRepo.create({
      applicantId,
      latitude,
      longitude,
      address,
      districtId: district?._id,
      geom: { type: 'Point', coordinates: [longitude, latitude] }
    })

    return location
  }

  // Search nearby businesses
  async findNearbyBusinesses(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    businessType?: string
  ): Promise<any[]> {
    return this.geospatialService.findNearby({
      point: { latitude, longitude },
      radiusKm,
      model: BusinessProfile,
      ...(businessType && { filter: { businessType } })
    })
  }

  // Get district statistics
  async getDistrictStatistics(districtId: string): Promise<any> {
    const [businessCount, applicantCount, stats] = await Promise.all([
      this.businessRepo.countByDistrict(districtId),
      this.applicantRepo.countByDistrict(districtId),
      this.geospatialService.getDistrictStats(districtId)
    ])

    return {
      districtId,
      businessCount,
      applicantCount,
      plasticStats: stats
    }
  }

  private validateCoordinates(lat: number, lon: number) {
    if (lat < -90 || lat > 90) throw new Error('Invalid latitude')
    if (lon < -180 || lon > 180) throw new Error('Invalid longitude')
  }
}
```

### Task 3.2: OpenLayers Location Picker Component

```typescript
// client/src/components/LocationPicker.tsx

import React, { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat, toLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { useFormContext } from 'react-hook-form'

interface LocationPickerProps {
  defaultLat?: number
  defaultLon?: number
  onLocationSelected?: (lat: number, lon: number, address: string) => void
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  defaultLat = 33.6844,
  defaultLon = 73.0479, // Default to Pakistan
  onLocationSelected
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number }>({
    lat: defaultLat,
    lon: defaultLon
  })
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (!mapContainer.current) return

    // Create map
    const vectorSource = new VectorSource()
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: '#FF0000' }),
          stroke: new Stroke({ color: '#FFF', width: 2 })
        })
      })
    })

    const map = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([coordinates.lon, coordinates.lat]),
        zoom: 12
      })
    })

    mapRef.current = map

    // Add marker for default location
    const marker = new Feature({
      geometry: new Point(fromLonLat([coordinates.lon, coordinates.lat]))
    })
    vectorSource.addFeature(marker)

    // Handle map click
    map.on('click', async (event) => {
      const clickedCoord = toLonLat(event.coordinate)
      const [lon, lat] = clickedCoord

      // Clear previous markers
      vectorSource.clear()

      // Add new marker
      const newMarker = new Feature({
        geometry: new Point(event.coordinate)
      })
      vectorSource.addFeature(newMarker)

      // Update coordinates
      setCoordinates({ lat, lon })

      // Reverse geocode to get address (optional)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        )
        const data = await response.json()
        setAddress(data.address?.city || data.address?.town || 'Location')
      } catch (error) {
        console.error('Geocoding error:', error)
      }

      onLocationSelected?.(lat, lon, address)
    })

    return () => {
      map.dispose()
    }
  }, [])

  return (
    <div className="space-y-4">
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg border border-gray-300"
      />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block font-medium text-gray-700">Latitude</label>
          <input
            type="number"
            value={coordinates.lat}
            onChange={(e) => setCoordinates({ ...coordinates, lat: parseFloat(e.target.value) })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.0001"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Longitude</label>
          <input
            type="number"
            value={coordinates.lon}
            onChange={(e) => setCoordinates({ ...coordinates, lon: parseFloat(e.target.value) })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.0001"
          />
        </div>
      </div>

      {address && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <strong>Address:</strong> {address}
        </div>
      )}
    </div>
  )
}
```

**Deliverable:** Interactive map component with location selection

---

## Week 6: Analytics & Reporting Dashboards

### Task 4.1: MIS Analytics Service

```typescript
// server/src/application/services/AnalyticsService.ts

export class AnalyticsService {
  constructor(
    private applicantRepo: ApplicantDetailRepository,
    private businessRepo: BusinessProfileRepository,
    private cache: CacheManager
  ) {}

  // Dashboard statistics
  async getDashboardStats(): Promise<any> {
    const cacheKey = 'dashboard:stats'
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached

    const [totalApplicants, byStatus, byType, recentApplications, pendingApprovals] = await Promise.all([
      this.applicantRepo.count(),
      this.applicantRepo.countByStatus(),
      this.businessRepo.countByType(),
      this.applicantRepo.getRecent(5),
      this.applicantRepo.countByStatus('Pending')
    ])

    const stats = {
      totalApplicants,
      byStatus,
      byType,
      recentApplications,
      pendingApprovals,
      generatedAt: new Date()
    }

    // Cache for 30 minutes
    await this.cache.set(cacheKey, stats, { ttl: 1800 })

    return stats
  }

  // District-level analytics
  async getDistrictAnalytics(districtId: string): Promise<any> {
    const [businesses, applicants, plasticStats, inspections] = await Promise.all([
      this.businessRepo.findByDistrict(districtId),
      this.applicantRepo.findByDistrict(districtId),
      this.getPlasticStats(districtId),
      this.getInspectionStats(districtId)
    ])

    return {
      district: districtId,
      businessCount: businesses.length,
      applicantCount: applicants.length,
      businessByType: this.groupByType(businesses),
      plasticStats,
      inspectionStats: inspections
    }
  }

  // Compliance analytics
  async getComplianceAnalytics(): Promise<any> {
    return this.applicantRepo.aggregate([
      {
        $facet: {
          compliant: [
            { $match: { applicationStatus: 'License Issued' } },
            { $count: 'count' }
          ],
          nonCompliant: [
            { $match: { applicationStatus: 'Rejected' } },
            { $count: 'count' }
          ],
          pending: [
            { $match: { applicationStatus: 'Under Review' } },
            { $count: 'count' }
          ]
        }
      }
    ])
  }

  private groupByType(businesses: any[]) {
    return businesses.reduce((acc, b) => {
      acc[b.businessType] = (acc[b.businessType] || 0) + 1
      return acc
    }, {})
  }
}
```

### Task 4.2: Analytics Dashboard Component

```typescript
// client/src/components/MISAnalyticsDashboard.tsx

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { LineChart, BarChart, PieChart, Card } from '@/components/charts'

export const MISAnalyticsDashboard: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

  // Fetch dashboard stats
  const { data: stats = {} } = useQuery(
    'dashboard-stats',
    () => axios.get('/api/analytics/dashboard').then(r => r.data.data)
  )

  // Fetch district analytics
  const { data: districtStats = {} } = useQuery(
    ['district-analytics', selectedDistrict],
    () => axios.get(`/api/analytics/district/${selectedDistrict}`).then(r => r.data.data),
    { enabled: !!selectedDistrict }
  )

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Applicants" value={stats.totalApplicants} />
        <Card title="Pending Approvals" value={stats.pendingApprovals} />
        <Card title="Licenses Issued" value={stats.byStatus?.['License Issued']} />
        <Card title="Compliance Rate" value={`${stats.complianceRate || 0}%`} />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Applications by Status</h3>
          <PieChart
            data={Object.entries(stats.byStatus || {}).map(([label, value]) => ({
              name: label,
              value
            }))}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Businesses by Type</h3>
          <BarChart
            data={Object.entries(stats.byType || {}).map(([name, count]) => ({
              name,
              count
            }))}
          />
        </div>
      </div>

      {/* District-level analytics */}
      {selectedDistrict && (
        <div>
          <h3 className="text-lg font-semibold mb-4">District Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="District Businesses" value={districtStats.businessCount} />
            <Card title="Applicants" value={districtStats.applicantCount} />
            <Card title="Inspections Done" value={districtStats.inspectionStats?.completed} />
          </div>
        </div>
      )}
    </div>
  )
}
```

**Deliverable:** Comprehensive analytics dashboard with charts and KPIs

---

## Summary: Phase 3 (Weeks 5-6)

**Deliverables:**
- ✅ Location service with GIS support
- ✅ OpenLayers map component
- ✅ Location-based queries
- ✅ Analytics service with caching
- ✅ MIS dashboards (KPI, district, compliance)
- ✅ 5+ analytics API endpoints
- ✅ Real-time statistics

**Code Added:** ~1,500 lines  
**Tests:** ~300 lines  

---

# PHASE 4: ROLE-BASED INTERFACES & ADVANCED FEATURES
**Duration:** Weeks 7-8  
**Focus:** Role-specific dashboards, advanced search, bulk operations

## Week 7: Role-Based Dashboards

### Task 5.1: Home Pages for Each Role

```typescript
// client/src/views/HomeAdmin.tsx - Admin Dashboard
// client/src/views/HomeDEO.tsx - Data Entry Officer Dashboard
// client/src/views/HomeDO.tsx - District Officer Dashboard
// client/src/views/HomeLicense.tsx - License Authority Dashboard
// client/src/views/HomeSuper.tsx - Super Admin Dashboard

// Each dashboard shows:
// - Role-specific KPIs
// - Pending tasks
// - Recent activities
// - Quick actions
// - Performance metrics
```

### Task 5.2: Advanced Search Component

```typescript
// client/src/components/AdvancedSearch.tsx

interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'between' | 'gt' | 'lt'
  value: any
}

export const AdvancedSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [results, setResults] = useState([])

  const handleSearch = useCallback(async () => {
    const query = buildQuery(filters)
    const response = await axios.get('/api/applicants', { params: query })
    setResults(response.data.data)
  }, [filters])

  // Complex filtering UI
  // Multi-field search
  // Save searches feature
  // Export results
}
```

**Deliverable:** Advanced search with complex filtering

---

## Week 8: Bulk Operations & Polish

### Task 6.1: Bulk Import/Export

```typescript
// client/src/components/BulkOperations.tsx

export const BulkOperations: React.FC = () => {
  // CSV import
  // Excel export
  // Batch status updates
  // Bulk document verification
  // Batch assignment creation
}
```

### Task 6.2: Testing & Performance Optimization

```
- Unit test coverage: 70%+
- Integration test coverage: 50%+
- E2E test coverage: 30%+
- Load testing results documented
- Performance baseline established
```

---

## Summary: Phase 4 (Weeks 7-8)

**Deliverables:**
- ✅ 6 role-specific dashboards
- ✅ Advanced search component
- ✅ Bulk import/export
- ✅ 70%+ test coverage
- ✅ Performance optimization

**Code Added:** ~1,000 lines  
**Tests:** ~600 lines  

---

# PHASES 5-7: ADVANCED FEATURES & POLISH
**Duration:** Weeks 9-14 (optional, for production-ready system)

## Week 9: Notifications & Alerts

- Push notifications (web/mobile)
- Email notifications
- SMS alerts
- In-app notification center

## Week 10: Audit Logging

- Complete audit trail
- Change history
- User activity tracking
- Export audit logs

## Week 11: Data Integrity & Cleanup

- Data validation tools
- Duplicate management
- Archive old records
- Data migration utilities

## Week 12: Accessibility & Internationalization

- WCAG 2.1 AA compliance
- Multi-language support (Urdu, English)
- RTL layout support
- Screen reader optimization

## Week 13: Performance Fine-tuning

- Database query optimization
- Caching strategy refinement
- Frontend bundle optimization
- API response time improvement

## Week 14: Production Hardening

- Security audit
- Load testing
- Disaster recovery planning
- Documentation completion

---

# 📊 COMPREHENSIVE TIMELINE

```
Week 1-2:   Foundation & Core Models
Week 3-4:   Workflow & Payments
Week 5-6:   Location & Analytics
Week 7-8:   Role-Based Interfaces
Week 9-10:  Advanced Features (Optional)
Week 11-12: Production Hardening (Optional)
Week 13-14: Final Polish & Deployment (Optional)
```

---

# 🎯 SUCCESS METRICS

| Metric | Target | Current |
|--------|--------|---------|
| **API Endpoints** | 50+ | 5 |
| **Data Models** | 20+ | 1 |
| **React Components** | 25+ | 5 |
| **Test Coverage** | 70% | 20% |
| **API Response Time** | <200ms P95 | TBD |
| **Frontend Bundle** | <500KB | 400KB ✅ |
| **Database Indexes** | 30+ | 18 ✅ |
| **Cache Hit Ratio** | >75% | Active ✅ |

---

# 📋 RESOURCE ALLOCATION

```
Backend Developer:   50% (14 weeks)
Frontend Developer:  40% (14 weeks)
Full Stack Dev:      30% (14 weeks) [Optional]
QA Engineer:         20% (14 weeks)
DevOps/PM:          10% (14 weeks)

Total: ~3-4 FTE for 14 weeks
```

---

# 🚀 NEXT STEPS

1. **Week 1 Monday:** Start database schema implementation
2. **Week 1 Wednesday:** Create repositories & services
3. **Week 2 Monday:** Implement REST API endpoints
4. **Week 2 Wednesday:** Build React components
5. **Weekly:** Demo to stakeholders every Friday
6. **Bi-weekly:** Sprint retrospective

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026  
**Status:** Ready for Implementation
