/**
 * Component Exports - Central export point
 */

// Applicant
export { ApplicantRegistration } from './ApplicantComponents'

// Business
export { BusinessRegistration, BusinessList } from './BusinessComponents'

// Document
export { DocumentUpload, DocumentExpiryList } from './DocumentComponents'

// Inventory
export { PlasticItemForm, InventoryDashboard } from './InventoryComponents'

// Workflow
export { AssignmentForm, AssignmentList, InspectionForm, WorkflowDashboard } from './WorkflowComponents'

// Advanced Dashboards (Chunk 8)
export {
  ComprehensiveAnalyticsDashboard,
  RecyclingAnalyticsDashboard,
  CustomReportBuilder
} from './AdvancedDashboards'

// Advanced Search (Chunk 8)
export {
  AdvancedSearchPanel,
  MultiCriteriaFilter,
  SavedFilters
} from './AdvancedSearch'
