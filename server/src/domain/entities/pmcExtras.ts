import type { Id, Timestamped } from '../types'

export type ApplicationAssignment = Timestamped & {
  id?: Id
  numericId?: number
  applicantId?: number
  assignedGroup?: string
  remarks?: string
  createdBy?: Id
  updatedBy?: Id
}

export type ApplicationSubmitted = Timestamped & {
  id?: Id
  applicantId?: number
}

export type ApplicantDocument = Timestamped & {
  id?: Id
  numericId?: number
  applicantId?: number
  documentPath: string
  documentDescription?: string
  createdBy?: Id
  updatedBy?: Id
}

export type ApplicantFieldResponse = Timestamped & {
  id?: Id
  applicantId?: number
  createdBy?: Id
}

export type ApplicantManualFields = Timestamped & {
  id?: Id
  applicantId?: number
  latitude?: number
  longitude?: number
}

export type ApplicantFee = Timestamped & {
  id?: Id
  numericId?: number
  applicantId?: number
  feeAmount?: number
  isSettled?: boolean
  reason?: string
}

export type PSIDTracking = Timestamped & {
  id?: Id
  applicantId?: number
  consumerNumber?: string
  paymentStatus?: string
  amountPaid?: number
  deptTransactionId?: string
  dueDate?: Date
  expiryDate?: Date
  amountWithinDueDate?: number
  amountAfterDueDate?: number
  consumerName?: string
  mobileNo?: string
  cnic?: string
  email?: string
  districtId?: number
  amountBifurcation?: string
  status?: string
  message?: string
  paidDate?: Date
  paidTime?: string
  bankCode?: string
}

export type Producer = Timestamped & {
  id?: Id
  applicantId?: number
  registrationRequiredFor?: string[] | string
  registrationRequiredForOther?: string[] | string
  totalCapacityValue?: number
  numberOfMachines?: number | string
}

export type Consumer = Timestamped & {
  id?: Id
  applicantId?: number
  registrationRequiredFor?: string[] | string
  registrationRequiredForOther?: string[] | string
  totalCapacityValue?: number
  consumption?: string
}

export type Collector = Timestamped & {
  id?: Id
  applicantId?: number
  registrationRequiredFor?: string[] | string
  registrationRequiredForOther?: string[] | string
  totalCapacityValue?: number
}

export type Recycler = Timestamped & {
  id?: Id
  applicantId?: number
  selectedCategories?: Array<{ wasteCollection?: number | string; wasteDisposal?: number | string }>
}


