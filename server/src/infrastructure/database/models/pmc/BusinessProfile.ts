import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

/**
 * Business entity types
 */
export enum EntityType {
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
  COLLECTOR = 'COLLECTOR',
  RECYCLER = 'RECYCLER',
  INDIVIDUAL = 'INDIVIDUAL'
}

/**
 * Business registration types
 */
export enum RegistrationType {
  SOLE_PROPRIETOR = 'SOLE_PROPRIETOR',
  PARTNERSHIP = 'PARTNERSHIP',
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  PUBLIC_LIMITED = 'PUBLIC_LIMITED',
  NTN = 'NTN',
  STRN = 'STRN',
  SERAI = 'SERAI'
}

/**
 * Business size
 */
export enum BusinessSize {
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

/**
 * Business status
 */
export enum BusinessStatus {
  NEW = 'NEW',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE'
}

export interface BusinessProfileDocument extends Document {
  numericId: number
  applicantId: number | string
  applicantIdString?: string
  businessName: string
  entityType: EntityType | string
  businessSize?: BusinessSize | string
  trackingNumber?: string
  status: BusinessStatus | string
  
  // Owner info
  ownerName?: string
  ownerCNIC?: string
  ownerEmail?: string
  ownerMobile?: string
  
  // Contact info
  contactPerson?: {
    name?: string
    designation?: string
    phone?: string
    email?: string
    mobile?: string
  }
  email?: string
  mobileOperator?: string
  mobileNo?: string
  phoneNo?: string
  websiteAddress?: string
  
  // Location
  location?: {
    address?: string
    cityTown?: string
    village?: string
    postalCode?: string
    districtId?: number
    districtName?: string
    tehsilId?: number
    tehsilName?: string
    latitude?: number
    longitude?: number
  }
  
  // Operational details
  operationalDetails?: {
    operationalSince?: Date
    commencementDate?: Date
    workingDays?: number
    noOfWorkers?: number
    productionCapacity?: number
    consumptionCapacity?: number
    collectionArea?: string
    recyclingCapacity?: number
    facilitySize?: string
    environmentalCompliance?: {
      wasteManagementPlan?: boolean
      wasteManagementPlanUrl?: string
      efflunetTreatment?: boolean
      efflunetTreatmentUrl?: string
      pollutionControlCert?: string
    }
  }
  
  // Registration details
  registration?: {
    registrationType?: RegistrationType | string
    registrationNumber?: string
    registrationDate?: Date
    ntnNumber?: string
    strnNumber?: string
    seraiNumber?: string
    businessLicense?: string
    licenseExpiryDate?: Date
    certifications?: {
      name?: string
      issuedBy?: string
      issuedDate?: Date
      expiryDate?: Date
      certificateUrl?: string
    }[]
  }
  
  // Financial
  financialInfo?: {
    yearlyRevenue?: number
    bankName?: string
    accountHolder?: string
    accountNumber?: string
    ifscCode?: string
    bankBranch?: string
  }
  
  // Additional
  description?: string
  tags?: string[]
  remarks?: string
  isActive: boolean
  
  // Verification
  verifiedBy?: mongoose.Types.ObjectId
  verificationDate?: Date
  rejectionReason?: string
  
  // Legacy fields
  ntnStrnPraNoIndividual?: string
  ntnStrnPraNoCompany?: string
  businessRegistrationType?: string
  businessRegistrationNo?: string
  districtId?: number
  tehsilId?: number
  cityTownVillage?: string
  postalAddress?: string
  postalCode?: string
  locationLatitude?: number
  locationLongitude?: number
  workingDays?: number
  commencementDate?: Date
  noOfWorkers?: number
  
  name?: string // Legacy
  
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}

const BusinessProfileSchema = new Schema<BusinessProfileDocument>(
  {
    numericId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    applicantId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true
    },
    applicantIdString: {
      type: String,
      index: true,
      sparse: true
    },
    businessName: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      default: EntityType.INDIVIDUAL,
      index: true
    },
    businessSize: {
      type: String,
      enum: Object.values(BusinessSize),
      sparse: true
    },
    trackingNumber: String,
    status: {
      type: String,
      enum: Object.values(BusinessStatus),
      default: BusinessStatus.NEW,
      index: true
    },
    
    // Owner info
    ownerName: String,
    ownerCNIC: String,
    ownerEmail: String,
    ownerMobile: String,
    
    // Contact
    contactPerson: {
      name: String,
      designation: String,
      phone: String,
      email: String,
      mobile: String
    },
    email: String,
    mobileOperator: String,
    mobileNo: String,
    phoneNo: String,
    websiteAddress: String,
    
    // Location with GIS support
    location: {
      address: String,
      cityTown: String,
      village: String,
      postalCode: String,
      districtId: Number,
      districtName: String,
      tehsilId: Number,
      tehsilName: String,
      latitude: Number,
      longitude: Number
    },
    
    // Operational details
    operationalDetails: {
      operationalSince: Date,
      commencementDate: Date,
      workingDays: Number,
      noOfWorkers: Number,
      productionCapacity: Number,
      consumptionCapacity: Number,
      collectionArea: String,
      recyclingCapacity: Number,
      facilitySize: String,
      environmentalCompliance: {
        wasteManagementPlan: Boolean,
        wasteManagementPlanUrl: String,
        efflunetTreatment: Boolean,
        efflunetTreatmentUrl: String,
        pollutionControlCert: String
      }
    },
    
    // Registration details
    registration: {
      registrationType: {
        type: String,
        enum: Object.values(RegistrationType)
      },
      registrationNumber: String,
      registrationDate: Date,
      ntnNumber: String,
      strnNumber: String,
      seraiNumber: String,
      businessLicense: String,
      licenseExpiryDate: Date,
      certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        certificateUrl: String
      }]
    },
    
    // Financial
    financialInfo: {
      yearlyRevenue: Number,
      bankName: String,
      accountHolder: String,
      accountNumber: String,
      ifscCode: String,
      bankBranch: String
    },
    
    // Additional
    description: String,
    tags: [String],
    remarks: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    // Verification
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    verificationDate: Date,
    rejectionReason: String,
    
    // Legacy fields
    ntnStrnPraNoIndividual: String,
    ntnStrnPraNoCompany: String,
    businessRegistrationType: String,
    businessRegistrationNo: String,
    districtId: { type: Number, index: true },
    tehsilId: Number,
    cityTownVillage: String,
    postalAddress: String,
    postalCode: String,
    locationLatitude: Number,
    locationLongitude: Number,
    workingDays: Number,
    commencementDate: Date,
    noOfWorkers: Number,
    name: String,
    
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true, collection: 'businessprofiles' }
)

// Indexes for common queries
BusinessProfileSchema.index({ applicantId: 1, entityType: 1 })
BusinessProfileSchema.index({ applicantId: 1, status: 1 })
BusinessProfileSchema.index({ entityType: 1, status: 1 })
BusinessProfileSchema.index({ status: 1, createdAt: -1 })
BusinessProfileSchema.index({ 'location.latitude': 1, 'location.longitude': 1 }, { sparse: true })
BusinessProfileSchema.index({ 'location.districtId': 1 })
BusinessProfileSchema.index({ isActive: 1, status: 1 })
BusinessProfileSchema.index({ businessName: 'text', 'registration.ntnNumber': 'text' })

// Pre-save middleware
BusinessProfileSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('BusinessProfile')
  }
  return next()
})

// Virtual for checking if license is expiring soon (30 days)
BusinessProfileSchema.virtual('licenseExpiringWithin30Days').get(function (this: BusinessProfileDocument) {
  if (!this.registration?.licenseExpiryDate) return false
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  return (
    this.registration.licenseExpiryDate <= thirtyDaysFromNow &&
    this.registration.licenseExpiryDate > new Date()
  )
})

// Virtual for checking if license is expired
BusinessProfileSchema.virtual('licenseExpired').get(function (this: BusinessProfileDocument) {
  if (!this.registration?.licenseExpiryDate) return false
  return new Date() > this.registration.licenseExpiryDate
})

// Method to verify business
BusinessProfileSchema.methods.verify = function (
  this: BusinessProfileDocument,
  verifiedBy: mongoose.Types.ObjectId,
  rejected: boolean = false,
  reason?: string
) {
  this.status = rejected ? BusinessStatus.REJECTED : BusinessStatus.VERIFIED
  this.verifiedBy = verifiedBy
  this.verificationDate = new Date()
  if (rejected && reason) {
    this.rejectionReason = reason
  }
  return this.save()
}

// Method to activate business (after approval)
BusinessProfileSchema.methods.activate = function (this: BusinessProfileDocument) {
  this.status = BusinessStatus.ACTIVE
  this.isActive = true
  return this.save()
}

// Method to suspend business
BusinessProfileSchema.methods.suspend = function (this: BusinessProfileDocument, reason?: string) {
  this.status = BusinessStatus.SUSPENDED
  if (reason) this.remarks = reason
  return this.save()
}

export const BusinessProfileModel = mongoose.model<BusinessProfileDocument>(
  'BusinessProfile',
  BusinessProfileSchema,
  'businessprofiles'
)
