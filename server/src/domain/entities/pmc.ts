import type { Id, Timestamped } from '../types'

export type ApplicantDetail = Timestamped & {
  id?: Id
  numericId: number
  registrationFor?: string
  firstName: string
  lastName?: string
  applicantDesignation?: string
  gender?: string
  cnic?: string
  email?: string
  mobileOperator?: string
  mobileNo?: string
  applicationStatus?: string
  trackingNumber?: string
  remarks?: string
  createdBy?: Id
  assignedGroup?: string
  trackingHash?: string
}

export type BusinessProfile = Timestamped & {
  id?: Id
  applicantId?: number
  businessName?: string
  name?: string
  districtId?: number
  tehsilId?: number
  postalAddress?: string
  entityType?: string
}

export type District = Timestamped & {
  id?: Id
  districtId?: number
  divisionId: number
  districtName: string
  districtCode: string
  shortName?: string
  pitbDistrictId?: number
}

export type Tehsil = Timestamped & {
  id?: Id
  tehsilId?: number
  districtId?: number
  divisionId: number
  tehsilName: string
  tehsilCode: string
}

export type License = Timestamped & {
  id?: Id
  applicantId?: number
  licenseNumber?: string
  licenseFor?: string
  licenseDuration?: string
  ownerName?: string
  businessName?: string
  typesOfPlastics?: string
  particulars?: string
  feeAmount?: number
  address?: string
  dateOfIssue?: Date
  createdBy?: Id
}

export type InspectionReport = Timestamped & {
  id?: Id
  applicantId?: number
  businessName?: string
  businessType?: string
  districtId?: number
  inspectionDate?: Date
  createdBy?: Id
}



