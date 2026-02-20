import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import {
  businessProfileRepositoryMongo,
  applicationAssignmentRepositoryMongo,
  applicantDocumentRepositoryMongo,
  competitionRegistrationRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { ApplicantDocumentModel } from '../../../infrastructure/database/models/pmc/ApplicantDocument'
import { DistrictPlasticCommitteeDocumentModel } from '../../../infrastructure/database/models/pmc/DistrictPlasticCommitteeDocument'

type AuthRequest = Request & { user?: any }

/**
 * GET /business-profiles/by_applicant/?applicant_id=X
 * Dedicated query endpoint for fetching business profiles by applicant
 */
export const getBusinessProfilesByApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.applicant_id ? Number(req.query.applicant_id) : null
  const applicantId_alt = req.query.applicant ? Number(req.query.applicant) : applicantId

  if (!applicantId_alt) {
    return res.status(400).json({ message: 'applicant_id query parameter is required' })
  }

  try {
    const profiles = await businessProfileRepositoryMongo.list({ applicantId: applicantId_alt })
    return res.json(profiles || [])
  } catch (error) {
    console.error(`Error fetching business profiles for applicant ${applicantId_alt}:`, error)
    return res.status(500).json({ message: 'Failed to fetch business profiles' })
  }
})

/**
 * GET /application-assignment/by_applicant/?applicant_id=X
 * Dedicated query endpoint for fetching assignments by applicant
 */
export const getApplicationAssignmentByApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.applicant_id ? Number(req.query.applicant_id) : null
  const applicantId_alt = req.query.applicant ? Number(req.query.applicant) : applicantId

  if (!applicantId_alt) {
    return res.status(400).json({ message: 'applicant_id query parameter is required' })
  }

  try {
    const assignments = await applicationAssignmentRepositoryMongo.list({ applicantId: applicantId_alt })
    return res.json(assignments || [])
  } catch (error) {
    console.error(`Error fetching assignments for applicant ${applicantId_alt}:`, error)
    return res.status(500).json({ message: 'Failed to fetch assignments' })
  }
})

/**
 * GET /applicant-documents/:id/
 * Retrieve single applicant document by ID
 */
export const getApplicantDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const document = await ApplicantDocumentModel.findById(documentId).lean()
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    return res.json(document)
  } catch (error) {
    console.error(`Error retrieving applicant document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to retrieve document' })
  }
})

/**
 * PATCH /applicant-documents/:id/
 * Update applicant document metadata
 */
export const updateApplicantDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const updated = await ApplicantDocumentModel.findByIdAndUpdate(documentId, req.body, { new: true }).lean()
    
    if (!updated) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    return res.json(updated)
  } catch (error) {
    console.error(`Error updating applicant document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to update document' })
  }
})

/**
 * DELETE /applicant-documents/:id/
 * Delete applicant document
 */
export const deleteApplicantDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const deleted = await ApplicantDocumentModel.findByIdAndDelete(documentId)
    
    if (!deleted) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    return res.status(204).send()
  } catch (error) {
    console.error(`Error deleting applicant document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to delete document' })
  }
})

/**
 * GET /district-documents/:id/
 * Retrieve single district document by ID
 */
export const getDistrictDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const document = await DistrictPlasticCommitteeDocumentModel.findById(documentId).lean()
    
    if (!document) {
      return res.status(404).json({ message: 'District document not found' })
    }
    
    return res.json(document)
  } catch (error) {
    console.error(`Error retrieving district document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to retrieve district document' })
  }
})

/**
 * PATCH /district-documents/:id/
 * Update district document metadata
 */
export const updateDistrictDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const updated = await DistrictPlasticCommitteeDocumentModel.findByIdAndUpdate(
      documentId,
      req.body,
      { new: true }
    ).lean()
    
    if (!updated) {
      return res.status(404).json({ message: 'District document not found' })
    }
    
    return res.json(updated)
  } catch (error) {
    console.error(`Error updating district document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to update district document' })
  }
})

/**
 * DELETE /district-documents/:id/
 * Delete district document
 */
export const deleteDistrictDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id
    const deleted = await DistrictPlasticCommitteeDocumentModel.findByIdAndDelete(documentId)
    
    if (!deleted) {
      return res.status(404).json({ message: 'District document not found' })
    }
    
    return res.status(204).send()
  } catch (error) {
    console.error(`Error deleting district document ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to delete district document' })
  }
})

/**
 * Cached Inspection Report handlers
 * These endpoints provide caching layer on top of inspection reports
 */
export const listCachedInspectionReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Replace with actual cached report model/repository when implemented
    // For now returns empty array (caching layer can be added later)
    return res.json([])
  } catch (error) {
    console.error('Error listing cached inspection reports:', error)
    return res.status(500).json({ message: 'Failed to list cached inspection reports' })
  }
})

export const getCachedInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Replace with actual cached report lookup when implemented
    const reportId = req.params.id
    return res.status(404).json({ message: 'Cached inspection report not found' })
  } catch (error) {
    console.error(`Error retrieving cached inspection report ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to retrieve cached inspection report' })
  }
})

export const createCachedInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Replace with actual cached report creation when implemented
    return res.status(201).json({ 
      message: 'Cached inspection report created',
      _id: new Date().getTime().toString(),
      ...req.body 
    })
  } catch (error) {
    console.error('Error creating cached inspection report:', error)
    return res.status(500).json({ message: 'Failed to create cached inspection report' })
  }
})

export const updateCachedInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Replace with actual cached report update when implemented
    const reportId = req.params.id
    return res.status(404).json({ message: 'Cached inspection report not found' })
  } catch (error) {
    console.error(`Error updating cached inspection report ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to update cached inspection report' })
  }
})

export const deleteCachedInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Replace with actual cached report deletion when implemented
    const reportId = req.params.id
    return res.status(404).json({ message: 'Cached inspection report not found' })
  } catch (error) {
    console.error(`Error deleting cached inspection report ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to delete cached inspection report' })
  }
})

/**
 * Competition registration handlers for legacy /competition/register/ prefix
 */
export const listCompetitionRegistrations = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const registrations = await competitionRegistrationRepositoryMongo.findAll()
    return res.json(registrations || [])
  } catch (error) {
    console.error('Error listing competition registrations:', error)
    return res.status(500).json({ message: 'Failed to list competition registrations' })
  }
})

export const getCompetitionRegistrationDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const registrationId = req.params.id
    const registration = await competitionRegistrationRepositoryMongo.findById(registrationId)
    
    if (!registration) {
      return res.status(404).json({ message: 'Competition registration not found' })
    }
    
    return res.json(registration)
  } catch (error) {
    console.error(`Error retrieving competition registration ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to retrieve competition registration' })
  }
})

export const updateCompetitionRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const registrationId = req.params.id
    const updated = await competitionRegistrationRepositoryMongo.update(registrationId, req.body)
    
    if (!updated) {
      return res.status(404).json({ message: 'Competition registration not found' })
    }
    
    return res.json(updated)
  } catch (error) {
    console.error(`Error updating competition registration ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to update competition registration' })
  }
})

export const deleteCompetitionRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const registrationId = req.params.id
    const deleted = await competitionRegistrationRepositoryMongo.delete(registrationId)
    
    if (!deleted) {
      return res.status(404).json({ message: 'Competition registration not found' })
    }
    
    return res.status(204).send()
  } catch (error) {
    console.error(`Error deleting competition registration ${req.params.id}:`, error)
    return res.status(500).json({ message: 'Failed to delete competition registration' })
  }
})
