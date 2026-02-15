import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
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

const PERMISSION_KEYS = [
  'pmc_api.add_applicantdetail',
  'pmc_api.add_applicantdocument',
  'pmc_api.add_applicantfieldresponse',
  'pmc_api.add_applicantmanualfields',
  'pmc_api.add_applicationassignment',
  'pmc_api.add_businessprofile',
  'pmc_api.add_byproduct',
  'pmc_api.add_collector',
  'pmc_api.add_consumer',
  'pmc_api.add_districtplasticcommitteedocument',
  'pmc_api.add_inspectionreport',
  'pmc_api.add_plasticitem',
  'pmc_api.add_producer',
  'pmc_api.add_product',
  'pmc_api.add_psidtracking',
  'pmc_api.add_rawmaterial',
  'pmc_api.add_recycler',
  'pmc_api.change_applicantdetail',
  'pmc_api.change_applicantmanualfields',
  'pmc_api.change_applicationassignment',
  'pmc_api.change_businessprofile',
  'pmc_api.change_collector',
  'pmc_api.change_consumer',
  'pmc_api.change_inspectionreport',
  'pmc_api.change_producer',
  'pmc_api.change_recycler',
  'pmc_api.delete_applicantdetail',
  'pmc_api.delete_businessprofile',
  'pmc_api.delete_inspectionreport',
  'pmc_api.view_applicantdetail',
  'pmc_api.view_applicantdocument',
  'pmc_api.view_applicantfee',
  'pmc_api.view_applicantfieldresponse',
  'pmc_api.view_applicantmanualfields',
  'pmc_api.view_applicationassignment',
  'pmc_api.view_businessprofile',
  'pmc_api.view_byproduct',
  'pmc_api.view_collector',
  'pmc_api.view_consumer',
  'pmc_api.view_district',
  'pmc_api.view_districtplasticcommitteedocument',
  'pmc_api.view_inspectionreport',
  'pmc_api.view_license',
  'pmc_api.view_plasticitem',
  'pmc_api.view_producer',
  'pmc_api.view_product',
  'pmc_api.view_psidtracking',
  'pmc_api.view_rawmaterial',
  'pmc_api.view_recycler',
  'pmc_api.view_singleuseplasticssnapshot',
  'pmc_api.view_tehsil',
]

const buildPermission = (permissionKey: string) => {
  const [appLabel, codename] = permissionKey.split('.')
  const action = codename.split('_')[0]
  const modelName = codename.split('_').slice(1).join('_')
  const label = modelName.replace(/_/g, ' ')
  const name = `Can ${action} ${label}`
  return { permissionKey, name, codename, appLabel, modelName }
}

const PERMISSION_SEEDS = PERMISSION_KEYS.map(buildPermission)

const DEFAULT_GROUP_PERMISSIONS: Record<string, string[]> = {
  APPLICANT: [
    'pmc_api.view_applicantdetail',
    'pmc_api.add_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.add_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.add_businessprofile',
    'pmc_api.change_businessprofile',
    'pmc_api.view_producer',
    'pmc_api.add_producer',
    'pmc_api.change_producer',
    'pmc_api.view_consumer',
    'pmc_api.add_consumer',
    'pmc_api.change_consumer',
    'pmc_api.view_collector',
    'pmc_api.add_collector',
    'pmc_api.change_collector',
    'pmc_api.view_recycler',
    'pmc_api.add_recycler',
    'pmc_api.change_recycler',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
    'pmc_api.view_license',
    'pmc_api.add_psidtracking',
    'pmc_api.view_psidtracking',
  ],
  LSO: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
  ],
  LSM: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
  ],
  LSM2: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
  ],
  TL: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
  ],
  DO: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
    'pmc_api.view_inspectionreport',
  ],
  DEO: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
    'pmc_api.view_inspectionreport',
  ],
  DG: [
    'pmc_api.view_applicantdetail',
    'pmc_api.change_applicantdetail',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantfee',
    'pmc_api.view_psidtracking',
    'pmc_api.view_license',
    'pmc_api.view_applicationassignment',
    'pmc_api.add_applicationassignment',
    'pmc_api.change_applicationassignment',
    'pmc_api.view_applicantfieldresponse',
    'pmc_api.view_applicantmanualfields',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
    'pmc_api.view_product',
    'pmc_api.view_byproduct',
    'pmc_api.view_plasticitem',
    'pmc_api.view_rawmaterial',
    'pmc_api.view_inspectionreport',
  ],
  'Download License': [
    'pmc_api.view_license',
    'pmc_api.view_applicantdetail',
    'pmc_api.view_businessprofile',
    'pmc_api.view_applicantdocument',
    'pmc_api.view_psidtracking',
    'pmc_api.view_applicantfee',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
  ],
  Inspector: [
    'pmc_api.view_inspectionreport',
    'pmc_api.add_inspectionreport',
    'pmc_api.change_inspectionreport',
    'pmc_api.view_district',
    'pmc_api.view_tehsil',
  ],
}


type AdminUseCaseDeps = {
  userRepo: UserRepository
  groupRepo: GroupRepository
  permissionRepo: PermissionRepository
  auditRepo: UserAuditLogRepository
}

const defaultDeps: AdminUseCaseDeps = {
  userRepo: userRepositoryMongo,
  groupRepo: groupRepositoryMongo,
  permissionRepo: permissionRepositoryMongo,
  auditRepo: userAuditLogRepositoryMongo,
}


const ROLE_DASHBOARD_KEY = 'role_dashboard_map'

function normalizeRoleDashboardMap(raw: any) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const cleaned: Record<string, string> = {}
  for (const [role, path] of Object.entries(raw)) {
    if (typeof role !== 'string') continue
    if (typeof path !== 'string') continue
    const trimmedRole = role.trim()
    const trimmedPath = path.trim()
    if (!trimmedRole || !trimmedPath || !trimmedPath.startsWith('/')) continue
    cleaned[trimmedRole] = trimmedPath
  }
  return cleaned
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
  deps: AdminUseCaseDeps = defaultDeps
) {
  const groupDocs = groups.length ? await deps.groupRepo.listByNames(groups) : []
  const groupPermissions = groupDocs.flatMap((group) => group.permissions || [])
  const merged = new Set<string>([...groupPermissions, ...directPermissions])
  return Array.from(merged)
}

async function syncUsersForGroup(groupName: string, deps: AdminUseCaseDeps = defaultDeps) {
  const users = await deps.userRepo.listByGroup(groupName)
  for (const user of users) {
    const direct = user.directPermissions || []
    const effective = await computeEffectivePermissions(user.groups || [], direct, deps)
    await deps.userRepo.updateById(String(user.id), {
      permissions: effective,
    })
  }
}

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await defaultDeps.permissionRepo.list()
  return res.json(
    permissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
      codename: permission.codename,
      app_label: permission.appLabel,
      model_name: permission.modelName,
      permission_key: permission.permissionKey,
    }))
  )
})

export const resetPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorGroups: string[] = req.user?.groups || []
  if (!actorGroups.includes('Super')) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const permissionKeys = PERMISSION_SEEDS.map((p) => p.permissionKey)
  const validSet = new Set(permissionKeys)

  await PermissionModel.deleteMany({})
  if (PERMISSION_SEEDS.length) {
    await PermissionModel.insertMany(PERMISSION_SEEDS)
  }

  const groups = await GroupModel.find({}).lean()
  for (const group of groups) {
    const groupName = group.name
    const defaultPerms = DEFAULT_GROUP_PERMISSIONS[groupName] || DEFAULT_GROUP_PERMISSIONS[groupName?.toUpperCase?.()] || null
    let nextPermissions = (group.permissions || []).filter((p: string) => validSet.has(p))
    if (['Super', 'Admin'].includes(groupName)) {
      nextPermissions = [...permissionKeys]
    } else if (defaultPerms) {
      nextPermissions = defaultPerms.filter((p) => validSet.has(p))
    }
    await GroupModel.updateOne({ _id: group._id }, { permissions: nextPermissions })
  }

  const users = await UserModel.find({}).lean()
  for (const user of users) {
    const direct = ((user as any).directPermissions || []).filter((p: string) => validSet.has(p))
    const groupsForUser = (user.groups || [])
    const effective = await computeEffectivePermissions(groupsForUser, direct, defaultDeps)
    await UserModel.updateOne({ _id: user._id }, { directPermissions: direct, permissions: effective })
  }

  logAdminAction(req, 'permissions.reset', 'permission', 'all', { count: permissionKeys.length })

  return res.json({
    message: 'Permissions reset successfully.',
    count: permissionKeys.length,
  })
})

export const listGroups = asyncHandler(async (_req: Request, res: Response) => {
  const groups = await defaultDeps.groupRepo.list()
  return res.json(
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      permissions: group.permissions || [],
    }))
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
    permissions: Array.isArray(permissions) ? permissions : [],
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

  const existing = await defaultDeps.groupRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ message: 'Group not found.' })
  }

  const updatePayload: Record<string, unknown> = {}
  if (name) updatePayload.name = String(name)
  if (Array.isArray(permissions)) updatePayload.permissions = permissions

  const updated = await defaultDeps.groupRepo.updateById(id, updatePayload)
  if (!updated) {
    return res.status(500).json({ message: 'Failed to update group.' })
  }

  const oldName = existing.name
  const newName = updated.name

  if (oldName !== newName) {
    logAdminAction(req, 'group.rename', 'group', String(updated.id), { oldName, newName })
    const users = await defaultDeps.userRepo.listByGroup(oldName)
    for (const user of users) {
      const nextGroups = (user.groups || []).map((g) => (g === oldName ? newName : g))
      const direct = user.directPermissions || []
      const effective = await computeEffectivePermissions(nextGroups, direct, defaultDeps)
      await defaultDeps.userRepo.updateById(String(user.id), {
        groups: nextGroups,
        permissions: effective,
      })
    }
  } else if (Array.isArray(permissions)) {
    await syncUsersForGroup(updated.name)
    logAdminAction(req, 'group.permissions.update', 'group', String(updated.id), {
      name: updated.name,
      permissions: updated.permissions || [],
    })
  }


  return res.json({
    id: updated.id,
    name: updated.name,
    permissions: updated.permissions || [],
  })
})

export const deleteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const existing = await defaultDeps.groupRepo.findById(id)
  if (!existing) {
    return res.status(404).json({ message: 'Group not found.' })
  }

  await defaultDeps.groupRepo.deleteById(id)

  logAdminAction(req, 'group.delete', 'group', String(existing.id), { name: existing.name })

  const users = await defaultDeps.userRepo.listByGroup(existing.name)
  for (const user of users) {
    const nextGroups = (user.groups || []).filter((g) => g !== existing.name)
    const direct = user.directPermissions || []
    const effective = await computeEffectivePermissions(nextGroups, direct, defaultDeps)
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
    visibleUsers.map((user) => ({
      id: user.id,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      groups: user.groups || [],
      permissions: user.permissions || [],
      direct_permissions: user.directPermissions || [],
      is_active: user.isActive,
      is_superadmin: user.isSuperadmin || false,
    }))
  )
})

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { groups, direct_permissions, is_active } = req.body || {}

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
  const nextDirect = Array.isArray(direct_permissions) ? direct_permissions : user.directPermissions || []
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
    permissions: updated.permissions || [],
    direct_permissions: updated.directPermissions || [],
    is_active: updated.isActive,
  })
})

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

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

  logAdminAction(req, 'user.delete', 'user', String(user.id), { username: user.username })

  return res.json({ message: 'User deleted.' })
})
export const resetUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { new_password } = req.body || {}

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
    supers.map((user) => ({
      id: user.id,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      groups: user.groups || [],
      is_active: user.isActive,
      is_superadmin: true,
    }))
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
  const doc = await SystemConfigModel.findOne({ key: ROLE_DASHBOARD_KEY }).lean()
  const mappings = normalizeRoleDashboardMap(doc?.value || {})
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

  return res.json({ mappings })
})



function parsePaging(query: Record<string, any>) {
  const limitRaw = Number(query.limit || 50)
  const pageRaw = Number(query.page || 1)
  const limit = Math.min(Math.max(limitRaw, 1), 500)
  const page = Math.max(pageRaw, 1)
  const skip = (page - 1) * limit
  return { limit, page, skip }
}

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

export const listApiLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.service) filter.serviceName = String(query.service)
  if (query.endpoint) filter.endpoint = new RegExp(escapeRegExp(String(query.endpoint)), 'i')
  if (query.status) filter.statusCode = Number(query.status)
  const range = parseDateRange(query)
  if (range) filter.createdAt = range

  const { limit, page, skip } = parsePaging(query)
  const [items, total] = await Promise.all([
    ApiLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApiLogModel.countDocuments(filter),
  ])

  return res.json({ items, total, page, limit })
})

export const listAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.user) filter.username = new RegExp(escapeRegExp(String(query.user)), 'i')
  if (query.action) filter.action = String(query.action)
  if (query.model) filter.modelName = String(query.model)
  const range = parseDateRange(query)
  if (range) filter.timestamp = range

  const { limit, page, skip } = parsePaging(query)
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ])

  return res.json({ items, total, page, limit })
})

export const listAccessLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.user) filter.username = new RegExp(escapeRegExp(String(query.user)), 'i')
  if (query.model) filter.modelName = String(query.model)
  if (query.method) filter.method = String(query.method).toUpperCase()
  if (query.endpoint) filter.endpoint = new RegExp(escapeRegExp(String(query.endpoint)), 'i')
  const range = parseDateRange(query)
  if (range) filter.timestamp = range

  const { limit, page, skip } = parsePaging(query)
  const [items, total] = await Promise.all([
    AccessLogModel.find(filter).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    AccessLogModel.countDocuments(filter),
  ])

  return res.json({ items, total, page, limit })
})

export const listServiceConfigurations = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const items = await ServiceConfigurationModel.find({}).sort({ serviceName: 1 }).lean()
  return res.json(items)
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

  return res.status(201).json(created)
})

export const updateServiceConfiguration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const payload = req.body || {}
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

  if (!updated) {
    return res.status(404).json({ message: 'Service configuration not found.' })
  }

  return res.json(updated)
})

export const listExternalTokens = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, any>
  const filter: Record<string, any> = {}
  if (query.service) filter.serviceName = String(query.service)
  const items = await ExternalServiceTokenModel.find(filter).sort({ createdAt: -1 }).limit(200).lean()
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
  return res.json(normalized)
})
