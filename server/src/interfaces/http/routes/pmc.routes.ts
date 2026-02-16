import { Router } from 'express'
import { authenticate, requirePermission } from '../middlewares/auth'
import { parseMultipart } from '../middlewares/multipart'
import { cacheMiddleware } from '../middlewares/cache'
import {
  listApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  listApplicantsMain,
  listApplicantsMainDO,
} from '../controllers/pmc/ApplicantController'
import {
  businessProfileController,
  plasticItemsController,
  productsController,
  byProductsController,
  producersController,
  consumersController,
  collectorsController,
  recyclersController,
  rawMaterialsController,
  applicantFieldResponsesController,
  applicantManualFieldsController,
  applicationAssignmentController,
  createBusinessProfile,
  updateBusinessProfile,
  createApplicationAssignment,
} from '../controllers/pmc/ResourceController'
import {
  uploadApplicantDocument,
  listApplicantDocuments,
  uploadDistrictDocument,
  listDistrictDocuments,
  downloadLatestApplicantDocument,
  downloadMedia,
} from '../controllers/pmc/DocumentsController'
import {
  listUserGroups,
  trackApplication,
  applicantAlerts,
  listDistricts,
  listDistrictsPublic,
  listTehsils,
  applicantLocationPublic,
  applicantStatistics,
  misApplicantStatistics,
  districtPlasticStats,
  districtByLatLon,
} from '../controllers/pmc/CommonController'
import { report, reportFee, exportApplicant, psidReport } from '../controllers/pmc/ReportController'
import { generateLicensePdf, licensePdf, licenseByUser } from '../controllers/pmc/LicenseController'
import { receiptPdf, chalanPdf, generateReceiptPdf, verifyChalanQr } from '../controllers/pmc/PdfController'
import { getPaymentStatus, recordPayment, checkPsidPaymentStatus, getPaymentHistory, checkLicenseEligibility, verifyMultiplePayments, sendPaymentReminder, getPaymentSummary } from '../controllers/pmc/PaymentController'
import { generatePsid, checkPsidStatus, paymentIntimation, plmisToken } from '../controllers/pmc/PsidController'
import {
  listInspectionReports,
  createInspectionReport,
  updateInspectionReport,
  deleteInspectionReport,
  allOtherSingleUsePlastics,
  districtSummary,
  exportAllInspectionsExcel,
  exportAllInspectionsPdf,
  exportDistrictSummaryExcel,
  exportDistrictSummaryPdf,
} from '../controllers/pmc/InspectionController'
import { registerCompetition, generateLabel, listCompetitions, getCompetition, getMyRegistrations, submitEntry, getCourierLabelPdf, scoreSubmission } from '../controllers/pmc/CompetitionController'
import { districtsClubCounts, clubsGeojsonAll, clubsGeojsonAllViewset } from '../controllers/idm/IdmController'
import { ping, verifyChalan, confiscationLookup } from '../controllers/pmc/UtilityController'
import { listApplicants as listGroupStats, listApplicantsDo as listGroupStatsDo } from '../controllers/pmc/StatisticsController'
import * as plmisUseCases from '../../../application/usecases/pmc/PLMISUseCases'
import * as excelExportUseCases from '../../../application/usecases/pmc/ExcelExportUseCases'
import * as alertUseCases from '../../../application/usecases/pmc/AlertUseCases'
import * as advancedFieldUseCases from '../../../application/usecases/pmc/AdvancedFieldResponseUseCases'

export const pmcRouter = Router()

// Applicant detail
pmcRouter.get('/applicant-detail/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), listApplicants)
pmcRouter.get('/applicant-detail/:id/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), getApplicant)
pmcRouter.post('/applicant-detail/', authenticate, requirePermission(['pmc_api.add_applicantdetail']), parseMultipart, createApplicant)
pmcRouter.patch('/applicant-detail/:id/', authenticate, requirePermission(['pmc_api.change_applicantdetail']), parseMultipart, updateApplicant)
pmcRouter.delete('/applicant-detail/:id/', authenticate, requirePermission(['pmc_api.delete_applicantdetail']), deleteApplicant)

pmcRouter.get('/applicant-detail-main-list/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), listApplicantsMain)
pmcRouter.get('/applicant-detail-main-do-list/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), listApplicantsMainDO)

// Business profiles
pmcRouter.get('/business-profiles/', authenticate, requirePermission(['pmc_api.view_businessprofile']), businessProfileController.list)
pmcRouter.get('/business-profiles/:id/', authenticate, requirePermission(['pmc_api.view_businessprofile']), businessProfileController.get)
pmcRouter.post('/business-profiles/', authenticate, requirePermission(['pmc_api.add_businessprofile']), parseMultipart, createBusinessProfile)
pmcRouter.patch('/business-profiles/:id/', authenticate, requirePermission(['pmc_api.change_businessprofile']), parseMultipart, updateBusinessProfile)
pmcRouter.delete('/business-profiles/:id/', authenticate, requirePermission(['pmc_api.delete_businessprofile']), businessProfileController.remove)

// Reference data
pmcRouter.get('/plastic-items/', authenticate, requirePermission(['pmc_api.view_plasticitem']), cacheMiddleware(3600), plasticItemsController.list)
pmcRouter.post('/plastic-items/', authenticate, requirePermission(['pmc_api.add_plasticitem']), plasticItemsController.create)

pmcRouter.get('/products/', authenticate, requirePermission(['pmc_api.view_product']), cacheMiddleware(3600), productsController.list)
pmcRouter.post('/products/', authenticate, requirePermission(['pmc_api.add_product']), productsController.create)

pmcRouter.get('/by-products/', authenticate, requirePermission(['pmc_api.view_byproduct']), cacheMiddleware(3600), byProductsController.list)
pmcRouter.post('/by-products/', authenticate, requirePermission(['pmc_api.add_byproduct']), byProductsController.create)

// Producers/Consumers/Collectors/Recyclers
pmcRouter.get('/producers/', authenticate, requirePermission(['pmc_api.view_producer']), producersController.list)
pmcRouter.get('/producers/:id/', authenticate, requirePermission(['pmc_api.view_producer']), producersController.get)
pmcRouter.post('/producers/', authenticate, requirePermission(['pmc_api.add_producer']), parseMultipart, producersController.create)
pmcRouter.patch('/producers/:id/', authenticate, requirePermission(['pmc_api.change_producer']), parseMultipart, producersController.update)

pmcRouter.get('/consumers/', authenticate, requirePermission(['pmc_api.view_consumer']), consumersController.list)
pmcRouter.get('/consumers/:id/', authenticate, requirePermission(['pmc_api.view_consumer']), consumersController.get)
pmcRouter.post('/consumers/', authenticate, requirePermission(['pmc_api.add_consumer']), parseMultipart, consumersController.create)
pmcRouter.patch('/consumers/:id/', authenticate, requirePermission(['pmc_api.change_consumer']), parseMultipart, consumersController.update)

pmcRouter.get('/collectors/', authenticate, requirePermission(['pmc_api.view_collector']), collectorsController.list)
pmcRouter.get('/collectors/:id/', authenticate, requirePermission(['pmc_api.view_collector']), collectorsController.get)
pmcRouter.post('/collectors/', authenticate, requirePermission(['pmc_api.add_collector']), parseMultipart, collectorsController.create)
pmcRouter.patch('/collectors/:id/', authenticate, requirePermission(['pmc_api.change_collector']), parseMultipart, collectorsController.update)

pmcRouter.get('/recyclers/', authenticate, requirePermission(['pmc_api.view_recycler']), recyclersController.list)
pmcRouter.get('/recyclers/:id/', authenticate, requirePermission(['pmc_api.view_recycler']), recyclersController.get)
pmcRouter.post('/recyclers/', authenticate, requirePermission(['pmc_api.add_recycler']), parseMultipart, recyclersController.create)
pmcRouter.patch('/recyclers/:id/', authenticate, requirePermission(['pmc_api.change_recycler']), parseMultipart, recyclersController.update)

pmcRouter.get('/raw-materials/', authenticate, requirePermission(['pmc_api.view_rawmaterial']), rawMaterialsController.list)
pmcRouter.post('/raw-materials/', authenticate, requirePermission(['pmc_api.add_rawmaterial']), rawMaterialsController.create)

// Documents
pmcRouter.get('/applicant-documents/', authenticate, requirePermission(['pmc_api.view_applicantdocument']), listApplicantDocuments)
pmcRouter.post('/applicant-documents/', authenticate, requirePermission(['pmc_api.add_applicantdocument']), ...uploadApplicantDocument)
pmcRouter.get(
  '/download_latest_document/',
  authenticate,
  requirePermission(['pmc_api.view_applicantdocument']),
  downloadLatestApplicantDocument
)

pmcRouter.get('/district-documents/', authenticate, requirePermission(['pmc_api.view_districtplasticcommitteedocument']), listDistrictDocuments)
pmcRouter.post('/district-documents/', authenticate, requirePermission(['pmc_api.add_districtplasticcommitteedocument']), ...uploadDistrictDocument)

// Districts/Tehsils
pmcRouter.get('/districts/', authenticate, requirePermission(['pmc_api.view_district']), cacheMiddleware(3600), listDistricts)
pmcRouter.get('/districts-public', cacheMiddleware(3600), listDistrictsPublic)
pmcRouter.get('/tehsils/', authenticate, requirePermission(['pmc_api.view_tehsil']), cacheMiddleware(3600), listTehsils)

// Applicant public views
pmcRouter.get('/applicant-location-public/', applicantLocationPublic)

// User groups
pmcRouter.get('/user-groups/', authenticate, listUserGroups)

// Assignments
pmcRouter.get('/application-assignment/', authenticate, requirePermission(['pmc_api.view_applicationassignment']), applicationAssignmentController.list)
pmcRouter.post('/application-assignment/', authenticate, requirePermission(['pmc_api.add_applicationassignment']), parseMultipart, createApplicationAssignment)
pmcRouter.patch('/application-assignment/:id/', authenticate, requirePermission(['pmc_api.change_applicationassignment']), parseMultipart, applicationAssignmentController.update)

// Field responses / manual fields
pmcRouter.get('/field-responses/', authenticate, requirePermission(['pmc_api.view_applicantfieldresponse']), applicantFieldResponsesController.list)
pmcRouter.post('/field-responses/', authenticate, requirePermission(['pmc_api.add_applicantfieldresponse']), parseMultipart, applicantFieldResponsesController.create)

pmcRouter.get('/manual-fields/', authenticate, requirePermission(['pmc_api.view_applicantmanualfields']), applicantManualFieldsController.list)
pmcRouter.post('/manual-fields/', authenticate, requirePermission(['pmc_api.add_applicantmanualfields']), parseMultipart, applicantManualFieldsController.create)
pmcRouter.patch('/manual-fields/:id/', authenticate, requirePermission(['pmc_api.change_applicantmanualfields']), parseMultipart, applicantManualFieldsController.update)

// Statistics
pmcRouter.get('/fetch-statistics-view-groups/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), cacheMiddleware(1800), listGroupStats)
pmcRouter.get('/fetch-statistics-do-view-groups/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), cacheMiddleware(1800), listGroupStatsDo)

pmcRouter.get('/applicant-statistics/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), cacheMiddleware(1800), applicantStatistics)
pmcRouter.get('/mis-applicant-statistics/', cacheMiddleware(1800), misApplicantStatistics)
pmcRouter.get('/mis-district-plastic-stats/', cacheMiddleware(1800), districtPlasticStats)

pmcRouter.get('/DistrictByLatLon/', districtByLatLon)

// Applicant alerts and tracking
pmcRouter.get('/applicant-alerts/', authenticate, applicantAlerts)
pmcRouter.get('/track-application/', trackApplication)

// Reports
pmcRouter.get('/report/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), report)
pmcRouter.get('/report-fee/', authenticate, requirePermission(['pmc_api.view_applicantfee']), reportFee)
pmcRouter.get('/export-applicant/', authenticate, requirePermission(['pmc_api.view_applicantdetail']), exportApplicant)
pmcRouter.get('/psid-report/', authenticate, requirePermission(['pmc_api.view_psidtracking']), psidReport)

// PSID
pmcRouter.get('/generate-psid/', authenticate, requirePermission(['pmc_api.add_psidtracking']), generatePsid)
pmcRouter.get('/check-psid-status/', authenticate, checkPsidStatus)
pmcRouter.post('/payment-intimation/', authenticate, requirePermission(['pmc_api.add_psidtracking']), paymentIntimation)
pmcRouter.get('/plmis-token/', plmisToken)

// Licenses
pmcRouter.get('/generate-license-pdf/', generateLicensePdf)
pmcRouter.get('/license-pdf/', licensePdf)
pmcRouter.get('/license-by-user/', authenticate, requirePermission(['pmc_api.view_license']), licenseByUser)

// PDFs
pmcRouter.get('/receipt-pdf/', authenticate, receiptPdf)
pmcRouter.get('/chalan-pdf/', authenticate, chalanPdf)
pmcRouter.post('/receipt-pdf/', authenticate, generateReceiptPdf)
pmcRouter.post('/chalan-pdf/', authenticate, chalanPdf)
pmcRouter.post('/verify-chalan-qr/', authenticate, verifyChalanQr)

// Payment Status
pmcRouter.get('/payment-status/:applicantId', authenticate, getPaymentStatus)
pmcRouter.post('/payment-status/:applicantId', authenticate, recordPayment)
pmcRouter.get('/check-psid-payment/', authenticate, checkPsidPaymentStatus)
pmcRouter.get('/payment-history/:applicantId', authenticate, getPaymentHistory)
pmcRouter.get('/license-eligibility/:applicantId', authenticate, checkLicenseEligibility)
pmcRouter.post('/verify-payments', authenticate, verifyMultiplePayments)
pmcRouter.post('/payment-reminder/:applicantId', authenticate, sendPaymentReminder)
pmcRouter.get('/payment-summary', authenticate, getPaymentSummary)

// PLMIS Payment Integration
pmcRouter.post('/plmis/initiate', authenticate, requirePermission(['pmc_api.add_psidtracking']), plmisUseCases.initiatePlmisPayment)
pmcRouter.get('/plmis/status/:psidNumber', authenticate, plmisUseCases.checkPlmisPaymentStatus)
pmcRouter.post('/plmis/verify', authenticate, requirePermission(['pmc_api.change_psidtracking']), plmisUseCases.verifyPlmisPayment)
pmcRouter.get('/plmis/receipt/:psidNumber', authenticate, plmisUseCases.getPlmisReceipt)
pmcRouter.post('/plmis/cancel/:psidNumber', authenticate, requirePermission(['pmc_api.change_psidtracking']), plmisUseCases.cancelPlmisPayment)
pmcRouter.get('/plmis/statistics', authenticate, requirePermission(['pmc_api.view_psidtracking']), plmisUseCases.getPlmisStatistics)
pmcRouter.get('/plmis/health', authenticate, plmisUseCases.validatePlmisHealth)

// PLMIS Webhooks (Public endpoints for bank callbacks)
pmcRouter.post('/plmis/webhook/payment-confirmed', plmisUseCases.plmisPaymentConfirmedWebhook)
pmcRouter.post('/plmis/webhook/payment-failed', plmisUseCases.plmisPaymentFailedWebhook)

// Inspection reports
pmcRouter.get('/inspection-report/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), listInspectionReports)
pmcRouter.post('/inspection-report/', authenticate, requirePermission(['pmc_api.add_inspectionreport']), ...createInspectionReport)
pmcRouter.patch('/inspection-report/:id/', authenticate, requirePermission(['pmc_api.change_inspectionreport']), ...updateInspectionReport)
pmcRouter.delete('/inspection-report/:id/', authenticate, requirePermission(['pmc_api.delete_inspectionreport']), deleteInspectionReport)

pmcRouter.get('/inspection-report/district_summary/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), districtSummary)
pmcRouter.get('/inspection-report/export-all-inspections-excel/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), exportAllInspectionsExcel)
pmcRouter.get('/inspection-report/export-all-inspections-pdf/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), exportAllInspectionsPdf)
pmcRouter.get('/inspection-report/export-district-summary-excel/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), exportDistrictSummaryExcel)
pmcRouter.get('/inspection-report/export-district-summary-pdf/', authenticate, requirePermission(['pmc_api.view_inspectionreport']), exportDistrictSummaryPdf)

pmcRouter.get('/inspection-report-cached/all_other_single_use_plastics/', authenticate, requirePermission(['pmc_api.view_singleuseplasticssnapshot']), allOtherSingleUsePlastics)

// Competition
pmcRouter.get('/competition/', listCompetitions)
pmcRouter.get('/competition/:id', getCompetition)
pmcRouter.post('/competition/:competitionId/register/', registerCompetition)
pmcRouter.post('/competition/register/', registerCompetition)
pmcRouter.get('/competition/my/registrations', authenticate, getMyRegistrations)
pmcRouter.post('/competition/:competitionId/registrations/:registrationId/submit', authenticate, submitEntry)
pmcRouter.post('/competition/:id/submit', authenticate, submitEntry)
pmcRouter.get('/competition/:competitionId/registrations/:registrationId/generate-label/', authenticate, generateLabel)
pmcRouter.post('/competition/:competitionId/registrations/:registrationId/generate-label/', authenticate, generateLabel)
pmcRouter.get('/competition/generate-label/', generateLabel)
pmcRouter.get('/competition/courier-label/:registrationId', authenticate, getCourierLabelPdf)
pmcRouter.post('/competition/:competitionId/registrations/:registrationId/score', authenticate, scoreSubmission)
pmcRouter.post('/competition/:registrationId/score', authenticate, scoreSubmission)

// IDM
pmcRouter.get('/idm_districts-club-counts/', districtsClubCounts)
pmcRouter.get('/idm_clubs_geojson_all/', clubsGeojsonAll)
pmcRouter.get('/idm_clubs/all/', clubsGeojsonAllViewset)

// Utilities
pmcRouter.get('/ping/', ping)
pmcRouter.get('/verify-chalan/', verifyChalan)
pmcRouter.get('/confiscation-lookup/', confiscationLookup)

// Media downloads
pmcRouter.get('/media/:folder_name/:file_name/', downloadMedia)
pmcRouter.get('/media/:folder_name/:folder_name2/:file_name/', downloadMedia)

// Excel Export
pmcRouter.get('/export/applicants-payment', authenticate, requirePermission(['pmc_api.view_applicantdetail']), excelExportUseCases.exportApplicantsWithPayment)
pmcRouter.get('/export/competitions', authenticate, requirePermission(['pmc_api.view_applicantdetail']), excelExportUseCases.exportCompetitionRegistrations)
pmcRouter.get('/export/payments', authenticate, requirePermission(['pmc_api.view_applicantfee']), excelExportUseCases.exportPaymentTransactions)
pmcRouter.get('/export/psid-tracking', authenticate, requirePermission(['pmc_api.view_psidtracking']), excelExportUseCases.exportPsidTracking)
pmcRouter.get('/export/courier-labels', authenticate, requirePermission(['pmc_api.view_applicantdetail']), excelExportUseCases.exportCourierLabels)
pmcRouter.get('/export/summary-report', authenticate, requirePermission(['pmc_api.view_applicantdetail']), excelExportUseCases.exportSummaryReport)

// Alerts
pmcRouter.get('/alerts', authenticate, alertUseCases.getApplicantAlerts)
pmcRouter.get('/alerts/unread-count', authenticate, alertUseCases.getUnreadCount)
pmcRouter.get('/alerts/:alertId', authenticate, alertUseCases.getAlertDetails)
pmcRouter.put('/alerts/:alertId/read', authenticate, alertUseCases.markAlertAsRead)
pmcRouter.put('/alerts/mark-read/batch', authenticate, alertUseCases.markMultipleAsRead)
pmcRouter.delete('/alerts/:alertId', authenticate, alertUseCases.deleteAlert)
pmcRouter.get('/alerts/preferences', authenticate, alertUseCases.getNotificationPreferences)
pmcRouter.put('/alerts/preferences', authenticate, alertUseCases.updateNotificationPreferences)
pmcRouter.post('/alerts/test', authenticate, alertUseCases.sendTestAlert)
pmcRouter.get('/alerts/statistics', authenticate, alertUseCases.getAlertStatistics)

// Admin Alerts
pmcRouter.post('/admin/alerts/create', authenticate, requirePermission(['pmc_api.manage_alerts']), alertUseCases.adminCreateAlert)
pmcRouter.get('/admin/alerts/all', authenticate, requirePermission(['pmc_api.manage_alerts']), alertUseCases.adminGetAllAlerts)

// Advanced Field Responses
pmcRouter.get('/fields/definitions', authenticate, advancedFieldUseCases.getFieldDefinitions)
pmcRouter.get('/fields/definitions/:fieldId', authenticate, advancedFieldUseCases.getFieldDefinition)
pmcRouter.post('/fields/validate', authenticate, advancedFieldUseCases.validateFieldValue)
pmcRouter.post('/fields/responses', authenticate, advancedFieldUseCases.saveFieldResponses)
pmcRouter.get('/fields/responses', authenticate, advancedFieldUseCases.getApplicantResponses)
pmcRouter.get('/fields/completion-status', authenticate, advancedFieldUseCases.getCompletionStatus)
pmcRouter.post('/fields/evaluate-conditions', authenticate, advancedFieldUseCases.evaluateConditions)
pmcRouter.get('/fields/audit-log/:fieldId', authenticate, advancedFieldUseCases.getFieldAuditLog)
pmcRouter.get('/fields/sections', authenticate, advancedFieldUseCases.getAllSections)
pmcRouter.get('/fields/sections/:sectionId', authenticate, advancedFieldUseCases.getSectionWithFields)

// Admin Advanced Fields
pmcRouter.post('/admin/fields/definitions', authenticate, requirePermission(['pmc_api.manage_fields']), advancedFieldUseCases.adminCreateFieldDefinition)
pmcRouter.put('/admin/fields/definitions/:fieldId', authenticate, requirePermission(['pmc_api.manage_fields']), advancedFieldUseCases.adminUpdateFieldDefinition)
pmcRouter.delete('/admin/fields/definitions/:fieldId', authenticate, requirePermission(['pmc_api.manage_fields']), advancedFieldUseCases.adminDeleteFieldDefinition)
pmcRouter.post('/admin/fields/bulk-update', authenticate, requirePermission(['pmc_api.manage_fields']), advancedFieldUseCases.adminBulkUpdateFields)
