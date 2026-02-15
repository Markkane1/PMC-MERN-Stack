import type { Id, Timestamped } from '../types'

/**
 * Business entity types in the PMC system
 */
export enum EntityType {
  PRODUCER = 'PRODUCER',           // Plastic producers
  CONSUMER = 'CONSUMER',           // Plastic consumers/users
  COLLECTOR = 'COLLECTOR',         // Waste collectors
  RECYCLER = 'RECYCLER',           // Plastic recyclers
  INDIVIDUAL = 'INDIVIDUAL'        // Individual applicant
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
 * Business size classification
 */
export enum BusinessSize {
  MICRO = 'MICRO',         // < 10 employees
  SMALL = 'SMALL',         // 10-50 employees
  MEDIUM = 'MEDIUM',       // 50-250 employees
  LARGE = 'LARGE'          // > 250 employees
}

/**
 * Business status in approval workflow
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

/**
 * Contact person information
 */
export interface ContactPerson {
  name: string
  designation: string
  phone: string
  email: string
  mobile?: string
}

/**
 * Location information with coordinates
 */
export interface LocationInfo {
  address: string
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

/**
 * Facility/Operational details
 */
export interface OperationalDetails {
  operationalSince: Date
  commencementDate?: Date
  workingDays?: number
  noOfWorkers?: number
  productionCapacity?: number // for producers
  consumptionCapacity?: number // for consumers
  collectionArea?: string // for collectors
  recyclingCapacity?: number // for recyclers
  facilitySize?: string
  environmentalCompliance?: {
    wasteManagementPlan: boolean
    wasteManagementPlanUrl?: string
    efflunetTreatment: boolean
    efflunetTreatmentUrl?: string
    pollutionControlCert?: string
  }
}

/**
 * Registration and certification details
 */
export interface RegistrationDetails {
  registrationType: RegistrationType | string
  registrationNumber: string
  registrationDate?: Date
  ntnNumber?: string // National Tax Number
  strnNumber?: string // Sales Tax Registration Number
  seraiNumber?: string
  businessLicense?: string
  licenseExpiryDate?: Date
  certifications?: {
    name: string
    issuedBy: string
    issuedDate: Date
    expiryDate?: Date
    certificateUrl?: string
  }[]
}

/**
 * Financial information
 */
export interface FinancialInfo {
  yearlyRevenue?: number
  bankName?: string
  accountHolder?: string
  accountNumber?: string
  ifscCode?: string
  bankBranch?: string
}

/**
 * Core BusinessProfile entity
 */
export type BusinessProfile = Timestamped & {
  id?: Id
  numericId?: number
  applicantId: number | string
  applicantIdString?: string
  businessName: string
  entityType: EntityType | string
  businessSize: BusinessSize | string
  trackingNumber?: string
  status: BusinessStatus | string
  
  // Owner/Entity information
  ownerName?: string
  ownerCNIC?: string
  ownerEmail?: string
  ownerMobile?: string
  
  // Contact
  contactPerson?: ContactPerson
  email?: string
  mobileOperator?: string
  mobileNo?: string
  phoneNo?: string
  websiteAddress?: string
  
  // Location
  location?: LocationInfo
  
  // Operations
  operationalDetails?: OperationalDetails
  
  // Registration
  registration?: RegistrationDetails
  
  // Financial
  financialInfo?: FinancialInfo
  
  // Additional
  description?: string
  tags?: string[]
  remarks?: string
  isActive: boolean
  
  // Verification
  verifiedBy?: Id
  verificationDate?: Date
  rejectionReason?: string
  
  // Legacy fields (for backward compatibility)
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
  
  createdBy?: Id
  updatedBy?: Id
}

/**
 * Business profile filter options
 */
export interface BusinessFilterOptions {
  applicantId?: number | string
  entityType?: EntityType | string
  status?: BusinessStatus | string
  districtId?: number
  businessSize?: BusinessSize | string
  registrationType?: RegistrationType | string
  startDate?: Date
  endDate?: Date
  tags?: string[]
  searchText?: string // Search by name, NTN, phone, etc
  isActive?: boolean
  limit?: number
  offset?: number
  sort?: 'createdAt' | 'businessName' | 'status'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Business query result
 */
export interface BusinessQueryResult {
  businesses: BusinessProfile[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Business statistics
 */
export interface BusinessStatistics {
  totalBusinesses: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  bySize: Record<string, number>
  byDistrict: Record<string, number>
  activeCount: number
  inactiveCount: number
  pendingVerification: number
}
