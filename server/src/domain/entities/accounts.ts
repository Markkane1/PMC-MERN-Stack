import type { Id, Timestamped } from '../types'

export type User = Timestamped & {
  id?: Id
  djangoId?: number
  username: string
  passwordHash: string
  firstName?: string
  lastName?: string
  groups: string[]
  permissions?: string[]
  directPermissions?: string[]
  isActive: boolean
  isSuperadmin?: boolean
}

export type UserProfile = Timestamped & {
  id?: Id
  userId?: Id
  districtId?: number
  districtName?: string
  districtShortName?: string
}

export type Permission = Timestamped & {
  id?: Id
  djangoId?: number
  name: string
  codename: string
  appLabel?: string
  modelName?: string
  contentTypeId?: number
  permissionKey: string
}

export type Group = Timestamped & {
  id?: Id
  djangoId?: number
  name: string
  permissions: string[]
}

export type UserAuditLog = Timestamped & {
  id?: Id
  djangoId?: number
  userId?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  dateJoined?: Date
  lastLogin?: Date
  changeReason?: string
  historyDate?: Date
  historyType?: string
  raw?: Record<string, unknown>
}

