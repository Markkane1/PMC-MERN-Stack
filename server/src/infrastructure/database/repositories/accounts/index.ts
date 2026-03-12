import type { UserRepository, UserProfileRepository, GroupRepository, PermissionRepository, UserAuditLogRepository } from '../../../../domain/repositories/accounts'
import { UserModel } from '../../models/accounts/User'
import { UserProfileModel } from '../../models/accounts/UserProfile'
import { GroupModel } from '../../models/accounts/Group'
import { PermissionModel } from '../../models/accounts/Permission'
import { UserAuditLogModel } from '../../models/accounts/UserAuditLog'
import { cacheManager } from '../../../cache/cacheManager'
import {
  ACCOUNT_PERMISSION_LIST_CACHE_KEY,
  accountUserProfileCacheKey,
} from '../../../cache/cacheKeys'

const ACCOUNT_CACHE_TTL_SECONDS = 300

const mapUser = (user: any) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  passwordHash: user.passwordHash,
  firstName: user.firstName,
  lastName: user.lastName,
  avatar: user.avatar,
  groups: user.groups || [],
  permissions: (user as any).permissions || [],
  directPermissions: (user as any).directPermissions || [],
  sourceId: (user as any).sourceId,
  isActive: user.isActive,
  isSuperadmin: (user as any).isSuperadmin ?? ((user.groups || []).includes('Super')),
  createdAt: (user as any).createdAt,
  updatedAt: (user as any).updatedAt,
})

const applyGroupPermissions = async (user: any) => {
  if (!user) return null
  const mapped = mapUser(user)
  const groupNames = mapped.groups || []
  if (!groupNames.length) {
    return mapped
  }
  const groups = await GroupModel.find({ name: { $in: groupNames } }).lean()
  const groupPermissions = groups.flatMap((group) => group.permissions || [])
  const merged = new Set([
    ...(mapped.permissions || []),
    ...(mapped.directPermissions || []),
    ...groupPermissions,
  ])
  return { ...mapped, permissions: Array.from(merged) }
}

export const userRepositoryMongo: UserRepository = {
  async findById(id: string) {
    const user = await UserModel.findById(id).lean()
    return user ? applyGroupPermissions(user) : null
  },

  async findByUsername(username: string) {
    const user = await UserModel.findOne({ username }).lean()
    return user ? applyGroupPermissions(user) : null
  },

  async findByEmail(email: string) {
    const user = await UserModel.findOne({ email }).lean()
    return user ? applyGroupPermissions(user) : null
  },

  async findByIdAndUsername(id: string, username: string) {
    const user = await UserModel.findOne({ _id: id, username }).lean()
    return user ? applyGroupPermissions(user) : null
  },

  async listByGroup(group: string) {
    const users = await UserModel.find({ groups: group }).lean()
    return users.map(mapUser)
  },

  async listAll() {
    const users = await UserModel.find({}).lean()
    return users.map(mapUser)
  },

  async listByIds(ids: string[]) {
    const users = await UserModel.find({ _id: { $in: ids } }).lean()
    return users.map(mapUser)
  },

  async create(user: any) {
    const created = await UserModel.create({
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      groups: user.groups,
      permissions: (user as any).permissions || [],
      directPermissions: (user as any).directPermissions || [],
      sourceId: (user as any).sourceId,
      isActive: user.isActive,
    })
    return mapUser(created)
  },

  async updateById(id: string, updates: any) {
    const updated = await UserModel.findByIdAndUpdate(id, updates, { new: true }).lean()
    return updated ? mapUser(updated) : null
  },

  async updatePassword(id: string, passwordHash: string) {
    await UserModel.updateOne({ _id: id }, { passwordHash })
  },

  async deleteById(id: string) {
    await UserModel.deleteOne({ _id: id })
  },
}


export const userProfileRepositoryMongo: UserProfileRepository = {
  async findByUserId(userId: string) {
    const cacheKey = accountUserProfileCacheKey(userId)
    const cached = await cacheManager.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    const profile = await UserProfileModel.findOne({ userId }).lean()
    const mapped = profile
      ? {
          id: profile._id.toString(),
          userId: profile.userId.toString(),
          districtId: profile.districtId,
          districtName: profile.districtName,
          districtShortName: profile.districtShortName,
          createdAt: (profile as any).createdAt,
          updatedAt: (profile as any).updatedAt,
        }
      : null
    if (mapped) {
      await cacheManager.set(cacheKey, mapped, { ttl: ACCOUNT_CACHE_TTL_SECONDS })
    }
    return mapped
  },

  async listByUserIds(userIds: string[]) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
    const cachedProfiles = await Promise.all(
      uniqueIds.map(async (userId) => [userId, await cacheManager.get<any>(accountUserProfileCacheKey(userId))] as const)
    )

    const cachedByUserId = new Map(
      cachedProfiles.filter((entry): entry is readonly [string, any] => entry[1] != null)
    )
    const missingUserIds = uniqueIds.filter((userId) => !cachedByUserId.has(userId))

    const profiles = missingUserIds.length
      ? await UserProfileModel.find({ userId: { $in: missingUserIds } }).lean()
      : []

    const mappedProfiles = profiles.map((profile) => ({
      id: profile._id.toString(),
      userId: profile.userId.toString(),
      districtId: profile.districtId,
      districtName: profile.districtName,
      districtShortName: profile.districtShortName,
      createdAt: (profile as any).createdAt,
      updatedAt: (profile as any).updatedAt,
    }))

    await Promise.all(
      mappedProfiles.map((profile) =>
        cacheManager.set(accountUserProfileCacheKey(profile.userId), profile, { ttl: ACCOUNT_CACHE_TTL_SECONDS })
      )
    )

    return uniqueIds
      .map((userId) => cachedByUserId.get(userId) || mappedProfiles.find((profile) => profile.userId === userId) || null)
      .filter(Boolean)
  },

  async create(profile: any) {
    const created = await UserProfileModel.create({
      userId: profile.userId,
      districtId: profile.districtId,
      districtName: profile.districtName,
      districtShortName: profile.districtShortName,
    })
    const mapped = {
      id: created._id.toString(),
      userId: created.userId.toString(),
      districtId: created.districtId,
      districtName: created.districtName,
      districtShortName: created.districtShortName,
      createdAt: (created as any).createdAt,
      updatedAt: (created as any).updatedAt,
    }
    await cacheManager.set(accountUserProfileCacheKey(mapped.userId), mapped, { ttl: ACCOUNT_CACHE_TTL_SECONDS })
    return mapped
  },
}

export const groupRepositoryMongo: GroupRepository = {
  async list() {
    const groups = await GroupModel.find({}).lean()
    return groups.map((group) => ({
      id: group._id.toString(),
      sourceId: (group as any).sourceId,
      name: group.name,
      permissions: group.permissions || [],
      createdAt: (group as any).createdAt,
      updatedAt: (group as any).updatedAt,
    }))
  },

  async listByNames(names: string[]) {
    const groups = await GroupModel.find({ name: { $in: names } }).lean()
    return groups.map((group) => ({
      id: group._id.toString(),
      sourceId: (group as any).sourceId,
      name: group.name,
      permissions: group.permissions || [],
      createdAt: (group as any).createdAt,
      updatedAt: (group as any).updatedAt,
    }))
  },

  async findById(id: string) {
    const group = await GroupModel.findById(id).lean()
    return group
      ? {
          id: group._id.toString(),
          sourceId: (group as any).sourceId,
          name: group.name,
          permissions: group.permissions || [],
          createdAt: (group as any).createdAt,
          updatedAt: (group as any).updatedAt,
        }
      : null
  },

  async findByName(name: string) {
    const group = await GroupModel.findOne({ name }).lean()
    return group
      ? {
          id: group._id.toString(),
          sourceId: (group as any).sourceId,
          name: group.name,
          permissions: group.permissions || [],
          createdAt: (group as any).createdAt,
          updatedAt: (group as any).updatedAt,
        }
      : null
  },

  async create(group: any) {
    const created = await GroupModel.create({
      name: group.name,
      permissions: group.permissions || [],
      sourceId: (group as any).sourceId,
    })
    return {
      id: created._id.toString(),
      sourceId: (created as any).sourceId,
      name: created.name,
      permissions: created.permissions || [],
      createdAt: (created as any).createdAt,
      updatedAt: (created as any).updatedAt,
    }
  },

  async updateById(id: string, updates: any) {
    const updated = await GroupModel.findByIdAndUpdate(id, updates, { new: true }).lean()
    return updated
      ? {
          id: updated._id.toString(),
          sourceId: (updated as any).sourceId,
          name: updated.name,
          permissions: updated.permissions || [],
          createdAt: (updated as any).createdAt,
          updatedAt: (updated as any).updatedAt,
        }
      : null
  },

  async deleteById(id: string) {
    await GroupModel.deleteOne({ _id: id })
  },
}

export const permissionRepositoryMongo: PermissionRepository = {
  async list() {
    const cached = await cacheManager.get<any[]>(ACCOUNT_PERMISSION_LIST_CACHE_KEY)
    if (cached) {
      return cached
    }

    const permissions = await PermissionModel.find({}).lean()
    const mapped = permissions.map((permission) => ({
      id: permission._id.toString(),
      sourceId: (permission as any).sourceId,
      name: permission.name,
      codename: permission.codename,
      appLabel: permission.appLabel,
      modelName: permission.modelName,
      contentTypeId: permission.contentTypeId,
      permissionKey: permission.permissionKey,
      createdAt: (permission as any).createdAt,
      updatedAt: (permission as any).updatedAt,
    }))
    await cacheManager.set(ACCOUNT_PERMISSION_LIST_CACHE_KEY, mapped, { ttl: ACCOUNT_CACHE_TTL_SECONDS })
    return mapped
  },

  async listByKeys(keys: string[]) {
    const cached = await cacheManager.get<any[]>(ACCOUNT_PERMISSION_LIST_CACHE_KEY)
    if (cached) {
      const keySet = new Set(keys)
      return cached.filter((permission) => keySet.has(permission.permissionKey))
    }

    const permissions = await PermissionModel.find({ permissionKey: { $in: keys } }).lean()
    return permissions.map((permission) => ({
      id: permission._id.toString(),
      sourceId: (permission as any).sourceId,
      name: permission.name,
      codename: permission.codename,
      appLabel: permission.appLabel,
      modelName: permission.modelName,
      contentTypeId: permission.contentTypeId,
      permissionKey: permission.permissionKey,
      createdAt: (permission as any).createdAt,
      updatedAt: (permission as any).updatedAt,
    }))
  },
}

export const userAuditLogRepositoryMongo: UserAuditLogRepository = {
  async create(log: any) {
    const created = await UserAuditLogModel.create(log)
    return {
      id: created._id.toString(),
      sourceId: (created as any).sourceId,
      userId: (created as any).userId,
      username: created.username,
      firstName: created.firstName,
      lastName: created.lastName,
      email: created.email,
      isActive: created.isActive,
      isStaff: created.isStaff,
      isSuperuser: created.isSuperuser,
      dateJoined: created.dateJoined,
      lastLogin: created.lastLogin,
      changeReason: created.changeReason,
      historyDate: created.historyDate,
      historyType: created.historyType,
      raw: (created as any).raw,
      createdAt: (created as any).createdAt,
      updatedAt: (created as any).updatedAt,
    }
  },
}
