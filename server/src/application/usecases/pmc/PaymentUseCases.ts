import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { PaymentVerificationService } from '../../services/pmc/PaymentVerificationService'
import { buildApplicantServiceDeps } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

const deps = buildApplicantServiceDeps()
const paymentService = new PaymentVerificationService(
  deps.applicantRepo,
  deps.applicantFeeRepo,
  deps.psidTrackingRepo
)

/**
 * Get payment status for an applicant
 * GET /api/pmc/payment-status/:applicantId
 */
export const getPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { applicantId } = req.params

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  const status = await paymentService.getPaymentStatus(Number(applicantId))

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
  const { applicantId } = req.params
  const { amountDue, amountPaid, referenceNumber, reference } = req.body
  const resolvedAmount = Number(amountPaid ?? amountDue)
  const resolvedReference = String(referenceNumber || reference || '').trim()

  if (!applicantId || !Number.isFinite(resolvedAmount) || resolvedAmount <= 0 || !resolvedReference) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID, amount, and reference number are required',
    })
  }

  try {
    const status = await paymentService.recordPayment(
      Number(applicantId),
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
  const { applicantId } = req.params

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  const history = await paymentService.getPaymentHistory(Number(applicantId))

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
  const { applicantId } = req.params

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  try {
    const eligible = await paymentService.isEligibleForLicense(Number(applicantId))
    const status = await paymentService.getPaymentStatus(Number(applicantId))

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
  const { applicantId } = req.params
  const { daysUntilDue } = req.body

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  try {
    const sent = await paymentService.sendPaymentReminder(
      Number(applicantId),
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

  const summary = await paymentService.generatePaymentSummary(districtId as string | undefined)

  res.json({
    success: true,
    data: summary,
  })
})
