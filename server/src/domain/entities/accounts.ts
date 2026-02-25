import type { Id, Timestamped } from '../types'

export type User = Timestamped & {
  id?: Id
  sourceId?: number
  username: string
  email?: string
  passwordHash: string
  firstName?: string
  lastName?: string
  avatar?: string
  groups: string[]
  permissions?: string[]
  directPermissions?: string[]
  isActive: boolean
  isSuperadmin?: boolean
}

export type SocialAccount = Timestamped & {
  id?: Id
  userId: Id
  provider: 'google' | 'github'
  providerId: string
  email?: string
  name?: string
  avatar?: string
  raw?: Record<string, unknown>
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
  sourceId?: number
  name: string
  codename: string
  appLabel?: string
  modelName?: string
  contentTypeId?: number
  permissionKey: string
}

export type Group = Timestamped & {
  id?: Id
  sourceId?: number
  name: string
  permissions: string[]
}

export type UserAuditLog = Timestamped & {
  id?: Id
  sourceId?: number
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

