import { Response, Request } from 'express'
import mongoose from 'mongoose'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository, ApplicationSubmittedRepository, BusinessProfileRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  applicantRepositoryMongo,
  applicationSubmittedRepositoryMongo,
  businessProfileRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'

type AuthRequest = Request & { user?: any }

type StatsDeps = {
  applicantRepo: ApplicantRepository
  submittedRepo: ApplicationSubmittedRepository
  businessProfileRepo: BusinessProfileRepository
  districtRepo: DistrictRepository
}

const defaultDeps: StatsDeps = {
  applicantRepo: applicantRepositoryMongo,
  submittedRepo: applicationSubmittedRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  districtRepo: districtRepositoryMongo,
}

const USER_GROUPS = ['APPLICANT', 'LSO', 'LSM', 'LSM2', 'TL', 'DO', 'DEO', 'DG', 'Download License']
const USER_GROUPS_DO = ['APPLICANT', 'DO', 'DEO', 'DG', 'Download License']

async function getSubmittedApplicantIds(submittedRepo: ApplicationSubmittedRepository): Promise<number[]> {
  const submitted = await submittedRepo.list()
  let ids = submitted
    .map((s: any) => Number((s as any).applicantId))
    .filter((id: number) => Number.isFinite(id))

  if (!ids.length) {
    const raw = await mongoose.connection.db
      ?.collection('applicationsubmitteds')
      .find({}, { projection: { applicantId: 1, applicant_id: 1 } })
      .toArray()
    ids = (raw || [])
      .map((row: any) => Number(row?.applicantId ?? row?.applicant_id))
      .filter((id: number) => Number.isFinite(id))
  }

  return Array.from(new Set(ids))
}

export const listApplicants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json({})

  const isSuper = user.groups?.includes('Super')

  const stats = await defaultDeps.applicantRepo.aggregate([
    { $addFields: { assignedGroup: { $ifNull: ['$assignedGroup', '$assigned_group'] } } },
    { $match: { assignedGroup: { $in: USER_GROUPS } } },
    { $group: { _id: '$assignedGroup', count: { $sum: 1 } } },
  ])

  const result: Record<string, number> = {}
  if (isSuper) {
    for (const group of ['All-Applications', 'Challan-Downloaded', 'Submitted', 'PMC', ...USER_GROUPS]) {
      result[group] = 0
    }
    result['All-Applications'] = await defaultDeps.applicantRepo.count()
    const challanDownloadedAgg = await defaultDeps.applicantRepo.aggregate([
      { $addFields: { normalizedStatus: { $ifNull: ['$applicationStatus', '$application_status'] } } },
      { $match: { normalizedStatus: 'Fee Challan' } },
      { $count: 'count' },
    ])
    result['Challan-Downloaded'] = challanDownloadedAgg[0]?.count || 0

    const submittedIds = await getSubmittedApplicantIds(defaultDeps.submittedRepo)
    result['Submitted'] = submittedIds.length

    const lsoCounts = { LSO1: 0, LSO2: 0, LSO3: 0 }
    for (const applicantId of submittedIds) {
      const mod = applicantId % 3
      if (mod === 1) lsoCounts.LSO1 += 1
      if (mod === 2) lsoCounts.LSO2 += 1
      if (mod === 0) lsoCounts.LSO3 += 1
    }

    result['LSO1'] = lsoCounts.LSO1
    result['LSO2'] = lsoCounts.LSO2
    result['LSO3'] = lsoCounts.LSO3
  } else {
    for (const group of USER_GROUPS) {
      result[group] = 0
    }
  }

  for (const stat of stats) {
    result[stat._id] = stat.count
  }

  result['PMC'] = (result['LSO'] || 0) + (result['LSM'] || 0) + (result['LSM2'] || 0) + (result['TL'] || 0)

  return res.json(result)
})

export const listApplicantsDo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json({})

  const username = user.username || ''
  const parts = username.split('.')
  const districtShort = parts[1] ? parts[1].toUpperCase() : null
  if (!districtShort) {
    return res.status(400).json({ error: 'Invalid username format. District short name missing.' })
  }

  const profiles = await defaultDeps.businessProfileRepo.list()
  const applicants = await defaultDeps.applicantRepo.list()

  const districtIds = new Set<string>()
  for (const profile of profiles) {
    if (!(profile as any).districtId) continue
    const district = await defaultDeps.districtRepo.findByDistrictId((profile as any).districtId)
    if (district?.shortName?.toUpperCase() === districtShort) {
      districtIds.add(String((profile as any).applicantId || ''))
    }
  }

  const stats: Record<string, number> = {}
  for (const group of USER_GROUPS_DO) stats[group] = 0

  for (const applicant of applicants) {
    if (!districtIds.has(String((applicant as any).numericId))) continue
    if (!(applicant as any).assignedGroup) continue
    if (!USER_GROUPS_DO.includes((applicant as any).assignedGroup)) continue
    stats[(applicant as any).assignedGroup] += 1
  }

  return res.json(stats)
})
