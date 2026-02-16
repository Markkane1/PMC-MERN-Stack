import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

/**
 * PLMIS Payment Request Interface
 */
export interface PLMISPaymentRequest {
  applicantId: number
  applicantName: string
  amount: number
  description: string
  challanNumber?: string
  email?: string
  phone?: string
  redirectUrl?: string
}

/**
 * PLMIS Payment Response Interface
 */
export interface PLMISPaymentResponse {
  success: boolean
  psidNumber?: string
  transactionId?: string
  paymentUrl?: string
  message: string
  timestamp: Date
}

/**
 * PLMIS Payment Status Interface
 */
export interface PLMISPaymentStatus {
  psidNumber: string
  transactionId: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED'
  amount: number
  amountPaid?: number
  paymentDate?: Date
  confirmationDetails?: Record<string, any>
}

/**
 * PLMIS Integration Service
 * Handles payment initiation and verification with PLMIS system
 */
export class PLMISService {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl: string
  private departmentCode: string

  constructor() {
    this.baseUrl = process.env.PLMIS_API_URL || 'https://plmis.pitb.gov.pk/api'
    this.apiKey = process.env.PLMIS_API_KEY || ''
    this.departmentCode = process.env.PLMIS_DEPT_CODE || 'PMC'

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        console.error('PLMIS API Error:', (error.response as any)?.data || error.message)
        throw new Error(
          `PLMIS API Error: ${(error.response as any)?.data?.message || error.message}`
        )
      }
    )
  }

  /**
   * Initiate payment through PLMIS
   * @param request - Payment request details
   * @returns Payment response with PSID and transaction details
   */
  async initiatePayment(request: PLMISPaymentRequest): Promise<PLMISPaymentResponse> {
    try {
      const payload = {
        departmentCode: this.departmentCode,
        applicantId: request.applicantId,
        applicantName: request.applicantName,
        amount: request.amount,
        description: request.description,
        challanNumber: request.challanNumber || `CHN-${Date.now()}`,
        email: request.email,
        phone: request.phone,
        redirectUrl: request.redirectUrl || process.env.PLMIS_REDIRECT_URL,
        deptTransactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }

      const response = await this.client.post('/payment/initiate', payload)

      return {
        success: response.data.success,
        psidNumber: response.data.psidNumber,
        transactionId: response.data.transactionId,
        paymentUrl: response.data.paymentUrl,
        message: response.data.message || 'Payment initiated successfully',
        timestamp: new Date(),
      }
    } catch (error) {
      console.error('Failed to initiate PLMIS payment:', error)
      return {
        success: false,
        message: `Payment initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
    }
  }

  /**
   * Check payment status
   * @param psidNumber - PSID number from PLMIS
   * @returns Payment status details
   */
  async checkPaymentStatus(psidNumber: string): Promise<PLMISPaymentStatus | null> {
    try {
      const response = await this.client.get(`/payment/status/${psidNumber}`)

      if (!response.data.success) {
        return null
      }

      return {
        psidNumber: response.data.psidNumber,
        transactionId: response.data.transactionId,
        status: response.data.status,
        amount: response.data.amount,
        amountPaid: response.data.amountPaid,
        paymentDate: response.data.paymentDate ? new Date(response.data.paymentDate) : undefined,
        confirmationDetails: response.data.confirmationDetails,
      }
    } catch (error) {
      console.error(`Failed to check payment status for PSID ${psidNumber}:`, error)
      return null
    }
  }

  /**
   * Verify payment with bank
   * @param psidNumber - PSID number
   * @param deptTransactionId - Department transaction ID
   * @returns Verification result
   */
  async verifyPayment(psidNumber: string, deptTransactionId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/payment/verify', {
        psidNumber,
        deptTransactionId,
      })

      return response.data.success && response.data.verified === true
    } catch (error) {
      console.error(`Failed to verify payment for PSID ${psidNumber}:`, error)
      return false
    }
  }

  /**
   * Get payment receipt from PLMIS
   * @param psidNumber - PSID number
   * @returns Receipt data
   */
  async getPaymentReceipt(psidNumber: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/payment/receipt/${psidNumber}`)

      if (!response.data.success) {
        return null
      }

      return response.data.receipt
    } catch (error) {
      console.error(`Failed to get receipt for PSID ${psidNumber}:`, error)
      return null
    }
  }

  /**
   * Cancel payment
   * @param psidNumber - PSID number
   * @returns Cancellation result
   */
  async cancelPayment(psidNumber: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/payment/cancel/${psidNumber}`)

      return response.data.success
    } catch (error) {
      console.error(`Failed to cancel payment for PSID ${psidNumber}:`, error)
      return false
    }
  }

  /**
   * Get payment statistics for department
   * @param startDate - Start date for report
   * @param endDate - End date for report
   * @returns Payment statistics
   */
  async getPaymentStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<
    | {
        totalPayments: number
        totalAmount: number
        successfulPayments: number
        failedPayments: number
        pendingPayments: number
        averageAmount: number
      }
    | null
  > {
    try {
      const response = await this.client.get('/payment/statistics', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      })

      if (!response.data.success) {
        return null
      }

      return {
        totalPayments: response.data.totalPayments,
        totalAmount: response.data.totalAmount,
        successfulPayments: response.data.successfulPayments,
        failedPayments: response.data.failedPayments,
        pendingPayments: response.data.pendingPayments,
        averageAmount:
          response.data.totalPayments > 0
            ? response.data.totalAmount / response.data.totalPayments
            : 0,
      }
    } catch (error) {
      console.error('Failed to get payment statistics:', error)
      return null
    }
  }

  /**
   * Validate PLMIS credentials and connectivity
   * @returns Connection status
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health')
      return response.data.status === 'ok'
    } catch (error) {
      console.error('PLMIS Connection validation failed:', error)
      return false
    }
  }

  /**
   * Generate payment intimation for challan
   * @param applicantId - Applicant ID
   * @param amount - Payment amount
   * @param description - Payment description
   * @returns PSID and payment initiation URL
   */
  async generatePaymentIntimation(
    applicantId: number,
    amount: number,
    description: string
  ): Promise<{ psidNumber: string; paymentUrl: string } | null> {
    try {
      const response = await this.initiatePayment({
        applicantId,
        applicantName: `Applicant ${applicantId}`,
        amount,
        description,
      })

      if (response.success && response.psidNumber && response.paymentUrl) {
        return {
          psidNumber: response.psidNumber,
          paymentUrl: response.paymentUrl,
        }
      }

      return null
    } catch (error) {
      console.error('Failed to generate payment intimation:', error)
      return null
    }
  }
}

// Singleton instance
export const plmisService = new PLMISService()
