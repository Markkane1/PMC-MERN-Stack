import type { Id, Timestamped } from '../types'

export type DistrictNew = Timestamped & {
  id?: Id
  name?: string
  shortName?: string
  divisionName?: string
  districtId?: number
  divisionId?: number
  extent?: string
}

export type EecClub = Timestamped & {
  id?: Id
  emisCode?: number
  schoolName?: string
  address?: string
  headName?: string
  headMobile?: string
  gender?: string
  educationLevel?: string
  latitude?: number
  longitude?: number
  addedBy?: string
  districtId?: Id
  districtName?: string
  createdBy?: Id
  notificationPath?: string
}


