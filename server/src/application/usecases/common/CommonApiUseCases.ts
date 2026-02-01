import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository, ApplicationAssignmentRepository, BusinessProfileRepository } from '../../../domain/repositories/pmc'
import { applicantRepositoryMongo, applicationAssignmentRepositoryMongo, businessProfileRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

type CommonApiDeps = {
  applicantRepo: ApplicantRepository
  assignmentRepo: ApplicationAssignmentRepository
  businessProfileRepo: BusinessProfileRepository
}

const defaultDeps: CommonApiDeps = {
  applicantRepo: applicantRepositoryMongo,
  assignmentRepo: applicationAssignmentRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
}

async function buildApplicantAlerts(userId: string, deps: CommonApiDeps = defaultDeps) {
  const applicants = await deps.applicantRepo.list({
    createdBy: userId,
    assignedGroup: { $in: ['APPLICANT', 'Download License'] },
  })

  const applicantIds = applicants.map((a: any) => (a as any).numericId)

  const assignments = (await deps.assignmentRepo.list({
    applicantId: { $in: applicantIds },
    assignedGroup: 'APPLICANT',
    remarks: { $ne: null },
  })) as any[]

  const baseAlerts = assignments
    .filter((a) => a.remarks && String(a.remarks).toLowerCase() !== 'undefined')
    .map((a) => ({
      applicantId: a.applicantId,
      remarks: a.remarks as string,
      createdAt: a.createdAt,
      urlSubPart: '/review-application',
    }))

  const downloadAlerts = applicants
    .filter((a: any) => (a as any).assignedGroup === 'Download License')
    .map((a: any) => ({
      applicantId: (a as any).numericId,
      remarks: `Please Download License [${(a as any).trackingNumber || 'N/A'}]`,
      createdAt: (a as any).updatedAt || (a as any).createdAt,
      urlSubPart: '/home-license',
    }))

  const trackingMap = new Map(applicants.map((a: any) => [(a as any).numericId, (a as any).trackingNumber || '']))

  return [...baseAlerts, ...downloadAlerts].map((alert, index) => ({
    id: `${alert.applicantId}-${index}`,
    applicantId: alert.applicantId,
    trackingNumber: trackingMap.get(alert.applicantId) || '',
    remarks: alert.remarks,
    createdAt: alert.createdAt,
    urlSubPart: alert.urlSubPart,
  }))
}

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json([])

  const alerts = await buildApplicantAlerts(String(user._id))

  const response = alerts.map((alert) => ({
    id: alert.id,
    target: alert.trackingNumber || String(alert.applicantId),
    description: alert.remarks,
    date: alert.createdAt,
    image: '',
    type: 1,
    location: '',
    locationLabel: '',
    status: '',
    readed: false,
    link: alert.urlSubPart,
  }))

  return res.json(response)
})

export const notificationCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json({ count: 0 })

  const alerts = await buildApplicantAlerts(String(user._id))
  return res.json({ count: alerts.length })
})

export const searchQuery = asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.query || '').trim()
  if (!query) return res.json([])

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

  const applicants = await defaultDeps.applicantRepo.list({
    $or: [
      { trackingNumber: regex },
      { firstName: regex },
      { lastName: regex },
      { cnic: regex },
      { mobileNo: regex },
    ],
  })

  const applicantItems = applicants.slice(0, 20).map((applicant: any) => ({
    key: `app-${(applicant as any).numericId}`,
    path: `/spuid-review/${(applicant as any).numericId}`,
    title: `${(applicant as any).trackingNumber || 'Application'} - ${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    icon: 'FaClipboardList',
    category: 'applications',
    categoryTitle: 'Applications',
  }))

  const businessProfiles = await defaultDeps.businessProfileRepo.searchByBusinessName(regex, 20)

  const businessItems = businessProfiles.map((profile: any) => ({
    key: `biz-${(profile as any).applicantId}`,
    path: `/spuid-review/${(profile as any).applicantId}`,
    title: (profile as any).businessName || 'Business Profile',
    icon: 'FaAddressBook',
    category: 'businesses',
    categoryTitle: 'Businesses',
  }))

  const results: Array<{ title: string; data: any[] }> = []
  if (applicantItems.length) {
    results.push({ title: 'Applications', data: applicantItems })
  }
  if (businessItems.length) {
    results.push({ title: 'Businesses', data: businessItems })
  }

  return res.json(results)
})
