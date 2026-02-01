export function serializeBusinessProfile(profile: any) {
  if (!profile) return null
  return {
    id: profile.numericId,
    applicant: profile.applicantId,
    entity_type: profile.entityType,
    tracking_number: profile.trackingNumber,
    name: profile.name,
    ntn_strn_pra_no_individual: profile.ntnStrnPraNoIndividual,
    business_name: profile.businessName,
    business_registration_type: profile.businessRegistrationType,
    business_registration_no: profile.businessRegistrationNo,
    ntn_strn_pra_no_company: profile.ntnStrnPraNoCompany,
    working_days: profile.workingDays,
    commencement_date: profile.commencementDate,
    no_of_workers: profile.noOfWorkers,
    district: profile.districtId,
    tehsil: profile.tehsilId,
    city_town_village: profile.cityTownVillage,
    postal_address: profile.postalAddress,
    postal_code: profile.postalCode,
    location_latitude: profile.locationLatitude,
    location_longitude: profile.locationLongitude,
    email: profile.email,
    mobile_operator: profile.mobileOperator,
    mobile_no: profile.mobileNo,
    phone_no: profile.phoneNo,
    website_address: profile.websiteAddress,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  }
}

export function serializeProducer(producer: any) {
  if (!producer) return null
  return {
    id: producer.numericId,
    applicant: producer.applicantId,
    tracking_number: producer.trackingNumber,
    registration_required_for: producer.registrationRequiredFor,
    registration_required_for_other: producer.registrationRequiredForOther,
    plain_plastic_sheets_for_food_wrapping: producer.plainPlasticSheetsForFoodWrapping,
    packaging_items: producer.packagingItems,
    number_of_machines: producer.numberOfMachines,
    total_capacity_value: producer.totalCapacityValue,
    date_of_setting_up: producer.dateOfSettingUp,
    total_waste_generated_value: producer.totalWasteGeneratedValue,
    has_waste_storage_capacity: producer.hasWasteStorageCapacity,
    waste_disposal_provision: producer.wasteDisposalProvision,
    registration_required_for_other_other_text: producer.registrationRequiredForOtherOtherText,
    created_at: producer.createdAt,
  }
}

export function serializeConsumer(consumer: any) {
  if (!consumer) return null
  return {
    id: consumer.numericId,
    applicant: consumer.applicantId,
    registration_required_for: consumer.registrationRequiredFor,
    registration_required_for_other: consumer.registrationRequiredForOther,
    plain_plastic_sheets_for_food_wrapping: consumer.plainPlasticSheetsForFoodWrapping,
    packaging_items: consumer.packagingItems,
    consumption: consumer.consumption,
    provision_waste_disposal_bins: consumer.provisionWasteDisposalBins,
    no_of_waste_disposable_bins: consumer.noOfWasteDisposableBins,
    segregated_plastics_handed_over_to_registered_recyclers: consumer.segregatedPlasticsHandedOverToRegisteredRecyclers,
    registration_required_for_other_other_text: consumer.registrationRequiredForOtherOtherText,
    created_at: consumer.createdAt,
  }
}

export function serializeCollector(collector: any) {
  if (!collector) return null
  return {
    id: collector.numericId,
    applicant: collector.applicantId,
    registration_required_for: collector.registrationRequiredFor,
    registration_required_for_other: collector.registrationRequiredForOther,
    selected_categories: collector.selectedCategories,
    total_capacity_value: collector.totalCapacityValue,
    number_of_vehicles: collector.numberOfVehicles,
    number_of_persons: collector.numberOfPersons,
    registration_required_for_other_other_text: collector.registrationRequiredForOtherOtherText,
    created_at: collector.createdAt,
  }
}

export function serializeRecycler(recycler: any) {
  if (!recycler) return null
  return {
    id: recycler.numericId,
    applicant: recycler.applicantId,
    selected_categories: recycler.selectedCategories,
    plastic_waste_acquired_through: recycler.plasticWasteAcquiredThrough,
    has_adequate_pollution_control_systems: recycler.hasAdequatePollutionControlSystems,
    pollution_control_details: recycler.pollutionControlDetails,
    registration_required_for_other_other_text: recycler.registrationRequiredForOtherOtherText,
    created_at: recycler.createdAt,
  }
}

export function serializeAssignment(assignment: any) {
  if (!assignment) return null
  return {
    id: assignment.numericId,
    applicant: assignment.applicantId,
    assigned_group: assignment.assignedGroup,
    remarks: assignment.remarks,
    created_at: assignment.createdAt,
    updated_at: assignment.updatedAt,
  }
}

export function serializeApplicantDocument(doc: any, documentUrl?: string) {
  if (!doc) return null
  const resolvedUrl =
    documentUrl ||
    (doc.documentPath
      ? doc.documentPath.startsWith('media/')
        ? `/api/pmc/media/${doc.documentPath.replace('media/', '')}`
        : `/api/pmc/media/${doc.documentPath}`
      : undefined)
  return {
    id: doc.numericId,
    applicant: doc.applicantId,
    document: resolvedUrl,
    document_description: doc.documentDescription,
    created_at: doc.createdAt,
  }
}

export function serializeApplicantFieldResponse(resp: any) {
  if (!resp) return null
  return {
    id: resp.numericId,
    applicant: resp.applicantId,
    field_key: resp.fieldKey,
    response: resp.response,
    comment: resp.comment,
    created_at: resp.createdAt,
  }
}

export function serializeApplicantManualFields(fields: any) {
  if (!fields) return null
  return {
    id: fields.numericId,
    applicant: fields.applicantId,
    latitude: fields.latitude,
    longitude: fields.longitude,
    list_of_products: fields.listOfProducts,
    list_of_by_products: fields.listOfByProducts,
    raw_material_imported: fields.rawMaterialImported,
    seller_name_if_raw_material_bought: fields.sellerNameIfRawMaterialBought,
    self_import_details: fields.selfImportDetails,
    raw_material_utilized: fields.rawMaterialUtilized,
    compliance_thickness_75: fields.complianceThickness75,
    valid_consent_permit_building_bylaws: fields.validConsentPermitBuildingBylaws,
    stockist_distributor_list: fields.stockistDistributorList,
    procurement_per_day: fields.procurementPerDay,
    no_of_workers: fields.noOfWorkers,
    labor_dept_registration_status: fields.laborDeptRegistrationStatus,
    occupational_safety_and_health_facilities: fields.occupationalSafetyAndHealthFacilities,
    adverse_environmental_impacts: fields.adverseEnvironmentalImpacts,
    created_at: fields.createdAt,
    updated_at: fields.updatedAt,
  }
}
