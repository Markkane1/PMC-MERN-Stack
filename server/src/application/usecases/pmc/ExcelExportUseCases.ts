import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { ExcelExportService } from '../../services/common/ExcelExportService'
import {
  applicantRepositoryMongo,
  applicantFeeRepositoryMongo,
  psidTrackingRepositoryMongo,
  competitionRegistrationRepositoryMongo,
  courierLabelRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { PaymentVerificationService } from '../../services/pmc/PaymentVerificationService'

type AuthRequest = Request & { user?: any }

/**
 * Export applicants with payment status
 * GET /api/pmc/export/applicants-payment
 */
export const exportApplicantsWithPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicants = await applicantRepositoryMongo.list()

    if (!applicants || applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applicants found to export',
      })
    }

    // Build payment map
    const paymentService = new PaymentVerificationService(
      applicantRepositoryMongo,
      applicantFeeRepositoryMongo,
      psidTrackingRepositoryMongo
    )

    const paymentMap = new Map()
    for (const applicant of applicants) {
      try {
        const status = await paymentService.getPaymentStatus((applicant as any).numericId)
        paymentMap.set((applicant as any).numericId, status)
      } catch (error) {
        console.error(`Failed to get payment status for applicant ${(applicant as any).numericId}`)
      }
    }

    const buffer = await ExcelExportService.exportApplicantsWithPayment(applicants, paymentMap)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="applicants-payment-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export applicants: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Export competition registrations
 * GET /api/pmc/export/competitions
 */
export const exportCompetitionRegistrations = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const registrations = await competitionRegistrationRepositoryMongo.findAll() as any[]

    if (!registrations || registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No competition registrations found to export',
      })
    }

    const buffer = await ExcelExportService.exportCompetitionRegistrations(registrations)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="competition-registrations-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export competitions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Export payment transactions
 * GET /api/pmc/export/payments
 * Query params: startDate, endDate (optional)
 */
export const exportPaymentTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const transactions = await applicantFeeRepositoryMongo.findAll()

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payment transactions found to export',
      })
    }

    // Filter by date range if provided
    let filtered = transactions
    if (startDate || endDate) {
      const start = startDate ? new Date(String(startDate)) : new Date(0)
      const end = endDate ? new Date(String(endDate)) : new Date()

      filtered = transactions.filter((t: any) => {
        const txDate = new Date(t.createdAt || t.transactionDate || new Date())
        return txDate >= start && txDate <= end
      })
    }

    const buffer = await ExcelExportService.exportPaymentTransactions(filtered)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="payment-transactions-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Export PSID tracking data
 * GET /api/pmc/export/psid-tracking
 */
export const exportPsidTracking = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const psidRecords = await psidTrackingRepositoryMongo.findAll()

    if (!psidRecords || psidRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No PSID tracking records found to export',
      })
    }

    const buffer = await ExcelExportService.exportPsidTracking(psidRecords)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="psid-tracking-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export PSID tracking: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Export courier labels
 * GET /api/pmc/export/courier-labels
 */
export const exportCourierLabels = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const labels = await courierLabelRepositoryMongo.findAll()

    if (!labels || labels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No courier labels found to export',
      })
    }

    const buffer = await ExcelExportService.exportCourierLabels(labels)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="courier-labels-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export courier labels: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Export comprehensive summary report
 * GET /api/pmc/export/summary-report
 */
export const exportSummaryReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicants = await applicantRepositoryMongo.list()
    const competitions = await competitionRegistrationRepositoryMongo.findAll()
    const payments = await applicantFeeRepositoryMongo.findAll()
    const psidRecords = await psidTrackingRepositoryMongo.findAll()
    const labels = await courierLabelRepositoryMongo.findAll()

    const buffer = await ExcelExportService.exportSummaryReport({
      applicants,
      competitions,
      payments,
      psidRecords,
      labels,
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="summary-report-${new Date().getTime()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to export summary report: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
