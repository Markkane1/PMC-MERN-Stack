import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository, PSIDTrackingRepository } from '../../../domain/repositories/pmc'
import { applicantRepositoryMongo, psidTrackingRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

type PsidDeps = {
  applicantRepo: ApplicantRepository
  psidRepo: PSIDTrackingRepository
}

const defaultDeps: PsidDeps = {
  applicantRepo: applicantRepositoryMongo,
  psidRepo: psidTrackingRepositoryMongo,
}

export const generatePsid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.applicant_id as string | undefined
  if (!applicantId) {
    return res.status(400).json({ message: 'applicant_id is required' })
  }

  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) {
    return res.status(404).json({ message: 'Applicant not found' })
  }

  const psid = await defaultDeps.psidRepo.create({
    applicantId: (applicant as any).numericId,
    deptTransactionId: `TX-${Date.now()}`,
    dueDate: new Date(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    amountWithinDueDate: 0,
    consumerName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    mobileNo: (applicant as any).mobileNo,
    cnic: (applicant as any).cnic,
    districtId: null,
    amountBifurcation: {},
    consumerNumber: `PSID-${Math.floor(Math.random() * 1000000)}`,
    status: 'Generated',
    createdBy: req.user?._id,
  })

  return res.json(serializePsid(psid))
})

export const checkPsidStatus = asyncHandler(async (req: Request, res: Response) => {
  const applicantId = req.query.applicant_id as string | undefined
  if (!applicantId) {
    return res.status(400).json({ message: 'applicant_id is required' })
  }

  const psid = await defaultDeps.psidRepo.findLatestByApplicantId(Number(applicantId))
  if (!psid) {
    return res.status(404).json({ message: 'PSID not found' })
  }

  return res.json(serializePsid(psid))
})

export const paymentIntimation = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ message: 'Payment intimation received.' })
})

export const plmisToken = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ token: 'not-configured' })
})

function serializePsid(psid: any) {
  if (!psid) return {}
  return {
    id: psid._id || psid.id,
    applicant_id: psid.applicantId,
    dept_transaction_id: psid.deptTransactionId,
    due_date: psid.dueDate ? psid.dueDate.toISOString().slice(0, 10) : null,
    expiry_date: psid.expiryDate,
    amount_within_due_date: psid.amountWithinDueDate,
    amount_after_due_date: psid.amountAfterDueDate,
    consumer_name: psid.consumerName,
    mobile_no: psid.mobileNo,
    cnic: psid.cnic,
    email: psid.email,
    district_id: psid.districtId,
    amount_bifurcation: psid.amountBifurcation,
    consumer_number: psid.consumerNumber,
    status: psid.status,
    message: psid.message,
    payment_status: psid.paymentStatus,
    amount_paid: psid.amountPaid,
    paid_date: psid.paidDate ? psid.paidDate.toISOString().slice(0, 10) : null,
    paid_time: psid.paidTime,
    bank_code: psid.bankCode,
    created_at: psid.createdAt,
  }
}


