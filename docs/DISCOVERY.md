# DISCOVERY.md

Generated on: 2026-03-05
Repository: PMC Mernstack (`d:\web temps\PMC Working Project\PMC Mernstack`)

This document is based on direct code inspection only (no code/tests changed).

## 1. API ROUTES

### 1.1 Server Route Mounting and Global Behavior

- Express app factory: `server/src/app.ts`
- Base API mount: `app.use('/api', apiRouter)` where `apiRouter` mounts:
  - `/api/accounts/*` via `accountsRouter`
  - `/api/pmc/*` via `pmcRouter`
  - `/api/cache/*` via `cacheRouter`
  - `/api/*` common via `commonRouter`
- Additional non-`/api` routers:
  - `/monitoring/*` (`monitoringRouter`)
  - `/resilience/*` (`resilienceRouter`)
  - `/ha/*` (`haRouter`)
- Global middleware relevant to route behavior:
  - `helmet()` strict defaults
  - strict CORS allowlist (`env.corsOrigins`)
  - `express.json({ limit: '10kb' })` + `urlencoded({ limit: '10kb' })`
  - `mongoSanitize()` + custom request sanitizers
  - method hardening under `/api`: TRACE/HEAD/non-allowed verbs => `405`
  - auth-route rate-limit (10 attempts / 15 min) and general API limit
- Error response shape (`server/src/interfaces/http/middlewares/error.ts`):
  - Dev: detailed message/debug stack
  - Non-dev: `{ "message": "An error occurred" }`
  - Common status mapping: `400`, `401`, `403`, `404`, `413`, `500`

### 1.2 Authentication and Authorization Rules Used by Routes

- JWT auth middleware: `authenticate`
  - Token from `Authorization: Bearer <token>` OR `pmc_access_token` httpOnly cookie
  - Rejects invalid token, missing `userId`, refresh token type, inactive users -> `401`
- Group RBAC middleware: `requireGroup([...])` -> `403`
- Permission RBAC middleware: `requirePermission([...])` -> `403`
- Mixed auth middleware: `authenticateUserOrService` used for `/api/pmc/payment-intimation/`
  - Supports service token (header or query token) OR user auth path

### 1.3 Active Route Inventory (method + path + auth + handler)

Source files:
- `server/src/interfaces/http/routes/accounts.routes.ts`
- `server/src/interfaces/http/routes/common.routes.ts`
- `server/src/interfaces/http/routes/cache.routes.ts`
- `server/src/interfaces/http/routes/pmc.routes.ts`
- `server/src/infrastructure/monitoring/routes.ts`
- `server/src/infrastructure/resilience/routes.ts`
- `server/src/infrastructure/ha/routes.ts`

- POST /api/accounts/register/ | auth: public | handler: register
- POST /api/accounts/login/ | auth: public | handler: login
- POST /api/accounts/logout/ | auth: public | handler: logout
- GET /api/accounts/profile/ | auth: jwt | handler: profile
- GET /api/accounts/role-dashboard/ | auth: jwt | handler: getRoleDashboardConfig
- PATCH /api/accounts/profile/ | auth: jwt | handler: updateProfile
- POST /api/accounts/reset-password2/ | auth: jwt | handler: resetPassword
- POST /api/accounts/find-user/ | auth: public | handler: findUser
- POST /api/accounts/reset-forgot-password/ | auth: public | handler: resetForgotPassword
- GET /api/accounts/list-inspectors/ | auth: jwt | handler: listInspectors
- POST /api/accounts/create-update-inpsector-user/ | auth: jwt | handler: createOrUpdateInspector
- GET /api/accounts/generate-captcha/ | auth: public | handler: generateCaptcha
- GET /api/accounts/admin/permissions/ | auth: jwt + group ['Admin', 'Super'] | handler: listPermissions
- POST /api/accounts/admin/permissions/reset/ | auth: jwt + group ['Super'] | handler: resetPermissions
- PUT /api/accounts/admin/role-dashboard/ | auth: jwt + group ['Admin', 'Super'] | handler: updateRoleDashboardConfig
- GET /api/accounts/admin/groups/ | auth: jwt + group ['Admin', 'Super'] | handler: listGroups
- POST /api/accounts/admin/groups/ | auth: jwt + group ['Admin', 'Super'] | handler: createGroup
- PATCH /api/accounts/admin/groups/:id/ | auth: jwt + group ['Admin', 'Super'] | handler: updateGroup
- DELETE /api/accounts/admin/groups/:id/ | auth: jwt + group ['Admin', 'Super'] | handler: deleteGroup
- GET /api/accounts/admin/users/ | auth: jwt + group ['Admin', 'Super'] | handler: listUsers
- PATCH /api/accounts/admin/users/:id/ | auth: jwt + group ['Admin', 'Super'] | handler: updateUser
- DELETE /api/accounts/admin/users/:id/ | auth: jwt + group ['Super'] | handler: deleteUser
- POST /api/accounts/admin/users/:id/reset-password/ | auth: jwt + group ['Admin', 'Super'] | handler: resetUserPassword
- GET /api/accounts/admin/superadmins/ | auth: jwt + group ['Super'] | handler: listSuperadmins
- POST /api/accounts/admin/superadmins/ | auth: jwt + group ['Super'] | handler: createSuperadmin
- PATCH /api/accounts/admin/superadmins/:id/ | auth: jwt + group ['Super'] | handler: updateSuperadmin
- DELETE /api/accounts/admin/superadmins/:id/ | auth: jwt + group ['Super'] | handler: deleteSuperadmin
- GET /api/accounts/admin/api-logs/ | auth: jwt + group ['Admin', 'Super'] | handler: listApiLogs
- GET /api/accounts/admin/audit-logs/ | auth: jwt + group ['Admin', 'Super'] | handler: listAuditLogs
- GET /api/accounts/admin/access-logs/ | auth: jwt + group ['Admin', 'Super'] | handler: listAccessLogs
- GET /api/accounts/admin/service-configs/ | auth: jwt + group ['Admin', 'Super'] | handler: listServiceConfigurations
- POST /api/accounts/admin/service-configs/ | auth: jwt + group ['Admin', 'Super'] | handler: createServiceConfiguration
- PATCH /api/accounts/admin/service-configs/:id/ | auth: jwt + group ['Admin', 'Super'] | handler: updateServiceConfiguration
- GET /api/accounts/admin/external-tokens/ | auth: jwt + group ['Admin', 'Super'] | handler: listExternalTokens
- GET /api/notification/list | auth: jwt | handler: listNotifications
- GET /api/notification/count | auth: jwt | handler: notificationCount
- GET /api/search/query | auth: jwt | handler: searchQuery
- GET /api/cache/health | auth: public | handler: (multi-line/inline)
- GET /api/cache/stats | auth: public | handler: (multi-line/inline)
- POST /api/cache/clear | auth: public | handler: (multi-line/inline)
- GET /api/pmc/applicant-detail/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: listApplicants
- GET /api/pmc/applicant-detail/:id/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: getApplicant
- POST /api/pmc/applicant-detail/ | auth: jwt + perm ['pmc.add_applicantdetail'] | handler: createApplicant
- PATCH /api/pmc/applicant-detail/:id/ | auth: jwt + perm ['pmc.change_applicantdetail'] | handler: updateApplicant
- DELETE /api/pmc/applicant-detail/:id/ | auth: jwt + perm ['pmc.delete_applicantdetail'] | handler: deleteApplicant
- GET /api/pmc/applicant-detail-main-list/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: listApplicantsMain
- GET /api/pmc/applicant-detail-main-do-list/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: listApplicantsMainDO
- GET /api/pmc/business-profiles/ | auth: jwt + perm ['pmc.view_businessprofile'] | handler: businessProfileController.list
- GET /api/pmc/business-profiles/:id/ | auth: jwt + perm ['pmc.view_businessprofile'] | handler: businessProfileController.get
- GET /api/pmc/business-profiles/by_applicant/ | auth: jwt + perm ['pmc.view_businessprofile'] | handler: getBusinessProfilesByApplicant
- POST /api/pmc/business-profiles/ | auth: jwt + perm ['pmc.add_businessprofile'] | handler: createBusinessProfile
- PATCH /api/pmc/business-profiles/:id/ | auth: jwt + perm ['pmc.change_businessprofile'] | handler: updateBusinessProfile
- DELETE /api/pmc/business-profiles/:id/ | auth: jwt + perm ['pmc.delete_businessprofile'] | handler: businessProfileController.remove
- GET /api/pmc/plastic-items/ | auth: jwt + perm ['pmc.view_plasticitem'] | handler: plasticItemsController.list
- GET /api/pmc/plastic-items/:id/ | auth: jwt + perm ['pmc.view_plasticitem'] | handler: plasticItemsController.get
- POST /api/pmc/plastic-items/ | auth: jwt + perm ['pmc.add_plasticitem'] | handler: plasticItemsController.create
- PATCH /api/pmc/plastic-items/:id/ | auth: jwt + perm ['pmc.change_plasticitem'] | handler: plasticItemsController.update
- DELETE /api/pmc/plastic-items/:id/ | auth: jwt + perm ['pmc.delete_plasticitem'] | handler: plasticItemsController.remove
- GET /api/pmc/products/ | auth: jwt + perm ['pmc.view_product'] | handler: productsController.list
- GET /api/pmc/products/:id/ | auth: jwt + perm ['pmc.view_product'] | handler: productsController.get
- POST /api/pmc/products/ | auth: jwt + perm ['pmc.add_product'] | handler: productsController.create
- PATCH /api/pmc/products/:id/ | auth: jwt + perm ['pmc.change_product'] | handler: productsController.update
- DELETE /api/pmc/products/:id/ | auth: jwt + perm ['pmc.delete_product'] | handler: productsController.remove
- GET /api/pmc/by-products/ | auth: jwt + perm ['pmc.view_byproduct'] | handler: byProductsController.list
- GET /api/pmc/by-products/:id/ | auth: jwt + perm ['pmc.view_byproduct'] | handler: byProductsController.get
- POST /api/pmc/by-products/ | auth: jwt + perm ['pmc.add_byproduct'] | handler: byProductsController.create
- PATCH /api/pmc/by-products/:id/ | auth: jwt + perm ['pmc.change_byproduct'] | handler: byProductsController.update
- DELETE /api/pmc/by-products/:id/ | auth: jwt + perm ['pmc.delete_byproduct'] | handler: byProductsController.remove
- GET /api/pmc/producers/ | auth: jwt + perm ['pmc.view_producer'] | handler: producersController.list
- GET /api/pmc/producers/:id/ | auth: jwt + perm ['pmc.view_producer'] | handler: producersController.get
- POST /api/pmc/producers/ | auth: jwt + perm ['pmc.add_producer'] | handler: producersController.create
- PATCH /api/pmc/producers/:id/ | auth: jwt + perm ['pmc.change_producer'] | handler: producersController.update
- DELETE /api/pmc/producers/:id/ | auth: jwt + perm ['pmc.delete_producer'] | handler: producersController.remove
- GET /api/pmc/consumers/ | auth: jwt + perm ['pmc.view_consumer'] | handler: consumersController.list
- GET /api/pmc/consumers/:id/ | auth: jwt + perm ['pmc.view_consumer'] | handler: consumersController.get
- POST /api/pmc/consumers/ | auth: jwt + perm ['pmc.add_consumer'] | handler: consumersController.create
- PATCH /api/pmc/consumers/:id/ | auth: jwt + perm ['pmc.change_consumer'] | handler: consumersController.update
- DELETE /api/pmc/consumers/:id/ | auth: jwt + perm ['pmc.delete_consumer'] | handler: consumersController.remove
- GET /api/pmc/collectors/ | auth: jwt + perm ['pmc.view_collector'] | handler: collectorsController.list
- GET /api/pmc/collectors/:id/ | auth: jwt + perm ['pmc.view_collector'] | handler: collectorsController.get
- POST /api/pmc/collectors/ | auth: jwt + perm ['pmc.add_collector'] | handler: collectorsController.create
- PATCH /api/pmc/collectors/:id/ | auth: jwt + perm ['pmc.change_collector'] | handler: collectorsController.update
- DELETE /api/pmc/collectors/:id/ | auth: jwt + perm ['pmc.delete_collector'] | handler: collectorsController.remove
- GET /api/pmc/recyclers/ | auth: jwt + perm ['pmc.view_recycler'] | handler: recyclersController.list
- GET /api/pmc/recyclers/:id/ | auth: jwt + perm ['pmc.view_recycler'] | handler: recyclersController.get
- POST /api/pmc/recyclers/ | auth: jwt + perm ['pmc.add_recycler'] | handler: recyclersController.create
- PATCH /api/pmc/recyclers/:id/ | auth: jwt + perm ['pmc.change_recycler'] | handler: recyclersController.update
- DELETE /api/pmc/recyclers/:id/ | auth: jwt + perm ['pmc.delete_recycler'] | handler: recyclersController.remove
- GET /api/pmc/raw-materials/ | auth: jwt + perm ['pmc.view_rawmaterial'] | handler: rawMaterialsController.list
- GET /api/pmc/raw-materials/:id/ | auth: jwt + perm ['pmc.view_rawmaterial'] | handler: rawMaterialsController.get
- POST /api/pmc/raw-materials/ | auth: jwt + perm ['pmc.add_rawmaterial'] | handler: rawMaterialsController.create
- PATCH /api/pmc/raw-materials/:id/ | auth: jwt + perm ['pmc.change_rawmaterial'] | handler: rawMaterialsController.update
- DELETE /api/pmc/raw-materials/:id/ | auth: jwt + perm ['pmc.delete_rawmaterial'] | handler: rawMaterialsController.remove
- GET /api/pmc/applicant-documents/ | auth: jwt + perm ['pmc.view_applicantdocument'] | handler: listApplicantDocuments
- GET /api/pmc/applicant-documents/:id/ | auth: jwt + perm ['pmc.view_applicantdocument'] | handler: getApplicantDocument
- POST /api/pmc/applicant-documents/ | auth: jwt + perm ['pmc.add_applicantdocument'] | handler: ...uploadApplicantDocument
- PATCH /api/pmc/applicant-documents/:id/ | auth: jwt + perm ['pmc.change_applicantdocument'] | handler: updateApplicantDocument
- DELETE /api/pmc/applicant-documents/:id/ | auth: jwt + perm ['pmc.delete_applicantdocument'] | handler: deleteApplicantDocument
- GET /api/pmc/district-documents/ | auth: jwt + perm ['pmc.view_districtplasticcommitteedocument'] | handler: listDistrictDocuments
- GET /api/pmc/district-documents/:id/ | auth: jwt + perm ['pmc.view_districtplasticcommitteedocument'] | handler: getDistrictDocument
- POST /api/pmc/district-documents/ | auth: jwt + perm ['pmc.add_districtplasticcommitteedocument'] | handler: ...uploadDistrictDocument
- PATCH /api/pmc/district-documents/:id/ | auth: jwt + perm ['pmc.change_districtplasticcommitteedocument'] | handler: updateDistrictDocument
- DELETE /api/pmc/district-documents/:id/ | auth: jwt + perm ['pmc.delete_districtplasticcommitteedocument'] | handler: deleteDistrictDocument
- GET /api/pmc/districts/ | auth: jwt + perm ['pmc.view_district'] | handler: listDistricts
- GET /api/pmc/districts-public | auth: public | handler: listDistrictsPublic
- GET /api/pmc/tehsils/ | auth: jwt + perm ['pmc.view_tehsil'] | handler: listTehsils
- GET /api/pmc/applicant-location-public/ | auth: public | handler: applicantLocationPublic
- GET /api/pmc/user-groups/ | auth: jwt | handler: listUserGroups
- GET /api/pmc/application-assignment/ | auth: jwt + perm ['pmc.view_applicationassignment'] | handler: applicationAssignmentController.list
- GET /api/pmc/application-assignment/:id/ | auth: jwt + perm ['pmc.view_applicationassignment'] | handler: applicationAssignmentController.get
- GET /api/pmc/application-assignment/by_applicant/ | auth: jwt + perm ['pmc.view_applicationassignment'] | handler: getApplicationAssignmentByApplicant
- POST /api/pmc/application-assignment/ | auth: jwt + perm ['pmc.add_applicationassignment'] | handler: createApplicationAssignment
- PATCH /api/pmc/application-assignment/:id/ | auth: jwt + perm ['pmc.change_applicationassignment'] | handler: applicationAssignmentController.update
- GET /api/pmc/field-responses/ | auth: jwt + perm ['pmc.view_applicantfieldresponse'] | handler: applicantFieldResponsesController.list
- GET /api/pmc/field-responses/:id/ | auth: jwt + perm ['pmc.view_applicantfieldresponse'] | handler: applicantFieldResponsesController.get
- POST /api/pmc/field-responses/ | auth: jwt + perm ['pmc.add_applicantfieldresponse'] | handler: applicantFieldResponsesController.create
- PATCH /api/pmc/field-responses/:id/ | auth: jwt + perm ['pmc.change_applicantfieldresponse'] | handler: applicantFieldResponsesController.update
- DELETE /api/pmc/field-responses/:id/ | auth: jwt + perm ['pmc.delete_applicantfieldresponse'] | handler: applicantFieldResponsesController.remove
- GET /api/pmc/manual-fields/ | auth: jwt + perm ['pmc.view_applicantmanualfields'] | handler: applicantManualFieldsController.list
- GET /api/pmc/manual-fields/:id/ | auth: jwt + perm ['pmc.view_applicantmanualfields'] | handler: applicantManualFieldsController.get
- POST /api/pmc/manual-fields/ | auth: jwt + perm ['pmc.add_applicantmanualfields'] | handler: applicantManualFieldsController.create
- PATCH /api/pmc/manual-fields/:id/ | auth: jwt + perm ['pmc.change_applicantmanualfields'] | handler: applicantManualFieldsController.update
- DELETE /api/pmc/manual-fields/:id/ | auth: jwt + perm ['pmc.delete_applicantmanualfields'] | handler: applicantManualFieldsController.remove
- GET /api/pmc/fetch-statistics-view-groups/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: listGroupStats
- GET /api/pmc/fetch-statistics-do-view-groups/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: listGroupStatsDo
- GET /api/pmc/applicant-statistics/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: applicantStatistics
- GET /api/pmc/mis-applicant-statistics/ | auth: public | handler: misApplicantStatistics
- GET /api/pmc/mis-district-plastic-stats/ | auth: public | handler: districtPlasticStats
- GET /api/pmc/DistrictByLatLon/ | auth: public | handler: districtByLatLon
- GET /api/pmc/applicant-alerts/ | auth: jwt | handler: applicantAlerts
- GET /api/pmc/track-application/ | auth: public | handler: trackApplication
- GET /api/pmc/report/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: report
- GET /api/pmc/report-fee/ | auth: jwt + perm ['pmc.view_applicantfee', 'pmc.view_applicantdetail'] | handler: reportFee
- GET /api/pmc/export-applicant/ | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: exportApplicant
- GET /api/pmc/psid-report/ | auth: jwt + perm ['pmc.view_psidtracking'] | handler: psidReport
- GET /api/pmc/generate-psid/ | auth: jwt + perm ['pmc.add_psidtracking'] | handler: generatePsid
- GET /api/pmc/check-psid-status/ | auth: jwt | handler: checkPsidStatus
- POST /api/pmc/payment-intimation/ | auth: jwt-or-service-token | handler: paymentIntimation
- POST /api/pmc/plmis-token/ | auth: public | handler: plmisToken
- GET /api/pmc/plmis-token/ | auth: public | handler: (multi-line/inline)
- GET /api/pmc/generate-license-pdf/ | auth: public | handler: generateLicensePdf
- GET /api/pmc/license-pdf/ | auth: public | handler: licensePdf
- GET /api/pmc/license-by-user/ | auth: jwt + perm ['pmc.view_license'] | handler: licenseByUser
- GET /api/pmc/receipt-pdf/ | auth: jwt | handler: receiptPdf
- GET /api/pmc/chalan-pdf/ | auth: jwt | handler: chalanPdf
- POST /api/pmc/receipt-pdf/ | auth: jwt | handler: generateReceiptPdf
- POST /api/pmc/chalan-pdf/ | auth: jwt | handler: chalanPdf
- POST /api/pmc/verify-chalan-qr/ | auth: jwt | handler: verifyChalanQr
- GET /api/pmc/payment-status/:applicantId | auth: jwt | handler: getPaymentStatus
- POST /api/pmc/payment-status/:applicantId | auth: jwt | handler: recordPayment
- GET /api/pmc/check-psid-payment/ | auth: jwt | handler: checkPsidPaymentStatus
- GET /api/pmc/payment-history/:applicantId | auth: jwt | handler: getPaymentHistory
- GET /api/pmc/license-eligibility/:applicantId | auth: jwt | handler: checkLicenseEligibility
- POST /api/pmc/verify-payments | auth: jwt | handler: verifyMultiplePayments
- POST /api/pmc/payment-reminder/:applicantId | auth: jwt | handler: sendPaymentReminder
- GET /api/pmc/payment-summary | auth: jwt | handler: getPaymentSummary
- POST /api/pmc/plmis/initiate | auth: jwt + perm ['pmc.add_psidtracking'] | handler: plmisUseCases.initiatePlmisPayment
- GET /api/pmc/plmis/status/:psidNumber | auth: jwt | handler: plmisUseCases.checkPlmisPaymentStatus
- POST /api/pmc/plmis/verify | auth: jwt + perm ['pmc.change_psidtracking'] | handler: plmisUseCases.verifyPlmisPayment
- GET /api/pmc/plmis/receipt/:psidNumber | auth: jwt | handler: plmisUseCases.getPlmisReceipt
- POST /api/pmc/plmis/cancel/:psidNumber | auth: jwt + perm ['pmc.change_psidtracking'] | handler: plmisUseCases.cancelPlmisPayment
- GET /api/pmc/plmis/statistics | auth: jwt + perm ['pmc.view_psidtracking'] | handler: plmisUseCases.getPlmisStatistics
- GET /api/pmc/plmis/health | auth: jwt | handler: plmisUseCases.validatePlmisHealth
- POST /api/pmc/plmis/webhook/payment-confirmed | auth: public | handler: plmisUseCases.plmisPaymentConfirmedWebhook
- POST /api/pmc/plmis/webhook/payment-failed | auth: public | handler: plmisUseCases.plmisPaymentFailedWebhook
- GET /api/pmc/inspection-report/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: listInspectionReports
- GET /api/pmc/inspection-report/district_summary/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: districtSummary
- GET /api/pmc/inspection-report/export-all-inspections-excel/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: exportAllInspectionsExcel
- GET /api/pmc/inspection-report/export-all-inspections-pdf/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: exportAllInspectionsPdf
- GET /api/pmc/inspection-report/export-district-summary-excel/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: exportDistrictSummaryExcel
- GET /api/pmc/inspection-report/export-district-summary-pdf/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: exportDistrictSummaryPdf
- POST /api/pmc/inspection-report/ | auth: jwt + perm ['pmc.add_inspectionreport'] | handler: ...createInspectionReport
- GET /api/pmc/inspection-report/:id/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: getInspectionReport
- PATCH /api/pmc/inspection-report/:id/ | auth: jwt + perm ['pmc.change_inspectionreport'] | handler: ...updateInspectionReport
- DELETE /api/pmc/inspection-report/:id/ | auth: jwt + perm ['pmc.delete_inspectionreport'] | handler: deleteInspectionReport
- GET /api/pmc/inspection-report-cached/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: listCachedInspectionReports
- GET /api/pmc/inspection-report-cached/all_other_single_use_plastics/ | auth: jwt + perm ['pmc.view_singleuseplasticssnapshot'] | handler: allOtherSingleUsePlastics
- GET /api/pmc/inspection-report-cached/:id/ | auth: jwt + perm ['pmc.view_inspectionreport'] | handler: getCachedInspectionReport
- POST /api/pmc/inspection-report-cached/ | auth: jwt + perm ['pmc.add_inspectionreport'] | handler: createCachedInspectionReport
- PATCH /api/pmc/inspection-report-cached/:id/ | auth: jwt + perm ['pmc.change_inspectionreport'] | handler: updateCachedInspectionReport
- DELETE /api/pmc/inspection-report-cached/:id/ | auth: jwt + perm ['pmc.delete_inspectionreport'] | handler: deleteCachedInspectionReport
- GET /api/pmc/competition/ | auth: public | handler: listCompetitions
- GET /api/pmc/competition/register/ | auth: jwt + perm ['pmc.view_competitionregistration'] | handler: listCompetitionRegistrations
- GET /api/pmc/competition/register/:id/ | auth: jwt + perm ['pmc.view_competitionregistration'] | handler: getCompetitionRegistrationDetails
- POST /api/pmc/competition/:competitionId/register/ | auth: public | handler: registerCompetition
- POST /api/pmc/competition/register/ | auth: public | handler: registerCompetition
- PATCH /api/pmc/competition/register/:id/ | auth: jwt + perm ['pmc.change_competitionregistration'] | handler: updateCompetitionRegistration
- DELETE /api/pmc/competition/register/:id/ | auth: jwt + perm ['pmc.delete_competitionregistration'] | handler: deleteCompetitionRegistration
- GET /api/pmc/competition/my/registrations | auth: jwt | handler: getMyRegistrations
- GET /api/pmc/competition/generate-label/ | auth: public | handler: generateLabel
- GET /api/pmc/competition/courier-label/:registrationId | auth: jwt | handler: getCourierLabelPdf
- POST /api/pmc/competition/:competitionId/registrations/:registrationId/submit | auth: jwt | handler: submitEntry
- POST /api/pmc/competition/:id/submit | auth: jwt | handler: submitEntry
- GET /api/pmc/competition/:competitionId/registrations/:registrationId/generate-label/ | auth: jwt | handler: generateLabel
- POST /api/pmc/competition/:competitionId/registrations/:registrationId/generate-label/ | auth: jwt | handler: generateLabel
- POST /api/pmc/competition/:competitionId/registrations/:registrationId/score | auth: jwt | handler: scoreSubmission
- POST /api/pmc/competition/:registrationId/score | auth: jwt | handler: scoreSubmission
- GET /api/pmc/competition/:id | auth: public | handler: getCompetition
- GET /api/pmc/idm_districts-club-counts/ | auth: public | handler: districtsClubCounts
- GET /api/pmc/idm_clubs_geojson_all/ | auth: public | handler: clubsGeojsonAll
- GET /api/pmc/idm_clubs/all/ | auth: public | handler: clubsGeojsonAllViewset
- GET /api/pmc/ping/ | auth: public | handler: ping
- POST /api/pmc/verify-chalan/ | auth: public | handler: verifyChalan
- GET /api/pmc/verify-chalan/ | auth: public | handler: (multi-line/inline)
- GET /api/pmc/confiscation-lookup/ | auth: public | handler: confiscationLookup
- GET /api/pmc/media/:folder_name/:file_name/ | auth: public | handler: downloadMedia
- GET /api/pmc/media/:folder_name/:folder_name2/:file_name/ | auth: public | handler: downloadMedia
- GET /api/pmc/export/applicants-payment | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: excelExportUseCases.exportApplicantsWithPayment
- GET /api/pmc/export/competitions | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: excelExportUseCases.exportCompetitionRegistrations
- GET /api/pmc/export/payments | auth: jwt + perm ['pmc.view_applicantfee'] | handler: excelExportUseCases.exportPaymentTransactions
- GET /api/pmc/export/psid-tracking | auth: jwt + perm ['pmc.view_psidtracking'] | handler: excelExportUseCases.exportPsidTracking
- GET /api/pmc/export/courier-labels | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: excelExportUseCases.exportCourierLabels
- GET /api/pmc/export/summary-report | auth: jwt + perm ['pmc.view_applicantdetail'] | handler: excelExportUseCases.exportSummaryReport
- GET /api/pmc/alerts | auth: jwt | handler: alertUseCases.getApplicantAlerts
- GET /api/pmc/alerts/unread-count | auth: jwt | handler: alertUseCases.getUnreadCount
- GET /api/pmc/alerts/:alertId([0-9a-fA-F]{24}) | auth: jwt | handler: alertUseCases.getAlertDetails
- PUT /api/pmc/alerts/:alertId([0-9a-fA-F]{24})/read | auth: jwt | handler: alertUseCases.markAlertAsRead
- PUT /api/pmc/alerts/mark-read/batch | auth: jwt | handler: alertUseCases.markMultipleAsRead
- DELETE /api/pmc/alerts/:alertId([0-9a-fA-F]{24}) | auth: jwt | handler: alertUseCases.deleteAlert
- GET /api/pmc/alerts/preferences | auth: jwt | handler: alertUseCases.getNotificationPreferences
- PUT /api/pmc/alerts/preferences | auth: jwt | handler: alertUseCases.updateNotificationPreferences
- POST /api/pmc/alerts/test | auth: jwt | handler: alertUseCases.sendTestAlert
- GET /api/pmc/alerts/statistics | auth: jwt | handler: alertUseCases.getAlertStatistics
- POST /api/pmc/admin/alerts/create | auth: jwt + perm ['pmc.manage_alerts'] | handler: alertUseCases.adminCreateAlert
- GET /api/pmc/admin/alerts/all | auth: jwt + perm ['pmc.manage_alerts'] | handler: alertUseCases.adminGetAllAlerts
- GET /api/pmc/fields/definitions | auth: jwt | handler: advancedFieldUseCases.getFieldDefinitions
- GET /api/pmc/fields/definitions/:fieldId | auth: jwt | handler: advancedFieldUseCases.getFieldDefinition
- POST /api/pmc/fields/validate | auth: jwt | handler: advancedFieldUseCases.validateFieldValue
- POST /api/pmc/fields/responses | auth: jwt | handler: advancedFieldUseCases.saveFieldResponses
- GET /api/pmc/fields/responses | auth: jwt | handler: advancedFieldUseCases.getApplicantResponses
- GET /api/pmc/fields/completion-status | auth: jwt | handler: advancedFieldUseCases.getCompletionStatus
- POST /api/pmc/fields/evaluate-conditions | auth: jwt | handler: advancedFieldUseCases.evaluateConditions
- GET /api/pmc/fields/audit-log/:fieldId | auth: jwt | handler: advancedFieldUseCases.getFieldAuditLog
- GET /api/pmc/fields/sections | auth: jwt | handler: advancedFieldUseCases.getAllSections
- GET /api/pmc/fields/sections/:sectionId | auth: jwt | handler: advancedFieldUseCases.getSectionWithFields
- POST /api/pmc/admin/fields/definitions | auth: jwt + perm ['pmc.manage_fields'] | handler: advancedFieldUseCases.adminCreateFieldDefinition
- PUT /api/pmc/admin/fields/definitions/:fieldId | auth: jwt + perm ['pmc.manage_fields'] | handler: advancedFieldUseCases.adminUpdateFieldDefinition
- DELETE /api/pmc/admin/fields/definitions/:fieldId | auth: jwt + perm ['pmc.manage_fields'] | handler: advancedFieldUseCases.adminDeleteFieldDefinition
- POST /api/pmc/admin/fields/bulk-update | auth: jwt + perm ['pmc.manage_fields'] | handler: advancedFieldUseCases.adminBulkUpdateFields
- GET /monitoring/metrics | auth: public | handler: (multi-line/inline)
- GET /monitoring/dashboard | auth: public | handler: (multi-line/inline)
- GET /monitoring/health | auth: public | handler: (multi-line/inline)
- GET /monitoring/endpoints | auth: public | handler: (multi-line/inline)
- GET /monitoring/endpoints/:method/* | auth: public | handler: (multi-line/inline)
- GET /monitoring/cache | auth: public | handler: (multi-line/inline)
- GET /monitoring/database | auth: public | handler: (multi-line/inline)
- GET /monitoring/system | auth: public | handler: (multi-line/inline)
- GET /monitoring/report | auth: public | handler: (multi-line/inline)
- GET /monitoring/alerts | auth: public | handler: (multi-line/inline)
- POST /monitoring/reset | auth: public | handler: (multi-line/inline)
- GET /monitoring/summary | auth: public | handler: (multi-line/inline)
- GET /resilience/rate-limits | auth: public | handler: (multi-line/inline)
- GET /resilience/rate-limits/ip/:ip | auth: public | handler: (multi-line/inline)
- GET /resilience/rate-limits/endpoint | auth: public | handler: (multi-line/inline)
- DELETE /resilience/rate-limits/reset | auth: public | handler: (multi-line/inline)
- GET /resilience/circuit-breakers | auth: public | handler: (multi-line/inline)
- POST /resilience/circuit-breakers/:name/reset | auth: public | handler: (multi-line/inline)
- POST /resilience/circuit-breakers/reset-all | auth: public | handler: (multi-line/inline)
- GET /resilience/resilience/summary | auth: public | handler: (multi-line/inline)
- GET /resilience/resilience/health | auth: public | handler: (multi-line/inline)
- GET /resilience/resilience/strategies | auth: public | handler: (multi-line/inline)
- GET /ha/load-balancer/nodes | auth: public | handler: (multi-line/inline)
- POST /ha/load-balancer/nodes | auth: public | handler: (multi-line/inline)
- DELETE /ha/load-balancer/nodes/:nodeId | auth: public | handler: (multi-line/inline)
- GET /ha/service-registry/services | auth: public | handler: (multi-line/inline)
- GET /ha/service-registry/services/:serviceName | auth: public | handler: (multi-line/inline)
- POST /ha/service-registry/register | auth: public | handler: (multi-line/inline)
- DELETE /ha/service-registry/deregister/:serviceName/:instanceId | auth: public | handler: (multi-line/inline)
- GET /ha/health-checks | auth: public | handler: (multi-line/inline)
- POST /ha/health-checks/run | auth: public | handler: (multi-line/inline)
- GET /ha/ha/status | auth: public | handler: (multi-line/inline)
- GET /ha/ha/readiness | auth: public | handler: (multi-line/inline)
- GET /ha/ha/liveness | auth: public | handler: (multi-line/inline)

- GET /api/pmc/download_latest_document/ | auth: jwt + perm ['pmc.view_applicantdocument'] | handler: downloadLatestApplicantDocument
- POST /ha/service-registry/heartbeat/:serviceName/:instanceId | auth: public | handler: serviceRegistry.heartbeat

### 1.4 Request/Param/Query Contracts and Success/Error Behavior

Contracts below map to the handlers used above.

#### A) Accounts Auth (`AuthUseCases.ts`)

- `POST /api/accounts/register/`
  - Body: `username`, `password`, optional `first_name`, `last_name`, `captcha_input`, `captcha_token`
  - Success: `201` `{ id, username }`
  - Errors: `400` (validation/captcha/duplicate username)
- `POST /api/accounts/login/`
  - Body: `username`, `password`, optional captcha fields
  - Success: `200` signed-in message + user object; sets `pmc_access_token` cookie
  - Errors: `400` captcha failure; `401` invalid credentials
- `POST /api/accounts/logout/`
  - Auth: public route; clears auth cookie if present
  - Success: `200 { message: 'Signed out' }`
- `GET /api/accounts/profile/`
  - Auth required
  - Success: user profile payload with groups/permissions
  - Errors: `401`, `404`
- `PATCH /api/accounts/profile/`
  - Auth required
  - Body: `first_name`, `last_name`
  - Success: updated profile
  - Errors: `401`, `404`
- `POST /api/accounts/reset-password2/`
  - Auth required
  - Body: `current_password`, `new_password`
  - Success: password updated message
  - Errors: `400`, `401`, `404`
- `POST /api/accounts/find-user/`
  - Body: `tracking_number` OR `psid`, and `mobile_number`, `cnic`
  - Success: `{ username }`
  - Errors: `400`, `404`
- `POST /api/accounts/reset-forgot-password/`
  - Body: `tracking_number` OR `psid`, `mobile_number`, `cnic`, `username`, `new_password`
  - Success: password reset message
  - Errors: `400`, `404`
- `GET /api/accounts/list-inspectors/`
  - Auth required (`DO` group check inside handler)
  - Success: inspector list for caller district
  - Errors: `403`, `400`
- `POST /api/accounts/create-update-inpsector-user/`
  - Auth required (`DO` group)
  - Body: `user_id` (optional), `username`, `password` (required for create), `first_name`, `last_name`
  - Success: `200/201` message
  - Errors: `400`, `403`
- `GET /api/accounts/generate-captcha/`
  - Success: `{ captcha_image, captcha_token }`

#### B) Accounts Admin (`AdminUseCases.ts`)

- Admin routes are role-gated by `requireGroup(['Admin','Super'])` or `['Super']`.
- Group management:
  - `GET/POST /api/accounts/admin/groups/`
  - `PATCH/DELETE /api/accounts/admin/groups/:id/`
  - Body for create/update: `name`, `permissions[]`
- User management:
  - `GET /api/accounts/admin/users/`
  - `PATCH /api/accounts/admin/users/:id/` body supports `groups[]`, `direct_permissions[]`, `is_active`
  - `DELETE /api/accounts/admin/users/:id/` (Super only)
  - `POST /api/accounts/admin/users/:id/reset-password/` body: `new_password`
- Superadmin management:
  - `GET/POST /api/accounts/admin/superadmins/`
  - `PATCH/DELETE /api/accounts/admin/superadmins/:id/`
- Permissions reset/list:
  - `GET /api/accounts/admin/permissions/`
  - `POST /api/accounts/admin/permissions/reset/` (Super only)
- Role dashboard mapping:
  - `GET /api/accounts/role-dashboard/`
  - `PUT /api/accounts/admin/role-dashboard/` body: `mappings` object
- Logs/config:
  - `GET /api/accounts/admin/api-logs/` query: `service`, `endpoint`, `status`, `from`, `to`, `page`, `limit`
  - `GET /api/accounts/admin/audit-logs/` query: `user`, `action`, `model`, date range, paging
  - `GET /api/accounts/admin/access-logs/` query: `user`, `model`, `method`, `endpoint`, date range, paging
  - `GET/POST /api/accounts/admin/service-configs/`
  - `PATCH /api/accounts/admin/service-configs/:id/`
  - `GET /api/accounts/admin/external-tokens/` query optional `service`
- Success patterns: list endpoints return arrays/`{items,total,page,limit}`; mutations return updated object/message.
- Error patterns: `400` invalid IDs/inputs, `403` forbidden, `404` not found, `500` internal failures.

#### C) Common API (`CommonApiUseCases.ts`)

- `GET /api/notification/list` (auth): user alert feed array
- `GET /api/notification/count` (auth): `{ count }`
- `GET /api/search/query` (auth): query param `query`; returns grouped search results

#### D) Cache API (`cache.routes.ts`)

- `GET /api/cache/health`: redis/cache health + stats
- `GET /api/cache/stats`: cache stats
- `POST /api/cache/clear`: clears all cache keys
- Current state: no explicit auth middleware (public management surface)

#### E) PMC CRUD Family (`createCrudController` and `ResourceUseCases`)

Applies to many `/api/pmc/*` resources (applicant-detail, business-profiles, plastic-items, products, by-products, producers, consumers, collectors, recyclers, raw-materials, field-responses, manual-fields, application-assignment, documents, inspections-cached, competition-register admin ops):

- List routes (`GET /resource/`)
  - Query commonly supports pagination (`page`, `page_size`/`limit`) where enabled
  - Success: array or paginated response
- Detail routes (`GET /resource/:id/`)
  - Success: object
  - Errors: `404` if missing
- Create routes (`POST /resource/`)
  - Body: mapped from request body/form-data by each resource mapper
  - Success: `201` created object/array
- Update routes (`PATCH /resource/:id/`)
  - Success: updated object
  - Errors: `404` if missing
- Delete routes (`DELETE /resource/:id/`)
  - Success: `204`
  - Errors: `404` if missing

#### F) Applicant/Tracking/Statistics (`ApplicantUseCases.ts`, `CommonUseCases.ts`, `StatisticsUseCases.ts`)

- Applicant lists/detail:
  - `GET /api/pmc/applicant-detail/`
  - `GET /api/pmc/applicant-detail/:id/`
  - Main list query fields include: `compact`, `page`, `page_size|limit`, `assigned_group`, `application_status`
- Tracking + alerts:
  - `GET /api/pmc/track-application/?tracking_number=...`
  - `GET /api/pmc/applicant-alerts/`
- District/tehsil/public geo:
  - `GET /api/pmc/districts/`, `/districts-public`, `/tehsils/?district_id=...`, `/applicant-location-public/`, `/DistrictByLatLon/?lat=...&lon=...`
- Statistics/reporting:
  - `/fetch-statistics-view-groups/`, `/fetch-statistics-do-view-groups/`, `/applicant-statistics/`, `/mis-applicant-statistics/`, `/mis-district-plastic-stats/`

#### G) Documents/Media (`DocumentsUseCases.ts` + query handlers)

- Applicant docs:
  - `GET/POST /api/pmc/applicant-documents/`
  - `GET/PATCH/DELETE /api/pmc/applicant-documents/:id/`
  - Upload body (multipart) includes applicant refs and file payload
- District docs:
  - `GET/POST /api/pmc/district-documents/`
  - `GET/PATCH/DELETE /api/pmc/district-documents/:id/`
- Downloads/media:
  - `GET /api/pmc/download_latest_document/`
  - `GET /api/pmc/media/:folder_name/:file_name/` and nested variant

#### H) Payment/PSID/License/PDF/PLMIS

- PSID core:
  - `GET /api/pmc/generate-psid/?applicant_id=...`
  - `GET /api/pmc/check-psid-status/?applicant_id=...`
  - `POST /api/pmc/payment-intimation/` (jwt OR service token)
  - `GET|POST /api/pmc/plmis-token/`
- Payment status:
  - `GET|POST /api/pmc/payment-status/:applicantId`
  - `GET /api/pmc/check-psid-payment/?psidNumber=...`
  - `GET /api/pmc/payment-history/:applicantId`
  - `GET /api/pmc/license-eligibility/:applicantId`
  - `POST /api/pmc/verify-payments` body: `payments[]`
  - `POST /api/pmc/payment-reminder/:applicantId` body supports reminder options
  - `GET /api/pmc/payment-summary?districtId=...`
- License/PDF:
  - `GET /api/pmc/generate-license-pdf/`
  - `GET /api/pmc/license-pdf/`
  - `GET /api/pmc/license-by-user/` (auth+perm)
  - `GET|POST /api/pmc/receipt-pdf/`, `GET|POST /api/pmc/chalan-pdf/`
  - `POST /api/pmc/verify-chalan-qr/`
- PLMIS integration:
  - `POST /api/pmc/plmis/initiate`
  - `GET /api/pmc/plmis/status/:psidNumber`
  - `POST /api/pmc/plmis/verify`
  - `GET /api/pmc/plmis/receipt/:psidNumber`
  - `POST /api/pmc/plmis/cancel/:psidNumber`
  - `GET /api/pmc/plmis/statistics`
  - `GET /api/pmc/plmis/health`
  - public webhooks:
    - `POST /api/pmc/plmis/webhook/payment-confirmed`
    - `POST /api/pmc/plmis/webhook/payment-failed`

#### I) Competition/IDM/Utilities/Exports/Alerts/Advanced Fields

- Competition:
  - public listing/registration + authenticated submission/score/courier label + admin registration update/delete
- IDM public geo endpoints:
  - `/api/pmc/idm_districts-club-counts/`, `/idm_clubs_geojson_all/`, `/idm_clubs/all/`
- Utilities:
  - `/api/pmc/ping/`, `/verify-chalan/`, `/confiscation-lookup/`
- Excel export endpoints under `/api/pmc/export/*` require auth/permissions
- Alert center endpoints under `/api/pmc/alerts*` require auth
- Advanced field engine endpoints under `/api/pmc/fields*` require auth; admin field-definition endpoints require `pmc.manage_fields`

#### J) Monitoring/Resilience/HA

- Monitoring endpoints expose metrics, dashboard, health, endpoint stats, report, alerts, reset, summary
- Resilience endpoints expose rate-limit and circuit-breaker controls and health/strategy summaries
- HA endpoints expose load-balancer node management, service registry, health checks, readiness/liveness
- Current route files show these management surfaces as public (no auth middleware in router definitions)

#### K) Legacy/Not-Mounted Route Module

- `server/src/interfaces/controllers/routes.ts` defines `/api/applicants`, `/api/businesses`, `/api/documents`, `/api/inventory`, `/api/workflow` endpoints.
- These are not mounted by `createApp()` currently.
- Frontend has components still calling these legacy endpoints (see section 7 risk findings).

## 2. REACT PAGES & COMPONENTS

### 2.1 Route-Configured Pages

Source: `client/src/configs/routes.config/{authRoute.ts,routes.config.ts,othersRoute.ts}`

Public/auth pages:
- `/pub` -> `@/views/auth/Analytics`
- `/mis-directory` -> `@/views/demo/MISAnalyticsView2`
- `/mis/directory` -> `@/views/demo/MISDirectoryPage`
- `/mis/clubs/directory` -> `@/views/demo/ClubDirectoryPage`
- `/ComingSoon` -> `@/views/demo/ComingSoon`
- `/mis/recycling-efficiency` -> `@/views/demo/MISRecyclingEfficiencyPage`
- `/sign-in` -> `@/views/auth/SignIn`
- `/sign-up` -> `@/views/auth/SignUp`
- `/forgot-password` -> `@/views/auth/ForgotPassword`
- `/reset-password` -> `@/views/auth/ResetPassword`
- `/cr` -> `@/views/auth/Analytics/CR`

Protected pages:
- `/home`, `/home-super`, `/home-admin`, `/home-deo`, `/home-do`, `/home-license`
- `/track-application`, `/generate-receipt`
- `/spuid-signup`, `/spuid-signup/:id`, `/spuid-review/:id`
- analytics demo paths (`/analytics1`, collapse menu demo paths)
- protected MIS paths (`/auth/mis/*`)
- EPA operations paths (`/auth/EPAOperations/*`, `/auth/EPAOperation/*`)
- admin paths (`/auth/admin/*`) with authority restrictions (`Admin`, `Super`)
- competition, payment, notifications, application, settings, GIS, advanced analytics, error routes
- `/access-denied` page in `othersRoute`

Routing behavior:
- `ProtectedRoute` redirects unauthenticated users to `appConfig.unAuthenticatedEntryPath` (`/pub`) and carries redirect query key.
- `AuthorityGuard` enforces per-route authority arrays.

### 2.2 API-Using Pages and Major Components

#### Pages with explicit API calls (high-activity)

- `client/src/views/Home*.tsx` (Home, HomeSuper, HomeAdmin, HomeDO, HomeDEO, HomeLicense)
  - Renders dashboard/statistical tables/charts and role-specific actions.
  - Calls include `/pmc/user-groups/`, `/pmc/fetch-statistics-*`, `/pmc/report-fee/`, `/pmc/license-by-user/`, report exports.
  - Interactions: filtering, export buttons, pagination/sorting, navigation by role.
  - Conditional rendering: user authority/group checks and data-dependent panels.

- `client/src/views/TrackApplication.tsx`
  - Renders public tracking form.
  - Calls `/pmc/track-application/` with `tracking_number` query.
  - Interaction: submit tracking number; displays status/error message.

- `client/src/views/GenerateReceiptPage.tsx`
  - Renders receipt/challan generation and payment verification UI.
  - Calls `/pmc/chalan-pdf/`, `/pmc/payment-status/:applicantId`.
  - Interaction: generate challan PDF, verify payment, download file.

- `client/src/views/supid/CreateApplication/CustomerCreate.tsx`
  - Multi-step application creation/edit flow.
  - Calls `/pmc/applicant-detail/*`, `/pmc/business-profiles/*`, producer/consumer/collector/recycler/manual fields/docs/assignment endpoints.
  - Interactions: multipart submissions, step navigation, conditional form sections by entity type.

- `client/src/views/supid/ReviewApplication/ReviewApplicationMain.tsx`
  - Application review orchestration page.
  - Calls `/pmc/applicant-detail/:id`, `/pmc/applicant-detail/`, `/pmc/business-profiles/`, `/pmc/producers/`, `/pmc/field-responses/`, `/pmc/applicant-documents/`, `/pmc/manual-fields/`, `/pmc/application-assignment/`.
  - Interactions: submit/patch review payloads, upload files, assign workflow.
  - Conditional logic: route param id, progress/status-based branching.

- EPA views:
  - `FieldInspectors.tsx` -> `/accounts/list-inspectors/`
  - `DocumentsTab.tsx` -> `/pmc/district-documents/` (GET/POST)
  - `Inspection*` views -> inspection report APIs for lists/details/dashboards.

- Public/demo analytic views:
  - MIS and club directory pages call `/pmc/districts-public`, `/pmc/mis-district-plastic-stats/`, `/pmc/idm_*` endpoints.

#### Major API helper modules/components

- `client/src/api/pmc.ts`
  - Hook wrappers for payment, alerts, advanced fields, excel exports.
  - Encapsulates fetch logic + credentials + loading/error states.
- `client/src/components/payment/PaymentStatusComponent.tsx`
  - Uses payment hook to display status and actions.
- `client/src/components/alerts/AlertNotificationCenter.tsx`, `AlertPreferencesPanel.tsx`
  - Uses alerts API hooks and preference updates.
- `client/src/components/forms/AdvancedFieldFormRenderer.tsx`
  - Uses advanced field definition/response APIs.
- `client/src/components/export/ExcelExportPanel.tsx`
  - Triggers `/pmc/export/*` downloads.

#### Legacy demo/feature components hitting legacy endpoints

- `AdvancedDashboards.tsx`, `AdvancedSearch.tsx`, `ApplicantComponents.tsx`, `BusinessComponents.tsx`, `DocumentComponents.tsx`, `InventoryComponents.tsx`, `WorkflowComponents.tsx`
- These call `/api/applicants`, `/api/businesses`, `/api/documents`, `/api/inventory`, `/api/workflow`, `/api/analytics` endpoints from legacy controller style.
- These routes are defined in `server/src/interfaces/controllers/routes.ts` but are not mounted in current app bootstrapping.

## 3. MONGOOSE MODELS

Source folder: `server/src/infrastructure/database/models`

### 3.1 Interface-Declared Models (fields/types + schema flags)

Below is extracted directly from each model file interface and schema flags (`required`, `unique`, `pre/post hooks`).

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\accounts\Group.ts
```ts
export interface GroupDocument extends Document {
  sourceId?: number
  name: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L14: name: { type: String, required: true, unique: true, index: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\accounts\Permission.ts
```ts
export interface PermissionDocument extends Document {
  sourceId?: number
  name: string
  codename: string
  appLabel?: string
  modelName?: string
  contentTypeId?: number
  permissionKey: string
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L18: name: { type: String, required: true },
  - L19: codename: { type: String, required: true },
  - L23: permissionKey: { type: String, required: true, unique: true, index: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\accounts\User.ts
```ts
export interface UserDocument extends Document {
  username: string
  email?: string
  passwordHash: string
  firstName?: string
  lastName?: string
  avatar?: string
  sourceId?: number
  groups: string[]
  directPermissions?: string[]
  permissions?: string[]
  isActive: boolean
  isSuperadmin?: boolean
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L22: username: { type: String, required: true, unique: true, index: true },
  - L24: passwordHash: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\accounts\UserAuditLog.ts
```ts
export interface UserAuditLogDocument extends Document {
  sourceId?: number
  userId?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  dateJoined?: Date
  lastLogin?: Date
  changeReason?: string
  historyDate?: Date
  historyType?: string
  raw?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\accounts\UserProfile.ts
```ts
export interface UserProfileDocument extends Document {
  userId: mongoose.Types.ObjectId
  districtId?: number
  districtName?: string
  districtShortName?: string
}
```
- schema flags:
  - L12: userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\AccessLog.ts
```ts
export interface AccessLogDocument extends Document {
  legacyId?: number
  userId?: mongoose.Types.ObjectId
  username?: string
  modelName?: string
  objectId?: string
  method?: string
  ipAddress?: string
  endpoint?: string
  timestamp?: Date
  createdAt: Date
  updatedAt: Date
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\ApiLog.ts
```ts
export interface ApiLogDocument extends Document {
  legacyId?: number
  serviceName: string
  endpoint: string
  requestData?: Record<string, unknown>
  responseData?: Record<string, unknown>
  statusCode?: number
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L17: serviceName: { type: String, required: true },
  - L18: endpoint: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\AuditLog.ts
```ts
export interface AuditLogDocument extends Document {
  legacyId?: number
  userId?: mongoose.Types.ObjectId
  username?: string
  action: string
  modelName?: string
  objectId?: string
  description?: string
  ipAddress?: string
  timestamp?: Date
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L22: action: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\ExternalServiceToken.ts
```ts
export interface ExternalServiceTokenDocument extends Document {
  legacyId?: number
  serviceName: string
  accessToken: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L15: serviceName: { type: String, required: true, index: true },
  - L16: accessToken: { type: String, required: true },
  - L17: expiresAt: { type: Date, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\ServiceConfiguration.ts
```ts
export interface ServiceConfigurationDocument extends Document {
  legacyId?: number
  serviceName: string
  baseUrl?: string
  authEndpoint?: string
  generatePsidEndpoint?: string
  transactionStatusEndpoint?: string
  clientId?: string
  clientSecret?: string
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L19: serviceName: { type: String, required: true, unique: true, index: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\common\SystemConfig.ts
```ts
export interface SystemConfigDocument extends Document {
  key: string
  value: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L12: key: { type: String, required: true, unique: true, index: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\idm\DistrictNew.ts
```ts
export interface DistrictNewDocument extends Document {
  name?: string
  shortName?: string
  divisionName?: string
  districtId?: number
  divisionId?: number
  extent?: string
  geom?: Record<string, unknown>
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\idm\EecClub.ts
```ts
export interface EecClubDocument extends Document {
  emisCode?: number
  schoolName?: string
  address?: string
  headName?: string
  headMobile?: string
  gender?: string
  educationLevel?: string
  latitude?: number
  longitude?: number
  addedBy?: string
  districtId?: mongoose.Types.ObjectId
  districtName?: string
  createdBy?: mongoose.Types.ObjectId
  notificationPath?: string
  geom?: Record<string, unknown>
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantAlert.ts
```ts
export interface ApplicantAlertDocument extends Document {
  numericId: number
  applicantId: number | string
  businessId?: number | string
  alertType: AlertType
  category: AlertCategory
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: AlertStatus
  source?: {
    type: 'SYSTEM' | 'MANUAL' | 'SCHEDULED'
    triggeredBy?: number | string
    automationRule?: string
  }
  relatedEntity?: {
    entityType: 'DOCUMENT' | 'BUSINESS_PROFILE' | 'INSPECTION' | 'ASSIGNMENT' | 'APPLICATION'
    entityId: string
    entityName?: string
  }
  recipients: AlertRecipient[]
  dueDate?: Date
  resolvedDate?: Date
  resolutionNotes?: string
  resolutionReason?: string
  repeating?: {
    enabled: boolean
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    endDate?: Date
    nextOccurrence?: Date
  }
  internalNotes?: string
  attachments?: string[]
  tags?: string[]
  escalatedTo?: {
    userId: number | string
    name?: string
    escalatedAt: Date
    escalationReason: string
  }
  isActive: boolean
  isArchived?: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}
```
- schema flags:
  - L94: userId: { type: Schema.Types.Mixed, required: true },
  - L105: unique: true,
  - L110: required: true,
  - L120: required: true,
  - L126: required: true,
  - L131: required: true
  - L135: required: true
  - L201: required: true
  - L205: required: true
  - L222: ApplicantAlertSchema.pre('save', async function (next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantDetail.ts
```ts
export interface ApplicantDetailDocument extends Document {
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
  createdBy?: mongoose.Types.ObjectId
  assignedGroup?: string
  trackingHash?: string
  createdAt: Date
  updatedAt: Date
}
```
- schema flags:
  - L28: numericId: { type: Number, unique: true, index: true },
  - L30: firstName: { type: String, required: true },
  - L56: ApplicantDetailSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantDocument.ts
```ts
export interface ApplicantDocumentDocument extends Document {
  numericId: number
  applicantId: number
  applicantIdString?: string // For UUID references if needed
  documentType: DocumentType | string
  fileUrl: string
  fileName: string
  fileSize: number // in bytes
  mimeType: string
  uploadDate: Date
  expiryDate?: Date
  status: DocumentStatus | string
  documentPath?: string // Legacy field
  documentDescription?: string // Legacy field
  verifiedBy?: mongoose.Types.ObjectId
  verificationDate?: Date
  rejectionReason?: string
  notes?: string
  isActive: boolean
  tags?: string[]
  metadata?: {
    uploadedFrom?: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
    deviceInfo?: string
    [key: string]: any
  }
  versioning?: {
    version: number
    previousVersionUrl?: string
    changeReason?: string
    changedBy?: mongoose.Types.ObjectId
    changedAt?: Date
  }
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L77: unique: true,
  - L83: required: true,
  - L94: required: true,
  - L99: required: true
  - L103: required: true
  - L107: required: true,
  - L115: required: true,
  - L198: ApplicantDocumentSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantFee.ts
```ts
export interface ApplicantFeeDocument extends Document {
  applicantId: number
  feeAmount: number
  isSettled?: boolean
  reason?: string
}
```
- schema flags:
  - L12: applicantId: { type: Number, required: true },
  - L13: feeAmount: { type: Number, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantFieldResponse.ts
```ts
export interface ApplicantFieldResponseDocument extends Document {
  numericId: number
  applicantId: number
  fieldKey: string
  response?: string
  comment?: string
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L15: numericId: { type: Number, unique: true, index: true },
  - L16: applicantId: { type: Number, required: true },
  - L17: fieldKey: { type: String, required: true },
  - L25: ApplicantFieldResponseSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicantManualFields.ts
```ts
export interface ApplicantManualFieldsDocument extends Document {
  numericId: number
  applicantId: number
  latitude?: number
  longitude?: number
  listOfProducts?: string
  listOfByProducts?: string
  rawMaterialImported?: string
  sellerNameIfRawMaterialBought?: string
  selfImportDetails?: string
  rawMaterialUtilized?: string
  complianceThickness75?: string
  validConsentPermitBuildingBylaws?: string
  stockistDistributorList?: string
  procurementPerDay?: string
  noOfWorkers?: number
  laborDeptRegistrationStatus?: string
  occupationalSafetyAndHealthFacilities?: string
  adverseEnvironmentalImpacts?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L29: numericId: { type: Number, unique: true, index: true },
  - L30: applicantId: { type: Number, required: true, unique: true },
  - L53: ApplicantManualFieldsSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicationAssignment.ts
```ts
export interface ApplicationAssignmentDocument extends Document {
  numericId: number
  applicantId: number | string
  businessId: number | string
  assignedToUserId: number | string
  assignedToName?: string
  assignedToEmail?: string
  assignmentType: 'INSPECTION' | 'VERIFICATION' | 'APPROVAL' | 'PROCESSING'
  status: AssignmentStatus
  priority: AssignmentPriority
  dueDate: Date
  assignmentDate: Date
  completionDate?: Date
  notes?: string
  instructions?: string
  attachments?: string[]
  previousAssignee?: {
    userId: number | string
    name: string
    completionDate: Date
    reason: string
  }
  escalationLevel: number
  escalatedOn?: Date
  escalationReason?: string
  performanceMetrics?: {
    averageCompletionTime: number
    completionRate: number
    qualityScore: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}
```
- schema flags:
  - L67: unique: true,
  - L72: required: true,
  - L77: required: true,
  - L82: required: true,
  - L90: required: true,
  - L107: required: true,
  - L152: required: true
  - L156: required: true
  - L172: ApplicationAssignmentSchema.pre('save', async function (next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ApplicationSubmitted.ts
```ts
export interface ApplicationSubmittedDocument extends Document {
  applicantId: number
}
```
- schema flags:
  - L9: applicantId: { type: Number, required: true, unique: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\BusinessProfile.ts
```ts
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
```
- schema flags:
  - L182: unique: true,
  - L188: required: true,
  - L198: required: true,
  - L359: BusinessProfileSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\ByProduct.ts
```ts
export interface ByProductDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  code?: string
  name: string
  productName?: string // Legacy
  description?: string
  category?: string
  quantity?: number
  unit?: string
  disposalMethod?: string
  disposalCost?: number
  environmentalImpact?: string
  harmfulSubstances?: string[]
  hazardLevel?: HazardLevel | string
  recommendations?: string
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L33: unique: true,
  - L39: required: true,
  - L54: required: true,
  - L111: ByProductSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Collector.ts
```ts
export interface CollectorDocument extends Document {
  numericId: number
  applicantId: number
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  selectedCategories?: any
  totalCapacityValue?: number
  numberOfVehicles?: number
  numberOfPersons?: number
  registrationRequiredForOtherOtherText?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L20: numericId: { type: Number, unique: true, index: true },
  - L21: applicantId: { type: Number, required: true, unique: true },
  - L35: CollectorSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\CompetitionRegistration.ts
```ts
export interface CompetitionRegistrationDocument extends Document {
  fullName: string
  institute: string
  grade: string
  category: string
  competitionType: string
  mobile: string
  studentCardFrontPath?: string
  studentCardBackPath?: string
  photoObjectPath?: string
  registrationId: string
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L20: fullName: { type: String, required: true },
  - L21: institute: { type: String, required: true },
  - L22: grade: { type: String, required: true },
  - L23: category: { type: String, required: true },
  - L24: competitionType: { type: String, required: true },
  - L25: mobile: { type: String, required: true },
  - L29: registrationId: { type: String, unique: true },
  - L35: CompetitionRegistrationSchema.pre('save', function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Consumer.ts
```ts
export interface ConsumerDocument extends Document {
  numericId: number
  applicantId: number
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  plainPlasticSheetsForFoodWrapping?: any
  packagingItems?: any
  consumption?: string
  provisionWasteDisposalBins?: string
  noOfWasteDisposableBins?: number
  segregatedPlasticsHandedOverToRegisteredRecyclers?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
  registrationRequiredForOtherOtherText?: string
}
```
- schema flags:
  - L22: numericId: { type: Number, unique: true, index: true },
  - L23: applicantId: { type: Number, required: true, unique: true },
  - L39: ConsumerSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Counter.ts
```ts
export interface CounterDocument extends Document {
  name: string
  seq: number
}
```
- schema flags:
  - L9: name: { type: String, required: true, unique: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\District.ts
```ts
export interface DistrictDocument extends Document {
  districtId: number
  divisionId: number
  districtName: string
  districtCode: string
  shortName?: string
  pitbDistrictId?: number
  geom?: Record<string, unknown>
}
```
- schema flags:
  - L15: districtId: { type: Number, required: true, unique: true, index: true },
  - L16: divisionId: { type: Number, required: true },
  - L17: districtName: { type: String, required: true },
  - L18: districtCode: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\DistrictPlasticCommitteeDocument.ts
```ts
export interface DistrictPlasticCommitteeDocumentDocument extends Document {
  numericId: number
  districtId: number
  documentType: string
  title?: string
  documentPath: string
  uploadedBy?: mongoose.Types.ObjectId
  documentDate?: Date
}
```
- schema flags:
  - L16: numericId: { type: Number, unique: true, index: true },
  - L17: districtId: { type: Number, required: true },
  - L18: documentType: { type: String, required: true },
  - L20: documentPath: { type: String, required: true },
  - L27: DistrictPlasticCommitteeDocumentSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Division.ts
```ts
export interface DivisionDocument extends Document {
  divisionId: number
  divisionName: string
  divisionCode: string
}
```
- schema flags:
  - L11: divisionId: { type: Number, required: true, unique: true },
  - L12: divisionName: { type: String, required: true },
  - L13: divisionCode: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\InspectionReport.ts
```ts
export interface InspectionReportDocument extends Document {
  numericId: number
  inspectorId: number | string
  inspectorName?: string
  applicantId: number | string
  businessId: number | string
  assignmentId?: string
  inspectionType: InspectionType
  status: InspectionStatus
  scheduledDate?: Date
  actualDate: Date
  duration?: number
  location?: {
    name?: string
    address?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  findings: InspectionFinding[]
  overallCompliance: number
  overallRecommendation: 'APPROVE' | 'CONDITIONAL_APPROVAL' | 'REJECT' | 'FURTHER_INSPECTION'
  violationsFound: boolean
  criticalIssues: number
  majorIssues: number
  minorIssues: number
  photosAttached: number
  reportsAttached: string[]
  observations?: string
  nextSteps?: string
  followUpRequired: boolean
  followUpDate?: Date
  followUpType?: InspectionType
  inspectorSignature?: string
  supervisorReview?: {
    reviewedBy: number | string
    reviewDate: Date
    comments?: string
    approved: boolean
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
  // Legacy fields for backward compatibility
  businessName?: string
  businessType?: string
  licenseNumber?: string
  plasticBagsConfiscation?: number
  totalConfiscation?: number
  latitude?: number
  longitude?: number
  inspectionDate?: Date
  fineAmount?: number
  districtId?: number
}
```
- schema flags:
  - L112: category: { type: String, required: true },
  - L113: description: { type: String, required: true },
  - L131: unique: true,
  - L136: required: true,
  - L142: required: true,
  - L153: required: true,
  - L165: required: true
  - L219: required: true
  - L223: required: true
  - L250: InspectionReportSchema.pre('save', async function (next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\License.ts
```ts
export interface LicenseDocument extends Document {
  licenseFor?: string
  licenseNumber: string
  licenseDuration?: string
  ownerName?: string
  businessName?: string
  typesOfPlastics?: string
  particulars?: string
  feeAmount?: number
  address?: string
  dateOfIssue?: Date
  applicantId?: number
  isActive?: boolean
  createdBy?: mongoose.Types.ObjectId
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\PlasticItem.ts
```ts
export interface PlasticItemDocument extends Document {
  numericId: number
  code: string
  itemName?: string // Legacy field
  name: string
  category: PlasticCategory | string
  description?: string
  hsnCode?: string
  unit: MeasurementUnit | string
  density?: number
  recyclingRate?: number
  hazardousLevel: HazardLevel | string
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L62: unique: true,
  - L68: required: true,
  - L69: unique: true,
  - L75: required: true,
  - L81: required: true,
  - L93: required: true
  - L142: PlasticItemSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Producer.ts
```ts
export interface ProducerDocument extends Document {
  numericId: number
  applicantId: number
  trackingNumber?: string
  registrationRequiredFor?: any
  registrationRequiredForOther?: any
  plainPlasticSheetsForFoodWrapping?: any
  packagingItems?: any
  numberOfMachines?: string
  totalCapacityValue?: number
  dateOfSettingUp?: Date
  totalWasteGeneratedValue?: number
  hasWasteStorageCapacity?: string
  wasteDisposalProvision?: string
  registrationRequiredForOtherOtherText?: string
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L24: numericId: { type: Number, unique: true, index: true },
  - L25: applicantId: { type: Number, required: true, unique: true },
  - L43: ProducerSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Product.ts
```ts
export interface ProductDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  plasticItemId: mongoose.Types.ObjectId | string
  productName?: string // Legacy
  name?: string
  description?: string
  quantity: number
  unit: string
  yearlyProduction?: number
  yearlyConsumption?: number
  storageLocation?: string
  qualityStandard?: string
  certifications?: string[]
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L32: unique: true,
  - L38: required: true,
  - L49: required: true,
  - L57: required: true,
  - L62: required: true
  - L106: ProductSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\PSIDTracking.ts
```ts
export interface PSIDTrackingDocument extends Document {
  applicantId?: number
  deptTransactionId: string
  dueDate?: Date
  expiryDate?: Date
  amountWithinDueDate?: number
  amountAfterDueDate?: number
  consumerName?: string
  mobileNo?: string
  cnic?: string
  email?: string
  districtId?: number
  amountBifurcation?: any
  consumerNumber?: string
  status?: string
  message?: string
  paymentStatus?: string
  amountPaid?: number
  paidDate?: Date
  paidTime?: string
  bankCode?: string
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L30: deptTransactionId: { type: String, required: true },

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\RawMaterial.ts
```ts
export interface RawMaterialDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  code?: string
  name: string
  category?: string
  description?: string
  source?: string
  sourceType?: 'SUPPLIER' | 'WASTE' | 'RECYCLED' | 'VIRGIN'
  quantity: number
  unit: string
  cost?: number
  totalCost?: number
  
  // Supplier Details
  supplier?: string
  supplierContact?: string
  supplierEmail?: string
  supplierPhone?: string
  purchaseDate?: Date
  deliveryDate?: Date
  
  // Quality Details
  qualityGrade?: string
  purityLevel?: number
  contaminants?: string[]
  testCertificate?: string
  
  // Storage
  storageLocation?: string
  storageConditions?: string
  expiryDate?: Date
  
  // Additional
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  
  // Legacy fields
  producerId?: mongoose.Types.ObjectId
  materialName?: string
  materialDescription?: string
  materialQuantityValue?: number
  materialQuantityUnit?: number
  materialUtilizedQuantityValue?: number
  materialUtilizedQuantityUnit?: number
  materialImportBought?: string
  nameSellerImporter?: string
  isImporterFormFilled?: boolean
  
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L64: unique: true,
  - L70: required: true,
  - L85: required: true,
  - L99: required: true,
  - L104: required: true
  - L189: RawMaterialSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Recycler.ts
```ts
export interface RecyclerDocument extends Document {
  numericId: number
  applicantId: number
  selectedCategories?: any
  plasticWasteAcquiredThrough?: any
  hasAdequatePollutionControlSystems?: string
  pollutionControlDetails?: string
  registrationRequiredForOtherOtherText?: string
  updatedBy?: mongoose.Types.ObjectId
  createdBy?: mongoose.Types.ObjectId
}
```
- schema flags:
  - L18: numericId: { type: Number, unique: true, index: true },
  - L19: applicantId: { type: Number, required: true, unique: true },
  - L31: RecyclerSchema.pre('save', async function preSave(next) {

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\SingleUsePlasticsSnapshot.ts
```ts
export interface SingleUsePlasticsSnapshotDocument extends Document {
  plasticItems: string[]
}
```

### D:\web temps\PMC Working Project\PMC Mernstack\server\src\infrastructure\database\models\pmc\Tehsil.ts
```ts
export interface TehsilDocument extends Document {
  tehsilId: number
  districtId: number
  divisionId: number
  tehsilName: string
  tehsilCode: string
}
```
- schema flags:
  - L13: tehsilId: { type: Number, required: true, unique: true },
  - L14: districtId: { type: Number, required: true },
  - L15: divisionId: { type: Number, required: true },
  - L16: tehsilName: { type: String, required: true },
  - L17: tehsilCode: { type: String, required: true },


### 3.2 Additional Schema-Only Models (no single `*Document` interface block)

#### `server/src/infrastructure/database/models/pmc/AdvancedFieldResponse.ts`

Contains these models:
- `AdvancedFieldDefinitionModel`
  - Key fields: `fieldId` (required+unique), `name`, `displayName`, `type` enum, `section`, `order`, `isRequired`, `isReadOnly`, `placeholder`, `helpText`, `defaultValue`, `validations[]`, `options[]`, `conditionalRules[]`, `dependencies[]`, `metadata`, `status` enum, `createdBy`, timestamps.
- `AdvancedFieldResponseModel`
  - Key fields: `applicantId` (required), `sectionId`, `sectionName`, `responses[]` (field-level values + validation), `completionPercentage`, `isComplete`, `lastModifiedBy`, `submittedAt`, `metadata`, timestamps.
- `FieldResponseAuditLogModel`
  - Key fields: `applicantId` (required), `fieldId` (required), `fieldName`, `oldValue`, `newValue`, `changeReason`, `changedBy` (required), `timestamp`.
- `FieldSectionModel`
  - Key fields: `sectionId` (required+unique), `name`, `displayName`, `description`, `order`, `fields[]` (ObjectId refs), `status` enum, `isConditional`, `conditionalRules[]`, timestamps.

#### `server/src/infrastructure/database/models/pmc/Alert.ts`

Contains these models:
- `AlertModel`
  - Key fields: `applicantId` (required), `title` (required), `message` (required), `description`, `type` enum (required), `priority`, `channels[]`, `status`, `isRead`, `readAt`, `metadata`, `sentAt`, `deliveredAt`, `failureReason`, `retryCount`, `maxRetries`, timestamps.
- `AlertRecipientModel`
  - Key fields: `applicantId` (required+unique), `email` (required), `phone` (required), nested `preferences` (email/sms/in-app/whatsapp flags + allowed alert types + DND hours), `isActive`, `verifiedEmail`, `verifiedPhone`, timestamps.
- `AlertTemplateModel`
  - Key fields: `name` (required), `type` enum (required+unique), `subject` (required), `emailTemplate` (required), `smsTemplate` (required), `inAppTemplate` (required), `whatsappTemplate`, `variableNames[]`, `isActive`, `createdBy`, timestamps.

## 4. AUTHENTICATION SURFACES

### 4.1 Auth mechanism

- Primary auth: JWT access token verified server-side (`jsonwebtoken`) in `authenticate` middleware.
- Access token is accepted via:
  - `Authorization: Bearer <token>`
  - httpOnly cookie `pmc_access_token`
- Refresh-token type is rejected on protected routes.
- User active-state check enforced during auth.

### 4.2 Token issuance/storage

- `POST /api/accounts/login/` sets httpOnly auth cookie via `setAuthCookie`.
- Frontend persistence strategy in app config is memory-only:
  - `client/src/configs/app.config.ts` -> `accessTokenPersistStrategy: 'memory'`
  - `client/src/utils/accessTokenStorage.ts` stores token in module variable only.
- Axios client uses `withCredentials: true` for cookie flow.
- Static scan found no `localStorage.setItem`, `sessionStorage.setItem`, or `document.cookie` token storage patterns in `client/src`.

### 4.3 Protected and role-restricted routes

- Protected by `authenticate`: all account profile/admin routes, most `/api/pmc/*` operational routes, notifications/search common routes.
- Group-restricted (`requireGroup`): `/api/accounts/admin/*` per Admin/Super and Super-only routes.
- Permission-restricted (`requirePermission`): broad `/api/pmc/*` resource and admin capability endpoints.

### 4.4 Service token auth surfaces

- `authenticateServiceToken` and `authenticateUserOrService` in `externalTokenAuth.ts`.
- Supported service-token inputs:
  - `Authorization: Bearer <service_token>`
  - `x-service-token` header
  - query parameters: `service_token` or `serviceToken`
- Route using mixed auth: `POST /api/pmc/payment-intimation/`.

### 4.5 Frontend route protection

- `ProtectedRoute` blocks unauthenticated users.
- `AuthorityGuard` applies route authority arrays from route config.

## 5. EXTERNAL DEPENDENCIES (APIs/SERVICES/SDKs)

### 5.1 Third-party services/integrations

- PLMIS payment gateway integration:
  - Service class: `server/src/application/services/pmc/PLMISService.ts`
  - External base URL from env (`PLMIS_API_URL`), bearer API key (`PLMIS_API_KEY`), dept code.
  - Used by `/api/pmc/plmis/*` endpoints and webhook handlers.

- Redis cache/state:
  - `ioredis` client in `server/src/infrastructure/cache/redisClient.ts`
  - Used by cache manager, cached route layers, and resilience features.

- Google Maps/OpenLayers in frontend:
  - `@react-google-maps/api`, `ol` imports in GIS/MIS pages.

- Firebase config object:
  - `client/src/configs/firebase.config.ts` consumes VITE firebase env vars.
  - No explicit runtime Firebase auth workflow confirmed in inspected route/auth flow.

### 5.2 Notable SDK/library usage

- Server: `axios`, `multer`, `pdfkit`, `qrcode`, `jsqr`, `bwip-js`, `exceljs`, `helmet`, `express-rate-limit`, `express-mongo-sanitize`.
- Client: `react-router-dom`, `zustand`, `react-hook-form`, `framer-motion`, charting/map libs.

## 6. ENVIRONMENT VARIABLES

### 6.1 Server env vars

From `server/src/infrastructure/config/env.ts`, `.env.example`, `.env.production.example`, `.env.staging.example`, and script usage.

- `PORT`: server listen port.
- `NODE_ENV`: environment (`development`/`production`).
- `MONGO_URI`: MongoDB connection URI.
- `JWT_SECRET`: required JWT secret (validated >=32 chars, non-placeholder).
- `JWT_EXPIRES_IN`: access token expiry string.
- `JWT_REFRESH_SECRET`: refresh token secret.
- `JWT_REFRESH_EXPIRES_IN`: refresh token expiry.
- `ALLOW_LEGACY_MASTERKEY_LOGIN`: enables fallback login behavior for legacy master key path.
- `CORS_ORIGIN`: comma-separated origin allowlist.
- `UPLOAD_DIR`: upload storage directory.
- `APP_URL`: frontend app URL used for redirects/links.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`: redis connectivity.
- `PITB_SERVICE_TOKEN`, `EPAY_SERVICE_TOKEN`: external service bearer token seeds.
- `PLMIS_API_URL`, `PLMIS_API_KEY`, `PLMIS_DEPT_CODE`, `PLMIS_REDIRECT_URL`: PLMIS integration config.
- Script-specific:
  - `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`
  - `TEST_TOKEN`
  - `TEHSILS_JSON`, `IDM_DISTRICTS_JSON`, `IDM_CLUBS_JSON`

### 6.2 Client env vars

From `client/.env*.example`, `client/src/utils/apiBaseUrl.ts`, `client/src/configs/firebase.config.ts`.

- `VITE_API_URL`: primary API base host.
- `VITE_API_BASE_URL`: backward-compatible alias.
- `VITE_API_PROXY`: dev proxy override.
- `VITE_GOOGLE_ANALYTICS_ID`: analytics id.
- `VITE_ENABLE_PWA`: PWA flag.
- `VITE_ENABLE_SERVICE_WORKER`: service worker flag.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- Found in production/staging example files (legacy flags):
  - `VITE_GOOGLE_OAUTH_ENABLED`
  - `VITE_GITHUB_OAUTH_ENABLED`

## 7. UNFINISHED OR RISKY CODE

### 7.1 TODO/placeholders/incomplete integrations

- `server/src/infrastructure/monitoring/routes.ts`
  - `POST /monitoring/reset` has TODO to add auth check.
- `server/src/application/services/pmc/AlertService.ts`
  - TODOs for actual Email/SMS/WhatsApp delivery implementations; currently logs placeholders.
- `server/src/infrastructure/ha/healthCheck.ts`
  - Placeholder disk metrics values (fixed constants).

### 7.2 Potentially risky auth/config surfaces

- Public management endpoints (no auth middleware in route declarations):
  - `/monitoring/*`, `/resilience/*`, `/ha/*`, `/api/cache/*`.
- Service token in URL query accepted (`service_token`/`serviceToken`) in `externalTokenAuth.ts`, increasing leakage risk in logs/history.
- Some public endpoints expose operational data (metrics, HA, resilience internals).

### 7.3 Legacy/dead-code mismatch and UI/backend divergence

- `server/src/interfaces/controllers/routes.ts` defines legacy endpoint families (`/api/applicants`, `/api/businesses`, `/api/documents`, `/api/inventory`, `/api/workflow`) but is not mounted by current `createApp()`.
- Frontend components still call these legacy endpoints:
  - `client/src/components/ApplicantComponents.tsx`
  - `client/src/components/BusinessComponents.tsx`
  - `client/src/components/DocumentComponents.tsx`
  - `client/src/components/InventoryComponents.tsx`
  - `client/src/components/WorkflowComponents.tsx`
  - `client/src/components/AdvancedDashboards.tsx`
  - `client/src/components/AdvancedSearch.tsx`

### 7.4 Direct body passthrough patterns

- `server/src/application/usecases/pmc/QueryHandlers.ts` contains update operations forwarding `req.body` directly to model update calls in some handlers.
- Global sanitize middleware exists, but this remains a sensitive path requiring strict validation discipline.

### 7.5 Logging and error handling observations

- Extensive `console.log/console.warn/console.error` across client and server code paths, including operational internals and webhook events.
- Error handler returns generic production message, but development mode includes debug stack payload.

### 7.6 Token storage/XSS surface check

- Static scan results in current frontend codebase:
  - no `localStorage.setItem`/`sessionStorage.setItem` token usage found.
  - no `dangerouslySetInnerHTML` usage found.

### 7.7 Notes on third-party login removal state

- No active Google/Facebook OAuth login route handlers were found in inspected active route files.
- Legacy env examples still include OAuth flags (`VITE_GOOGLE_OAUTH_ENABLED`, `VITE_GITHUB_OAUTH_ENABLED`), which can create configuration drift/confusion.

