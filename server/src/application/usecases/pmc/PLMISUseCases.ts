import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { plmisService } from '../../services/pmc/PLMISService'
import { applicantRepositoryMongo, psidTrackingRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

/**
 * Initiate PLMIS payment
 * POST /api/pmc/plmis/initiate
 * Body: {
 *   applicantId: number (required)
 *   amount: number (required)
 *   description: string (required)
 *   challanNumber?: string
 *   redirectUrl?: string
 * }
 */
export const initiatePlmisPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { applicantId, amount, description, challanNumber, redirectUrl } = req.body

  if (!applicantId || !amount || !description) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID, amount, and description are required',
    })
  }

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than zero',
    })
  }

  try {
    const applicant = await applicantRepositoryMongo.findByNumericId(Number(applicantId))
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found',
      })
    }

    const paymentResponse = await plmisService.initiatePayment({
      applicantId: Number(applicantId),
      applicantName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      amount: parseFloat(amount),
      description,
      challanNumber,
      email: (applicant as any).email,
      phone: (applicant as any).phone,
      redirectUrl,
    })

    res.json({
      success: paymentResponse.success,
      data: {
        psidNumber: paymentResponse.psidNumber,
        transactionId: paymentResponse.transactionId,
        paymentUrl: paymentResponse.paymentUrl,
      },
      message: paymentResponse.message,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to initiate payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Check PLMIS payment status
 * GET /api/pmc/plmis/status/:psidNumber
 */
export const checkPlmisPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { psidNumber } = req.params

  if (!psidNumber) {
    return res.status(400).json({
      success: false,
      message: 'PSID number is required',
    })
  }

  try {
    const status = await plmisService.checkPaymentStatus(psidNumber)

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      })
    }

    res.json({
      success: true,
      data: status,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Verify PLMIS payment
 * POST /api/pmc/plmis/verify
 * Body: {
 *   psidNumber: string (required)
 *   deptTransactionId: string (required)
 * }
 */
export const verifyPlmisPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { psidNumber, deptTransactionId } = req.body

  if (!psidNumber || !deptTransactionId) {
    return res.status(400).json({
      success: false,
      message: 'PSID number and transaction ID are required',
    })
  }

  try {
    const verified = await plmisService.verifyPayment(psidNumber, deptTransactionId)

    res.json({
      success: true,
      data: {
        psidNumber,
        verified,
        status: verified ? 'CONFIRMED' : 'PENDING',
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to verify payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Get PLMIS payment receipt
 * GET /api/pmc/plmis/receipt/:psidNumber
 */
export const getPlmisReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { psidNumber } = req.params

  if (!psidNumber) {
    return res.status(400).json({
      success: false,
      message: 'PSID number is required',
    })
  }

  try {
    const receipt = await plmisService.getPaymentReceipt(psidNumber)

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
      })
    }

    res.json({
      success: true,
      data: receipt,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to get receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Cancel PLMIS payment
 * POST /api/pmc/plmis/cancel/:psidNumber
 */
export const cancelPlmisPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { psidNumber } = req.params

  if (!psidNumber) {
    return res.status(400).json({
      success: false,
      message: 'PSID number is required',
    })
  }

  try {
    const cancelled = await plmisService.cancelPayment(psidNumber)

    res.json({
      success: cancelled,
      data: {
        psidNumber,
        cancelled,
      },
      message: cancelled ? 'Payment cancelled successfully' : 'Failed to cancel payment',
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Get payment statistics
 * GET /api/pmc/plmis/statistics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getPlmisStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query

  const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate ? new Date(String(endDate)) : new Date()

  try {
    const statistics = await plmisService.getPaymentStatistics(start, end)

    if (!statistics) {
      return res.status(400).json({
        success: false,
        message: 'Failed to retrieve statistics',
      })
    }

    res.json({
      success: true,
      data: {
        ...statistics,
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * PLMIS Webhook: Handle payment confirmation from PLMIS
 * POST /api/pmc/plmis/webhook/payment-confirmed
 * Body: {
 *   psidNumber: string
 *   transactionId: string
 *   status: string
 *   amount: number
 *   paymentDate: string
 *   confirmationDetails?: object
 * }
 */
export const plmisPaymentConfirmedWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { psidNumber, transactionId, status, amount, paymentDate } = req.body

    if (!psidNumber || !transactionId || !status || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required webhook fields',
      })
    }

    try {
      const normalizedStatus = String(status || '').toUpperCase()
      const paymentAmount = Number(amount)
      const paidAt = paymentDate ? new Date(paymentDate) : new Date()

      const existing = await psidTrackingRepositoryMongo.findByConsumerNumber(String(psidNumber))

      let applicantUpdated = false
      if (existing && ((existing as any)._id || (existing as any).id)) {
        await psidTrackingRepositoryMongo.updateById(String((existing as any)._id || (existing as any).id), {
          deptTransactionId: transactionId,
          paymentStatus: normalizedStatus === 'CONFIRMED' ? 'PAID' : normalizedStatus,
          status: 'PAID',
          amountPaid: Number.isFinite(paymentAmount) ? paymentAmount : undefined,
          paidDate: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
          paidTime: new Date().toTimeString().slice(0, 8),
          message: 'Payment confirmed via PLMIS webhook',
        })

        if ((existing as any).applicantId) {
          await applicantRepositoryMongo.updateByNumericId(Number((existing as any).applicantId), {
            applicationStatus: 'Submitted',
            assignedGroup: 'Download License',
          })
          applicantUpdated = true
        }
      } else {
        await psidTrackingRepositoryMongo.create({
          consumerNumber: String(psidNumber),
          deptTransactionId: String(transactionId),
          paymentStatus: normalizedStatus === 'CONFIRMED' ? 'PAID' : normalizedStatus,
          status: 'PAID',
          amountPaid: Number.isFinite(paymentAmount) ? paymentAmount : undefined,
          paidDate: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
          paidTime: new Date().toTimeString().slice(0, 8),
          message: 'Payment confirmed via PLMIS webhook',
        })
      }

      console.log('[PLMIS WEBHOOK] Payment confirmed:', {
        psidNumber,
        transactionId,
        status,
        amount,
        paymentDate,
      })

      res.json({
        success: true,
        message: 'Payment confirmation webhook processed',
        data: {
          psidNumber,
          processed: true,
          applicantUpdated,
        },
      })
    } catch (error) {
      console.error('[PLMIS WEBHOOK ERROR]', error)
      res.status(400).json({
        success: false,
        message: 'Failed to process payment confirmation',
      })
    }
  }
)

/**
 * PLMIS Webhook: Handle payment failed notification
 * POST /api/pmc/plmis/webhook/payment-failed
 */
export const plmisPaymentFailedWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { psidNumber, transactionId, reason } = req.body

    if (!psidNumber || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required webhook fields',
      })
    }

    try {
      const existing = await psidTrackingRepositoryMongo.findByConsumerNumber(String(psidNumber))
      if (existing && ((existing as any)._id || (existing as any).id)) {
        await psidTrackingRepositoryMongo.updateById(String((existing as any)._id || (existing as any).id), {
          deptTransactionId: String(transactionId),
          paymentStatus: 'FAILED',
          status: 'FAILED',
          message: `Payment failed: ${reason || 'Unknown reason'}`,
        })
      } else {
        await psidTrackingRepositoryMongo.create({
          consumerNumber: String(psidNumber),
          deptTransactionId: String(transactionId),
          paymentStatus: 'FAILED',
          status: 'FAILED',
          message: `Payment failed: ${reason || 'Unknown reason'}`,
        })
      }

      console.log('[PLMIS WEBHOOK] Payment failed:', {
        psidNumber,
        transactionId,
        reason,
      })

      res.json({
        success: true,
        message: 'Payment failure webhook processed',
        data: {
          psidNumber,
          processed: true,
        },
      })
    } catch (error) {
      console.error('[PLMIS WEBHOOK ERROR]', error)
      res.status(400).json({
        success: false,
        message: 'Failed to process payment failure notification',
      })
    }
  }
)

/**
 * Validate PLMIS connectivity
 * GET /api/pmc/plmis/health
 */
export const validatePlmisHealth = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const connected = await plmisService.validateConnection()

    res.json({
      success: connected,
      data: {
        status: connected ? 'CONNECTED' : 'DISCONNECTED',
        timestamp: new Date(),
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'PLMIS health check failed',
      data: {
        status: 'ERROR',
      },
    })
  }
})
