import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { validatePasswordPolicy } from '../../../shared/utils/passwordPolicy'
import { SystemConfigModel } from '../../../infrastructure/database/models/common/SystemConfig'
import { UserProfileModel } from '../../../infrastructure/database/models/accounts/UserProfile'
import { UserModel } from '../../../infrastructure/database/models/accounts/User'
import { GroupModel } from '../../../infrastructure/database/models/accounts/Group'
import { PermissionModel } from '../../../infrastructure/database/models/accounts/Permission'
import { ApiLogModel } from '../../../infrastructure/database/models/common/ApiLog'
import { AuditLogModel } from '../../../infrastructure/database/models/common/AuditLog'
import { AccessLogModel } from '../../../infrastructure/database/models/common/AccessLog'
import { ExternalServiceTokenModel } from '../../../infrastructure/database/models/common/ExternalServiceToken'
import { ServiceConfigurationModel } from '../../../infrastructure/database/models/common/ServiceConfiguration'
import { parsePaginationParams, paginateArray, paginateResponse } from '../../../infrastructure/utils/pagination'
import { cacheManager } from '../../../infrastructure/cache/cacheManager'
import { cacheInvalidation } from '../../../infrastructure/cache/cacheInvalidation'
import {
  ACCOUNT_ROLE_DASHBOARD_CACHE_KEY,
  ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY,
} from '../../../infrastructure/cache/cacheKeys'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import type {
  UserRepository,
  GroupRepository,
  PermissionRepository,
  UserAuditLogRepository,
} from '../../../domain/repositories/accounts'
import {
  userRepositoryMongo,
  groupRepositoryMongo,
  permissionRepositoryMongo,
  userAuditLogRepositoryMongo,
} from '../../../infrastructure/database/repositories/accounts'

type PermissionSeed = {
  permissionKey: string
  name: string
  codename: string
  appLabel?: string
  modelName?: string
}

const { PERMISSION_SEEDS, DEFAULT_GROUP_PERMISSIONS } = require('../../config/permissionRegistry') as {
  PERMISSION_SEEDS: PermissionSeed[]
  DEFAULT_GROUP_PERMISSIONS: Record<string, string[]>
}
const DEFAULT_GROUP_PERMISSION_ENTRIES = Object.entries(DEFAULT_GROUP_PERMISSIONS)

const PERMISSION_ORDER = new Map(
  PERMISSION_SEEDS.map((permission, index) => [permission.permissionKey, index] as const)
)
const VALID_PERMISSION_KEYS = new Set(PERMISSION_SEEDS.map((permission) => permission.permissionKey))


type AdminUseCaseDeps = {
  userRepo: UserRepository
  groupRepo: GroupRepository
  permissionRepo: PermissionRepository
  auditRepo: UserAuditLogRepository
}

type GroupPermissionLookup = Map<string, string[]>

const defaultDeps: AdminUseCaseDeps = {
  userRepo: userRepositoryMongo,
  groupRepo: groupRepositoryMongo,
  permissionRepo: permissionRepositoryMongo,
  auditRepo: userAuditLogRepositoryMongo,
}


const ROLE_DASHBOARD_KEY = 'role_dashboard_map'

function normalizePermissionKeys(permissionKeys: unknown): string[] {
  if (!Array.isArray(permissionKeys)) return []

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const permissionKey of permissionKeys) {
    if (typeof permissionKey !== 'string') continue
    if (!VALID_PERMISSION_KEYS.has(permissionKey)) continue
    if (seen.has(permissionKey)) continue

    seen.add(permissionKey)
    normalized.push(permissionKey)
  }

  return normalized.sort((left, right) => {
    const leftIndex = PERMISSION_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = PERMISSION_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex || left.localeCompare(right)
  })
}

function serializePermission(
  permission: Pick<PermissionSeed, 'permissionKey' | 'name' | 'codename' | 'appLabel' | 'modelName'> & { id?: string }
) {
  return {
    id: permission.id || permission.permissionKey,
    name: permission.name,
    codename: permission.codename,
    app_label: permission.appLabel,
    model_name: permission.modelName,
    permission_key: permission.permissionKey,
  }
}

function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value)
}

function normalizeRoleDashboardMap(raw: any) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(
        ([role, path]) =>
          typeof role === 'string' &&
          typeof path === 'string' &&
          role.trim().length > 0 &&
          path.trim().length > 0 &&
          path.trim().startsWith('/'),
      )
      .map(([role, path]) => [role.trim(), (path as string).trim()]),
  )
}

function getDefaultGroupPermissions(groupName: string) {
  const normalizedGroupName = groupName.trim()
  const upperName = normalizedGroupName.toUpperCase()

  const matchedEntry = DEFAULT_GROUP_PERMISSION_ENTRIES.find(
    ([key]) => key === normalizedGroupName || key === upperName,
  )

  return matchedEntry ? matchedEntry[1] : null
}

function logAdminAction(
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {},
  deps: AdminUseCaseDeps = defaultDeps
) {
  const actor = req.user || {}
  const raw = {
    action,
    targetType,
    targetId,
    actorId: actor._id || actor.id,
    actorUsername: actor.username,
    meta,
  }

  deps.auditRepo
    .create({
      username: actor.username,
      firstName: actor.firstName,
      lastName: actor.lastName,
      isActive: actor.isActive,
      changeReason: action,
      historyType: 'U',
      historyDate: new Date(),
      raw,
    })
    .catch(() => {})
}

async function computeEffectivePermissions(
  groups: string[],
  directPermissions: string[],
  deps: AdminUseCaseDeps = defaultDeps,
  groupPermissionLookup?: GroupPermissionLookup
) {
  const groupDocs =
    groups.length && !groupPermissionLookup ? await deps.groupRepo.listByNames(groups) : []
  const groupPermissions = groups.flatMap((groupName) => {
    if (groupPermissionLookup) {
      return groupPermissionLookup.get(groupName) || []
    }
    const groupDoc = groupDocs.find((group) => group.name === groupName)
    return normalizePermissionKeys(groupDoc?.permissions || [])
  })
  return normalizePermissionKeys([...groupPermissions, ...directPermissions])
}

async function buildGroupPermissionLookup(
  groupNames: string[],
  deps: AdminUseCaseDeps = defaultDeps
): Promise<GroupPermissionLookup> {
  const normalizedGroupNames = Array.from(
    new Set(groupNames.filter((groupName): groupName is string => typeof groupName === 'string' && groupName.trim().length > 0))
  )

  if (!normalizedGroupNames.length) {
    return new Map()
  }

  const groups = await deps.groupRepo.listByNames(normalizedGroupNames)
  return new Map(
    groups.map((group) => [group.name, normalizePermissionKeys(group.permissions || [])] as const)
  )
}

async function syncUsersForGroup(
  groupName: string,
  deps: AdminUseCaseDeps = defaultDeps,
  groupPermissionLookup?: GroupPermissionLookup
) {
  const users = await deps.userRepo.listByGroup(groupName)
  const lookup =
    groupPermissionLookup ||
    (await buildGroupPermissionLookup(
      users.flatMap((user) => user.groups || []),
      deps
    ))
  for (const user of users) {
    const direct = user.directPermissions || []
    const effective = await computeEffectivePermissions(user.groups || [], direct, deps, lookup)
    await deps.userRepo.updateById(String(user.id), {
      permissions: effective,
    })
  }
}

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const existingPermissions = await defaultDeps.permissionRepo.list()
  const existingByKey = new Map<string, (typeof existingPermissions)[number]>(
    existingPermissions.map((permission) => [permission.permissionKey, permission])
  )

  return res.json(
    paginateArray(
      PERMISSION_SEEDS.map((permission) => {
      const existing = existingByKey.get(permission.permissionKey)
      return serializePermission({
        id: existing?.id != null ? String(existing.id) : undefined,
        permissionKey: permission.permissionKey,
        name: permission.name,
        codename: permission.codename,
        appLabel: permission.appLabel,
        modelName: permission.modelName,
      })
      }),
      parsePaginationParams(_req.query)
    )
  )
})

export const resetPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const permissionKeys = PERMISSION_SEEDS.map((p) => p.permissionKey)
  await PermissionModel.deleteMany({})
  if (PERMISSION_SEEDS.length) {
    await PermissionModel.insertMany(PERMISSION_SEEDS)
  }

  const groups = await GroupModel.find({}).lean()
  for (const group of groups) {
    const groupName = group.name
    const defaultPerms = getDefaultGroupPermissions(groupName)
    let nextPermissions = normalizePermissionKeys(group.permissions || [])
    if (['Super', 'Admin'].includes(groupName)) {
      nextPermissions = [...permissionKeys]
    } else if (defaultPerms) {
      nextPermissions = normalizePermissionKeys(defaultPerms)
    }
    await GroupModel.updateOne({ _id: group._id }, { permissions: nextPermissions })
  }

  const groupPermissionLookup = new Map<string, string[]>(
    groups.map((group) => {
      const groupName = group.name
      const defaultPerms = getDefaultGroupPermissions(groupName)
      let nextPermissions = normalizePermissionKeys(group.permissions || [])
      if (['Super', 'Admin'].includes(groupName)) {
        nextPermissions = [...permissionKeys]
      } else if (defaultPerms) {
        nextPermissions = normalizePermissionKeys(defaultPerms)
      }
      return [groupName, nextPermissions] as const
    })
  )

  const users = await UserModel.find({}).lean()
  for (const user of users) {
    const direct = normalizePermissionKeys((user as any).directPermissions || [])
    const groupsForUser = (user.groups || [])
    const effective = await computeEffectivePermissions(groupsForUser, direct, defaultDeps, groupPermissionLookup)
    await UserModel.updateOne({ _id: user._id }, { directPermissions: direct, permissions: effective })
  }

  logAdminAction(req, 'permissions.reset', 'permission', 'all', { count: permissionKeys.length })
  await cacheInvalidation.invalidatePermissionLists()

  return res.json({
    message: 'Permissions reset successfully.',
    count: permissionKeys.length,
  })
})

export const listGroups = asyncHandler(async (_req: Request, res: Response) => {
  const groups = await defaultDeps.groupRepo.list()
  return res.json(
    paginateArray(
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        permissions: normalizePermissionKeys(group.permissions || []),
      })),
      parsePaginationParams(_req.query)
    )
  )
})

export const createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, permissions } = req.body || {}
  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' })
  }

  const existing = await defaultDeps.groupRepo.findByName(String(name))
  if (existing) {
    return res.status(400).json({ message: 'Group name already exists.' })
  }

  const created = await defaultDeps.groupRepo.create({
    name: String(name),
    permissions: normalizePermissionKeys(permissions),
  })

  logAdminAction(req, 'group.create', 'group', String(created.id), {
    name: created.name,
    permissions: created.permissions || [],
  })

  return res.status(201).json({
    id: created.id,
    name: created.name,
    permissions: created.permissions || [],
  })
})

export const updateGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { name, permissions } = req.body || {}

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid group id.' })
  }

  const existing = await defaultDeps.groupRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ message: 'Group not found.' })
  }

  const updatePayload: Record<string, unknown> = {}
  if (name) updatePayload.name = String(name)
  if (Array.isArray(permissions)) updatePayload.permissions = normalizePermissionKeys(permissions)

  const updated = await defaultDeps.groupRepo.updateById(id, updatePayload)
  if (!updated) {
    return res.status(500).json({ message: 'Failed to update group.' })
  }

  const oldName = existing.name
  const newName = updated.name

  if (oldName !== newName) {
    logAdminAction(req, 'group.rename', 'group', String(updated.id), { oldName, newName })
    const users = await defaultDeps.userRepo.listByGroup(oldName)
    const groupPermissionLookup = await buildGroupPermissionLookup(
      Array.from(
        new Set(
          users.flatMap((user) =>
            (user.groups || []).map((groupName) => (groupName === oldName ? newName : groupName))
          )
        )
      ),
      defaultDeps
    )
    for (const user of users) {
      const nextGroups = (user.groups || []).map((g) => (g === oldName ? newName : g))
      const direct = user.directPermissions || []
      const effective = await computeEffectivePermissions(nextGroups, direct, defaultDeps, groupPermissionLookup)
      await defaultDeps.userRepo.updateById(String(user.id), {
        groups: nextGroups,
        permissions: effective,
      })
    }
  } else if (Array.isArray(permissions)) {
    const users = await defaultDeps.userRepo.listByGroup(updated.name)
    const groupPermissionLookup = await buildGroupPermissionLookup(
      users.flatMap((user) => user.groups || []),
      defaultDeps
    )
    groupPermissionLookup.set(updated.name, normalizePermissionKeys(updated.permissions || []))
    await syncUsersForGroup(updated.name, defaultDeps, groupPermissionLookup)
    logAdminAction(req, 'group.permissions.update', 'group', String(updated.id), {
      name: updated.name,
      permissions: updated.permissions || [],
    })
  }


  return res.json({
    id: updated.id,
    name: updated.name,
    permissions: normalizePermissionKeys(updated.permissions || []),
  })
})

export const deleteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid group id.' })
  }

  const existing = await defaultDeps.groupRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ message: 'Group not found.' })
  }

  await defaultDeps.groupRepo.deleteById(id)

  logAdminAction(req, 'group.delete', 'group', String(existing.id), { name: existing.name })

  const users = await defaultDeps.userRepo.listByGroup(existing.name)
  const groupPermissionLookup = await buildGroupPermissionLookup(
    Array.from(
      new Set(
        users.flatMap((user) => (user.groups || []).filter((groupName) => groupName !== existing.name))
      )
    ),
    defaultDeps
  )
  for (const user of users) {
    const nextGroups = (user.groups || []).filter((g) => g !== existing.name)
    const direct = user.directPermissions || []
    const effective = await computeEffectivePermissions(nextGroups, direct, defaultDeps, groupPermissionLookup)
    await defaultDeps.userRepo.updateById(String(user.id), {
      groups: nextGroups,
      permissions: effective,
    })
  }

  return res.json({ message: 'Group deleted.' })
})

export const listUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await defaultDeps.userRepo.listAll()
  const actorGroups: string[] = req.user?.groups || []
  const isSuper = actorGroups.includes('Super')
  const visibleUsers = isSuper ? users : users.filter((u) => !u.isSuperadmin && !(u.groups || []).includes('Super'))
  return res.json(
    paginateArray(
      visibleUsers.map((user) => ({
        id: user.id,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        groups: user.groups || [],
        permissions: normalizePermissionKeys(user.permissions || []),
        direct_permissions: normalizePermissionKeys(user.directPermissions || []),
        is_active: user.isActive,
        is_superadmin: user.isSuperadmin || false,
      })),
      parsePaginationParams(req.query)
    )
  )
})

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { groups, direct_permissions, is_active } = req.body || {}

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  const user = await defaultDeps.userRepo.findById(id)
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const actorGroups: string[] = req.user?.groups || []
  const isActorSuper = actorGroups.includes('Super')
  if ((user.isSuperadmin || (user.groups || []).includes('Super')) && !isActorSuper) {
    return res.status(403).json({ message: 'Cannot modify SuperAdmin accounts.' })
  }

  const nextGroups = Array.isArray(groups) ? groups : user.groups || []
  const nextDirect = Array.isArray(direct_permissions)
    ? normalizePermissionKeys(direct_permissions)
    : normalizePermissionKeys(user.directPermissions || [])
  const effective = await computeEffectivePermissions(nextGroups, nextDirect, defaultDeps)

  const updated = await defaultDeps.userRepo.updateById(id, {
    groups: nextGroups,
    directPermissions: nextDirect,
    permissions: effective,
    ...(typeof is_active === 'boolean' ? { isActive: is_active } : {}),
  })

  if (!updated) {
    return res.status(500).json({ message: 'Failed to update user.' })
  }

  logAdminAction(req, 'user.permissions.update', 'user', String(updated.id), {
    groups: updated.groups || [],
    direct_permissions: updated.directPermissions || [],
    is_active: updated.isActive,
  })

  return res.json({
    id: updated.id,
    username: updated.username,
    first_name: updated.firstName,
    last_name: updated.lastName,
    groups: updated.groups || [],
    permissions: normalizePermissionKeys(updated.permissions || []),
    direct_permissions: normalizePermissionKeys(updated.directPermissions || []),
    is_active: updated.isActive,
  })
})

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  const actorGroups: string[] = req.user?.groups || []
  const isActorSuper = actorGroups.includes('Super')
  if (!isActorSuper) {
    return res.status(403).json({ message: 'Only SuperAdmin can delete users.' })
  }

  if (String(req.user?._id || req.user?.id) === String(id)) {
    return res.status(400).json({ message: 'You cannot delete your own account.' })
  }

  const user = await defaultDeps.userRepo.findById(id)
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  await UserModel.deleteOne({ _id: id })
  await UserProfileModel.deleteOne({ userId: id })
  await cacheInvalidation.invalidateUserProfiles([String(id)])

  logAdminAction(req, 'user.delete', 'user', String(user.id), { username: user.username })

  return res.json({ message: 'User deleted.' })
})
export const resetUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { new_password } = req.body || {}

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  if (!new_password) {
    return res.status(400).json({ message: 'new_password is required.' })
  }

  const passwordPolicyError = validatePasswordPolicy(new_password)
  if (passwordPolicyError) {
    return res.status(400).json({ message: passwordPolicyError })
  }

  const user = await defaultDeps.userRepo.findById(id)
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const actorGroups: string[] = req.user?.groups || []
  const isActorSuper = actorGroups.includes('Super')
  if ((user.isSuperadmin || (user.groups || []).includes('Super')) && !isActorSuper) {
    return res.status(403).json({ message: 'Cannot modify SuperAdmin accounts.' })
  }

  const passwordHash = await bcrypt.hash(String(new_password), 10)
  await defaultDeps.userRepo.updatePassword(id, passwordHash)

  logAdminAction(req, 'user.password.reset', 'user', String(user.id), {})

  return res.json({ message: 'Password updated.' })
})

export const listSuperadmins = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const users = await defaultDeps.userRepo.listAll()
  const supers = users.filter((user) => user.isSuperadmin || (user.groups || []).includes('Super'))
  return res.json(
    paginateArray(
      supers.map((user) => ({
        id: user.id,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        groups: user.groups || [],
        is_active: user.isActive,
        is_superadmin: true,
      })),
      parsePaginationParams(req.query)
    )
  )
})

export const createSuperadmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { username, password, first_name, last_name } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required.' })
  }

  const passwordPolicyError = validatePasswordPolicy(password)
  if (passwordPolicyError) {
    return res.status(400).json({ message: passwordPolicyError })
  }

  const existing = await defaultDeps.userRepo.findByUsername(String(username))
  if (existing) {
    return res.status(400).json({ message: 'Username already exists.' })
  }

  const passwordHash = await bcrypt.hash(String(password), 10)
  const created = await defaultDeps.userRepo.create({
    username: String(username),
    passwordHash,
    firstName: first_name,
    lastName: last_name,
    groups: ['Super', 'Admin'],
    permissions: [],
    directPermissions: [],
    isActive: true,
    isSuperadmin: true,
  } as any)

  logAdminAction(req, 'superadmin.create', 'user', String(created.id), { username: created.username })

  return res.status(201).json({
    id: created.id,
    username: created.username,
    first_name: created.firstName,
    last_name: created.lastName,
    groups: created.groups || [],
    is_active: created.isActive,
    is_superadmin: true,
  })
})

export const updateSuperadmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { id } = req.params
  const { first_name, last_name, password, is_active } = req.body || {}

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  const user = await defaultDeps.userRepo.findById(id)
  if (!user || !(user.isSuperadmin || (user.groups || []).includes('Super'))) {
    return res.status(404).json({ message: 'SuperAdmin not found.' })
  }

  const updates: Record<string, unknown> = {
    firstName: first_name ?? user.firstName,
    lastName: last_name ?? user.lastName,
    isActive: typeof is_active === 'boolean' ? is_active : user.isActive,
    isSuperadmin: true,
    groups: Array.from(new Set([...(user.groups || []), 'Super', 'Admin'])),
  }
  if (password) {
    const passwordPolicyError = validatePasswordPolicy(password)
    if (passwordPolicyError) {
      return res.status(400).json({ message: passwordPolicyError })
    }
    updates.passwordHash = await bcrypt.hash(String(password), 10)
  }

  const updated = await defaultDeps.userRepo.updateById(id, updates)
  if (!updated) {
    return res.status(500).json({ message: 'Failed to update SuperAdmin.' })
  }

  logAdminAction(req, 'superadmin.update', 'user', String(updated.id), { username: updated.username })

  return res.json({
    id: updated.id,
    username: updated.username,
    first_name: updated.firstName,
    last_name: updated.lastName,
    groups: updated.groups || [],
    is_active: updated.isActive,
    is_superadmin: true,
  })
})

export const deleteSuperadmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  const users = await defaultDeps.userRepo.listAll()
  const supers = users.filter((u) => u.isSuperadmin || (u.groups || []).includes('Super'))
  if (supers.length <= 1) {
    return res.status(400).json({ message: 'Cannot delete the last SuperAdmin.' })
  }

  const target = supers.find((u) => String(u.id) == String(id))
  if (!target) {
    return res.status(404).json({ message: 'SuperAdmin not found.' })
  }

  await defaultDeps.userRepo.updateById(String(target.id), {
    isActive: false,
    isSuperadmin: false,
    groups: (target.groups || []).filter((g) => g !== 'Super'),
  })

  logAdminAction(req, 'superadmin.delete', 'user', String(target.id), { username: target.username })

  return res.json({ message: 'SuperAdmin deactivated.' })
})


export const getRoleDashboardConfig = asyncHandler(async (_req: Request, res: Response) => {
  const cached = await cacheManager.get<Record<string, string>>(ACCOUNT_ROLE_DASHBOARD_CACHE_KEY)
  const mappings =
    cached ||
    normalizeRoleDashboardMap((await SystemConfigModel.findOne({ key: ROLE_DASHBOARD_KEY }).lean())?.value || {})
  if (!cached) {
    await cacheManager.set(ACCOUNT_ROLE_DASHBOARD_CACHE_KEY, mappings)
  }
  return res.json({ mappings })
})

export const updateRoleDashboardConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body || {}
  const raw = body.mappings ?? body
  const mappings = normalizeRoleDashboardMap(raw)

  const updated = await SystemConfigModel.findOneAndUpdate(
    { key: ROLE_DASHBOARD_KEY },
    { $set: { key: ROLE_DASHBOARD_KEY, value: mappings } },
    { upsert: true, new: true }
  ).lean()

  logAdminAction(req, 'role_dashboard.update', 'system_config', String(updated?._id || ROLE_DASHBOARD_KEY), {
    mappings,
  })
  await cacheManager.set(ACCOUNT_ROLE_DASHBOARD_CACHE_KEY, mappings)

  return res.json({ mappings })
})

function parseDateRange(query: Record<string, any>) {
  const from = query.from ? new Date(String(query.from)) : null
  const to = query.to ? new Date(String(query.to)) : null
  const range: Record<string, Date> = {}
  if (from && !Number.isNaN(from.getTime())) range.$gte = from
  if (to && !Number.isNaN(to.getTime())) range.$lte = to
  return Object.keys(range).length ? range : null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildContainsFilter(value: string) {
  return {
    $regex: escapeRegExp(value),
    $options: 'i',
  }
}

export const listApiLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.service) filter.serviceName = String(query.service)
  if (query.endpoint) filter.endpoint = buildContainsFilter(String(query.endpoint))
  if (query.status) filter.statusCode = Number(query.status)
  const range = parseDateRange(query)
  if (range) filter.createdAt = range

  const { limit, page, skip } = parsePaginationParams(query)
  const [items, total] = await Promise.all([
    ApiLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApiLogModel.countDocuments(filter),
  ])

  return res.json(paginateResponse(items, { page, limit, total }))
})

export const listAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.user) filter.username = buildContainsFilter(String(query.user))
  if (query.action) filter.action = String(query.action)
  if (query.model) filter.modelName = String(query.model)
  const range = parseDateRange(query)
  if (range) filter.timestamp = range

  const { limit, page, skip } = parsePaginationParams(query)
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ])

  return res.json(paginateResponse(items, { page, limit, total }))
})

export const listAccessLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.user) filter.username = buildContainsFilter(String(query.user))
  if (query.model) filter.modelName = String(query.model)
  if (query.method) filter.method = String(query.method).toUpperCase()
  if (query.endpoint) filter.endpoint = buildContainsFilter(String(query.endpoint))
  const range = parseDateRange(query)
  if (range) filter.timestamp = range

  const { limit, page, skip } = parsePaginationParams(query)
  const [items, total] = await Promise.all([
    AccessLogModel.find(filter).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    AccessLogModel.countDocuments(filter),
  ])

  return res.json(paginateResponse(items, { page, limit, total }))
})

export const listServiceConfigurations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cached = await cacheManager.get<any[]>(ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY)
  const items = cached || (await ServiceConfigurationModel.find({}).sort({ serviceName: 1 }).lean())
  if (!cached) {
    await cacheManager.set(ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY, items)
  }
  return res.json(paginateArray(items, parsePaginationParams(req.query)))
})

export const createServiceConfiguration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payload = req.body || {}
  if (!payload.serviceName) {
    return res.status(400).json({ message: 'serviceName is required.' })
  }

  const created = await ServiceConfigurationModel.create({
    serviceName: payload.serviceName,
    baseUrl: payload.baseUrl || undefined,
    authEndpoint: payload.authEndpoint || undefined,
    generatePsidEndpoint: payload.generatePsidEndpoint || undefined,
    transactionStatusEndpoint: payload.transactionStatusEndpoint || undefined,
    clientId: payload.clientId || undefined,
    clientSecret: payload.clientSecret || undefined,
  })
  await cacheInvalidation.invalidateServiceConfigurations([String(created.serviceName || payload.serviceName)])

  return res.status(201).json(created)
})

export const updateServiceConfiguration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const payload = req.body || {}

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid service configuration id.' })
  }

  const existing = await ServiceConfigurationModel.findById(id).lean()
  if (!existing) {
    return res.status(404).json({ message: 'Service configuration not found.' })
  }

  const updated = await ServiceConfigurationModel.findByIdAndUpdate(
    id,
    {
      $set: {
        serviceName: payload.serviceName,
        baseUrl: payload.baseUrl || undefined,
        authEndpoint: payload.authEndpoint || undefined,
        generatePsidEndpoint: payload.generatePsidEndpoint || undefined,
        transactionStatusEndpoint: payload.transactionStatusEndpoint || undefined,
        clientId: payload.clientId || undefined,
        clientSecret: payload.clientSecret || undefined,
      },
    },
    { new: true }
  )

  await cacheInvalidation.invalidateServiceConfigurations([
    String(existing.serviceName || ''),
    String(updated?.serviceName || payload.serviceName || ''),
  ])

  return res.json(updated)
})

export const listExternalTokens = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.service) filter.serviceName = String(query.service)
  const { page, limit, skip } = parsePaginationParams(query)
  const [items, total] = await Promise.all([
    ExternalServiceTokenModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ExternalServiceTokenModel.countDocuments(filter),
  ])
  const normalized = items.map((item: any) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : null
    let expiresAt = item.expiresAt ? new Date(item.expiresAt) : null
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      expiresAt = null
    }
    if (createdAt && expiresAt && expiresAt.getTime() < createdAt.getTime()) {
      expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000)
    }
    return {
      id: item._id,
      legacyId: item.legacyId,
      serviceName: item.serviceName,
      accessToken: item.accessToken,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      createdAt: createdAt ? createdAt.toISOString() : null,
    }
  })
  return res.json(paginateResponse(normalized, { page, limit, total }))
})
