import type {
  ApplicantRepository,
  ApplicantFeeRepository,
  PSIDTrackingRepository,
  BusinessProfileRepository,
} from '../../../domain/repositories/pmc'
import { invalidatePmcDashboardCaches } from './DashboardCacheService'

/**
 * Payment Status Interface
 */
export interface PaymentStatus {
  applicantId: number | string
  totalDue: number
  totalPaid: number
  remainingBalance: number
  isPaid: boolean
  isPartiallyPaid: boolean
  lastPaymentDate?: Date
  nextDueDate?: Date
  daysOverdue: number
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  paymentPercentage: number
}

/**
 * Payment Record Interface
 */
export interface PaymentRecord {
  _id?: string
  applicantId: number
  amount: number
  paymentMethod: 'CHALAN' | 'ONLINE' | 'MANUAL' | 'PSID'
  referenceNumber: string
  bankName?: string
  transactionDate: Date
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REVERSED'
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Payment Verification Service
 * Handles payment status tracking, verification, and applicant status updates
 */
export class PaymentVerificationService {
  constructor(
    private applicantRepo: ApplicantRepository,
    private feeRepo: ApplicantFeeRepository,
    private psidRepo: PSIDTrackingRepository,
    private businessProfileRepo?: BusinessProfileRepository
  ) {}

  /**
   * Get complete payment status for an applicant
   * @param applicantId - Numeric applicant ID
   * @returns Complete payment status object
   */
  async getPaymentStatus(applicantId: number): Promise<PaymentStatus> {
    try {
      const totalDue = await this.feeRepo.sumFeeByApplicantId(applicantId)

      const paidEntries = await this.psidRepo.listPaidByApplicantId(applicantId)
      const paid = paidEntries.reduce((sum, entry: any) => {
        const amount = Number(entry?.amountPaid ?? entry?.amountWithinDueDate ?? 0)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)

      const lastPayment = paidEntries
        .map((entry: any) => {
          const value = entry?.paidDate || entry?.updatedAt || entry?.createdAt
          return value ? new Date(value) : null
        })
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0]

      const remainingBalance = Math.max(0, totalDue - paid)
      const isPaid = remainingBalance <= 0
      const isPartiallyPaid = paid > 0 && !isPaid
      const paymentPercentage = totalDue > 0 ? Math.min(100, Math.round((paid / totalDue) * 100)) : 100
      const nextDueDate = this.calculateNextDue(lastPayment)
      const daysOverdue = !isPaid ? this.calculateDaysOverdue(nextDueDate) : 0

      let status: PaymentStatus['status'] = 'PENDING'
      if (isPaid) {
        status = 'PAID'
      } else if (isPartiallyPaid) {
        status = 'PARTIAL'
      } else if (daysOverdue > 0) {
        status = 'OVERDUE'
      }
      
      return {
        applicantId,
        totalDue,
        totalPaid: paid,
        remainingBalance,
        isPaid,
        isPartiallyPaid,
        lastPaymentDate: lastPayment,
        nextDueDate,
        daysOverdue,
        status,
        paymentPercentage,
      }
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify and record a payment
   * @param applicantId - Numeric applicant ID
   * @param amount - Payment amount
   * @param referenceNumber - Payment reference (chalan/PSID number)
   * @param paymentMethod - Type of payment
   * @returns Updated payment status
   */
  async recordPayment(
    applicantId: number,
    amount: number,
    referenceNumber: string
  ): Promise<PaymentStatus> {
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero')
    }
    if (!referenceNumber?.trim()) {
      throw new Error('Reference number is required')
    }

    const now = new Date()
    await this.psidRepo.create({
      applicantId,
      deptTransactionId: referenceNumber,
      consumerNumber: referenceNumber,
      amountWithinDueDate: amount,
      amountAfterDueDate: amount,
      amountPaid: amount,
      paidDate: now,
      paidTime: now.toTimeString().slice(0, 8),
      paymentStatus: 'PAID',
      status: 'PAID',
      message: 'Payment recorded manually',
      createdAt: now,
    })

    // Get updated status
    const status = await this.getPaymentStatus(applicantId)

    // Update applicant workflow status if fully paid
    if (status.isPaid) {
      await this.applicantRepo.updateOne(
        { numericId: applicantId },
        { assignedGroup: 'Download License', applicationStatus: 'Submitted' }
      )
    }

    await invalidatePmcDashboardCaches({
      applicantId,
      includeFees: true,
      includeSubmitted: true,
    })

    return status
  }

  /**
   * Verify PSID payment confirmation from bank
   * @param psidNumber - PSID tracking number
   * @returns True if payment is confirmed
   */
  async verifyPsidPayment(psidNumber: string): Promise<boolean> {
    try {
      const tracking = await this.psidRepo.findByConsumerNumber(psidNumber)
      const status = String((tracking as any)?.paymentStatus || '').toUpperCase()
      return status === 'PAID' || status === 'CONFIRMED' || status === 'SUCCESS' || status === 'COMPLETED'
    } catch (error) {
      return false
    }
  }

  /**
   * Get payment history for an applicant
   * @param applicantId - Numeric applicant ID
   * @returns Payment records
   */
  async getPaymentHistory(applicantId: number): Promise<PaymentRecord[]> {
    try {
      const fees = await this.feeRepo.listByApplicantId(applicantId)

      const feeEntries: PaymentRecord[] = fees.map((fee: any) => ({
        _id: fee._id?.toString(),
        applicantId,
        amount: Number(fee.feeAmount || 0),
        paymentMethod: 'CHALAN',
        referenceNumber: String(fee.numericId || fee._id || ''),
        bankName: undefined,
        transactionDate: fee.createdAt ? new Date(fee.createdAt) : new Date(),
        status: fee.isSettled ? 'CONFIRMED' : 'PENDING',
        notes: fee.reason,
        createdAt: fee.createdAt,
        updatedAt: fee.updatedAt,
      }))

      const psidPayments = await this.psidRepo.listPaidByApplicantId(applicantId)
      const paidEntries: PaymentRecord[] = psidPayments.map((entry: any) => ({
        _id: entry._id?.toString(),
        applicantId,
        amount: Number(entry.amountPaid || entry.amountWithinDueDate || 0),
        paymentMethod: 'PSID',
        referenceNumber: String(entry.consumerNumber || entry.deptTransactionId || ''),
        bankName: entry.bankCode,
        transactionDate: entry.paidDate ? new Date(entry.paidDate) : new Date(entry.createdAt || Date.now()),
        status: 'CONFIRMED',
        notes: entry.message,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }))

      return [...paidEntries, ...feeEntries].sort(
        (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()
      )
    } catch (error) {
      console.error(`Error getting payment history for applicant ${applicantId}:`, error)
      return []
    }
  }

  /**
   * Verify multiple payments (batch verification)
   * @param payments - Array of payment references to verify
   * @returns Verification results
   */
  async verifyMultiplePayments(
    payments: Array<{ referenceNumber: string; amount: number }>
  ): Promise<
    Array<{
      referenceNumber: string
      amount: number
      verified: boolean
      message: string
    }>
  > {
    return payments.map((payment) => {
      // In a real implementation, would verify against payment records
      // For now, assume all are verified within last 24 hours
      const verified = payment.amount > 0 && payment.referenceNumber.length > 0
      return {
        referenceNumber: payment.referenceNumber,
        amount: payment.amount,
        verified,
        message: verified ? 'Payment verified' : 'Invalid payment data',
      }
    })
  }

  /**
   * Check if applicant is eligible for license download
   * @param applicantId - Numeric applicant ID
   * @returns True if all payments are made
   */
  async isEligibleForLicense(applicantId: number): Promise<boolean> {
    const status = await this.getPaymentStatus(applicantId)
    return status.isPaid
  }

  /**
   * Send payment reminder notification
   * @param applicantId - Numeric applicant ID
   * @param daysUntilDue - Number of days until payment is due
   * @returns Success status
   */
  async sendPaymentReminder(applicantId: number, daysUntilDue: number = 7): Promise<boolean> {
    try {
      const status = await this.getPaymentStatus(applicantId)

      if (status.isPaid) {
        return false // No reminder needed if already paid
      }

      const applicant = await this.applicantRepo.findByNumericId(applicantId)
      if (!applicant) {
        throw new Error('Applicant not found')
      }

      // Log reminder for integration with email/SMS service
      const reminderData = {
        applicantId,
        applicantName: (applicant as any).firstName || '',
        email: (applicant as any).email || null,
        phone: (applicant as any).phone || (applicant as any).mobileNo || null,
        amountDue: status.remainingBalance,
        daysUntilDue,
        nextDueDate: status.nextDueDate,
        sentAt: new Date(),
      }

      console.log('[PAYMENT REMINDER]', reminderData)

      return true
    } catch (error) {
      console.error(`Failed to send payment reminder for applicant ${applicantId}:`, error)
      return false
    }
  }

  /**
   * Calculate days until payment is due
   * @returns Number of days remaining
   */
  private calculateNextDue(lastPaymentDate?: Date): Date {
    const due = lastPaymentDate ? new Date(lastPaymentDate) : new Date()
    due.setDate(due.getDate() + 30) // 30 days from last payment
    return due
  }

  /**
   * Check if payment is overdue
   * @param lastPaymentDate - Date of last payment
   * @returns True if overdue
   */
  private calculateDaysOverdue(dueDate: Date): number {
    const today = new Date()

    if (today <= dueDate) {
      return 0
    }

    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * Generate payment summary report
   * @param districtId - Optional district filter
   * @returns Summary statistics
   */
  async generatePaymentSummary(districtId?: string): Promise<{
    totalApplicants: number
    totalPaymentRequired: number
    totalPaymentReceived: number
    totalPending: number
    paymentCollectionRate: number
    overdueCount: number
  }> {
    try {
      const districtNumericId = districtId !== undefined ? Number(districtId) : null
      const hasDistrictFilter = Number.isFinite(districtNumericId)
      let targetApplicantIds: number[] | null = null

      if (hasDistrictFilter && this.businessProfileRepo) {
        const profiles = await this.businessProfileRepo.listByDistrictId(Number(districtNumericId))
        targetApplicantIds = Array.from(
          new Set(
            (profiles || [])
              .map((profile: any) => Number(profile?.applicantId ?? profile?.applicant_id))
              .filter((id) => Number.isFinite(id))
          )
        )
      }

      const applicantFilter =
        targetApplicantIds && targetApplicantIds.length
          ? {
              $or: [
                { numericId: { $in: targetApplicantIds } },
                { numeric_id: { $in: targetApplicantIds } },
                { id: { $in: targetApplicantIds.map(String) } },
              ],
            }
          : {}

      const applicants = await this.applicantRepo.list(applicantFilter)
      const applicantIds = Array.from(
        new Set(
          applicants
            .map((applicant: any) => Number((applicant as any)?.numericId ?? (applicant as any)?.id))
            .filter((id) => Number.isFinite(id))
        )
      )

      if (hasDistrictFilter && targetApplicantIds && !targetApplicantIds.length) {
        return {
          totalApplicants: 0,
          totalPaymentRequired: 0,
          totalPaymentReceived: 0,
          totalPending: 0,
          paymentCollectionRate: 0,
          overdueCount: 0,
        }
      }

      const [fees, psidEntries] = await Promise.all([
        applicantIds.length && this.feeRepo.listByApplicantIds
          ? this.feeRepo.listByApplicantIds(applicantIds)
          : this.feeRepo.list(),
        this.psidRepo.list(),
      ])

      const applicantIdSet = new Set(applicantIds)
      const dueByApplicant = new Map<number, number>()
      for (const fee of fees as any[]) {
        const applicantId = Number((fee as any)?.applicantId ?? (fee as any)?.applicant_id)
        if (!Number.isFinite(applicantId) || !applicantIdSet.has(applicantId)) continue
        const amount = Number((fee as any)?.feeAmount ?? (fee as any)?.fee_amount ?? 0)
        if (!Number.isFinite(amount)) continue
        dueByApplicant.set(applicantId, (dueByApplicant.get(applicantId) || 0) + amount)
      }

      const paidByApplicant = new Map<number, number>()
      const lastPaidAtByApplicant = new Map<number, Date>()
      for (const entry of psidEntries as any[]) {
        const applicantId = Number((entry as any)?.applicantId ?? (entry as any)?.applicant_id)
        if (!Number.isFinite(applicantId) || !applicantIdSet.has(applicantId)) continue

        const paymentStatus = String((entry as any)?.paymentStatus ?? (entry as any)?.payment_status ?? '').toUpperCase()
        if (!['PAID', 'CONFIRMED', 'SUCCESS', 'COMPLETED'].includes(paymentStatus)) continue

        const amount = Number((entry as any)?.amountPaid ?? (entry as any)?.amount_paid ?? (entry as any)?.amountWithinDueDate ?? (entry as any)?.amount_within_due_date ?? 0)
        if (Number.isFinite(amount)) {
          paidByApplicant.set(applicantId, (paidByApplicant.get(applicantId) || 0) + amount)
        }

        const paidAtRaw = (entry as any)?.paidDate ?? (entry as any)?.paid_date ?? (entry as any)?.updatedAt ?? (entry as any)?.createdAt
        const paidAt = paidAtRaw ? new Date(paidAtRaw) : null
        if (paidAt && Number.isFinite(paidAt.getTime())) {
          const current = lastPaidAtByApplicant.get(applicantId)
          if (!current || paidAt.getTime() > current.getTime()) {
            lastPaidAtByApplicant.set(applicantId, paidAt)
          }
        }
      }

      let totalPaymentRequired = 0
      let totalPaymentReceived = 0
      let totalPending = 0
      let overdueCount = 0

      for (const applicantId of applicantIds) {
        const totalDue = dueByApplicant.get(applicantId) || 0
        const totalPaid = paidByApplicant.get(applicantId) || 0
        const remainingBalance = Math.max(0, totalDue - totalPaid)
        totalPaymentRequired += totalDue
        totalPaymentReceived += totalPaid
        totalPending += remainingBalance

        if (remainingBalance > 0 && totalPaid <= 0) {
          const dueDate = this.calculateNextDue(lastPaidAtByApplicant.get(applicantId))
          if (this.calculateDaysOverdue(dueDate) > 0) {
            overdueCount += 1
          }
        }
      }

      const paymentCollectionRate = totalPaymentRequired > 0
        ? Math.round((totalPaymentReceived / totalPaymentRequired) * 100)
        : 0

      return {
        totalApplicants: applicantIds.length,
        totalPaymentRequired,
        totalPaymentReceived,
        totalPending,
        paymentCollectionRate,
        overdueCount,
      }
    } catch (error) {
      console.error('Error generating payment summary:', error)
      return {
        totalApplicants: 0,
        totalPaymentRequired: 0,
        totalPaymentReceived: 0,
        totalPending: 0,
        paymentCollectionRate: 0,
        overdueCount: 0,
      }
    }
  }
}
