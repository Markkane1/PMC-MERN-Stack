/**
 * API Routes
 * Central routing configuration for all API endpoints
 */

import type { Router } from 'express'
import {
  ApplicantController,
  BusinessController,
  DocumentController
} from './ApplicationControllers'
import { InventoryController, WorkflowController } from './InventoryWorkflowControllers'

/**
 * Setup all API routes
 */
export function setupRoutes(router: Router): void {
  // ============ APPLICANT ROUTES ============
  router.post('/api/applicants/register', (req, res) => ApplicantController.registerApplicant(req, res))
  router.get('/api/applicants/:applicantId', (req, res) => ApplicantController.getApplicant(req, res))
  router.get('/api/applicants/:applicantId/verification-status', (req, res) =>
    ApplicantController.getVerificationStatus(req, res)
  )
  router.patch('/api/applicants/:applicantId/status', (req, res) => ApplicantController.updateStatus(req, res))
  router.get('/api/applicants/pending/:actionType', (req, res) => ApplicantController.getPendingApplicants(req, res))
  router.get('/api/applicants', (req, res) => ApplicantController.listApplicants(req, res))

  // ============ BUSINESS ROUTES ============
  router.post('/api/businesses/register', (req, res) => BusinessController.registerBusiness(req, res))
  router.get('/api/businesses/:businessId', (req, res) => BusinessController.getBusiness(req, res))
  router.get('/api/businesses/:businessId/verification-checklist', (req, res) =>
    BusinessController.getVerificationChecklist(req, res)
  )
  router.patch('/api/businesses/:businessId/activate', (req, res) => BusinessController.activateBusiness(req, res))
  router.get('/api/businesses/:businessId/dashboard', (req, res) => BusinessController.getDashboard(req, res))
  router.get('/api/businesses', (req, res) => BusinessController.listBusinesses(req, res))

  // ============ DOCUMENT ROUTES ============
  router.post('/api/documents/upload', (req, res) => DocumentController.uploadDocument(req, res))
  router.patch('/api/documents/:documentId/verify', (req, res) => DocumentController.verifyDocument(req, res))
  router.get('/api/documents/expiring', (req, res) => DocumentController.getExpiringDocuments(req, res))
  router.get('/api/documents/statistics', (req, res) => DocumentController.getStatistics(req, res))

  // ============ INVENTORY ROUTES ============
  router.post('/api/inventory/plastic-items', (req, res) => InventoryController.createPlasticItem(req, res))
  router.post('/api/inventory/products', (req, res) => InventoryController.registerProduct(req, res))
  router.post('/api/inventory/by-products', (req, res) => InventoryController.recordByProduct(req, res))
  router.post('/api/inventory/raw-materials', (req, res) => InventoryController.registerRawMaterial(req, res))
  router.get('/api/inventory/businesses/:businessId', (req, res) => InventoryController.getBusinessInventory(req, res))
  router.get('/api/inventory/hazardous-materials', (req, res) => InventoryController.getHazardousMaterials(req, res))
  router.get('/api/inventory/expiring-materials', (req, res) => InventoryController.getExpiringMaterials(req, res))
  router.get('/api/inventory/disposal-statistics', (req, res) => InventoryController.getDisposalStatistics(req, res))
  router.get('/api/inventory/supplier-statistics', (req, res) => InventoryController.getSupplierStatistics(req, res))

  // ============ WORKFLOW ROUTES ============
  router.post('/api/workflow/assignments', (req, res) => WorkflowController.createAssignment(req, res))
  router.patch('/api/workflow/assignments/:assignmentId/complete', (req, res) =>
    WorkflowController.completeAssignment(req, res)
  )
  router.post('/api/workflow/inspections', (req, res) => WorkflowController.createInspection(req, res))
  router.post('/api/workflow/alerts', (req, res) => WorkflowController.createAlert(req, res))
  router.get('/api/workflow/assignments/user/:userId', (req, res) => WorkflowController.getUserAssignments(req, res))
  router.get('/api/workflow/inspections/:applicantId', (req, res) => WorkflowController.getApplicantInspections(req, res))
  router.get('/api/workflow/alerts/:applicantId', (req, res) => WorkflowController.getApplicantAlerts(req, res))
  router.get('/api/workflow/dashboard', (req, res) => WorkflowController.getWorkflowDashboard(req, res))

  // ============ HEALTH CHECK ============
  router.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date(),
      version: '1.0.0'
    })
  })
}

/**
 * API Route Summary
 * Total: 28 endpoints across 5 controllers
 *
 * Applicant Controller (6 endpoints)
 * - POST /api/applicants/register
 * - GET /api/applicants/:applicantId
 * - GET /api/applicants/:applicantId/verification-status
 * - PATCH /api/applicants/:applicantId/status
 * - GET /api/applicants/pending/:actionType
 * - GET /api/applicants
 *
 * Business Controller (6 endpoints)
 * - POST /api/businesses/register
 * - GET /api/businesses/:businessId
 * - GET /api/businesses/:businessId/verification-checklist
 * - PATCH /api/businesses/:businessId/activate
 * - GET /api/businesses/:businessId/dashboard
 * - GET /api/businesses
 *
 * Document Controller (4 endpoints)
 * - POST /api/documents/upload
 * - PATCH /api/documents/:documentId/verify
 * - GET /api/documents/expiring
 * - GET /api/documents/statistics
 *
 * Inventory Controller (9 endpoints)
 * - POST /api/inventory/plastic-items
 * - POST /api/inventory/products
 * - POST /api/inventory/by-products
 * - POST /api/inventory/raw-materials
 * - GET /api/inventory/businesses/:businessId
 * - GET /api/inventory/hazardous-materials
 * - GET /api/inventory/expiring-materials
 * - GET /api/inventory/disposal-statistics
 * - GET /api/inventory/supplier-statistics
 *
 * Workflow Controller (8 endpoints)
 * - POST /api/workflow/assignments
 * - PATCH /api/workflow/assignments/:assignmentId/complete
 * - POST /api/workflow/inspections
 * - POST /api/workflow/alerts
 * - GET /api/workflow/assignments/user/:userId
 * - GET /api/workflow/inspections/:applicantId
 * - GET /api/workflow/alerts/:applicantId
 * - GET /api/workflow/dashboard
 */
