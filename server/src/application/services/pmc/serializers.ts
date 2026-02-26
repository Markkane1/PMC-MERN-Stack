function pick(obj: any, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export function serializeBusinessProfile(profile: any) {
  if (!profile) return null
  return {
    id: pick(profile, 'numericId', 'numeric_id', 'id'),
    applicant: pick(profile, 'applicantId', 'applicant_id'),
    entity_type: pick(profile, 'entityType', 'entity_type'),
    tracking_number: pick(profile, 'trackingNumber', 'tracking_number'),
    name: pick(profile, 'name'),
    ntn_strn_pra_no_individual: pick(profile, 'ntnStrnPraNoIndividual', 'ntn_strn_pra_no_individual'),
    business_name: pick(profile, 'businessName', 'business_name'),
    business_registration_type: pick(profile, 'businessRegistrationType', 'business_registration_type'),
    business_registration_no: pick(profile, 'businessRegistrationNo', 'business_registration_no'),
    ntn_strn_pra_no_company: pick(profile, 'ntnStrnPraNoCompany', 'ntn_strn_pra_no_company'),
    working_days: pick(profile, 'workingDays', 'working_days'),
    commencement_date: pick(profile, 'commencementDate', 'commencement_date'),
    no_of_workers: pick(profile, 'noOfWorkers', 'no_of_workers'),
    district: pick(profile, 'districtId', 'district_id'),
    tehsil: pick(profile, 'tehsilId', 'tehsil_id'),
    city_town_village: pick(profile, 'cityTownVillage', 'city_town_village'),
    postal_address: pick(profile, 'postalAddress', 'postal_address'),
    postal_code: pick(profile, 'postalCode', 'postal_code'),
    location_latitude: pick(profile, 'locationLatitude', 'location_latitude'),
    location_longitude: pick(profile, 'locationLongitude', 'location_longitude'),
    email: pick(profile, 'email'),
    mobile_operator: pick(profile, 'mobileOperator', 'mobile_operator'),
    mobile_no: pick(profile, 'mobileNo', 'mobile_no'),
    phone_no: pick(profile, 'phoneNo', 'phone_no'),
    website_address: pick(profile, 'websiteAddress', 'website_address'),
    created_at: pick(profile, 'createdAt', 'created_at'),
    updated_at: pick(profile, 'updatedAt', 'updated_at'),
  }
}

export function serializeProducer(producer: any) {
  if (!producer) return null
  return {
    id: pick(producer, 'numericId', 'numeric_id', 'id'),
    applicant: pick(producer, 'applicantId', 'applicant_id'),
    tracking_number: pick(producer, 'trackingNumber', 'tracking_number'),
    registration_required_for: pick(producer, 'registrationRequiredFor', 'registration_required_for'),
    registration_required_for_other: pick(producer, 'registrationRequiredForOther', 'registration_required_for_other'),
    plain_plastic_sheets_for_food_wrapping: pick(
      producer,
      'plainPlasticSheetsForFoodWrapping',
      'plain_plastic_sheets_for_food_wrapping'
    ),
    packaging_items: pick(producer, 'packagingItems', 'packaging_items'),
    number_of_machines: pick(producer, 'numberOfMachines', 'number_of_machines'),
    total_capacity_value: pick(producer, 'totalCapacityValue', 'total_capacity_value'),
    date_of_setting_up: pick(producer, 'dateOfSettingUp', 'date_of_setting_up'),
    total_waste_generated_value: pick(producer, 'totalWasteGeneratedValue', 'total_waste_generated_value'),
    has_waste_storage_capacity: pick(producer, 'hasWasteStorageCapacity', 'has_waste_storage_capacity'),
    waste_disposal_provision: pick(producer, 'wasteDisposalProvision', 'waste_disposal_provision'),
    registration_required_for_other_other_text: pick(
      producer,
      'registrationRequiredForOtherOtherText',
      'registration_required_for_other_other_text'
    ),
    created_at: pick(producer, 'createdAt', 'created_at'),
  }
}

export function serializeConsumer(consumer: any) {
  if (!consumer) return null
  return {
    id: pick(consumer, 'numericId', 'numeric_id', 'id'),
    applicant: pick(consumer, 'applicantId', 'applicant_id'),
    registration_required_for: pick(consumer, 'registrationRequiredFor', 'registration_required_for'),
    registration_required_for_other: pick(consumer, 'registrationRequiredForOther', 'registration_required_for_other'),
    plain_plastic_sheets_for_food_wrapping: pick(
      consumer,
      'plainPlasticSheetsForFoodWrapping',
      'plain_plastic_sheets_for_food_wrapping'
    ),
    packaging_items: pick(consumer, 'packagingItems', 'packaging_items'),
    consumption: pick(consumer, 'consumption'),
    provision_waste_disposal_bins: pick(consumer, 'provisionWasteDisposalBins', 'provision_waste_disposal_bins'),
    no_of_waste_disposable_bins: pick(consumer, 'noOfWasteDisposableBins', 'no_of_waste_disposable_bins'),
    segregated_plastics_handed_over_to_registered_recyclers: pick(
      consumer,
      'segregatedPlasticsHandedOverToRegisteredRecyclers',
      'segregated_plastics_handed_over_to_registered_recyclers'
    ),
    registration_required_for_other_other_text: pick(
      consumer,
      'registrationRequiredForOtherOtherText',
      'registration_required_for_other_other_text'
    ),
    created_at: pick(consumer, 'createdAt', 'created_at'),
  }
}

export function serializeCollector(collector: any) {
  if (!collector) return null
  return {
    id: pick(collector, 'numericId', 'numeric_id', 'id'),
    applicant: pick(collector, 'applicantId', 'applicant_id'),
    registration_required_for: pick(collector, 'registrationRequiredFor', 'registration_required_for'),
    registration_required_for_other: pick(collector, 'registrationRequiredForOther', 'registration_required_for_other'),
    selected_categories: pick(collector, 'selectedCategories', 'selected_categories'),
    total_capacity_value: pick(collector, 'totalCapacityValue', 'total_capacity_value'),
    number_of_vehicles: pick(collector, 'numberOfVehicles', 'number_of_vehicles'),
    number_of_persons: pick(collector, 'numberOfPersons', 'number_of_persons'),
    registration_required_for_other_other_text: pick(
      collector,
      'registrationRequiredForOtherOtherText',
      'registration_required_for_other_other_text'
    ),
    created_at: pick(collector, 'createdAt', 'created_at'),
  }
}

export function serializeRecycler(recycler: any) {
  if (!recycler) return null
  return {
    id: pick(recycler, 'numericId', 'numeric_id', 'id'),
    applicant: pick(recycler, 'applicantId', 'applicant_id'),
    selected_categories: pick(recycler, 'selectedCategories', 'selected_categories'),
    plastic_waste_acquired_through: pick(recycler, 'plasticWasteAcquiredThrough', 'plastic_waste_acquired_through'),
    has_adequate_pollution_control_systems: pick(
      recycler,
      'hasAdequatePollutionControlSystems',
      'has_adequate_pollution_control_systems'
    ),
    pollution_control_details: pick(recycler, 'pollutionControlDetails', 'pollution_control_details'),
    registration_required_for_other_other_text: pick(
      recycler,
      'registrationRequiredForOtherOtherText',
      'registration_required_for_other_other_text'
    ),
    created_at: pick(recycler, 'createdAt', 'created_at'),
  }
}

export function serializeAssignment(assignment: any) {
  if (!assignment) return null
  return {
    id: pick(assignment, 'numericId', 'numeric_id', 'id'),
    applicant: pick(assignment, 'applicantId', 'applicant_id'),
    assigned_group: pick(assignment, 'assignedGroup', 'assigned_group'),
    remarks: pick(assignment, 'remarks'),
    created_at: pick(assignment, 'createdAt', 'created_at'),
    updated_at: pick(assignment, 'updatedAt', 'updated_at'),
  }
}

export function serializeApplicantDocument(doc: any, documentUrl?: string) {
  if (!doc) return null
  const documentPath = pick(doc, 'documentPath', 'document')
  const resolvedUrl =
    documentUrl ||
    (documentPath
      ? String(documentPath).startsWith('media/')
        ? `/api/pmc/media/${String(documentPath).replace('media/', '')}`
        : `/api/pmc/media/${documentPath}`
      : undefined)
  return {
    id: pick(doc, 'numericId', 'numeric_id', 'id'),
    applicant: pick(doc, 'applicantId', 'applicant_id'),
    document: resolvedUrl,
    document_description: pick(doc, 'documentDescription', 'document_description'),
    created_at: pick(doc, 'createdAt', 'created_at'),
  }
}

export function serializeApplicantFieldResponse(resp: any) {
  if (!resp) return null
  return {
    id: pick(resp, 'numericId', 'numeric_id', 'id'),
    applicant: pick(resp, 'applicantId', 'applicant_id'),
    field_key: pick(resp, 'fieldKey', 'field_key'),
    response: pick(resp, 'response'),
    comment: pick(resp, 'comment'),
    created_at: pick(resp, 'createdAt', 'created_at'),
  }
}

export function serializeApplicantManualFields(fields: any) {
  if (!fields) return null
  return {
    id: pick(fields, 'numericId', 'numeric_id', 'id'),
    applicant: pick(fields, 'applicantId', 'applicant_id'),
    latitude: pick(fields, 'latitude'),
    longitude: pick(fields, 'longitude'),
    list_of_products: pick(fields, 'listOfProducts', 'list_of_products'),
    list_of_by_products: pick(fields, 'listOfByProducts', 'list_of_by_products'),
    raw_material_imported: pick(fields, 'rawMaterialImported', 'raw_material_imported'),
    seller_name_if_raw_material_bought: pick(
      fields,
      'sellerNameIfRawMaterialBought',
      'seller_name_if_raw_material_bought'
    ),
    self_import_details: pick(fields, 'selfImportDetails', 'self_import_details'),
    raw_material_utilized: pick(fields, 'rawMaterialUtilized', 'raw_material_utilized'),
    compliance_thickness_75: pick(fields, 'complianceThickness75', 'compliance_thickness_75'),
    valid_consent_permit_building_bylaws: pick(
      fields,
      'validConsentPermitBuildingBylaws',
      'valid_consent_permit_building_bylaws'
    ),
    stockist_distributor_list: pick(fields, 'stockistDistributorList', 'stockist_distributor_list'),
    procurement_per_day: pick(fields, 'procurementPerDay', 'procurement_per_day'),
    no_of_workers: pick(fields, 'noOfWorkers', 'no_of_workers'),
    labor_dept_registration_status: pick(fields, 'laborDeptRegistrationStatus', 'labor_dept_registration_status'),
    occupational_safety_and_health_facilities: pick(
      fields,
      'occupationalSafetyAndHealthFacilities',
      'occupational_safety_and_health_facilities'
    ),
    adverse_environmental_impacts: pick(fields, 'adverseEnvironmentalImpacts', 'adverse_environmental_impacts'),
    created_at: pick(fields, 'createdAt', 'created_at'),
    updated_at: pick(fields, 'updatedAt', 'updated_at'),
  }
}
