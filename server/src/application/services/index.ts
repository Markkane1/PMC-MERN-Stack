/**
 * Service Layer Index
 * Central export point for all application services
 */

export { ApplicantService, BusinessService, DocumentService } from './ApplicationServices'
export { InventoryService, WorkflowService } from './InventoryWorkflowServices'

// Service factory for dependency injection
export class ServiceFactory {
  private static instance: ServiceFactory

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  /**
   * Get Applicant Service
   */
  getApplicantService() {
    return new (require('./ApplicationServices').ApplicantService)()
  }

  /**
   * Get Business Service
   */
  getBusinessService() {
    return new (require('./ApplicationServices').BusinessService)()
  }

  /**
   * Get Document Service
   */
  getDocumentService() {
    return new (require('./ApplicationServices').DocumentService)()
  }

  /**
   * Get Inventory Service
   */
  getInventoryService() {
    return new (require('./InventoryWorkflowServices').InventoryService)()
  }

  /**
   * Get Workflow Service
   */
  getWorkflowService() {
    return new (require('./InventoryWorkflowServices').WorkflowService)()
  }
}

/**
 * Export service factory singleton
 */
export const serviceFactory = ServiceFactory.getInstance()
