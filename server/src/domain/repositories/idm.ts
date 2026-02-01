import type { DistrictNew, EecClub } from '../entities/idm'

export interface DistrictNewRepository {
  list(): Promise<DistrictNew[]>
}

export interface EecClubRepository {
  list(): Promise<EecClub[]>
  listWithCoords(): Promise<EecClub[]>
}
