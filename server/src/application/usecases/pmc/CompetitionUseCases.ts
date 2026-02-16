import multer from 'multer'
import PDFDocument from 'pdfkit'
import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type {
  CompetitionRepository,
  CompetitionRegistrationRepository,
  CourierLabelRepository,
  ApplicantRepository,
  ApplicantFeeRepository,
  PSIDTrackingRepository,
} from '../../../domain/repositories/pmc'
import {
  createCompetitionRepository,
  createCompetitionRegistrationRepository,
  createCourierLabelRepository,
} from '../../../infrastructure/database/repositories/pmc/CompetitionRepository'
import {
  IMAGE_PDF_EXTENSIONS,
  IMAGE_PDF_MIMETYPES,
  MAX_FILE_SIZE,
  createFileFilter,
  ensureUploadSubDir,
  secureRandomFilename,
} from '../../../interfaces/http/middlewares/upload'
import { CourierLabelPdfService } from '../../services/pmc/CourierLabelPdfService'
import { PaymentVerificationService } from '../../services/pmc/PaymentVerificationService'
import {
  applicantRepositoryMongo,
  applicantFeeRepositoryMongo,
  psidTrackingRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = ensureUploadSubDir('media/competition')
    cb(null, dest)
  },
  filename: (_req, file, cb) => {
    cb(null, secureRandomFilename(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,
    fields: 50,
    fieldSize: 1024 * 1024,
  },
  fileFilter: createFileFilter(IMAGE_PDF_MIMETYPES, IMAGE_PDF_EXTENSIONS),
})

type AuthRequest = Request & { user?: any }

type CompetitionDeps = {
  competitionRepo: CompetitionRepository
  registrationRepo: CompetitionRegistrationRepository
  courierRepo: CourierLabelRepository
  paymentService: PaymentVerificationService
}

const defaultDeps: CompetitionDeps = {
  competitionRepo: createCompetitionRepository(),
  registrationRepo: createCompetitionRegistrationRepository(),
  courierRepo: createCourierLabelRepository(),
  paymentService: new PaymentVerificationService(
    applicantRepositoryMongo,
    applicantFeeRepositoryMongo,
    psidTrackingRepositoryMongo
  ),
}

/**
 * List all competitions
 * GET /api/pmc/competitions
 */
export const listCompetitions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { active } = req.query

  let competitions
  if (active === 'true') {
    competitions = await defaultDeps.competitionRepo.findActive()
  } else {
    competitions = await defaultDeps.competitionRepo.findAll()
  }

  res.json({
    success: true,
    data: competitions,
    total: competitions.length,
  })
})

/**
 * Get competition details
 * GET /api/pmc/competitions/:id
 */
export const getCompetition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Competition ID is required',
    })
  }

  const competition = await defaultDeps.competitionRepo.findById(id)
  if (!competition) {
    return res.status(404).json({
      success: false,
      message: 'Competition not found',
    })
  }

  const registrations = await defaultDeps.registrationRepo.findByCompetition(id)

  res.json({
    success: true,
    data: {
      ...competition.toObject(),
      registeredParticipants: registrations.length,
      participants: registrations,
    },
  })
})

/**
 * Register for competition (file upload)
 * POST /api/pmc/competitions/:id/register
 */
export const registerCompetition = [
  upload.fields([
    { name: 'submission_file', maxCount: 2 },
    { name: 'student_card_front', maxCount: 1 },
    { name: 'student_card_back', maxCount: 1 },
    { name: 'photo_object', maxCount: 1 },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const competitionParam = req.params.competitionId || req.params.id
    const {
      participantName,
      email,
      phone,
      submissionTitle,
      submissionDescription,
      full_name,
      fullName,
      mobile,
      institute,
      grade,
      category,
      competition_type,
      competitionType,
    } = req.body
    const applicantId = Number(
      (req as any).user?.applicantId || req.body.applicantId || req.query.applicantId
    )

    const resolvedParticipantName = participantName || full_name || fullName
    const resolvedPhone = phone || mobile
    const resolvedEmail =
      email ||
      (resolvedPhone ? `participant-${String(resolvedPhone)}@pmc.local` : undefined) ||
      (applicantId ? `applicant-${applicantId}@pmc.local` : undefined)
    const resolvedSubmissionTitle = submissionTitle || competitionType || competition_type || 'Competition Entry'
    const resolvedSubmissionDescription =
      submissionDescription ||
      [institute ? `Institute: ${institute}` : null, grade ? `Grade: ${grade}` : null, category ? `Category: ${category}` : null]
        .filter(Boolean)
        .join(' | ')

    if (!applicantId || !resolvedParticipantName || !resolvedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (applicantId, participant name, email)',
      })
    }

    let competitionId = competitionParam || req.body.competitionId || req.query.competitionId
    if (!competitionId) {
      const activeCompetitions = await defaultDeps.competitionRepo.findActive()
      if (!activeCompetitions.length) {
        return res.status(400).json({
          success: false,
          message: 'No active competition available for registration',
        })
      }
      competitionId = String((activeCompetitions[0] as any)._id)
    }

    // Check competition exists and is open
    const competition = await defaultDeps.competitionRepo.findById(String(competitionId))
    if (!competition || competition.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Competition not available for registration',
      })
    }

    // Check if already registered
    const existing = await defaultDeps.registrationRepo.findByCompetitionAndApplicant(
      String(competitionId),
      applicantId
    )
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this competition',
      })
    }

    // Process uploaded files
    const submissionFiles = ((req as any).files?.submission_file || []).map(
      (file: Express.Multer.File) => ({
        fileName: file.originalname,
        fileUrl: `/media/competition/${file.filename}`,
        fileType: file.mimetype,
        uploadedAt: new Date(),
      })
    )
    const additionalFiles = [
      ...((req as any).files?.student_card_front || []),
      ...((req as any).files?.student_card_back || []),
      ...((req as any).files?.photo_object || []),
    ].map((file: Express.Multer.File) => ({
      fileName: file.originalname,
      fileUrl: `/media/competition/${file.filename}`,
      fileType: file.mimetype,
      uploadedAt: new Date(),
    }))
    const allFiles = [...submissionFiles, ...additionalFiles]

    // Create registration
    const registration = await defaultDeps.registrationRepo.create({
      competitionId: String(competitionId) as any,
      applicantId,
      participantName: resolvedParticipantName,
      email: resolvedEmail,
      phone: resolvedPhone || '',
      submissionTitle: resolvedSubmissionTitle,
      submissionDescription: resolvedSubmissionDescription,
      submissionFiles: allFiles,
      status: 'REGISTERED',
      registeredAt: new Date(),
    })

    // Increment enrolled count
    await defaultDeps.competitionRepo.incrementEnrolledCount(String(competitionId))

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      registration_id: String((registration as any)._id || (registration as any).registrationId || ''),
      data: registration,
    })
  }),
] as any

/**
 * Get my registrations
 * GET /api/pmc/competitions/my/registrations
 */
export const getMyRegistrations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number((req as any).user?.applicantId)

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID required',
    })
  }

  const registrations = await defaultDeps.registrationRepo.findByApplicant(applicantId)

  res.json({
    success: true,
    data: registrations,
    total: registrations.length,
  })
})

/**
 * Submit competition entry
 * POST /api/pmc/competitions/:competitionId/registrations/:registrationId/submit
 */
export const submitEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const competitionId = req.params.competitionId || req.params.id
  const registrationId =
    req.params.registrationId ||
    req.body.registrationId ||
    req.body.registration_id ||
    req.query.registrationId ||
    req.query.registration_id

  if (!registrationId || !competitionId) {
    return res.status(400).json({
      success: false,
      message: 'Registration ID and Competition ID are required',
    })
  }

  const registration = await defaultDeps.registrationRepo.findById(registrationId)
  if (!registration) {
    return res.status(404).json({
      success: false,
      message: 'Registration not found',
    })
  }

  const updated = await defaultDeps.registrationRepo.update(registrationId, {
    status: 'SUBMITTED',
    submittedAt: new Date(),
  })

  res.json({
    success: true,
    message: 'Entry submitted successfully',
    data: updated,
  })
})

/**
 * Generate courier label
 * POST /api/pmc/competitions/:competitionId/registrations/:registrationId/label
 */
export const generateLabel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const competitionIdParam = req.params.competitionId || req.params.id
  const registrationId =
    req.params.registrationId ||
    req.query.registration_id ||
    req.query.registrationId ||
    req.body.registration_id ||
    req.body.registrationId
  const { recipientName, street, city, province, postalCode, phone, courierCompany } = req.body

  if (!registrationId) {
    return res.status(400).json({
      success: false,
      message: 'Registration ID is required',
    })
  }

  try {
    const registration = await defaultDeps.registrationRepo.findById(String(registrationId))
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      })
    }

    // Verify payment before allowing label generation
    const paymentStatus = await defaultDeps.paymentService.getPaymentStatus(registration.applicantId)
    if (paymentStatus.status !== 'PAID') {
      return res.status(403).json({
        success: false,
        message: `Payment verification required. Current status: ${paymentStatus.status}`,
        data: {
          applicantId: registration.applicantId,
          status: paymentStatus.status,
        },
      })
    }

    let label = await defaultDeps.courierRepo.findByRegistration(String(registrationId))

    if (!label) {
      const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      const resolvedCompetitionId = competitionIdParam || (registration as any).competitionId

      label = await defaultDeps.courierRepo.create({
        registrationId: String(registrationId) as any,
        competitionId: resolvedCompetitionId as any,
        applicantId: registration.applicantId,
        trackingNumber,
        courierCompany: courierCompany || 'TCS',
        shippingAddress: {
          recipientName: recipientName || registration.participantName,
          street: street || 'Address',
          city: city || 'Islamabad',
          province: province || 'Islamabad',
          postalCode: postalCode || '44000',
          phone: phone || registration.phone,
        },
        labelUrl: `/media/competition-labels/${trackingNumber}.pdf`,
        status: 'GENERATED',
        generatedAt: new Date(),
      })

      // Generate PDF label using CourierLabelPdfService
      await generateLabelPdf(label, registration)
    }

    if (req.method === 'GET') {
      const buffer = await generateLabelPdfBuffer(label)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="courier-label-${label.trackingNumber}.pdf"`)
      return res.send(buffer)
    }

    res.status(201).json({
      success: true,
      message: 'Courier label generated successfully',
      data: {
        ...(typeof (label as any).toObject === 'function' ? (label as any).toObject() : label),
        labelUrl: `/api/pmc/competition/courier-label/${registrationId}`,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to generate label: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Get courier label PDF
 * GET /api/pmc/courier-label/:registrationId
 */
export const getCourierLabelPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { registrationId } = req.params

  if (!registrationId) {
    return res.status(400).json({
      success: false,
      message: 'Registration ID is required',
    })
  }

  try {
    const label = await defaultDeps.courierRepo.findByRegistration(registrationId)
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Courier label not found',
      })
    }

    const buffer = await generateLabelPdfBuffer(label)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="courier-label-${label.trackingNumber}.pdf"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to retrieve label: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Generate PDF label
 */
async function generateLabelPdf(label: any, registration: any): Promise<void> {
  try {
    const labelData = {
      trackingNumber: label.trackingNumber,
      competitionName: 'Competition Entry',
      participantName: registration.participantName,
      recipientName: label.shippingAddress.recipientName,
      street: label.shippingAddress.street,
      city: label.shippingAddress.city,
      province: label.shippingAddress.province,
      postalCode: label.shippingAddress.postalCode,
      phone: label.shippingAddress.phone,
      courierCompany: label.courierCompany,
      generatedDate: label.generatedAt,
      registrationId: registration._id?.toString(),
    }

    await CourierLabelPdfService.generateCourierLabelPdf(labelData)
    console.log(`Generated label PDF for ${label.trackingNumber}`)
  } catch (error) {
    console.error(`Failed to generate label PDF: ${error}`)
    // Don't throw error - label record is already created
  }
}

/**
 * Generate label PDF buffer
 */
async function generateLabelPdfBuffer(label: any): Promise<Buffer> {
  const labelData = {
    trackingNumber: label.trackingNumber,
    competitionName: 'Competition Entry',
    participantName: label.shippingAddress?.recipientName || 'Recipient',
    recipientName: label.shippingAddress.recipientName,
    street: label.shippingAddress.street,
    city: label.shippingAddress.city,
    province: label.shippingAddress.province,
    postalCode: label.shippingAddress.postalCode,
    phone: label.shippingAddress.phone,
    courierCompany: label.courierCompany,
    generatedDate: label.generatedAt || new Date(),
    registrationId: label.registrationId?.toString(),
  }

  return await CourierLabelPdfService.generateCourierLabelPdf(labelData)
}

/**
 * Score submission (admin)
 * POST /api/pmc/competitions/:competitionId/registrations/:registrationId/score
 */
export const scoreSubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { registrationId } = req.params
  const { score } = req.body

  if (!registrationId || !Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({
      success: false,
      message: 'Valid score (0-100) is required',
    })
  }

  const updated = await defaultDeps.registrationRepo.scoreSubmission(
    registrationId,
    score,
    (req as any).user?.id || 'SYSTEM'
  )

  res.json({
    success: true,
    message: 'Submission scored successfully',
    data: updated,
  })
})
