import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import wkx from 'wkx'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import { pointInMultiPolygon, pointInPolygon } from '../../../shared/utils/geo'
import { parallelQueriesWithMetadata } from '../../../infrastructure/utils/parallelQueries'
import { cacheManager } from '../../../infrastructure/cache/cacheManager'
import type {
  ApplicantRepository,
  ApplicationAssignmentRepository,
  ApplicationSubmittedRepository,
  BusinessProfileRepository,
  DistrictRepository,
  TehsilRepository,
  ApplicantManualFieldsRepository,
  ProducerRepository,
  ConsumerRepository,
  CollectorRepository,
  RecyclerRepository,
} from '../../../domain/repositories/pmc'
import type { UserProfileRepository } from '../../../domain/repositories/accounts'
import {
  applicantRepositoryMongo,
  applicationAssignmentRepositoryMongo,
  applicationSubmittedRepositoryMongo,
  businessProfileRepositoryMongo,
  districtRepositoryMongo,
  tehsilRepositoryMongo,
  applicantManualFieldsRepositoryMongo,
  producerRepositoryMongo,
  consumerRepositoryMongo,
  collectorRepositoryMongo,
  recyclerRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { userProfileRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'

type CommonDeps = {
  applicantRepo: ApplicantRepository
  assignmentRepo: ApplicationAssignmentRepository
  submittedRepo: ApplicationSubmittedRepository
  businessProfileRepo: BusinessProfileRepository
  districtRepo: DistrictRepository
  tehsilRepo: TehsilRepository
  manualFieldsRepo: ApplicantManualFieldsRepository
  producerRepo: ProducerRepository
  consumerRepo: ConsumerRepository
  collectorRepo: CollectorRepository
  recyclerRepo: RecyclerRepository
  userProfileRepo: UserProfileRepository
}

const defaultDeps: CommonDeps = {
  applicantRepo: applicantRepositoryMongo,
  assignmentRepo: applicationAssignmentRepositoryMongo,
  submittedRepo: applicationSubmittedRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  districtRepo: districtRepositoryMongo,
  tehsilRepo: tehsilRepositoryMongo,
  manualFieldsRepo: applicantManualFieldsRepositoryMongo,
  producerRepo: producerRepositoryMongo,
  consumerRepo: consumerRepositoryMongo,
  collectorRepo: collectorRepositoryMongo,
  recyclerRepo: recyclerRepositoryMongo,
  userProfileRepo: userProfileRepositoryMongo,
}

function normalizeGeom(geom: any): string | null {
  if (!geom) return null
  if (Buffer.isBuffer(geom)) {
    try {
      const geometry = wkx.Geometry.parse(geom)
      return `SRID=4326;${geometry.toWkt()}`
    } catch {
      return null
    }
  }

  if (typeof geom === 'string') {
    const trimmed = geom.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('SRID=')) return trimmed
    const isHex = /^[0-9A-Fa-f]+$/.test(trimmed)
    if (isHex) {
      try {
        const geometry = wkx.Geometry.parse(Buffer.from(trimmed, 'hex'))
        return `SRID=4326;${geometry.toWkt()}`
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  if (typeof geom === 'object' && geom.type && geom.coordinates) {
    try {
      const geometry = wkx.Geometry.parseGeoJSON(geom as any)
      return `SRID=4326;${geometry.toWkt()}`
    } catch {
      return null
    }
  }
  return null
}


export const listUserGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json([])

  const groups: string[] = user.groups || []
  const profile = await defaultDeps.userProfileRepo.findByUserId(String(user._id))

  const response = groups.map((name, index) => ({
    id: index + 1,
    name,
    district_id: profile?.districtId || null,
    district_name: profile?.districtName || null,
  }))

  return res.json(response)
})

export const trackApplication = asyncHandler(async (req: Request, res: Response) => {
  const trackingNumber = req.query.tracking_number as string | undefined
  if (!trackingNumber) {
    return res.status(400).json({ message: 'Tracking number is required. For further details, call helpline 1373.' })
  }

  const application = await defaultDeps.applicantRepo.findByTrackingNumber(trackingNumber)
  if (!application) {
    return res.status(404).json({
      message: `No application found for the provided Tracking Number '${trackingNumber}'. For further details, call helpline 1373.`,
    })
  }

  const assignedGroup = (application as any).assignedGroup
  let statusMessage = ''

  if (!assignedGroup || assignedGroup.trim() === '') {
    statusMessage = `The application with Tracking Number '${trackingNumber}' is in draft form. Please complete it. For further details, call helpline 1373.`
  } else if (['LSO', 'LSM', 'LSM2', 'TL'].includes(assignedGroup)) {
    statusMessage = `The application with Tracking Number '${trackingNumber}' is with the Plastic Management Cell and is being processed. For further details, call helpline 1373.`
  } else if (assignedGroup === 'DO') {
    statusMessage = `The application with Tracking Number '${trackingNumber}' is with the Environment Officer District Incharge. For further details, call helpline 1373.`
  } else if (assignedGroup === 'APPLICANT') {
    // Parallel fetch of related data for APPLICANT case
    const { assignment } = await parallelQueriesWithMetadata({
      assignment: defaultDeps.assignmentRepo.findLatestByApplicantId((application as any).numericId),
    })
    const comment = assignment?.remarks && assignment.remarks !== 'undefined' ? assignment.remarks : 'No reason provided.'
    statusMessage = `The application with Tracking Number '${trackingNumber}' has been reassigned to the applicant. Reason: ${comment}. For further details, call helpline 1373.`
  } else if (assignedGroup === 'DEO') {
    statusMessage = `The application with Tracking Number '${trackingNumber}' is with the Designated Environmental Officer. For further details, call helpline 1373.`
  } else if (assignedGroup === 'DG') {
    statusMessage = `The application with Tracking Number '${trackingNumber}' is with the DG, EPA. For further details, call helpline 1373.`
  } else if (assignedGroup === 'Download License') {
    statusMessage = `The application with Tracking Number '${trackingNumber}' has been processed and the license is ready for download. You can download the license from your My Applications Dashboard. For further details, call helpline 1373.`
  } else {
    statusMessage = `The application with Tracking Number '${trackingNumber}' has an unknown status. Please contact support. For further details, call helpline 1373.`
  }

  return res.json({ message: statusMessage })
})

export const applicantAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json([])

  const applicants = await defaultDeps.applicantRepo.list({
    createdBy: user._id,
    assignedGroup: { $in: ['APPLICANT', 'Download License'] },
  })

  const applicantIds = applicants.map((a: any) => (a as any).numericId)

  const assignments = (await defaultDeps.assignmentRepo.list({
    applicantId: { $in: applicantIds },
    assignedGroup: 'APPLICANT',
    remarks: { $ne: null },
  })) as any[]

  const serialized = assignments
    .filter((a) => a.remarks && String(a.remarks).toLowerCase() !== 'undefined')
    .map((a) => ({
      applicant_id: a.applicantId,
      assigned_group: a.assignedGroup,
      remarks: a.remarks,
      created_at: a.createdAt,
      url_sub_part: '/review-application',
    }))

  for (const applicant of applicants.filter((a: any) => (a as any).assignedGroup === 'Download License')) {
    const trackingNumber = (applicant as any).trackingNumber || 'N/A'
    serialized.push({
      applicant_id: (applicant as any).numericId,
      assigned_group: 'Download License',
      remarks: `Please Download License [${trackingNumber}]`,
      created_at: (applicant as any).updatedAt || (applicant as any).createdAt,
      url_sub_part: '/home-license',
    })
  }

  return res.json(serialized)
})

export const listDistricts = asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = 'districts:list:with-stats'
  
  // Try cache first
  const cached = await cacheManager.get<any>(cacheKey)
  if (cached) {
    res.set('X-Cache', 'HIT')
    console.log('✅ Cache HIT: districts')
    return res.json(cached)
  }

  // Cache miss - fetch from database
  res.set('X-Cache', 'MISS')
  console.log('❌ Cache MISS: districts')
  
  const result = await parallelQueriesWithMetadata({
    districts: defaultDeps.districtRepo.list({}, { districtName: 1 }),
    stats: defaultDeps.applicantRepo.getStatsByDistrict(),
  })

  // Build stats map for quick lookup
  const statsMap = new Map()
  if (result.stats && Array.isArray(result.stats)) {
    result.stats.forEach((stat: any) => {
      statsMap.set(stat._id, stat)
    })
  }

  // Combine districts with their statistics
  const districtData = result.districts.map((d: any) => {
    const districtStat = statsMap.get(d.districtId) || {}
    return {
      district_id: d.districtId,
      district_name: d.districtName,
      district_code: d.districtCode,
      stats: {
        total_applicants: districtStat.total || 0,
        approved: districtStat.approved || 0,
        pending: districtStat.pending || 0,
      },
    }
  })

  // Store in cache (1 hour TTL)
  await cacheManager.set(cacheKey, districtData, { ttl: 3600 })

  return res.json(districtData)
})

export const listDistrictsPublic = asyncHandler(async (_req: Request, res: Response) => {
  const districts = await defaultDeps.districtRepo.list({}, { districtName: 1 })
  return res.json(districts.map((d: any) => ({
    district_id: d.districtId,
    district_name: d.districtName,
    district_code: d.districtCode,
    geom: normalizeGeom(d.geom),
  })))
})

export const listTehsils = asyncHandler(async (req: Request, res: Response) => {
  const districtId = req.query.district_id ? Number(req.query.district_id) : undefined
  const tehsils = districtId
    ? await defaultDeps.tehsilRepo.listByDistrictId(districtId)
    : await defaultDeps.tehsilRepo.list({}, { tehsilName: 1 })
  return res.json(tehsils.map((t: any) => ({
    tehsil_id: t.tehsilId,
    tehsil_name: t.tehsilName,
    tehsil_code: t.tehsilCode,
    district_id: t.districtId,
  })))
})

export const applicantLocationPublic = asyncHandler(async (_req: Request, res: Response) => {
  const manualFields = await defaultDeps.manualFieldsRepo.listWithLatLon()

  const getApplicantId = (record: any): string | null => {
    const raw = record?.applicantId ?? record?.applicant_id ?? record?.applicantID ?? record?.id ?? null
    if (raw === null || raw === undefined) return null
    const trimmed = String(raw).trim()
    return trimmed ? trimmed : null
  }

  const applicantIds = manualFields.map(getApplicantId).filter((id): id is string => Boolean(id))
  const applicantIdSet = new Set(applicantIds)
  const numericApplicantIds = applicantIds
    .map((id) => Number(id))
    .filter((value) => Number.isFinite(value))

  const fetchApplicants = async () => {
    if (applicantIds.length === 0) return []
    const results = await defaultDeps.applicantRepo.list({
      $or: [{ numericId: { $in: numericApplicantIds } }, { id: { $in: applicantIds } }],
    })
    if (results.length > 0) return results
    const all = await defaultDeps.applicantRepo.list()
    return all.filter((a: any) => applicantIdSet.has(String((a as any).id ?? (a as any).numericId ?? '')))
  }

  const fetchProfiles = async () => {
    if (applicantIds.length === 0) return []
    const results = await defaultDeps.businessProfileRepo.list({
      $or: [{ applicantId: { $in: numericApplicantIds } }, { applicant_id: { $in: applicantIds } }],
    })
    if (results.length > 0) return results
    const all = await defaultDeps.businessProfileRepo.list()
    return all.filter((p: any) => applicantIdSet.has(String((p as any).applicantId ?? (p as any).applicant_id ?? '')))
  }

  const applicants = await fetchApplicants()
  const profiles = await fetchProfiles()
  const districts = await defaultDeps.districtRepo.list()
  const tehsils = await defaultDeps.tehsilRepo.list()
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d]))
  const tehsilMap = new Map(tehsils.map((t: any) => [t.tehsilId, t]))

  const data = applicants.map((a: any) => {
    const applicantKey = getApplicantId(a) ?? String((a as any).numericId ?? (a as any).id ?? '')
    const manual = manualFields.find((m: any) => getApplicantId(m) === applicantKey)
    const profile = profiles.find((p: any) => getApplicantId(p) === applicantKey)
    const districtId = profile?.districtId ?? profile?.district_id ?? null
    const tehsilId = profile?.tehsilId ?? profile?.tehsil_id ?? null
    const district = districtId ? districtMap.get(Number(districtId)) : null
    const registrationForRaw = (a as any).registrationFor ?? (a as any).registration_for ?? null
    const registrationFor = (() => {
      if (!registrationForRaw) return null
      const value = String(registrationForRaw).trim()
      if (value.toLowerCase() === 'consumer') return 'Distributor'
      return value
    })()
    const firstName = (a as any).firstName ?? (a as any).first_name ?? ''
    const lastName = (a as any).lastName ?? (a as any).last_name ?? ''

    return {
      applicant_id: applicantKey || null,
      district_name: district?.districtName || null,
      district_id: district?.districtId || null,
      tehsil_name: tehsilId ? tehsilMap.get(Number(tehsilId))?.tehsilName || null : null,
      business_name: profile?.businessName || profile?.business_name || profile?.name || null,
      postal_address: profile?.postalAddress || profile?.postal_address || null,
      latitude: (manual as any)?.latitude || null,
      longitude: (manual as any)?.longitude || null,
      category: registrationFor,
      full_name: `${firstName} ${lastName}`.trim(),
      material_flow_kg_per_day: null,
    }
  })

  return res.json(data)
})

export const applicantStatistics = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const cacheKey = 'statistics:applicant:all'

  // Try cache first
  const cached = await cacheManager.get<any>(cacheKey)
  if (cached) {
    res.set('X-Cache', 'HIT')
    console.log('✅ Cache HIT: applicant statistics')
    return res.json(cached)
  }

  // Cache miss
  res.set('X-Cache', 'MISS')
  console.log('❌ Cache MISS: applicant statistics')

  // Fetch data in parallel: applicants, business profiles, and districts
  const result = await parallelQueriesWithMetadata({
    applicants: defaultDeps.applicantRepo.list({
      applicationStatus: { $nin: ['Created', 'Fee Challan'] },
    }),
    profiles: defaultDeps.businessProfileRepo.list({}),
    districts: defaultDeps.districtRepo.list({}),
    statsByStatus: defaultDeps.applicantRepo.getStatsByStatus(),
    statsByDistrict: defaultDeps.applicantRepo.getStatsByDistrict(),
  })

  const { applicants, profiles, districts, statsByStatus, statsByDistrict } = result
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))

  // Build district statistics
  const districtData: Record<string, Record<string, number>> = {}
  for (const applicant of applicants) {
    const profile = profiles.find((p: any) => (p as any).applicantId === (applicant as any).numericId)
    const districtName = (profile?.districtId ? districtMap.get(profile.districtId) : null) || 'Unknown'
    const regFor = (applicant as any).registrationFor || (applicant as any).registration_for || 'Unknown'
    districtData[districtName] ||= {}
    districtData[districtName][regFor] = (districtData[districtName][regFor] || 0) + 1
  }

  const districtDataList = Object.entries(districtData).flatMap(([districtName, regs]) =>
    Object.entries(regs).map(([registration_for, count]) => ({
      registration_for,
      businessprofile__district__district_name: districtName,
      count,
    }))
  )

  // Return combined statistics
  const responseData = {
    districtData: districtDataList,
    byStatus: statsByStatus || [],
    byDistrict: statsByDistrict || [],
  }

  // Store in cache (5 minute TTL for statistics)
  await cacheManager.set(cacheKey, responseData, { ttl: 300 })

  return res.json(responseData)
})

export const misApplicantStatistics = applicantStatistics

export const districtPlasticStats = asyncHandler(async (_req: Request, res: Response) => {
  const districts = await defaultDeps.districtRepo.list()

  const readNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return 0
    const num = typeof value === 'number' ? value : parseFloat(String(value))
    return Number.isFinite(num) ? num : 0
  }

  const readFromKeys = (obj: any, keys: string[]) => {
    if (!obj) return 0
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return readNumber(obj[key])
      }
    }
    return 0
  }

  const result = []
  for (const district of districts) {
    const profiles = await defaultDeps.businessProfileRepo.listByDistrictId((district as any).districtId)
    const applicantIds = profiles.map((p: any) => (p as any).applicantId).filter(Boolean)

    const producers = await defaultDeps.producerRepo.listByApplicantIds(applicantIds)
    const consumers = await defaultDeps.consumerRepo.listByApplicantIds(applicantIds)
    const collectors = await defaultDeps.collectorRepo.listByApplicantIds(applicantIds)
    const recyclers = await defaultDeps.recyclerRepo.listByApplicantIds(applicantIds)

    const produced = producers.reduce(
      (sum: number, p: any) =>
        sum +
        readFromKeys(p, [
          'totalCapacityValue',
          'total_capacity_value',
          'total_capacity',
          'averageProductionCapacity',
          'average_production_capacity',
          'production_capacity',
          'avg_production_capacity',
        ]),
      0
    )
    const distributed = consumers.reduce(
      (sum: number, c: any) =>
        sum +
        readFromKeys(c, [
          'consumption',
          'averageSale',
          'average_sale',
          'average_sale_per_day',
          'avg_sale',
          'avg_sale_per_day',
        ]),
      0
    )
    const collected = collectors.reduce(
      (sum: number, c: any) =>
        sum +
        readFromKeys(c, [
          'totalCapacityValue',
          'total_capacity_value',
          'total_capacity',
          'averageCollection',
          'average_collection',
          'avg_collection',
        ]),
      0
    )

    const wasteCollected = recyclers.reduce((sum: number, r: any) => {
      const items = Array.isArray((r as any).selectedCategories)
        ? (r as any).selectedCategories
        : Array.isArray((r as any).selected_categories)
            ? (r as any).selected_categories
            : []
      return (
        sum +
        items.reduce(
          (s: number, item: any) =>
            s +
            readFromKeys(item, [
              'wasteCollection',
              'waste_collection',
              'wasteCollected',
              'waste_collected',
            ]),
          0
        )
      )
    }, 0)

    const wasteDisposed = recyclers.reduce((sum: number, r: any) => {
      const items = Array.isArray((r as any).selectedCategories)
        ? (r as any).selectedCategories
        : Array.isArray((r as any).selected_categories)
            ? (r as any).selected_categories
            : []
      return (
        sum +
        items.reduce(
          (s: number, item: any) =>
            s +
            readFromKeys(item, [
              'wasteDisposal',
              'waste_disposal',
              'wasteDisposed',
              'waste_disposed',
            ]),
          0
        )
      )
    }, 0)

    const maxCollected = Math.max(collected, wasteCollected)
    const recyclingEfficiency = maxCollected === 0 ? 0 : Math.max(0, Math.round((wasteDisposed / maxCollected) * 10000) / 100)
    const unmanagedWaste = Math.max(0, maxCollected - wasteDisposed)

    result.push({
      district_id: (district as any).districtId,
      district_name: (district as any).districtName,
      produced_kg_per_day: produced,
      distributed_kg_per_day: distributed,
      collected_kg_per_day: collected,
      waste_disposed_kg_per_day: wasteDisposed,
      waste_collected_kg_per_day: wasteCollected,
      unmanaged_waste_kg_per_day: unmanagedWaste,
      recycling_efficiency: recyclingEfficiency,
    })
  }

  return res.json(result)
})

export const districtByLatLon = asyncHandler(async (req: Request, res: Response) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon are required' })
  }

  const districts = await defaultDeps.districtRepo.list({ geom: { $ne: null } })
  const point: [number, number] = [lon, lat]

  for (const district of districts) {
    const geom = (district as any).geom as any
    if (!geom) continue
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
      const outer = geom.coordinates[0]
      if (Array.isArray(outer) && pointInPolygon(point, outer)) {
        return res.json({ district_id: (district as any).districtId, district_name: (district as any).districtName })
      }
    }
    if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      if (pointInMultiPolygon(point, geom.coordinates)) {
        return res.json({ district_id: (district as any).districtId, district_name: (district as any).districtName })
      }
    }
  }

  return res.status(404).json({ message: 'District not found' })
})
