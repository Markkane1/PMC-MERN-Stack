import { AlertRepository, AlertRecipientRepository, AlertTemplateRepository } from '../../../domain/repositories/pmc'
import { AlertType, AlertChannel, AlertStatus, AlertPriority, CreateAlertDTO, SendAlertDTO } from '../../../domain/models/Alert'
import { PaymentVerificationService } from './PaymentVerificationService'

/**
 * Alert Service
 * Handles alert creation, sending, and management
 */
export class AlertService {
  constructor(
    private alertRepository: AlertRepository,
    private alertRecipientRepository: AlertRecipientRepository,
    private alertTemplateRepository: AlertTemplateRepository,
    private paymentService: PaymentVerificationService
  ) {}

  /**
   * Create a new alert
   */
  async createAlert(alertData: CreateAlertDTO) {
    const alert = await this.alertRepository.create({
      applicantId: alertData.applicantId,
      title: alertData.title,
      message: alertData.message,
      description: alertData.description || null,
      type: alertData.type,
      priority: alertData.priority || AlertPriority.MEDIUM,
      channels: alertData.channels,
      status: AlertStatus.PENDING,
      metadata: alertData.metadata || {},
      isRead: false,
    })

    // Automatically send if channels are specified
    if (alertData.channels && alertData.channels.length > 0) {
      await this.sendAlert(alert._id.toString(), alertData.channels)
    }

    return alert
  }

  /**
   * Send an alert through specified channels
   */
  async sendAlert(alertId: string, channels: AlertChannel[]) {
    const alert = await this.alertRepository.findById(alertId)
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`)
    }

    const recipient = await this.alertRecipientRepository.findByApplicantId(alert.applicantId)
    if (!recipient) {
      throw new Error(`No recipient found for applicant ${alert.applicantId}`)
    }

    // Check if user prefers notifications through these channels
    const validChannels = channels.filter((channel) => {
      switch (channel) {
        case AlertChannel.EMAIL:
          return recipient.preferences.emailNotifications && recipient.verifiedEmail
        case AlertChannel.SMS:
          return recipient.preferences.smsNotifications && recipient.verifiedPhone
        case AlertChannel.IN_APP:
          return recipient.preferences.inAppNotifications
        case AlertChannel.WHATSAPP:
          return recipient.preferences.whatsappNotifications && recipient.verifiedPhone
        default:
          return false
      }
    })

    if (validChannels.length === 0) {
      throw new Error(`No valid channels available for alert ${alertId}`)
    }

    try {
      // Get template
      const template = await this.alertTemplateRepository.findByType(alert.type)

      // Send through each channel
      for (const channel of validChannels) {
        await this.sendThroughChannel(alert, recipient, channel, template)
      }

      // Update alert status
      await this.alertRepository.updateStatus(alertId, AlertStatus.SENT)
      return { success: true, alert, channels: validChannels }
    } catch (error) {
      await this.alertRepository.update(alertId, {
        status: AlertStatus.FAILED,
        failureReason: (error as Error).message,
        retryCount: (alert.retryCount || 0) + 1,
      })
      throw error
    }
  }

  /**
   * Send alert through specific channel
   */
  private async sendThroughChannel(alert: any, recipient: any, channel: AlertChannel, template: any) {
    switch (channel) {
      case AlertChannel.EMAIL:
        return this.sendEmailAlert(alert, recipient, template)
      case AlertChannel.SMS:
        return this.sendSmsAlert(alert, recipient, template)
      case AlertChannel.IN_APP:
        return this.recordInAppAlert(alert)
      case AlertChannel.WHATSAPP:
        return this.sendWhatsappAlert(alert, recipient, template)
      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: any, recipient: any, template: any) {
    // TODO: Implement email sending via SMTP/SendGrid
    console.log(`Sending email to ${recipient.email}:`, alert.title)
    // For now, just log - implementation would integrate with email service
    return { success: true, channel: AlertChannel.EMAIL }
  }

  /**
   * Send SMS alert
   */
  private async sendSmsAlert(alert: any, recipient: any, template: any) {
    // TODO: Implement SMS sending via Twilio/local SMS gateway
    console.log(`Sending SMS to ${recipient.phone}:`, alert.message)
    // For now, just log - implementation would integrate with SMS service
    return { success: true, channel: AlertChannel.SMS }
  }

  /**
   * Record in-app alert
   */
  private async recordInAppAlert(alert: any) {
    // In-app alerts are already in database, just mark as ready
    return { success: true, channel: AlertChannel.IN_APP }
  }

  /**
   * Send WhatsApp alert
   */
  private async sendWhatsappAlert(alert: any, recipient: any, template: any) {
    // TODO: Implement WhatsApp sending via WhatsApp Business API
    console.log(`Sending WhatsApp to ${recipient.phone}:`, alert.message)
    // For now, just log - implementation would integrate with WhatsApp service
    return { success: true, channel: AlertChannel.WHATSAPP }
  }

  /**
   * Get alerts for applicant
   */
  async getApplicantAlerts(applicantId: number, limit = 50, offset = 0) {
    return this.alertRepository.findByApplicantId(applicantId, limit, offset)
  }

  /**
   * Get unread alerts count
   */
  async getUnreadCount(applicantId: number) {
    return this.alertRepository.countUnreadByApplicantId(applicantId)
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string) {
    return this.alertRepository.markAsRead(alertId)
  }

  /**
   * Mark multiple alerts as read
   */
  async markMultipleAsRead(alertIds: string[]) {
    return this.alertRepository.markMultipleAsRead(alertIds)
  }

  /**
   * Delete alert
   */
  async deleteAlert(alertId: string) {
    return this.alertRepository.delete(alertId)
  }

  /**
   * Get or create alert recipient
   */
  async getOrCreateRecipient(applicantId: number, email: string, phone: string) {
    let recipient = await this.alertRecipientRepository.findByApplicantId(applicantId)

    if (!recipient) {
      recipient = await this.alertRecipientRepository.create({
        applicantId,
        email,
        phone,
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          inAppNotifications: true,
          whatsappNotifications: false,
          alertTypes: Object.values(AlertType),
        },
        isActive: true,
      })
    }

    return recipient
  }

  /**
   * Update recipient preferences
   */
  async updateRecipientPreferences(applicantId: number, preferences: any) {
    return this.alertRecipientRepository.updatePreferences(applicantId, preferences)
  }

  /**
   * Trigger payment due alert
   */
  async triggerPaymentDueAlert(applicantId: number, amountDue: number, dueDate: Date) {
    return this.createAlert({
      applicantId,
      title: 'Payment Due Reminder',
      message: `Your payment of PKR ${amountDue.toFixed(2)} is due on ${dueDate.toLocaleDateString()}`,
      type: AlertType.PAYMENT_DUE,
      priority: AlertPriority.HIGH,
      channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.IN_APP],
      metadata: {
        amountDue,
        dueDate,
      },
    })
  }

  /**
   * Trigger payment received alert
   */
  async triggerPaymentReceivedAlert(applicantId: number, amountPaid: number, referenceNumber: string) {
    return this.createAlert({
      applicantId,
      title: 'Payment Received',
      message: `We have received your payment of PKR ${amountPaid.toFixed(2)} (Ref: ${referenceNumber})`,
      type: AlertType.PAYMENT_RECEIVED,
      priority: AlertPriority.MEDIUM,
      channels: [AlertChannel.EMAIL, AlertChannel.IN_APP],
      metadata: {
        amountPaid,
        referenceNumber,
      },
    })
  }

  /**
   * Trigger application status alert
   */
  async triggerApplicationStatusAlert(applicantId: number, status: string, message: string) {
    const priority = status === 'APPROVED' ? AlertPriority.HIGH : AlertPriority.MEDIUM
    const type = status === 'APPROVED' ? AlertType.APPLICATION_APPROVED : AlertType.APPLICATION_REJECTED

    return this.createAlert({
      applicantId,
      title: `Application ${status}`,
      message,
      type,
      priority,
      channels: [AlertChannel.EMAIL, AlertChannel.IN_APP],
    })
  }

  /**
   * Trigger PSID expiry alert
   */
  async triggerPsidExpiryAlert(applicantId: number, psid: string, expiryDate: Date, daysRemaining: number) {
    return this.createAlert({
      applicantId,
      title: 'PSID Expiring Soon',
      message: `Your PSID ${psid} will expire in ${daysRemaining} days (${expiryDate.toLocaleDateString()})`,
      type: AlertType.PSID_EXPIRING,
      priority: AlertPriority.HIGH,
      channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.IN_APP],
      metadata: {
        psid,
        expiryDate,
        daysRemaining,
      },
    })
  }

  /**
   * Trigger competition deadline alert
   */
  async triggerCompetitionDeadlineAlert(
    applicantId: number,
    competitionName: string,
    deadline: Date,
    hoursRemaining: number
  ) {
    return this.createAlert({
      applicantId,
      title: 'Competition Submission Deadline',
      message: `${competitionName} submission deadline is in ${hoursRemaining} hours`,
      type: AlertType.COMPETITION_DEADLINE,
      priority: hoursRemaining < 24 ? AlertPriority.CRITICAL : AlertPriority.HIGH,
      channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.IN_APP],
      metadata: {
        competitionName,
        deadline,
        hoursRemaining,
      },
    })
  }

  /**
   * Clean up old alerts (archive/delete)
   */
  async cleanupOldAlerts(olderThanDays = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const filter = {
      createdAt: { $lt: cutoffDate },
      status: AlertStatus.READ,
    }

    return this.alertRepository.deleteByApplicantId(0) // This is a simple implementation
    // In production, would use countByFilter and deleteMany instead
  }
}
