import { Router } from 'express'
import { authenticate, requirePermission } from '../middlewares/auth'
import { authenticateServiceToken, authenticateUserOrService } from '../middlewares/externalTokenAuth'
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
  getInspectionReport,
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
import {
  getBusinessProfilesByApplicant,
  getApplicationAssignmentByApplicant,
  getApplicantDocument,
  updateApplicantDocument,
  deleteApplicantDocument,
  getDistrictDocument,
  updateDistrictDocument,
  deleteDistrictDocument,
  listCachedInspectionReports,
  getCachedInspectionReport,
  createCachedInspectionReport,
  updateCachedInspectionReport,
  deleteCachedInspectionReport,
  listCompetitionRegistrations,
  getCompetitionRegistrationDetails,
  updateCompetitionRegistration,
  deleteCompetitionRegistration,
} from '../../../application/usecases/pmc/QueryHandlers'
import * as plmisUseCases from '../../../application/usecases/pmc/PLMISUseCases'
import * as excelExportUseCases from '../../../application/usecases/pmc/ExcelExportUseCases'
import * as alertUseCases from '../../../application/usecases/pmc/AlertUseCases'
import * as advancedFieldUseCases from '../../../application/usecases/pmc/AdvancedFieldResponseUseCases'

export const pmcRouter = Router()

// Applicant detail
pmcRouter.get('/applicant-detail/', authenticate, requirePermission(['pmc.view_applicantdetail']), listApplicants)
pmcRouter.get('/applicant-detail/:id/', authenticate, requirePermission(['pmc.view_applicantdetail']), getApplicant)
pmcRouter.post('/applicant-detail/', authenticate, requirePermission(['pmc.add_applicantdetail']), parseMultipart, createApplicant)
pmcRouter.patch('/applicant-detail/:id/', authenticate, requirePermission(['pmc.change_applicantdetail']), parseMultipart, updateApplicant)
pmcRouter.delete('/applicant-detail/:id/', authenticate, requirePermission(['pmc.delete_applicantdetail']), deleteApplicant)

pmcRouter.get('/applicant-detail-main-list/', authenticate, requirePermission(['pmc.view_applicantdetail']), listApplicantsMain)
pmcRouter.get('/applicant-detail-main-do-list/', authenticate, requirePermission(['pmc.view_applicantdetail']), listApplicantsMainDO)

// Business profiles
pmcRouter.get('/business-profiles/', authenticate, requirePermission(['pmc.view_businessprofile']), businessProfileController.list)
pmcRouter.get('/business-profiles/:id/', authenticate, requirePermission(['pmc.view_businessprofile']), businessProfileController.get)
pmcRouter.get('/business-profiles/by_applicant/', authenticate, requirePermission(['pmc.view_businessprofile']), getBusinessProfilesByApplicant)
pmcRouter.post('/business-profiles/', authenticate, requirePermission(['pmc.add_businessprofile']), parseMultipart, createBusinessProfile)
pmcRouter.patch('/business-profiles/:id/', authenticate, requirePermission(['pmc.change_businessprofile']), parseMultipart, updateBusinessProfile)
pmcRouter.delete('/business-profiles/:id/', authenticate, requirePermission(['pmc.delete_businessprofile']), businessProfileController.remove)

// Reference data
pmcRouter.get('/plastic-items/', authenticate, requirePermission(['pmc.view_plasticitem']), cacheMiddleware(3600), plasticItemsController.list)
pmcRouter.get('/plastic-items/:id/', authenticate, requirePermission(['pmc.view_plasticitem']), plasticItemsController.get)
pmcRouter.post('/plastic-items/', authenticate, requirePermission(['pmc.add_plasticitem']), plasticItemsController.create)
pmcRouter.patch('/plastic-items/:id/', authenticate, requirePermission(['pmc.change_plasticitem']), plasticItemsController.update)
pmcRouter.delete('/plastic-items/:id/', authenticate, requirePermission(['pmc.delete_plasticitem']), plasticItemsController.remove)

pmcRouter.get('/products/', authenticate, requirePermission(['pmc.view_product']), cacheMiddleware(3600), productsController.list)
pmcRouter.get('/products/:id/', authenticate, requirePermission(['pmc.view_product']), productsController.get)
pmcRouter.post('/products/', authenticate, requirePermission(['pmc.add_product']), productsController.create)
pmcRouter.patch('/products/:id/', authenticate, requirePermission(['pmc.change_product']), productsController.update)
pmcRouter.delete('/products/:id/', authenticate, requirePermission(['pmc.delete_product']), productsController.remove)

pmcRouter.get('/by-products/', authenticate, requirePermission(['pmc.view_byproduct']), cacheMiddleware(3600), byProductsController.list)
pmcRouter.get('/by-products/:id/', authenticate, requirePermission(['pmc.view_byproduct']), byProductsController.get)
pmcRouter.post('/by-products/', authenticate, requirePermission(['pmc.add_byproduct']), byProductsController.create)
pmcRouter.patch('/by-products/:id/', authenticate, requirePermission(['pmc.change_byproduct']), byProductsController.update)
pmcRouter.delete('/by-products/:id/', authenticate, requirePermission(['pmc.delete_byproduct']), byProductsController.remove)

// Producers/Consumers/Collectors/Recyclers
pmcRouter.get('/producers/', authenticate, requirePermission(['pmc.view_producer']), producersController.list)
pmcRouter.get('/producers/:id/', authenticate, requirePermission(['pmc.view_producer']), producersController.get)
pmcRouter.post('/producers/', authenticate, requirePermission(['pmc.add_producer']), parseMultipart, producersController.create)
pmcRouter.patch('/producers/:id/', authenticate, requirePermission(['pmc.change_producer']), parseMultipart, producersController.update)
pmcRouter.delete('/producers/:id/', authenticate, requirePermission(['pmc.delete_producer']), producersController.remove)

pmcRouter.get('/consumers/', authenticate, requirePermission(['pmc.view_consumer']), consumersController.list)
pmcRouter.get('/consumers/:id/', authenticate, requirePermission(['pmc.view_consumer']), consumersController.get)
pmcRouter.post('/consumers/', authenticate, requirePermission(['pmc.add_consumer']), parseMultipart, consumersController.create)
pmcRouter.patch('/consumers/:id/', authenticate, requirePermission(['pmc.change_consumer']), parseMultipart, consumersController.update)
pmcRouter.delete('/consumers/:id/', authenticate, requirePermission(['pmc.delete_consumer']), consumersController.remove)

pmcRouter.get('/collectors/', authenticate, requirePermission(['pmc.view_collector']), collectorsController.list)
pmcRouter.get('/collectors/:id/', authenticate, requirePermission(['pmc.view_collector']), collectorsController.get)
pmcRouter.post('/collectors/', authenticate, requirePermission(['pmc.add_collector']), parseMultipart, collectorsController.create)
pmcRouter.patch('/collectors/:id/', authenticate, requirePermission(['pmc.change_collector']), parseMultipart, collectorsController.update)
pmcRouter.delete('/collectors/:id/', authenticate, requirePermission(['pmc.delete_collector']), collectorsController.remove)

pmcRouter.get('/recyclers/', authenticate, requirePermission(['pmc.view_recycler']), recyclersController.list)
pmcRouter.get('/recyclers/:id/', authenticate, requirePermission(['pmc.view_recycler']), recyclersController.get)
pmcRouter.post('/recyclers/', authenticate, requirePermission(['pmc.add_recycler']), parseMultipart, recyclersController.create)
pmcRouter.patch('/recyclers/:id/', authenticate, requirePermission(['pmc.change_recycler']), parseMultipart, recyclersController.update)
pmcRouter.delete('/recyclers/:id/', authenticate, requirePermission(['pmc.delete_recycler']), recyclersController.remove)

pmcRouter.get('/raw-materials/', authenticate, requirePermission(['pmc.view_rawmaterial']), rawMaterialsController.list)
pmcRouter.get('/raw-materials/:id/', authenticate, requirePermission(['pmc.view_rawmaterial']), rawMaterialsController.get)
pmcRouter.post('/raw-materials/', authenticate, requirePermission(['pmc.add_rawmaterial']), rawMaterialsController.create)
pmcRouter.patch('/raw-materials/:id/', authenticate, requirePermission(['pmc.change_rawmaterial']), rawMaterialsController.update)
pmcRouter.delete('/raw-materials/:id/', authenticate, requirePermission(['pmc.delete_rawmaterial']), rawMaterialsController.remove)

// Documents
pmcRouter.get('/applicant-documents/', authenticate, requirePermission(['pmc.view_applicantdocument']), listApplicantDocuments)
pmcRouter.get('/applicant-documents/:id/', authenticate, requirePermission(['pmc.view_applicantdocument']), getApplicantDocument)
pmcRouter.post('/applicant-documents/', authenticate, requirePermission(['pmc.add_applicantdocument']), ...uploadApplicantDocument)
pmcRouter.patch('/applicant-documents/:id/', authenticate, requirePermission(['pmc.change_applicantdocument']), updateApplicantDocument)
pmcRouter.delete('/applicant-documents/:id/', authenticate, requirePermission(['pmc.delete_applicantdocument']), deleteApplicantDocument)
pmcRouter.get(
  '/download_latest_document/',
  authenticate,
  requirePermission(['pmc.view_applicantdocument']),
  downloadLatestApplicantDocument
)

pmcRouter.get('/district-documents/', authenticate, requirePermission(['pmc.view_districtplasticcommitteedocument']), listDistrictDocuments)
pmcRouter.get('/district-documents/:id/', authenticate, requirePermission(['pmc.view_districtplasticcommitteedocument']), getDistrictDocument)
pmcRouter.post('/district-documents/', authenticate, requirePermission(['pmc.add_districtplasticcommitteedocument']), ...uploadDistrictDocument)
pmcRouter.patch('/district-documents/:id/', authenticate, requirePermission(['pmc.change_districtplasticcommitteedocument']), updateDistrictDocument)
pmcRouter.delete('/district-documents/:id/', authenticate, requirePermission(['pmc.delete_districtplasticcommitteedocument']), deleteDistrictDocument)

// Districts/Tehsils
pmcRouter.get('/districts/', authenticate, requirePermission(['pmc.view_district']), cacheMiddleware(3600), listDistricts)
pmcRouter.get('/districts-public', cacheMiddleware(3600), listDistrictsPublic)
pmcRouter.get('/tehsils/', authenticate, requirePermission(['pmc.view_tehsil']), cacheMiddleware(3600), listTehsils)

// Applicant public views
pmcRouter.get('/applicant-location-public/', applicantLocationPublic)

// User groups
pmcRouter.get('/user-groups/', authenticate, listUserGroups)

// Assignments
pmcRouter.get('/application-assignment/', authenticate, requirePermission(['pmc.view_applicationassignment']), applicationAssignmentController.list)
pmcRouter.get('/application-assignment/:id/', authenticate, requirePermission(['pmc.view_applicationassignment']), applicationAssignmentController.get)
pmcRouter.get('/application-assignment/by_applicant/', authenticate, requirePermission(['pmc.view_applicationassignment']), getApplicationAssignmentByApplicant)
pmcRouter.post('/application-assignment/', authenticate, requirePermission(['pmc.add_applicationassignment']), parseMultipart, createApplicationAssignment)
pmcRouter.patch('/application-assignment/:id/', authenticate, requirePermission(['pmc.change_applicationassignment']), parseMultipart, applicationAssignmentController.update)

// Field responses / manual fields
pmcRouter.get('/field-responses/', authenticate, requirePermission(['pmc.view_applicantfieldresponse']), applicantFieldResponsesController.list)
pmcRouter.get('/field-responses/:id/', authenticate, requirePermission(['pmc.view_applicantfieldresponse']), applicantFieldResponsesController.get)
pmcRouter.post('/field-responses/', authenticate, requirePermission(['pmc.add_applicantfieldresponse']), parseMultipart, applicantFieldResponsesController.create)
pmcRouter.patch('/field-responses/:id/', authenticate, requirePermission(['pmc.change_applicantfieldresponse']), parseMultipart, applicantFieldResponsesController.update)
pmcRouter.delete('/field-responses/:id/', authenticate, requirePermission(['pmc.delete_applicantfieldresponse']), applicantFieldResponsesController.remove)

pmcRouter.get('/manual-fields/', authenticate, requirePermission(['pmc.view_applicantmanualfields']), applicantManualFieldsController.list)
pmcRouter.get('/manual-fields/:id/', authenticate, requirePermission(['pmc.view_applicantmanualfields']), applicantManualFieldsController.get)
pmcRouter.post('/manual-fields/', authenticate, requirePermission(['pmc.add_applicantmanualfields']), parseMultipart, applicantManualFieldsController.create)
pmcRouter.patch('/manual-fields/:id/', authenticate, requirePermission(['pmc.change_applicantmanualfields']), parseMultipart, applicantManualFieldsController.update)
pmcRouter.delete('/manual-fields/:id/', authenticate, requirePermission(['pmc.delete_applicantmanualfields']), applicantManualFieldsController.remove)

// Statistics
pmcRouter.get('/fetch-statistics-view-groups/', authenticate, requirePermission(['pmc.view_applicantdetail']), cacheMiddleware(1800), listGroupStats)
pmcRouter.get('/fetch-statistics-do-view-groups/', authenticate, requirePermission(['pmc.view_applicantdetail']), cacheMiddleware(1800), listGroupStatsDo)

pmcRouter.get('/applicant-statistics/', authenticate, requirePermission(['pmc.view_applicantdetail']), cacheMiddleware(1800), applicantStatistics)
pmcRouter.get('/mis-applicant-statistics/', cacheMiddleware(1800), misApplicantStatistics)
pmcRouter.get('/mis-district-plastic-stats/', cacheMiddleware(1800), districtPlasticStats)

pmcRouter.get('/DistrictByLatLon/', districtByLatLon)

// Applicant alerts and tracking
pmcRouter.get('/applicant-alerts/', authenticate, applicantAlerts)
pmcRouter.get('/track-application/', trackApplication)

// Reports
pmcRouter.get('/report/', authenticate, requirePermission(['pmc.view_applicantdetail']), report)
pmcRouter.get('/report-fee/', authenticate, requirePermission(['pmc.view_applicantfee', 'pmc.view_applicantdetail']), reportFee)
pmcRouter.get('/export-applicant/', authenticate, requirePermission(['pmc.view_applicantdetail']), exportApplicant)
pmcRouter.get('/psid-report/', authenticate, requirePermission(['pmc.view_psidtracking']), psidReport)

// PSID
pmcRouter.get('/generate-psid/', authenticate, requirePermission(['pmc.add_psidtracking']), generatePsid)
pmcRouter.get('/check-psid-status/', authenticate, checkPsidStatus)
// Payment intimation: Accept both user JWT and external service tokens
pmcRouter.post('/payment-intimation/', authenticateUserOrService, paymentIntimation)
pmcRouter.post('/plmis-token/', plmisToken)
pmcRouter.get('/plmis-token/', plmisToken) // Backward compatibility

// Licenses
pmcRouter.get('/generate-license-pdf/', generateLicensePdf)
pmcRouter.get('/license-pdf/', licensePdf)
pmcRouter.get('/license-by-user/', authenticate, requirePermission(['pmc.view_license']), licenseByUser)

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
pmcRouter.post('/plmis/initiate', authenticate, requirePermission(['pmc.add_psidtracking']), plmisUseCases.initiatePlmisPayment)
pmcRouter.get('/plmis/status/:psidNumber', authenticate, plmisUseCases.checkPlmisPaymentStatus)
pmcRouter.post('/plmis/verify', authenticate, requirePermission(['pmc.change_psidtracking']), plmisUseCases.verifyPlmisPayment)
pmcRouter.get('/plmis/receipt/:psidNumber', authenticate, plmisUseCases.getPlmisReceipt)
pmcRouter.post('/plmis/cancel/:psidNumber', authenticate, requirePermission(['pmc.change_psidtracking']), plmisUseCases.cancelPlmisPayment)
pmcRouter.get('/plmis/statistics', authenticate, requirePermission(['pmc.view_psidtracking']), plmisUseCases.getPlmisStatistics)
pmcRouter.get('/plmis/health', authenticate, plmisUseCases.validatePlmisHealth)

// PLMIS Webhooks (Public endpoints for bank callbacks)
pmcRouter.post('/plmis/webhook/payment-confirmed', plmisUseCases.plmisPaymentConfirmedWebhook)
pmcRouter.post('/plmis/webhook/payment-failed', plmisUseCases.plmisPaymentFailedWebhook)

// Inspection reports
pmcRouter.get('/inspection-report/', authenticate, requirePermission(['pmc.view_inspectionreport']), listInspectionReports)
pmcRouter.get('/inspection-report/:id/', authenticate, requirePermission(['pmc.view_inspectionreport']), getInspectionReport)
pmcRouter.post('/inspection-report/', authenticate, requirePermission(['pmc.add_inspectionreport']), ...createInspectionReport)
pmcRouter.patch('/inspection-report/:id/', authenticate, requirePermission(['pmc.change_inspectionreport']), ...updateInspectionReport)
pmcRouter.delete('/inspection-report/:id/', authenticate, requirePermission(['pmc.delete_inspectionreport']), deleteInspectionReport)

pmcRouter.get('/inspection-report/district_summary/', authenticate, requirePermission(['pmc.view_inspectionreport']), districtSummary)
pmcRouter.get('/inspection-report/export-all-inspections-excel/', authenticate, requirePermission(['pmc.view_inspectionreport']), exportAllInspectionsExcel)
pmcRouter.get('/inspection-report/export-all-inspections-pdf/', authenticate, requirePermission(['pmc.view_inspectionreport']), exportAllInspectionsPdf)
pmcRouter.get('/inspection-report/export-district-summary-excel/', authenticate, requirePermission(['pmc.view_inspectionreport']), exportDistrictSummaryExcel)
pmcRouter.get('/inspection-report/export-district-summary-pdf/', authenticate, requirePermission(['pmc.view_inspectionreport']), exportDistrictSummaryPdf)

pmcRouter.get('/inspection-report-cached/', authenticate, requirePermission(['pmc.view_inspectionreport']), listCachedInspectionReports)
pmcRouter.get('/inspection-report-cached/:id/', authenticate, requirePermission(['pmc.view_inspectionreport']), getCachedInspectionReport)
pmcRouter.post('/inspection-report-cached/', authenticate, requirePermission(['pmc.add_inspectionreport']), createCachedInspectionReport)
pmcRouter.patch('/inspection-report-cached/:id/', authenticate, requirePermission(['pmc.change_inspectionreport']), updateCachedInspectionReport)
pmcRouter.delete('/inspection-report-cached/:id/', authenticate, requirePermission(['pmc.delete_inspectionreport']), deleteCachedInspectionReport)
pmcRouter.get('/inspection-report-cached/all_other_single_use_plastics/', authenticate, requirePermission(['pmc.view_singleuseplasticssnapshot']), allOtherSingleUsePlastics)

// Competition
pmcRouter.get('/competition/', listCompetitions)
pmcRouter.get('/competition/:id', getCompetition)
pmcRouter.get('/competition/register/', authenticate, requirePermission(['pmc.view_competitionregistration']), listCompetitionRegistrations)
pmcRouter.get('/competition/register/:id/', authenticate, requirePermission(['pmc.view_competitionregistration']), getCompetitionRegistrationDetails)
pmcRouter.post('/competition/:competitionId/register/', registerCompetition)
pmcRouter.post('/competition/register/', registerCompetition)
pmcRouter.patch('/competition/register/:id/', authenticate, requirePermission(['pmc.change_competitionregistration']), updateCompetitionRegistration)
pmcRouter.delete('/competition/register/:id/', authenticate, requirePermission(['pmc.delete_competitionregistration']), deleteCompetitionRegistration)
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
pmcRouter.post('/verify-chalan/', parseMultipart, verifyChalan)
pmcRouter.get('/verify-chalan/', verifyChalan) // Backward compatibility for plain query calls
pmcRouter.get('/confiscation-lookup/', confiscationLookup)

// Media downloads
pmcRouter.get('/media/:folder_name/:file_name/', downloadMedia)
pmcRouter.get('/media/:folder_name/:folder_name2/:file_name/', downloadMedia)

// Excel Export
pmcRouter.get('/export/applicants-payment', authenticate, requirePermission(['pmc.view_applicantdetail']), excelExportUseCases.exportApplicantsWithPayment)
pmcRouter.get('/export/competitions', authenticate, requirePermission(['pmc.view_applicantdetail']), excelExportUseCases.exportCompetitionRegistrations)
pmcRouter.get('/export/payments', authenticate, requirePermission(['pmc.view_applicantfee']), excelExportUseCases.exportPaymentTransactions)
pmcRouter.get('/export/psid-tracking', authenticate, requirePermission(['pmc.view_psidtracking']), excelExportUseCases.exportPsidTracking)
pmcRouter.get('/export/courier-labels', authenticate, requirePermission(['pmc.view_applicantdetail']), excelExportUseCases.exportCourierLabels)
pmcRouter.get('/export/summary-report', authenticate, requirePermission(['pmc.view_applicantdetail']), excelExportUseCases.exportSummaryReport)

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
pmcRouter.post('/admin/alerts/create', authenticate, requirePermission(['pmc.manage_alerts']), alertUseCases.adminCreateAlert)
pmcRouter.get('/admin/alerts/all', authenticate, requirePermission(['pmc.manage_alerts']), alertUseCases.adminGetAllAlerts)

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
pmcRouter.post('/admin/fields/definitions', authenticate, requirePermission(['pmc.manage_fields']), advancedFieldUseCases.adminCreateFieldDefinition)
pmcRouter.put('/admin/fields/definitions/:fieldId', authenticate, requirePermission(['pmc.manage_fields']), advancedFieldUseCases.adminUpdateFieldDefinition)
pmcRouter.delete('/admin/fields/definitions/:fieldId', authenticate, requirePermission(['pmc.manage_fields']), advancedFieldUseCases.adminDeleteFieldDefinition)
pmcRouter.post('/admin/fields/bulk-update', authenticate, requirePermission(['pmc.manage_fields']), advancedFieldUseCases.adminBulkUpdateFields)
