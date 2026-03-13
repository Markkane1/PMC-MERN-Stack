import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { PaymentVerificationService } from '../../services/pmc/PaymentVerificationService'
import { buildApplicantServiceDeps } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

const deps = buildApplicantServiceDeps()
const paymentService = new PaymentVerificationService(
  deps.applicantRepo,
  deps.applicantFeeRepo,
  deps.psidTrackingRepo,
  deps.businessProfileRepo
)

const PAYMENT_READ_PERMISSIONS = new Set([
  'pmc.view_applicantdetail',
  'pmc.view_applicantfee',
  'pmc.view_psidtracking',
  'pmc.view_license',
])

const PAYMENT_WRITE_PERMISSIONS = new Set([
  'pmc.change_applicantdetail',
  'pmc.change_applicantfee',
  'pmc.change_psidtracking',
  'pmc.add_psidtracking',
])

function normalizeUserId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function hasAnyPermission(user: any, permissions: Set<string>): boolean {
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : []
  return userPermissions.some((permission: string) => permissions.has(permission))
}

function isPrivilegedPaymentUser(user: any, mode: 'read' | 'write' | 'admin' = 'read'): boolean {
  if (!user) {
    return false
  }

  if (user.isSuperadmin || user.groups?.includes('Super') || user.groups?.includes('Admin')) {
    return true
  }

  if (mode === 'admin') {
    return hasAnyPermission(user, PAYMENT_WRITE_PERMISSIONS)
  }

  return hasAnyPermission(user, mode === 'write' ? PAYMENT_WRITE_PERMISSIONS : PAYMENT_READ_PERMISSIONS)
}

async function ensureApplicantAccess(
  req: AuthRequest,
  res: Response,
  applicantId: number,
  mode: 'read' | 'write' = 'read'
): Promise<boolean> {
  const user = req.user

  if (!Number.isFinite(applicantId) || applicantId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
    return false
  }

  if (mode === 'write' && !isPrivilegedPaymentUser(user, 'write')) {
    res.status(403).json({
      success: false,
      message: 'Manual payment verification requires elevated permissions',
    })
    return false
  }

  if (mode === 'read' && isPrivilegedPaymentUser(user, 'read')) {
    return true
  }

  const applicant = await deps.applicantRepo.findByNumericId(applicantId)
  if (!applicant) {
    res.status(404).json({
      success: false,
      message: 'Applicant not found',
    })
    return false
  }

  const applicantOwnerId = normalizeUserId((applicant as any).createdBy ?? (applicant as any).created_by)
  const candidateOwnerIds = new Set(
    [user?._id, user?.id, user?.sourceId].map(normalizeUserId).filter(Boolean) as string[]
  )
  const sessionApplicantId = Number(user?.applicantId)

  if ((applicantOwnerId && candidateOwnerIds.has(applicantOwnerId)) || sessionApplicantId === applicantId) {
    return true
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden',
  })
  return false
}

/**
 * Get payment status for an applicant
 * GET /api/pmc/payment-status/:applicantId
 */
export const getPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.applicantId)

  if (!(await ensureApplicantAccess(req, res, applicantId, 'read'))) {
    return
  }

  const status = await paymentService.getPaymentStatus(applicantId)

  res.json({
    success: true,
    data: status,
  })
})

/**
 * Record a payment
 * POST /api/pmc/payment-status/:applicantId
 */
export const recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.applicantId)
  const { amountDue, amountPaid, referenceNumber, reference } = req.body
  const resolvedAmount = Number(amountPaid ?? amountDue)
  const resolvedReference = String(referenceNumber || reference || '').trim()

  if (!(await ensureApplicantAccess(req, res, applicantId, 'write'))) {
    return
  }

  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0 || !resolvedReference) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID, amount, and reference number are required',
    })
  }

  try {
    const status = await paymentService.recordPayment(
      applicantId,
      resolvedAmount,
      resolvedReference
    )

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: status,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Check PSID payment status
 * GET /api/pmc/check-psid-status?psidNumber=XXX
 */
export const checkPsidPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { psidNumber } = req.query

  if (!psidNumber) {
    return res.status(400).json({
      success: false,
      message: 'PSID number is required',
    })
  }

  const tracking = await deps.psidTrackingRepo.findByConsumerNumber(String(psidNumber))
  const trackingApplicantId = Number((tracking as any)?.applicantId)

  if (!tracking || !Number.isFinite(trackingApplicantId)) {
    return res.status(404).json({
      success: false,
      message: 'PSID tracking record not found',
    })
  }

  if (!(await ensureApplicantAccess(req, res, trackingApplicantId, 'read'))) {
    return
  }

  try {
    const isPaid = await paymentService.verifyPsidPayment(String(psidNumber))

    res.json({
      success: true,
      data: {
        psidNumber,
        paymentConfirmed: isPaid,
        status: isPaid ? 'CONFIRMED' : 'PENDING',
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to check PSID payment status',
    })
  }
})

/**
 * Get payment history for an applicant
 * GET /api/pmc/payment-history/:applicantId
 */
export const getPaymentHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.applicantId)

  if (!(await ensureApplicantAccess(req, res, applicantId, 'read'))) {
    return
  }

  const history = await paymentService.getPaymentHistory(applicantId)

  res.json({
    success: true,
    data: {
      applicantId,
      payments: history,
      totalPayments: history.length,
    },
  })
})

/**
 * Check license eligibility based on payment
 * GET /api/pmc/license-eligibility/:applicantId
 */
export const checkLicenseEligibility = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.applicantId)

  if (!(await ensureApplicantAccess(req, res, applicantId, 'read'))) {
    return
  }

  try {
    const eligible = await paymentService.isEligibleForLicense(applicantId)
    const status = await paymentService.getPaymentStatus(applicantId)

    res.json({
      success: true,
      data: {
        applicantId,
        eligible,
        paymentStatus: status.status,
        remainingBalance: status.remainingBalance,
        message: eligible
          ? 'Applicant is eligible to download license'
          : `Applicant must pay PKR ${status.remainingBalance} to be eligible`,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to check eligibility',
    })
  }
})

/**
 * Verify multiple payments
 * POST /api/pmc/verify-payments
 * Body: {
 *   payments: [{ referenceNumber, amount }, ...]
 * }
 */
export const verifyMultiplePayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { payments } = req.body

  if (!isPrivilegedPaymentUser(req.user, 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Bulk payment verification requires elevated permissions',
    })
  }

  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Payments array is required',
    })
  }

  const results = await paymentService.verifyMultiplePayments(payments)

  const verified = results.filter((r) => r.verified).length
  const failed = results.length - verified

  res.json({
    success: true,
    data: {
      total: results.length,
      verified,
      failed,
      details: results,
    },
  })
})

/**
 * Send payment reminder
 * POST /api/pmc/payment-reminder/:applicantId
 */
export const sendPaymentReminder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.applicantId)
  const { daysUntilDue } = req.body

  if (!(await ensureApplicantAccess(req, res, applicantId, 'write'))) {
    return
  }

  try {
    const sent = await paymentService.sendPaymentReminder(
      applicantId,
      daysUntilDue || 7
    )

    res.json({
      success: true,
      message: sent ? 'Reminder sent successfully' : 'No reminder needed (payment already made)',
      data: {
        sent,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Get payment summary report
 * GET /api/pmc/payment-summary?districtId=XXX
 */
export const getPaymentSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { districtId } = req.query

  if (!isPrivilegedPaymentUser(req.user, 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Payment summary access requires elevated permissions',
    })
  }

  const summary = await paymentService.generatePaymentSummary(districtId as string | undefined)

  res.json({
    success: true,
    data: summary,
  })
})
