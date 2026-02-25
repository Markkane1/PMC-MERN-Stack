import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { alertRepositoryMongo, alertRecipientRepositoryMongo, alertTemplateRepositoryMongo, applicantRepositoryMongo, applicantFeeRepositoryMongo, psidTrackingRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'
import { AlertService } from '../../services/pmc/AlertService'
import { PaymentVerificationService } from '../../services/pmc/PaymentVerificationService'
import { AlertChannel, AlertType } from '../../../domain/models/Alert'

type AuthRequest = Request & { user?: any }

// Initialize services
const paymentService = new PaymentVerificationService(applicantRepositoryMongo, applicantFeeRepositoryMongo, psidTrackingRepositoryMongo)
const alertService = new AlertService(
  alertRepositoryMongo,
  alertRecipientRepositoryMongo,
  alertTemplateRepositoryMongo,
  paymentService
)

/**
 * Get alerts for current applicant
 * GET /api/pmc/alerts
 */
export const getApplicantAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const alerts = await alertService.getApplicantAlerts(applicantId, limit, offset)

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit,
        offset,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get unread alert count
 * GET /api/pmc/alerts/unread-count
 */
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const count = await alertService.getUnreadCount(applicantId)

    res.json({
      success: true,
      data: { unreadCount: count },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Mark alert as read
 * PUT /api/pmc/alerts/:alertId/read
 */
export const markAlertAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params
    const alert = await alertService.markAlertAsRead(alertId)

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' })
    }

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: alert,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Mark multiple alerts as read
 * PUT /api/pmc/alerts/mark-read/batch
 */
export const markMultipleAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { alertIds } = req.body

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ success: false, message: 'alertIds array is required' })
    }

    const count = await alertService.markMultipleAsRead(alertIds)

    res.json({
      success: true,
      message: `Marked ${count} alerts as read`,
      data: { markedCount: count },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Delete alert
 * DELETE /api/pmc/alerts/:alertId
 */
export const deleteAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params
    const success = await alertService.deleteAlert(alertId)

    if (!success) {
      return res.status(404).json({ success: false, message: 'Alert not found' })
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get notification preferences
 * GET /api/pmc/alerts/preferences
 */
export const getNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const recipient = await alertRecipientRepositoryMongo.findByApplicantId(applicantId)

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Preferences not found' })
    }

    res.json({
      success: true,
      data: recipient.preferences,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Update notification preferences
 * PUT /api/pmc/alerts/preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const { preferences } = req.body

    if (!preferences) {
      return res.status(400).json({ success: false, message: 'Preferences object is required' })
    }

    const updated = await alertService.updateRecipientPreferences(applicantId, preferences)

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: updated.preferences,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Send test alert
 * POST /api/pmc/alerts/test
 */
export const sendTestAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const { channels = [AlertChannel.IN_APP] } = req.body

    const testAlert = await alertService.createAlert({
      applicantId,
      title: 'Test Notification',
      message: 'This is a test notification to verify your alert settings',
      type: AlertType.SYSTEM_NOTIFICATION,
      channels,
    })

    res.json({
      success: true,
      message: 'Test alert sent successfully',
      data: testAlert,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get alert statistics
 * GET /api/pmc/alerts/statistics
 */
export const getAlertStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found in session' })
    }

    const allAlerts = await alertService.getApplicantAlerts(applicantId, 1000, 0)
    const unreadCount = await alertService.getUnreadCount(applicantId)

    // Calculate statistics
    const stats = {
      total: allAlerts.length,
      unread: unreadCount,
      read: allAlerts.length - unreadCount,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    }

    allAlerts.forEach((alert) => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1
      stats.byPriority[alert.priority] = (stats.byPriority[alert.priority] || 0) + 1
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1
    })

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get alert details
 * GET /api/pmc/alerts/:alertId
 */
export const getAlertDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params
    const alert = await alertRepositoryMongo.findById(alertId)

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' })
    }

    // Verify ownership
    if (alert.applicantId !== req.user?.applicantId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to alert' })
    }

    res.json({
      success: true,
      data: alert,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Create system alert for applicant
 * POST /api/pmc/alerts/admin/create
 */
export const adminCreateAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permission
    const hasPermission = req.user?.permissions?.includes('pmc.manage_alerts')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const { applicantId, title, message, type, priority, channels, metadata } = req.body

    if (!applicantId || !title || !message || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const alert = await alertService.createAlert({
      applicantId,
      title,
      message,
      type,
      priority,
      channels: channels || [AlertChannel.IN_APP],
      metadata,
    })

    res.json({
      success: true,
      message: 'Alert created successfully',
      data: alert,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Get all alerts
 * GET /api/pmc/alerts/admin/all
 */
export const adminGetAllAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    // Check admin permission
    const hasPermission = req.user?.permissions?.includes('pmc.manage_alerts')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500)
    const offset = parseInt(req.query.offset as string) || 0
    const status = req.query.status as string
    const type = req.query.type as string

    const filter: any = {}
    if (status) filter.status = status
    if (type) filter.type = type

    const alerts = await alertRepositoryMongo.listByFilter(filter, limit, offset)
    const count = await alertRepositoryMongo.countByFilter(filter)

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit,
        offset,
        total: count,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})
