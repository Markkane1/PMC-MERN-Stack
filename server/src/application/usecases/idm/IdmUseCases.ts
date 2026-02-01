import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import wkx from 'wkx'
import type { DistrictNewRepository, EecClubRepository } from '../../../domain/repositories/idm'
import { districtNewRepositoryMongo, eecClubRepositoryMongo } from '../../../infrastructure/database/repositories/idm'

type AuthRequest = Request & { user?: any }

type IdmUseCaseDeps = {
  districtRepo: DistrictNewRepository
  clubRepo: EecClubRepository
}

const defaultDeps: IdmUseCaseDeps = {
  districtRepo: districtNewRepositoryMongo,
  clubRepo: eecClubRepositoryMongo,
}


function normalizeGeomToGeoJSON(geom: any): any | null {
  if (!geom) return null
  if (Buffer.isBuffer(geom)) {
    try {
      return wkx.Geometry.parse(geom).toGeoJSON()
    } catch {
      return null
    }
  }
  if (typeof geom === 'string') {
    const trimmed = geom.trim()
    if (!trimmed) return null
    const isHex = /^[0-9A-Fa-f]+$/.test(trimmed)
    if (isHex) {
      try {
        return wkx.Geometry.parse(Buffer.from(trimmed, 'hex')).toGeoJSON()
      } catch {
        return null
      }
    }
    return null
  }
  if (typeof geom === 'object' && geom.type && geom.coordinates) {
    return geom
  }
  return null
}

function getClubField(club: any, camelKey: string, snakeKey: string) {
  return club?.[camelKey] ?? club?.[snakeKey]
}
const ALLOWED_GROUPS = new Set(['Super', 'EEC', 'Admin', 'DEO', 'DG', 'DO', 'LSM', 'LSO', 'TL'])

function showSensitive(req: AuthRequest): boolean {
  const groups: string[] = req.user?.groups || []
  return groups.some((g) => ALLOWED_GROUPS.has(g))
}

export const districtsClubCounts = asyncHandler(async (_req: Request, res: Response) => {
  const [districts, clubs] = await Promise.all([
    defaultDeps.districtRepo.list(),
    defaultDeps.clubRepo.list(),
  ])

  const counts: Record<string, number> = {}
  for (const club of clubs) {
    const districtId = ((club as any).districtId ?? (club as any).district_id ?? null)
    if (districtId === null || districtId === undefined || districtId === '') continue
    const key = String(districtId)
    counts[key] = (counts[key] || 0) + 1
  }

  const features = districts.map((d: any) => {
    const districtId = (d as any).districtId ?? (d as any).district_id ?? (d as any).id ?? (d as any)._id
    const name = d.shortName || d.short_name || d.name || null
    return {
      type: 'Feature',
      geometry: normalizeGeomToGeoJSON(d.geom),
      properties: {
        id: districtId,
        name,
        club_count: counts[String(districtId)] || 0,
      },
    }
  })

  return res.json({ type: 'FeatureCollection', features })
})

export const clubsGeojsonAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clubs = await defaultDeps.clubRepo.listWithCoords()
  const allowSensitive = showSensitive(req)

  const features = clubs.map((club: any) => {
    const latitude = getClubField(club, 'latitude', 'latitude')
    const longitude = getClubField(club, 'longitude', 'longitude')
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      properties: {
        id: club._id || club.id,
        emiscode: getClubField(club, 'emisCode', 'emiscode'),
        name: getClubField(club, 'schoolName', 'school_name'),
        address: getClubField(club, 'address', 'address'),
        head_name: getClubField(club, 'headName', 'head_name'),
        district_id: getClubField(club, 'districtId', 'district_id'),
        district: getClubField(club, 'districtName', 'district_name'),
        ...(allowSensitive
          ? {
              head_mobile: club.headMobile ?? club['head_mobile_no'] ?? club['head_mobile_no  '],
              notification_path: club.notificationPath ? `/${club.notificationPath}` : club.notification_path ? `/${club.notification_path}` : null,
            }
          : {}),
      },
    }
  })

  return res.json({ type: 'FeatureCollection', features })
})

export const clubsGeojsonAllViewset = asyncHandler(async (req: AuthRequest, res: Response) => {
  return clubsGeojsonAll(req, res, () => {})
})
