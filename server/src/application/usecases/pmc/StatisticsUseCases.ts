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
import { cacheManager } from '../../../infrastructure/cache/cacheManager'

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
const STATS_CACHE_TTL_SECONDS = 120

type SubmittedModuloKey = '0' | '1' | '2'
type SubmittedBreakdown = {
  total: number
  moduloCounts: Record<SubmittedModuloKey, number>
}
type StatsGroupKey =
  | 'All-Applications'
  | 'Challan-Downloaded'
  | 'Submitted'
  | 'PMC'
  | 'LSO1'
  | 'LSO2'
  | 'LSO3'
  | (typeof USER_GROUPS)[number]
type DoStatsKey = (typeof USER_GROUPS_DO)[number]

const isSubmittedModuloKey = (value: string): value is SubmittedModuloKey =>
  value === '0' || value === '1' || value === '2'

const assignModuloCount = (
  moduloCounts: Record<SubmittedModuloKey, number>,
  mod: string,
  count: number,
) => {
  switch (mod) {
    case '0':
      moduloCounts['0'] = count
      break
    case '1':
      moduloCounts['1'] = count
      break
    case '2':
      moduloCounts['2'] = count
      break
    default:
      break
  }
}

const incrementModuloCount = (
  moduloCounts: Record<SubmittedModuloKey, number>,
  mod: string,
) => {
  switch (mod) {
    case '0':
      moduloCounts['0'] += 1
      break
    case '1':
      moduloCounts['1'] += 1
      break
    case '2':
      moduloCounts['2'] += 1
      break
    default:
      break
  }
}

const isStatsGroupKey = (value: string): value is StatsGroupKey =>
  value === 'All-Applications'
  || value === 'Challan-Downloaded'
  || value === 'Submitted'
  || value === 'PMC'
  || value === 'LSO1'
  || value === 'LSO2'
  || value === 'LSO3'
  || USER_GROUPS.includes(value)

const assignStatsGroupCount = (
  stats: Record<string, number>,
  group: string,
  count: number,
) => {
  if (!isStatsGroupKey(group)) return
  switch (group) {
    case 'All-Applications':
      stats['All-Applications'] = count
      break
    case 'Challan-Downloaded':
      stats['Challan-Downloaded'] = count
      break
    case 'Submitted':
      stats.Submitted = count
      break
    case 'PMC':
      stats.PMC = count
      break
    case 'LSO1':
      stats.LSO1 = count
      break
    case 'LSO2':
      stats.LSO2 = count
      break
    case 'LSO3':
      stats.LSO3 = count
      break
    case 'APPLICANT':
      stats.APPLICANT = count
      break
    case 'LSO':
      stats.LSO = count
      break
    case 'LSM':
      stats.LSM = count
      break
    case 'LSM2':
      stats.LSM2 = count
      break
    case 'TL':
      stats.TL = count
      break
    case 'DO':
      stats.DO = count
      break
    case 'DEO':
      stats.DEO = count
      break
    case 'DG':
      stats.DG = count
      break
    case 'Download License':
      stats['Download License'] = count
      break
    default:
      break
  }
}

const assignDoStatsGroupCount = (
  stats: Record<string, number>,
  group: string,
  count: number,
) => {
  switch (group) {
    case 'APPLICANT':
      stats.APPLICANT = count
      break
    case 'DO':
      stats.DO = count
      break
    case 'DEO':
      stats.DEO = count
      break
    case 'DG':
      stats.DG = count
      break
    case 'Download License':
      stats['Download License'] = count
      break
    default:
      break
  }
}

async function getSubmittedBreakdown(submittedRepo: ApplicationSubmittedRepository): Promise<{
  total: number
  moduloCounts: Record<'0' | '1' | '2', number>
}> {
  const cacheKey = 'stats:submitted-breakdown:v1'
  const cached = await cacheManager.get<SubmittedBreakdown>(cacheKey)
  if (cached) {
    return cached
  }

  const moduloCounts: Record<'0' | '1' | '2', number> = { '0': 0, '1': 0, '2': 0 }
  let total = 0

  const rawCollection = mongoose.connection.db?.collection('ApplicationSubmitted')
  if (rawCollection) {
    const grouped = await rawCollection.aggregate([
      {
        $project: {
          applicantIdRaw: { $ifNull: ['$applicantId', '$applicant_id'] },
        },
      },
      {
        $addFields: {
          applicantIdNum: {
            $convert: {
              input: '$applicantIdRaw',
              to: 'int',
              onError: null,
              onNull: null,
            },
          },
        },
      },
      { $match: { applicantIdNum: { $ne: null } } },
      {
        $group: {
          _id: { $mod: ['$applicantIdNum', 3] },
          count: { $sum: 1 },
        },
      },
    ]).toArray()

    for (const row of grouped as any[]) {
      const mod = String(row?._id) as '0' | '1' | '2'
      const count = Number(row?.count || 0)
      if (isSubmittedModuloKey(mod)) {
        assignModuloCount(moduloCounts, mod, count)
        total += count
      }
    }
  } else {
    // Safety fallback if raw collection is unavailable.
    const submitted = await submittedRepo.list()
    const ids = submitted
      .map((s: any) => Number((s as any).applicantId))
      .filter((id: number) => Number.isFinite(id))

    for (const applicantId of ids) {
      const mod = String(applicantId % 3) as '0' | '1' | '2'
      incrementModuloCount(moduloCounts, mod)
    }
    total = ids.length
  }

  const payload = { total, moduloCounts }
  await cacheManager.set(cacheKey, payload, { ttl: STATS_CACHE_TTL_SECONDS })
  return payload
}

const normalizeApplicantIdArray = (values: unknown[]): number[] =>
  values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

async function getDistrictApplicantIdsByDistrictId(districtId: number): Promise<number[]> {
  const cacheKey = `stats:district:${districtId}:applicant-ids:v1`
  const cached = await cacheManager.get<number[]>(cacheKey)
  if (Array.isArray(cached)) {
    return cached
  }

  const profiles = await defaultDeps.businessProfileRepo.listByDistrictId(districtId)
  const applicantIds = Array.from(
    new Set(normalizeApplicantIdArray(profiles.map((profile: any) => profile?.applicantId)))
  )
  await cacheManager.set(cacheKey, applicantIds, { ttl: STATS_CACHE_TTL_SECONDS })
  return applicantIds
}

const buildEmptyDoStats = () => {
  return Object.fromEntries(USER_GROUPS_DO.map((group) => [group, 0])) as Record<
    string,
    number
  >
}

const toCacheFriendlyStats = (stats: Record<string, number>) => {
  return Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [key, Number(value || 0)]),
  ) as Record<string, number>
}

export const listApplicants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now()
  const user = req.user
  if (!user) return res.json({})

  const isSuper = user.groups?.includes('Super')
  const cacheKey = `stats:view-groups:${isSuper ? 'super' : 'default'}`
  const cachedStats = await cacheManager.get<Record<string, number>>(cacheKey)
  if (cachedStats) {
    res.setHeader('X-Stats-Cache', 'HIT')
    res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
    return res.json(cachedStats)
  }
  res.setHeader('X-Stats-Cache', 'MISS')

  const [stats, totalCount, challanDownloadedAgg, submittedBreakdown] = await Promise.all([
    defaultDeps.applicantRepo.aggregate([
      { $addFields: { assignedGroup: { $ifNull: ['$assignedGroup', '$assigned_group'] } } },
      { $match: { assignedGroup: { $in: USER_GROUPS } } },
      { $group: { _id: '$assignedGroup', count: { $sum: 1 } } },
    ]),
    isSuper ? defaultDeps.applicantRepo.count() : Promise.resolve(0),
    isSuper
      ? defaultDeps.applicantRepo.aggregate([
          { $addFields: { normalizedStatus: { $ifNull: ['$applicationStatus', '$application_status'] } } },
          { $match: { normalizedStatus: 'Fee Challan' } },
          { $count: 'count' },
        ])
      : Promise.resolve([]),
    isSuper ? getSubmittedBreakdown(defaultDeps.submittedRepo) : Promise.resolve(null),
  ])

  const result: Record<string, number> = {}
  if (isSuper) {
    Object.assign(
      result,
      Object.fromEntries(
        ['All-Applications', 'Challan-Downloaded', 'Submitted', 'PMC', ...USER_GROUPS].map(
          (group) => [group, 0],
        ),
      ),
    )
    result['All-Applications'] = totalCount
    result['Challan-Downloaded'] = challanDownloadedAgg[0]?.count || 0
    result.Submitted = submittedBreakdown?.total || 0
    result.LSO1 = submittedBreakdown?.moduloCounts?.['1'] || 0
    result.LSO2 = submittedBreakdown?.moduloCounts?.['2'] || 0
    result.LSO3 = submittedBreakdown?.moduloCounts?.['0'] || 0
  } else {
    Object.assign(result, Object.fromEntries(USER_GROUPS.map((group) => [group, 0])))
  }

  for (const stat of stats) {
    const key = String(stat?._id || '')
    if (!key) continue
    assignStatsGroupCount(result, key, Number(stat?.count || 0))
  }

  result.PMC = (result.LSO || 0) + (result.LSM || 0) + (result.LSM2 || 0) + (result.TL || 0)

  const normalized = toCacheFriendlyStats(result)
  await cacheManager.set(cacheKey, normalized, { ttl: STATS_CACHE_TTL_SECONDS })
  res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
  return res.json(normalized)
})

export const listApplicantsDo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now()
  const user = req.user
  if (!user) return res.json({})

  const username = user.username || ''
  const parts = username.split('.')
  const districtShort = parts[1] ? parts[1].toUpperCase() : null
  if (!districtShort) {
    return res.status(400).json({ error: 'Invalid username format. District short name missing.' })
  }

  const cacheKey = `stats:do-view-groups:${districtShort}`
  const cachedStats = await cacheManager.get<Record<string, number>>(cacheKey)
  if (cachedStats) {
    res.setHeader('X-Stats-Cache', 'HIT')
    res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
    return res.json(cachedStats)
  }
  res.setHeader('X-Stats-Cache', 'MISS')

  const district = await defaultDeps.districtRepo.findByShortName(districtShort)
  if (!district) {
    return res.status(400).json({ error: 'No matching district found for the user.' })
  }

  const uniqueApplicantIds = await getDistrictApplicantIdsByDistrictId(district.districtId)

  if (!uniqueApplicantIds.length) {
    const emptyStats = buildEmptyDoStats()
    await cacheManager.set(cacheKey, emptyStats, { ttl: STATS_CACHE_TTL_SECONDS })
    res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
    return res.json(emptyStats)
  }

  const applicantIdStrings = uniqueApplicantIds.map(String)
  const groupedStats = await defaultDeps.applicantRepo.aggregate([
    {
      $addFields: {
        normalizedAssignedGroup: { $ifNull: ['$assignedGroup', '$assigned_group'] },
        normalizedNumericId: {
          $convert: {
            input: { $ifNull: ['$numericId', '$numeric_id'] },
            to: 'int',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $match: {
        normalizedAssignedGroup: { $in: USER_GROUPS_DO },
        $or: [
          { normalizedNumericId: { $in: uniqueApplicantIds } },
          { numeric_id: { $in: uniqueApplicantIds } },
          { id: { $in: applicantIdStrings } },
        ],
      },
    },
    {
      $group: {
        _id: '$normalizedAssignedGroup',
        count: { $sum: 1 },
      },
    },
  ])

  const stats = buildEmptyDoStats()
  for (const row of groupedStats as any[]) {
    const group = String(row?._id || '')
    if (!USER_GROUPS_DO.includes(group)) continue
    assignDoStatsGroupCount(stats, group, Number(row?.count || 0))
  }

  const normalized = toCacheFriendlyStats(stats)
  await cacheManager.set(cacheKey, normalized, { ttl: STATS_CACHE_TTL_SECONDS })
  res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
  return res.json(normalized)
})
