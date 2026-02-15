import { createCrudController } from './crudFactory'
import {
  businessProfileCrudRepo,
  plasticItemCrudRepo,
  productCrudRepo,
  byProductCrudRepo,
  producerCrudRepo,
  consumerCrudRepo,
  collectorCrudRepo,
  recyclerCrudRepo,
  rawMaterialCrudRepo,
  applicantFieldResponseCrudRepo,
  applicantManualFieldsCrudRepo,
  applicationAssignmentCrudRepo,
} from '../../../infrastructure/database/repositories/pmc/resources'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { maybeUpdateTrackingNumber } from '../../services/pmc/ApplicantService'
import {
  serializeBusinessProfile,
  serializeCollector,
  serializeConsumer,
  serializeProducer,
  serializeRecycler,
  serializeApplicantFieldResponse,
  serializeApplicantManualFields,
  serializeAssignment,
} from '../../services/pmc/serializers'
import type { Request } from 'express'
import { applicationAssignmentRepositoryMongo, applicantRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

export const businessProfileController = createCrudController(businessProfileCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  enablePagination: true,
  transform: (doc) => serializeBusinessProfile(doc),
})

export const plasticItemsController = createCrudController(plasticItemCrudRepo)
export const productsController = createCrudController(productCrudRepo)
export const byProductsController = createCrudController(byProductCrudRepo)

export const producersController = createCrudController(producerCrudRepo, {
  setCreatedBy: true,
  transform: (doc) => serializeProducer(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    trackingNumber: body.tracking_number ?? body.trackingNumber,
    registrationRequiredFor: parseJson(body.registration_required_for),
    registrationRequiredForOther: parseJson(body.registration_required_for_other),
    plainPlasticSheetsForFoodWrapping: parseJson(body.plain_plastic_sheets_for_food_wrapping),
    packagingItems: parseJson(body.packaging_items),
    numberOfMachines: body.number_of_machines ?? body.numberOfMachines,
    totalCapacityValue: toNumber(body.total_capacity_value ?? body.totalCapacityValue),
    dateOfSettingUp: body.date_of_setting_up ?? body.dateOfSettingUp,
    totalWasteGeneratedValue: toNumber(body.total_waste_generated_value ?? body.totalWasteGeneratedValue),
    hasWasteStorageCapacity: body.has_waste_storage_capacity ?? body.hasWasteStorageCapacity,
    wasteDisposalProvision: body.waste_disposal_provision ?? body.wasteDisposalProvision,
    registrationRequiredForOtherOtherText: body.registration_required_for_other_other_text ?? body.registrationRequiredForOtherOtherText,
  }),
})
export const consumersController = createCrudController(consumerCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  transform: (doc) => serializeConsumer(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    registrationRequiredFor: parseJson(body.registration_required_for),
    registrationRequiredForOther: parseJson(body.registration_required_for_other),
    plainPlasticSheetsForFoodWrapping: parseJson(body.plain_plastic_sheets_for_food_wrapping),
    packagingItems: parseJson(body.packaging_items),
    consumption: body.consumption,
    provisionWasteDisposalBins: body.provision_waste_disposal_bins ?? body.provisionWasteDisposalBins,
    noOfWasteDisposableBins: toNumber(body.no_of_waste_disposable_bins ?? body.noOfWasteDisposableBins),
    segregatedPlasticsHandedOverToRegisteredRecyclers: body.segregated_plastics_handed_over_to_registered_recyclers ?? body.segregatedPlasticsHandedOverToRegisteredRecyclers,
    registrationRequiredForOtherOtherText: body.registration_required_for_other_other_text ?? body.registrationRequiredForOtherOtherText,
  }),
})
export const collectorsController = createCrudController(collectorCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  transform: (doc) => serializeCollector(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    registrationRequiredFor: parseJson(body.registration_required_for),
    registrationRequiredForOther: parseJson(body.registration_required_for_other),
    selectedCategories: parseJson(body.selected_categories ?? body.selectedCategories),
    totalCapacityValue: toNumber(body.total_capacity_value ?? body.totalCapacityValue),
    numberOfVehicles: toNumber(body.number_of_vehicles ?? body.numberOfVehicles),
    numberOfPersons: toNumber(body.number_of_persons ?? body.numberOfPersons),
    registrationRequiredForOtherOtherText: body.registration_required_for_other_other_text ?? body.registrationRequiredForOtherOtherText,
  }),
})
export const recyclersController = createCrudController(recyclerCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  transform: (doc) => serializeRecycler(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    selectedCategories: parseJson(body.selected_categories ?? body.selectedCategories),
    plasticWasteAcquiredThrough: parseJson(body.plastic_waste_acquired_through ?? body.plasticWasteAcquiredThrough),
    hasAdequatePollutionControlSystems: body.has_adequate_pollution_control_systems ?? body.hasAdequatePollutionControlSystems,
    pollutionControlDetails: body.pollution_control_details ?? body.pollutionControlDetails,
    registrationRequiredForOtherOtherText: body.registration_required_for_other_other_text ?? body.registrationRequiredForOtherOtherText,
  }),
})

export const rawMaterialsController = createCrudController(rawMaterialCrudRepo)
export const applicantFieldResponsesController = createCrudController(applicantFieldResponseCrudRepo, {
  setCreatedBy: true,
  enablePagination: true,
  transform: (doc) => serializeApplicantFieldResponse(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    fieldKey: body.field_key ?? body.fieldKey,
    response: body.response,
    comment: body.comment,
  }),
})
export const applicantManualFieldsController = createCrudController(applicantManualFieldsCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  enablePagination: true,
  transform: (doc) => serializeApplicantManualFields(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    latitude: toNumber(body.latitude),
    longitude: toNumber(body.longitude),
    listOfProducts: body.list_of_products ?? body.listOfProducts,
    listOfByProducts: body.list_of_by_products ?? body.listOfByProducts,
    rawMaterialImported: body.raw_material_imported ?? body.rawMaterialImported,
    sellerNameIfRawMaterialBought: body.seller_name_if_raw_material_bought ?? body.sellerNameIfRawMaterialBought,
    selfImportDetails: body.self_import_details ?? body.selfImportDetails,
    rawMaterialUtilized: body.raw_material_utilized ?? body.rawMaterialUtilized,
    complianceThickness75: body.compliance_thickness_75 ?? body.complianceThickness75,
    validConsentPermitBuildingBylaws: body.valid_consent_permit_building_bylaws ?? body.validConsentPermitBuildingBylaws,
    stockistDistributorList: body.stockist_distributor_list ?? body.stockistDistributorList,
    procurementPerDay: body.procurement_per_day ?? body.procurementPerDay,
    noOfWorkers: toNumber(body.no_of_workers ?? body.noOfWorkers),
    laborDeptRegistrationStatus: body.labor_dept_registration_status ?? body.laborDeptRegistrationStatus,
    occupationalSafetyAndHealthFacilities: body.occupational_safety_and_health_facilities ?? body.occupationalSafetyAndHealthFacilities,
    adverseEnvironmentalImpacts: body.adverse_environmental_impacts ?? body.adverseEnvironmentalImpacts,
  }),
})
export const applicationAssignmentController = createCrudController(applicationAssignmentCrudRepo, {
  setCreatedBy: true,
  setUpdatedBy: true,
  enablePagination: true,
  transform: (doc) => serializeAssignment(doc),
  mapPayload: (body) => ({
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    assignedGroup: body.assigned_group ?? body.assignedGroup,
    remarks: body.remarks,
  }),
})

export const createApplicationAssignment = asyncHandler(async (req: AuthRequest, res) => {
  const payload = {
    applicantId: toNumber(req.body.applicant || req.body.applicant_id || req.body.applicantId),
    assignedGroup: req.body.assigned_group ?? req.body.assignedGroup,
    remarks: req.body.remarks,
    createdBy: req.user?._id,
  }

  const assignment = await applicationAssignmentRepositoryMongo.create(payload)

  if (payload.applicantId && payload.assignedGroup) {
    await applicantRepositoryMongo.updateOne(
      { numericId: payload.applicantId },
      { assignedGroup: payload.assignedGroup }
    )
  }

  return res.status(201).json(serializeAssignment(assignment))
})

export const createBusinessProfile = asyncHandler(async (req: AuthRequest, res) => {
  const payload = mapBusinessProfilePayload(req.body, req.user?._id)
  const profile = await businessProfileCrudRepo.create(payload)
  if ((profile as any).applicantId) {
    await maybeUpdateTrackingNumber((profile as any).applicantId)
  }
  return res.status(201).json(serializeBusinessProfile(profile))
})

export const updateBusinessProfile = asyncHandler(async (req: AuthRequest, res) => {
  const payload = mapBusinessProfilePayload(req.body, req.user?._id, true)
  const profile = await businessProfileCrudRepo.updateById(req.params.id, payload)
  if (!profile) return res.status(404).json({ message: 'Not found' })
  if ((profile as any).applicantId) {
    await maybeUpdateTrackingNumber((profile as any).applicantId)
  }
  return res.json(serializeBusinessProfile(profile))
})

function mapBusinessProfilePayload(body: any, userId?: any, isUpdate = false) {
  const payload: any = {
    applicantId: toNumber(body.applicant || body.applicant_id || body.applicantId),
    entityType: body.entity_type ?? body.entityType,
    trackingNumber: body.tracking_number ?? body.trackingNumber,
    name: body.name,
    ntnStrnPraNoIndividual: body.ntn_strn_pra_no_individual ?? body.ntnStrnPraNoIndividual,
    businessName: body.business_name ?? body.businessName,
    businessRegistrationType: body.business_registration_type ?? body.businessRegistrationType,
    businessRegistrationNo: body.business_registration_no ?? body.businessRegistrationNo,
    ntnStrnPraNoCompany: body.ntn_strn_pra_no_company ?? body.ntnStrnPraNoCompany,
    workingDays: body.working_days ?? body.workingDays,
    commencementDate: body.commencement_date ?? body.commencementDate,
    noOfWorkers: body.no_of_workers ?? body.noOfWorkers,
    districtId: toNumber(body.district ?? body.district_id ?? body.districtId),
    tehsilId: toNumber(body.tehsil ?? body.tehsil_id ?? body.tehsilId),
    cityTownVillage: body.city_town_village ?? body.cityTownVillage,
    postalAddress: body.postal_address ?? body.postalAddress,
    postalCode: body.postal_code ?? body.postalCode,
    locationLatitude: toNumber(body.location_latitude ?? body.locationLatitude),
    locationLongitude: toNumber(body.location_longitude ?? body.locationLongitude),
    email: body.email,
    mobileOperator: body.mobile_operator ?? body.mobileOperator,
    mobileNo: body.mobile_no ?? body.mobileNo,
    phoneNo: body.phone_no ?? body.phoneNo,
    websiteAddress: body.website_address ?? body.websiteAddress,
  }

  if (isUpdate) payload.updatedBy = userId
  else payload.createdBy = userId

  return payload
}

function parseJson(value: any) {
  if (value === undefined || value === null) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function toNumber(value: any) {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}
