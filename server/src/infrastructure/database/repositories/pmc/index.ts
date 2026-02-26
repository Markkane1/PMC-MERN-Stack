import type {
  ApplicantRepository,
  BusinessProfileRepository,
  DistrictRepository,
  TehsilRepository,
  LicenseRepository,
  ApplicationSubmittedRepository,
  ApplicationAssignmentRepository,
  ApplicantDocumentRepository,
  ApplicantFieldResponseRepository,
  ApplicantManualFieldsRepository,
  ApplicantFeeRepository,
  PSIDTrackingRepository,
  ProducerRepository,
  ConsumerRepository,
  CollectorRepository,
  RecyclerRepository,
  InspectionReportRepository,
  SingleUsePlasticsSnapshotRepository,
  CompetitionRegistrationRepository,
  CourierLabelRepository,
  DistrictPlasticCommitteeDocumentRepository,
  AlertRepository,
  AlertRecipientRepository,
  AlertTemplateRepository,
  AdvancedFieldDefinitionRepository,
  AdvancedFieldResponseRepository,
  FieldResponseAuditLogRepository,
  FieldSectionRepository,
} from '../../../../domain/repositories/pmc'
import { ApplicantDetailModel } from '../../models/pmc/ApplicantDetail'
import { BusinessProfileModel } from '../../models/pmc/BusinessProfile'
import { DistrictModel } from '../../models/pmc/District'
import { TehsilModel } from '../../models/pmc/Tehsil'
import { LicenseModel } from '../../models/pmc/License'
import { ApplicationSubmittedModel } from '../../models/pmc/ApplicationSubmitted'
import { ApplicationAssignmentModel } from '../../models/pmc/ApplicationAssignment'
import { ApplicantDocumentModel } from '../../models/pmc/ApplicantDocument'
import { ApplicantFieldResponseModel } from '../../models/pmc/ApplicantFieldResponse'
import { ApplicantManualFieldsModel } from '../../models/pmc/ApplicantManualFields'
import { ApplicantFeeModel } from '../../models/pmc/ApplicantFee'
import { PSIDTrackingModel } from '../../models/pmc/PSIDTracking'
import { ProducerModel } from '../../models/pmc/Producer'
import { ConsumerModel } from '../../models/pmc/Consumer'
import { CollectorModel } from '../../models/pmc/Collector'
import { RecyclerModel } from '../../models/pmc/Recycler'
import { InspectionReportModel } from '../../models/pmc/InspectionReport'
import { SingleUsePlasticsSnapshotModel } from '../../models/pmc/SingleUsePlasticsSnapshot'
import { CompetitionRegistrationModel } from '../../models/pmc/CompetitionRegistration'
import { DistrictPlasticCommitteeDocumentModel } from '../../models/pmc/DistrictPlasticCommitteeDocument'
import { createCourierLabelRepository } from './CompetitionRepository'
import { createAlertRepository, createAlertRecipientRepository, createAlertTemplateRepository } from './AlertRepository'
import {
  createAdvancedFieldDefinitionRepository,
  createAdvancedFieldResponseRepository,
  createFieldResponseAuditLogRepository,
  createFieldSectionRepository,
} from './AdvancedFieldResponseRepository'
const mapDistrict = (doc: any) => {
  if (!doc) return doc
  const districtId = doc.districtId ?? doc.district_id ?? doc.id
  const districtName = doc.districtName ?? doc.district_name ?? doc.name
  const districtCode = doc.districtCode ?? doc.district_code ?? doc.code
  const divisionId = doc.divisionId ?? doc.division_id
  const shortName = doc.shortName ?? doc.short_name
  const pitbDistrictId = doc.pitbDistrictId ?? doc.pitb_district_id
  return {
    ...doc,
    districtId,
    districtName,
    districtCode,
    divisionId,
    shortName,
    pitbDistrictId,
  }
}

const mapTehsil = (doc: any) => {
  if (!doc) return doc
  const tehsilId = doc.tehsilId ?? doc.tehsil_id ?? doc.id
  const tehsilName = doc.tehsilName ?? doc.tehsil_name ?? doc.name
  const tehsilCode = doc.tehsilCode ?? doc.tehsil_code ?? doc.code
  const districtId = doc.districtId ?? doc.district_id
  const divisionId = doc.divisionId ?? doc.division_id
  return {
    ...doc,
    tehsilId,
    tehsilName,
    tehsilCode,
    districtId,
    divisionId,
  }
}


const mapApplicant = (doc: any) => {
  if (!doc) return doc
  const numericId = doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    registrationFor: doc.registrationFor ?? doc.registration_for,
    firstName: doc.firstName ?? doc.first_name,
    lastName: doc.lastName ?? doc.last_name,
    applicantDesignation: doc.applicantDesignation ?? doc.applicant_designation,
    mobileOperator: doc.mobileOperator ?? doc.mobile_operator,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    applicationStatus: doc.applicationStatus ?? doc.application_status,
    trackingNumber: doc.trackingNumber ?? doc.tracking_number,
    assignedGroup: doc.assignedGroup ?? doc.assigned_group,
    trackingHash: doc.trackingHash ?? doc.tracking_hash,
    createdBy: doc.createdBy ?? doc.created_by ?? doc.created_by_id,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapBusinessProfile = (doc: any) => {
  if (!doc) return doc
  const applicantId = doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined)
  const numericId = doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    applicantId,
    entityType: doc.entityType ?? doc.entity_type,
    trackingNumber: doc.trackingNumber ?? doc.tracking_number,
    name: doc.name,
    businessName: doc.businessName ?? doc.business_name,
    businessRegistrationType: doc.businessRegistrationType ?? doc.business_registration_type,
    businessRegistrationNo: doc.businessRegistrationNo ?? doc.business_registration_no,
    districtId: doc.districtId ?? doc.district_id,
    tehsilId: doc.tehsilId ?? doc.tehsil_id,
    cityTownVillage: doc.cityTownVillage ?? doc.city_town_village,
    postalAddress: doc.postalAddress ?? doc.postal_address,
    postalCode: doc.postalCode ?? doc.postal_code,
    locationLatitude: doc.locationLatitude ?? doc.location_latitude,
    locationLongitude: doc.locationLongitude ?? doc.location_longitude,
    mobileOperator: doc.mobileOperator ?? doc.mobile_operator,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    phoneNo: doc.phoneNo ?? doc.phone_no,
    websiteAddress: doc.websiteAddress ?? doc.website_address,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapAssignment = (doc: any) => {
  if (!doc) return doc
  const numericId = doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    assignedGroup: doc.assignedGroup ?? doc.assigned_group,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapSubmitted = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapApplicantDocument = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    documentDescription: doc.documentDescription ?? doc.document_description,
    documentPath: doc.documentPath ?? doc.document,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

const mapApplicantFieldResponse = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    fieldKey: doc.fieldKey ?? doc.field_key,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

const mapApplicantManualFields = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    listOfProducts: doc.listOfProducts ?? doc.list_of_products,
    listOfByProducts: doc.listOfByProducts ?? doc.list_of_by_products,
    rawMaterialImported: doc.rawMaterialImported ?? doc.raw_material_imported,
    sellerNameIfRawMaterialBought: doc.sellerNameIfRawMaterialBought ?? doc.seller_name_if_raw_material_bought,
    selfImportDetails: doc.selfImportDetails ?? doc.self_import_details,
    rawMaterialUtilized: doc.rawMaterialUtilized ?? doc.raw_material_utilized,
    complianceThickness75: doc.complianceThickness75 ?? doc.compliance_thickness_75,
    validConsentPermitBuildingBylaws: doc.validConsentPermitBuildingBylaws ?? doc.valid_consent_permit_building_bylaws,
    stockistDistributorList: doc.stockistDistributorList ?? doc.stockist_distributor_list,
    procurementPerDay: doc.procurementPerDay ?? doc.procurement_per_day,
    noOfWorkers: doc.noOfWorkers ?? doc.no_of_workers,
    laborDeptRegistrationStatus: doc.laborDeptRegistrationStatus ?? doc.labor_dept_registration_status,
    occupationalSafetyAndHealthFacilities: doc.occupationalSafetyAndHealthFacilities ?? doc.occupational_safety_and_health_facilities,
    adverseEnvironmentalImpacts: doc.adverseEnvironmentalImpacts ?? doc.adverse_environmental_impacts,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapApplicantFee = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    feeAmount: doc.feeAmount ?? doc.fee_amount,
    isSettled: doc.isSettled ?? doc.is_settled,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapPSIDTracking = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    deptTransactionId: doc.deptTransactionId ?? doc.dept_transaction_id,
    dueDate: doc.dueDate ?? doc.due_date,
    expiryDate: doc.expiryDate ?? doc.expiry_date,
    amountWithinDueDate: doc.amountWithinDueDate ?? doc.amount_within_due_date,
    amountAfterDueDate: doc.amountAfterDueDate ?? doc.amount_after_due_date,
    consumerName: doc.consumerName ?? doc.consumer_name,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    districtId: doc.districtId ?? doc.district_id,
    amountBifurcation: doc.amountBifurcation ?? doc.amount_bifurcation,
    consumerNumber: doc.consumerNumber ?? doc.consumer_number,
    paymentStatus: doc.paymentStatus ?? doc.payment_status,
    amountPaid: doc.amountPaid ?? doc.amount_paid,
    paidDate: doc.paidDate ?? doc.paid_date,
    paidTime: doc.paidTime ?? doc.paid_time,
    bankCode: doc.bankCode ?? doc.bank_code,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

const mapLicense = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    licenseFor: doc.licenseFor ?? doc.license_for,
    licenseNumber: doc.licenseNumber ?? doc.license_number,
    licenseDuration: doc.licenseDuration ?? doc.license_duration,
    ownerName: doc.ownerName ?? doc.owner_name,
    businessName: doc.businessName ?? doc.business_name,
    typesOfPlastics: doc.typesOfPlastics ?? doc.types_of_plastics,
    feeAmount: doc.feeAmount ?? doc.fee_amount,
    dateOfIssue: doc.dateOfIssue ?? doc.date_of_issue,
    isActive: doc.isActive ?? doc.is_active ?? true,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapProducer = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    trackingNumber: doc.trackingNumber ?? doc.tracking_number,
    registrationRequiredFor: doc.registrationRequiredFor ?? doc.registration_required_for,
    registrationRequiredForOther: doc.registrationRequiredForOther ?? doc.registration_required_for_other,
    plainPlasticSheetsForFoodWrapping: doc.plainPlasticSheetsForFoodWrapping ?? doc.plain_plastic_sheets_for_food_wrapping,
    packagingItems: doc.packagingItems ?? doc.packaging_items,
    numberOfMachines: doc.numberOfMachines ?? doc.number_of_machines,
    totalCapacityValue: doc.totalCapacityValue ?? doc.total_capacity_value,
    dateOfSettingUp: doc.dateOfSettingUp ?? doc.date_of_setting_up,
    totalWasteGeneratedValue: doc.totalWasteGeneratedValue ?? doc.total_waste_generated_value,
    hasWasteStorageCapacity: doc.hasWasteStorageCapacity ?? doc.has_waste_storage_capacity,
    wasteDisposalProvision: doc.wasteDisposalProvision ?? doc.waste_disposal_provision,
    registrationRequiredForOtherOtherText:
      doc.registrationRequiredForOtherOtherText ?? doc.registration_required_for_other_other_text,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapConsumer = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    registrationRequiredFor: doc.registrationRequiredFor ?? doc.registration_required_for,
    registrationRequiredForOther: doc.registrationRequiredForOther ?? doc.registration_required_for_other,
    plainPlasticSheetsForFoodWrapping: doc.plainPlasticSheetsForFoodWrapping ?? doc.plain_plastic_sheets_for_food_wrapping,
    packagingItems: doc.packagingItems ?? doc.packaging_items,
    consumption: doc.consumption,
    provisionWasteDisposalBins: doc.provisionWasteDisposalBins ?? doc.provision_waste_disposal_bins,
    noOfWasteDisposableBins: doc.noOfWasteDisposableBins ?? doc.no_of_waste_disposable_bins,
    segregatedPlasticsHandedOverToRegisteredRecyclers:
      doc.segregatedPlasticsHandedOverToRegisteredRecyclers ??
      doc.segregated_plastics_handed_over_to_registered_recyclers,
    registrationRequiredForOtherOtherText:
      doc.registrationRequiredForOtherOtherText ?? doc.registration_required_for_other_other_text,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapCollector = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    registrationRequiredFor: doc.registrationRequiredFor ?? doc.registration_required_for,
    registrationRequiredForOther: doc.registrationRequiredForOther ?? doc.registration_required_for_other,
    selectedCategories: doc.selectedCategories ?? doc.selected_categories,
    totalCapacityValue: doc.totalCapacityValue ?? doc.total_capacity_value,
    numberOfVehicles: doc.numberOfVehicles ?? doc.number_of_vehicles,
    numberOfPersons: doc.numberOfPersons ?? doc.number_of_persons,
    registrationRequiredForOtherOtherText:
      doc.registrationRequiredForOtherOtherText ?? doc.registration_required_for_other_other_text,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapRecycler = (doc: any) => {
  if (!doc) return doc
  const applicantIdRaw = doc.applicantId ?? doc.applicant_id
  const applicantId =
    applicantIdRaw !== undefined && applicantIdRaw !== null
      ? Number(applicantIdRaw)
      : undefined
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: Number.isFinite(applicantId) ? applicantId : undefined,
    selectedCategories: doc.selectedCategories ?? doc.selected_categories,
    plasticWasteAcquiredThrough: doc.plasticWasteAcquiredThrough ?? doc.plastic_waste_acquired_through,
    hasAdequatePollutionControlSystems:
      doc.hasAdequatePollutionControlSystems ?? doc.has_adequate_pollution_control_systems,
    pollutionControlDetails: doc.pollutionControlDetails ?? doc.pollution_control_details,
    registrationRequiredForOtherOtherText:
      doc.registrationRequiredForOtherOtherText ?? doc.registration_required_for_other_other_text,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapInspectionReport = (doc: any) => {
  if (!doc) return doc
  const districtIdRaw = doc.districtId ?? doc.district_id
  const districtId =
    districtIdRaw !== undefined && districtIdRaw !== null ? Number(districtIdRaw) : undefined
  const numericIdRaw = doc.numericId ?? doc.numeric_id ?? doc.id
  const numericId =
    numericIdRaw !== undefined && numericIdRaw !== null ? Number(numericIdRaw) : undefined
  return {
    ...doc,
    numericId: Number.isFinite(numericId) ? numericId : undefined,
    businessName: doc.businessName ?? doc.business_name,
    businessType: doc.businessType ?? doc.business_type,
    licenseNumber: doc.licenseNumber ?? doc.license_number,
    violationFound: doc.violationFound ?? doc.violation_found,
    violationType: doc.violationType ?? doc.violation_type,
    actionTaken: doc.actionTaken ?? doc.action_taken,
    plasticBagsConfiscation: doc.plasticBagsConfiscation ?? doc.plastic_bags_confiscation,
    confiscationOtherPlastics: doc.confiscationOtherPlastics ?? doc.confiscation_other_plastics,
    totalConfiscation: doc.totalConfiscation ?? doc.total_confiscation,
    otherSingleUseItems: doc.otherSingleUseItems ?? doc.other_single_use_items,
    inspectionDate: doc.inspectionDate ?? doc.inspection_date ?? doc.actualDate ?? doc.actual_date,
    fineAmount: doc.fineAmount ?? doc.fine_amount,
    fineRecoveryStatus: doc.fineRecoveryStatus ?? doc.fine_recovery_status,
    fineRecoveryDate: doc.fineRecoveryDate ?? doc.fine_recovery_date,
    recoveryAmount: doc.recoveryAmount ?? doc.recovery_amount,
    deSealedDate: doc.deSealedDate ?? doc.de_sealed_date,
    fineRecoveryBreakup: doc.fineRecoveryBreakup ?? doc.fine_recovery_breakup,
    affidavitPath: doc.affidavitPath ?? doc.affidavit,
    confiscationReceiptPath: doc.confiscationReceiptPath ?? doc.confiscation_receipt,
    paymentChallanPath: doc.paymentChallanPath ?? doc.payment_challan,
    receiptBookNumber: doc.receiptBookNumber ?? doc.receipt_book_number,
    receiptNumber: doc.receiptNumber ?? doc.receipt_number,
    districtId: Number.isFinite(districtId) ? districtId : undefined,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

function toSnakeCase(input: string) {
  return input.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
}

function buildLegacyAwareFilter(filter: Record<string, unknown> = {}) {
  const clauses: Record<string, unknown>[] = []
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) {
      clauses.push({ [key]: value })
      continue
    }
    const snakeKey = toSnakeCase(key)
    if (snakeKey !== key) {
      clauses.push({ $or: [{ [key]: value }, { [snakeKey]: value }] })
    } else {
      clauses.push({ [key]: value })
    }
  }
  if (!clauses.length) return {}
  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

function normalizeNumericIds(values: number[]) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  )
}

function buildNumericIdMatch(numericId: number) {
  return {
    $or: [{ numericId }, { numeric_id: numericId }, { id: numericId }, { id: String(numericId) }],
  } as any
}

function buildApplicantIdMatch(applicantId: number) {
  return {
    $or: [{ applicantId }, { applicant_id: applicantId }, { applicant_id: String(applicantId) }],
  } as any
}

function buildApplicantIdsMatch(applicantIds: number[]) {
  const ids = normalizeNumericIds(applicantIds)
  const legacyIds = ids.map(String)
  if (!ids.length) return { _id: null } as any
  return {
    $or: [
      { applicantId: { $in: ids } },
      { applicant_id: { $in: ids } },
      { applicant_id: { $in: legacyIds } },
    ],
  } as any
}

function buildDistrictIdMatch(districtId: number) {
  return {
    $or: [{ districtId }, { district_id: districtId }, { district_id: String(districtId) }],
  } as any
}

function buildTehsilIdMatch(tehsilId: number) {
  return {
    $or: [{ tehsilId }, { tehsil_id: tehsilId }, { tehsil_id: String(tehsilId) }],
  } as any
}

export const applicantRepositoryMongo: ApplicantRepository = {
  async findByNumericId(numericId: number) {
    const doc = await ApplicantDetailModel.findOne(buildNumericIdMatch(numericId)).lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findById(id: string) {
    const doc = await ApplicantDetailModel.findById(id).lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findByTrackingNumber(trackingNumber: string) {
    const doc = await ApplicantDetailModel.findOne({
      $or: [{ trackingNumber }, { tracking_number: trackingNumber }],
    } as any)
      .lean()
      .maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findOne(filter: Record<string, unknown>) {
    const doc = await ApplicantDetailModel.findOne(buildLegacyAwareFilter(filter)).lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findOneWithCreator(filter: Record<string, unknown>) {
    const doc = await ApplicantDetailModel.findOne(buildLegacyAwareFilter(filter))
      .populate('createdBy')
      .lean()
      .maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicantDetailModel.find(buildLegacyAwareFilter(filter))
      .lean()
      .maxTimeMS(30000)
      .select('-__v')
    return docs.map(mapApplicant)
  },
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    projection?: Record<string, 0 | 1>
  ) {
    const skip = (page - 1) * pageSize
    const normalizedFilter = buildLegacyAwareFilter(filter)
    const query = ApplicantDetailModel.find(normalizedFilter)
      .lean()
      .maxTimeMS(30000)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)

    if (projection && Object.keys(projection).length > 0) {
      query.select(projection as any)
    } else {
      query.select('-__v')
    }

    const [docs, total] = await Promise.all([
      query,
      ApplicantDetailModel.countDocuments(normalizedFilter).maxTimeMS(30000),
    ])
    return {
      data: docs.map(mapApplicant),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
  },
  async create(applicant: Partial<any>) {
    const created = await ApplicantDetailModel.create(applicant)
    return mapApplicant(created.toObject())
  },
  async updateByNumericId(numericId: number, updates: Partial<any>) {
    const doc = await ApplicantDetailModel.findOneAndUpdate(buildNumericIdMatch(numericId), updates, { new: true }).lean()
    return doc ? mapApplicant(doc) : null
  },
  async updateOne(filter: Record<string, unknown>, updates: Record<string, unknown>) {
    await ApplicantDetailModel.updateOne(filter, updates)
  },
  async deleteByNumericId(numericId: number) {
    await ApplicantDetailModel.findOneAndDelete({ numericId })
  },
  async count(filter: Record<string, unknown> = {}) {
    return ApplicantDetailModel.countDocuments(buildLegacyAwareFilter(filter))
  },
  async aggregate(pipeline: any[]) {
    return ApplicantDetailModel.aggregate(pipeline)
  },
  async getStatsByStatus() {
    return ApplicantDetailModel.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$applicationStatus', '$application_status'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
  },
  async getStatsByDistrict() {
    return ApplicantDetailModel.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$districtId', '$district_id'] },
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [
                {
                  $eq: [{ $toLower: { $ifNull: ['$applicationStatus', '$application_status'] } }, 'approved'],
                },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $eq: [{ $toLower: { $ifNull: ['$applicationStatus', '$application_status'] } }, 'pending'],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ])
  },
  async getDashboardMetrics(filter: Record<string, unknown> = {}) {
    const results = await ApplicantDetailModel.aggregate([
      { $match: filter },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$applicationStatus',
                count: { $sum: 1 },
              },
            },
          ],
          byDistrict: [
            {
              $group: {
                _id: '$districtId',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                approved: {
                  $sum: {
                    $cond: [{ $eq: ['$applicationStatus', 'approved'] }, 1, 0],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [{ $eq: ['$applicationStatus', 'pending'] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ])
    return results[0] || {}
  },
}

export const businessProfileRepositoryMongo: BusinessProfileRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await BusinessProfileModel.findOne(buildApplicantIdMatch(applicantId)).lean().maxTimeMS(30000)
    return doc ? mapBusinessProfile(doc) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await BusinessProfileModel.find(buildApplicantIdsMatch(applicantIds))
      .lean()
      .select('-__v')
      .maxTimeMS(30000)
    return docs.map(mapBusinessProfile)
  },
  async listByDistrictId(districtId: number) {
    const docs = await BusinessProfileModel.find(buildDistrictIdMatch(districtId))
      .lean()
      .select('-__v')
      .maxTimeMS(30000)
    return docs.map(mapBusinessProfile)
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await BusinessProfileModel.find(buildLegacyAwareFilter(filter)).lean().select('-__v').maxTimeMS(30000)
    return docs.map(mapBusinessProfile)
  },
  async searchByBusinessName(regex: RegExp, limit: number) {
    const docs = await BusinessProfileModel.find({
      $or: [{ businessName: regex }, { business_name: regex }],
    } as any)
      .select('-__v')
      .limit(limit)
      .lean()
      .maxTimeMS(30000)
    return docs.map(mapBusinessProfile)
  },
}

export const districtRepositoryMongo: DistrictRepository = {
  async list(filter: Record<string, unknown> = {}, sort: Record<string, 1 | -1> = {}) {
    const rows = await DistrictModel.find(buildLegacyAwareFilter(filter)).lean().select('-__v').maxTimeMS(30000).sort(sort)
    return rows.map(mapDistrict)
  },
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 50,
    sort: Record<string, 1 | -1> = { districtId: 1 }
  ) {
    const skip = (page - 1) * pageSize
    const normalizedFilter = buildLegacyAwareFilter(filter)
    const [rows, total] = await Promise.all([
      DistrictModel.find(normalizedFilter)
        .lean()
        .select('-__v')
        .maxTimeMS(30000)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      DistrictModel.countDocuments(normalizedFilter).maxTimeMS(30000),
    ])
    return {
      data: rows.map(mapDistrict),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
  },
  async findByDistrictId(districtId: number) {
    const doc = await DistrictModel.findOne(buildDistrictIdMatch(districtId)).lean().maxTimeMS(30000)
    return doc ? mapDistrict(doc) : null
  },
  async findByShortName(shortName: string) {
    const doc = await DistrictModel.findOne({
      $or: [{ shortName }, { short_name: shortName }],
    } as any)
      .lean()
      .maxTimeMS(30000)
    return doc ? mapDistrict(doc) : null
  },
}

export const tehsilRepositoryMongo: TehsilRepository = {
  async list(filter: Record<string, unknown> = {}, sort: Record<string, 1 | -1> = {}) {
    const rows = await TehsilModel.find(buildLegacyAwareFilter(filter)).lean().select('-__v').maxTimeMS(30000).sort(sort)
    return rows.map(mapTehsil)
  },
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 50,
    sort: Record<string, 1 | -1> = { tehsilId: 1 }
  ) {
    const skip = (page - 1) * pageSize
    const normalizedFilter = buildLegacyAwareFilter(filter)
    const [rows, total] = await Promise.all([
      TehsilModel.find(normalizedFilter)
        .lean()
        .select('-__v')
        .maxTimeMS(30000)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      TehsilModel.countDocuments(normalizedFilter).maxTimeMS(30000),
    ])
    return {
      data: rows.map(mapTehsil),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
  },
  async listByDistrictId(districtId?: number) {
    const rows = districtId
      ? await TehsilModel.find(buildDistrictIdMatch(districtId)).lean().select('-__v').maxTimeMS(30000)
      : await TehsilModel.find().lean().select('-__v').maxTimeMS(30000)
    return rows.map(mapTehsil)
  },
  async findByTehsilId(tehsilId: number) {
    const doc = await TehsilModel.findOne(buildTehsilIdMatch(tehsilId)).lean().maxTimeMS(30000)
    return doc ? mapTehsil(doc) : null
  },
}

export const licenseRepositoryMongo: LicenseRepository = {
  async upsertByApplicantId(applicantId: number, data: Partial<any>) {
    const doc = await LicenseModel.findOneAndUpdate(
      {
        $or: [{ applicantId }, { applicant_id: applicantId }, { applicant_id: String(applicantId) }],
      } as any,
      data,
      { upsert: true, new: true }
    )
    return mapLicense(doc.toObject())
  },
  async findActiveByLicenseNumber(licenseNumber: string, dateOfIssue?: Date) {
    const docs = await LicenseModel.find({
      $and: [
        { $or: [{ licenseNumber }, { license_number: licenseNumber }] },
        {
          $or: [
            { isActive: true },
            { is_active: true },
            { $and: [{ isActive: { $exists: false } }, { is_active: { $exists: false } }] },
          ],
        },
      ],
    } as any)
      .sort({ dateOfIssue: -1, date_of_issue: -1, createdAt: -1, created_at: -1 })
      .lean()

    if (!docs.length) return null

    if (dateOfIssue) {
      const target = dateOfIssue.toISOString().slice(0, 10)
      const matched = docs.find((row: any) => {
        const rawDate = row?.dateOfIssue ?? row?.date_of_issue
        if (!rawDate) return false
        const parsed = new Date(rawDate)
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === target
      })
      return mapLicense(matched || docs[0])
    }
    return mapLicense(docs[0])
  },
  async list() {
    const docs = await LicenseModel.find()
      .select({
        applicantId: 1,
        applicant_id: 1,
        licenseFor: 1,
        license_for: 1,
        licenseNumber: 1,
        license_number: 1,
        licenseDuration: 1,
        license_duration: 1,
        ownerName: 1,
        owner_name: 1,
        businessName: 1,
        business_name: 1,
        typesOfPlastics: 1,
        types_of_plastics: 1,
        feeAmount: 1,
        fee_amount: 1,
        address: 1,
        dateOfIssue: 1,
        date_of_issue: 1,
        isActive: 1,
        is_active: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .lean()
    return docs.map(mapLicense)
  },
  async listByApplicantIds(applicantIds: number[]) {
    if (!applicantIds.length) return []
    const docs = await LicenseModel.find(buildApplicantIdsMatch(applicantIds))
      .select({
        applicantId: 1,
        applicant_id: 1,
        licenseFor: 1,
        license_for: 1,
        licenseNumber: 1,
        license_number: 1,
        licenseDuration: 1,
        license_duration: 1,
        ownerName: 1,
        owner_name: 1,
        businessName: 1,
        business_name: 1,
        typesOfPlastics: 1,
        types_of_plastics: 1,
        feeAmount: 1,
        fee_amount: 1,
        address: 1,
        dateOfIssue: 1,
        date_of_issue: 1,
        isActive: 1,
        is_active: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .lean()
    return docs.map(mapLicense)
  },
}

export const inspectionReportRepositoryMongo: InspectionReportRepository = {
  async list(filter: Record<string, unknown> = {}) {
    const docs = await InspectionReportModel.find(buildLegacyAwareFilter(filter)).lean()
    return docs.map(mapInspectionReport)
  },
  async create(payload: Record<string, unknown>) {
    const created = await InspectionReportModel.create(payload)
    return mapInspectionReport(created.toObject())
  },
  async updateByNumericId(numericId: number, updates: Record<string, unknown>) {
    const doc = await InspectionReportModel.findOneAndUpdate(
      {
        $or: [{ numericId }, { numeric_id: numericId }, { id: numericId }, { id: String(numericId) }],
      } as any,
      updates,
      { new: true }
    ).lean()
    return doc ? mapInspectionReport(doc) : null
  },
  async deleteByNumericId(numericId: number) {
    await InspectionReportModel.findOneAndDelete({
      $or: [{ numericId }, { numeric_id: numericId }, { id: numericId }, { id: String(numericId) }],
    } as any)
  },
}

export const singleUsePlasticsSnapshotRepositoryMongo: SingleUsePlasticsSnapshotRepository = {
  async findById(id: string) {
    return SingleUsePlasticsSnapshotModel.findOne({ _id: id }).lean()
  },
  async upsertAddItems(id: string, items: any[]) {
    return SingleUsePlasticsSnapshotModel.findOneAndUpdate(
      { _id: id },
      { $addToSet: { plasticItems: { $each: items } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  },
}

export const competitionRegistrationRepositoryMongo: CompetitionRegistrationRepository = {
  async findAll() {
    return CompetitionRegistrationModel.find().sort({ registeredAt: -1 }).lean()
  },
  async findByCompetition(competitionId: string) {
    return CompetitionRegistrationModel.find({ competitionId }).sort({ registeredAt: -1 }).lean()
  },
  async findByApplicant(applicantId: number) {
    return CompetitionRegistrationModel.find({ applicantId }).lean()
  },
  async findById(id: string) {
    return CompetitionRegistrationModel.findById(id).lean()
  },
  async findByRegistrationId(registrationId: string) {
    return CompetitionRegistrationModel.findOne({ registrationId }).lean()
  },
  async findByCompetitionAndApplicant(competitionId: string, applicantId: number) {
    return CompetitionRegistrationModel.findOne({ competitionId, applicantId }).lean()
  },
  async create(data: Record<string, unknown>) {
    const created = await CompetitionRegistrationModel.create(data)
    return created.toObject()
  },
  async update(id: string, data: Partial<Record<string, unknown>>) {
    return CompetitionRegistrationModel.findByIdAndUpdate(id, data, { new: true }).lean()
  },
  async updateStatus(id: string, status: string) {
    return CompetitionRegistrationModel.findByIdAndUpdate(id, { status }, { new: true }).lean()
  },
  async delete(id: string) {
    const result = await CompetitionRegistrationModel.findByIdAndDelete(id)
    return !!result
  },
  async scoreSubmission(id: string, score: number, scoredBy: string) {
    return CompetitionRegistrationModel.findByIdAndUpdate(
      id,
      { score, scoredBy, scoredAt: new Date() },
      { new: true }
    ).lean()
  },
}

export const courierLabelRepositoryMongo: CourierLabelRepository = createCourierLabelRepository()

export const districtPlasticCommitteeDocumentRepositoryMongo: DistrictPlasticCommitteeDocumentRepository = {
  async create(payload: Record<string, unknown>) {
    const created = await DistrictPlasticCommitteeDocumentModel.create(payload)
    return created.toObject()
  },
  async list() {
    return DistrictPlasticCommitteeDocumentModel.find().lean()
  },
}

export const applicationSubmittedRepositoryMongo: ApplicationSubmittedRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ApplicationSubmittedModel.collection.findOne({
      $or: [{ applicantId }, { applicant_id: applicantId }, { applicant_id: String(applicantId) }],
    })
    return doc ? mapSubmitted(doc) : null
  },
  async create(applicantId: number) {
    const created = await ApplicationSubmittedModel.create({ applicantId })
    return mapSubmitted(created.toObject())
  },
  async list() {
    const docs = await ApplicationSubmittedModel.collection
      .find({})
      .project({
        applicantId: 1,
        applicant_id: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .toArray()
    return docs.map(mapSubmitted)
  },
  async listByApplicantIds(applicantIds: number[]) {
    if (!applicantIds.length) return []
    const docs = await ApplicationSubmittedModel.collection
      .find({
        $or: [
          { applicantId: { $in: applicantIds } },
          { applicant_id: { $in: applicantIds } },
          { applicant_id: { $in: applicantIds.map(String) } },
        ],
      })
      .project({
        applicantId: 1,
        applicant_id: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .toArray()
    return docs.map(mapSubmitted)
  },
}

export const applicationAssignmentRepositoryMongo: ApplicationAssignmentRepository = {
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ApplicationAssignmentModel.find(buildApplicantIdsMatch(applicantIds))
      .sort({ createdAt: -1 })
      .select({
        applicantId: 1,
        applicant_id: 1,
        assignedGroup: 1,
        assigned_group: 1,
        remarks: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .lean()
    return docs.map(mapAssignment)
  },
  async findLatestByApplicantId(applicantId: number) {
    const doc = await ApplicationAssignmentModel.findOne(buildApplicantIdMatch(applicantId))
      .sort({ createdAt: -1, created_at: -1 })
      .select({
        applicantId: 1,
        applicant_id: 1,
        assignedGroup: 1,
        assigned_group: 1,
        remarks: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .lean()
    return doc ? mapAssignment(doc) : null
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicationAssignmentModel.find(buildLegacyAwareFilter(filter))
      .sort({ createdAt: -1, created_at: -1 })
      .lean()
    return docs.map(mapAssignment)
  },
  async create(payload: Record<string, unknown>) {
    const created = await ApplicationAssignmentModel.create(payload)
    return mapAssignment(created.toObject())
  },
}

export const applicantDocumentRepositoryMongo: ApplicantDocumentRepository = {
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantDocumentModel.find(buildApplicantIdMatch(applicantId)).lean()
    return docs.map(mapApplicantDocument)
  },
  async list() {
    const docs = await ApplicantDocumentModel.find().lean()
    return docs.map(mapApplicantDocument)
  },
  async create(payload: Record<string, unknown>) {
    const created = await ApplicantDocumentModel.create(payload)
    return mapApplicantDocument(created.toObject())
  },
  async findLatestByApplicantAndDescription(applicantId: number, description: string) {
    const doc = await ApplicantDocumentModel.findOne({
      $and: [
        buildApplicantIdMatch(applicantId),
        { $or: [{ documentDescription: description }, { document_description: description }] },
      ],
    } as any)
      .sort({ createdAt: -1, created_at: -1 })
      .lean()
    return doc ? mapApplicantDocument(doc) : null
  },
}

export const applicantFieldResponseRepositoryMongo: ApplicantFieldResponseRepository = {
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantFieldResponseModel.find(buildApplicantIdMatch(applicantId)).lean()
    return docs.map(mapApplicantFieldResponse)
  },
}

export const applicantManualFieldsRepositoryMongo: ApplicantManualFieldsRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ApplicantManualFieldsModel.findOne(buildApplicantIdMatch(applicantId)).lean()
    return doc ? mapApplicantManualFields(doc) : null
  },
  async listWithLatLon() {
    const docs = await ApplicantManualFieldsModel.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
    }).lean()
    return docs.map(mapApplicantManualFields)
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicantManualFieldsModel.find(buildLegacyAwareFilter(filter)).lean()
    return docs.map(mapApplicantManualFields)
  },
}

export const applicantFeeRepositoryMongo: ApplicantFeeRepository = {
  async findAll() {
    const docs = await ApplicantFeeModel.find({}).lean()
    return docs.map(mapApplicantFee)
  },
  async list() {
    const docs = await ApplicantFeeModel.find({}).lean()
    return docs.map(mapApplicantFee)
  },
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantFeeModel.find(buildApplicantIdMatch(applicantId))
      .sort({ createdAt: -1, created_at: -1 })
      .select({
        applicantId: 1,
        applicant_id: 1,
        feeAmount: 1,
        fee_amount: 1,
        isSettled: 1,
        is_settled: 1,
        reason: 1,
        status: 1,
        createdAt: 1,
        created_at: 1,
        updatedAt: 1,
        updated_at: 1,
      })
      .lean()
    return docs.map(mapApplicantFee)
  },
  async listByApplicantIds(applicantIds: number[]) {
    if (!applicantIds.length) return []
    const docs = await ApplicantFeeModel.find(buildApplicantIdsMatch(applicantIds))
      .sort({ createdAt: -1, created_at: -1 })
      .select({
        applicantId: 1,
        applicant_id: 1,
        feeAmount: 1,
        fee_amount: 1,
        isSettled: 1,
        is_settled: 1,
        createdAt: 1,
        created_at: 1,
      })
      .lean()
    return docs.map(mapApplicantFee)
  },
  async sumFeeByApplicantId(applicantId: number) {
    const feeAgg = await ApplicantFeeModel.aggregate([
      { $match: buildApplicantIdMatch(applicantId) },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$feeAmount', '$fee_amount'] } } } },
    ])
    return feeAgg[0]?.total || 0
  },
  async countByApplicantId(applicantId: number) {
    return ApplicantFeeModel.countDocuments(buildApplicantIdMatch(applicantId))
  },
  async aggregateBySettlement() {
    return ApplicantFeeModel.aggregate([
      { $group: { _id: '$isSettled', total: { $sum: '$feeAmount' }, count: { $sum: 1 } } },
    ])
  },
}

export const psidTrackingRepositoryMongo: PSIDTrackingRepository = {
  async findAll() {
    const docs = await PSIDTrackingModel.find().lean()
    return docs.map(mapPSIDTracking)
  },
  async listPaidByApplicantId(applicantId: number) {
    const docs = await PSIDTrackingModel.find({
      $and: [
        buildApplicantIdMatch(applicantId),
        { $or: [{ paymentStatus: 'PAID' }, { payment_status: 'PAID' }] },
      ],
    } as any).lean()
    return docs.map(mapPSIDTracking)
  },
  async findByConsumerNumber(consumerNumber: string) {
    const doc = await PSIDTrackingModel.findOne({
      $or: [{ consumerNumber }, { consumer_number: consumerNumber }],
    } as any).lean()
    return doc ? mapPSIDTracking(doc) : null
  },
  async findByConsumerAndDept(consumerNumber: string, deptTransactionId: string) {
    const doc = await PSIDTrackingModel.findOne({
      $or: [
        { consumerNumber, deptTransactionId },
        { consumer_number: consumerNumber, dept_transaction_id: deptTransactionId },
      ],
    } as any)
      .sort({ createdAt: -1, created_at: -1 })
      .lean()
    return doc ? mapPSIDTracking(doc) : null
  },
  async countByApplicantId(applicantId: number) {
    return PSIDTrackingModel.countDocuments(buildApplicantIdMatch(applicantId))
  },
  async findLatestByApplicantId(applicantId: number) {
    const doc = await PSIDTrackingModel.findOne(buildApplicantIdMatch(applicantId))
      .sort({ createdAt: -1, created_at: -1 })
      .lean()
    return doc ? mapPSIDTracking(doc) : null
  },
  async list() {
    const docs = await PSIDTrackingModel.find().lean()
    return docs.map(mapPSIDTracking)
  },
  async create(payload: Record<string, unknown>) {
    const created = await PSIDTrackingModel.create(payload)
    return mapPSIDTracking(created.toObject())
  },
  async updateById(id: string, updates: Record<string, unknown>) {
    const doc = await PSIDTrackingModel.findByIdAndUpdate(id, updates, { new: true }).lean()
    return doc ? mapPSIDTracking(doc) : null
  },
}

export const producerRepositoryMongo: ProducerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ProducerModel.findOne(buildApplicantIdMatch(applicantId)).lean()
    return doc ? mapProducer(doc) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ProducerModel.find(buildApplicantIdsMatch(applicantIds)).lean()
    return docs.map(mapProducer)
  },
}

export const consumerRepositoryMongo: ConsumerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ConsumerModel.findOne(buildApplicantIdMatch(applicantId)).lean()
    return doc ? mapConsumer(doc) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ConsumerModel.find(buildApplicantIdsMatch(applicantIds)).lean()
    return docs.map(mapConsumer)
  },
}

export const collectorRepositoryMongo: CollectorRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await CollectorModel.findOne(buildApplicantIdMatch(applicantId)).lean()
    return doc ? mapCollector(doc) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await CollectorModel.find(buildApplicantIdsMatch(applicantIds)).lean()
    return docs.map(mapCollector)
  },
}

export const recyclerRepositoryMongo: RecyclerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await RecyclerModel.findOne(buildApplicantIdMatch(applicantId)).lean()
    return doc ? mapRecycler(doc) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await RecyclerModel.find(buildApplicantIdsMatch(applicantIds)).lean()
    return docs.map(mapRecycler)
  },
}

export const alertRepositoryMongo: AlertRepository = createAlertRepository()

export const alertRecipientRepositoryMongo: AlertRecipientRepository = createAlertRecipientRepository()

export const alertTemplateRepositoryMongo: AlertTemplateRepository = createAlertTemplateRepository()

export const advancedFieldDefinitionRepositoryMongo: AdvancedFieldDefinitionRepository = createAdvancedFieldDefinitionRepository()

export const advancedFieldResponseRepositoryMongo: AdvancedFieldResponseRepository = createAdvancedFieldResponseRepository()

export const fieldResponseAuditLogRepositoryMongo: FieldResponseAuditLogRepository = createFieldResponseAuditLogRepository()

export const fieldSectionRepositoryMongo: FieldSectionRepository = createFieldSectionRepository()

export function buildApplicantServiceDeps() {
  return {
    applicantRepo: applicantRepositoryMongo,
    businessProfileRepo: businessProfileRepositoryMongo,
    districtRepo: districtRepositoryMongo,
    tehsilRepo: tehsilRepositoryMongo,
    licenseRepo: licenseRepositoryMongo,
    applicationSubmittedRepo: applicationSubmittedRepositoryMongo,
    applicationAssignmentRepo: applicationAssignmentRepositoryMongo,
    applicantDocumentRepo: applicantDocumentRepositoryMongo,
    applicantFieldResponseRepo: applicantFieldResponseRepositoryMongo,
    applicantManualFieldsRepo: applicantManualFieldsRepositoryMongo,
    applicantFeeRepo: applicantFeeRepositoryMongo,
    psidTrackingRepo: psidTrackingRepositoryMongo,
    producerRepo: producerRepositoryMongo,
    consumerRepo: consumerRepositoryMongo,
    collectorRepo: collectorRepositoryMongo,
    recyclerRepo: recyclerRepositoryMongo,
  }
}
