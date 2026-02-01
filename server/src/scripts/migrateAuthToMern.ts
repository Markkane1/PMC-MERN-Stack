import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'

import { UserModel } from '../infrastructure/database/models/accounts/User'
import { GroupModel } from '../infrastructure/database/models/accounts/Group'
import { PermissionModel } from '../infrastructure/database/models/accounts/Permission'
import { UserAuditLogModel } from '../infrastructure/database/models/accounts/UserAuditLog'

const args = new Set(process.argv.slice(2))
const shouldArchive = !args.has('--no-archive')

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

async function fetchRaw(name: string) {
  return mongoose.connection.db!.collection(name).find({}).toArray()
}

async function collectionExists(name: string) {
  return mongoose.connection.db!.listCollections({ name }).hasNext()
}

async function archiveCollections(names: string[]) {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '')
  for (const name of names) {
    const exists = await collectionExists(name)
    if (!exists) continue
    const archive = `archive_${name}_${ts}`
    log(`Archiving ${name} -> ${archive}`)
    await mongoose.connection.db!.renameCollection(name, archive)
  }
}

async function main() {
  log(`Mongo: ${env.mongoUri}`)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

  try {
    const contentTypes = await fetchRaw('django_content_type')
    const contentTypeMap = new Map<number, { appLabel?: string; modelName?: string }>()
    for (const ct of contentTypes as any[]) {
      contentTypeMap.set(Number(ct.id), {
        appLabel: ct.app_label,
        modelName: ct.modelName,
      })
    }

    const permissionsRaw = await fetchRaw('auth_permission')
    const permissions = (permissionsRaw as any[]).map((p) => {
      const ct = contentTypeMap.get(Number(p.content_type_id)) || {}
      const appLabel = ct.appLabel || ''
      const codename = p.codename
      const permissionKey = appLabel ? `${appLabel}.${codename}` : codename
      return {
        djangoId: Number(p.id),
        name: p.name,
        codename,
        appLabel: ct.appLabel,
        modelName: ct.modelName,
        contentTypeId: Number(p.content_type_id),
        permissionKey,
      }
    })

    if (permissions.length) {
      log(`Upserting permissions: ${permissions.length}`)
      for (const perm of permissions) {
        await PermissionModel.updateOne(
          { permissionKey: perm.permissionKey },
          { $set: perm },
          { upsert: true }
        )
      }
    }

    const groupPermissionsExists = await collectionExists('auth_group_permissions')
    const groupPermissionsRaw = groupPermissionsExists ? await fetchRaw('auth_group_permissions') : []

    const groupPermissionMap = new Map<number, string[]>()
    for (const row of groupPermissionsRaw as any[]) {
      const groupId = Number(row.group_id)
      const permissionId = Number(row.permission_id)
      const perm = permissions.find((p) => p.djangoId === permissionId)
      if (!perm) continue
      const list = groupPermissionMap.get(groupId) || []
      list.push(perm.permissionKey)
      groupPermissionMap.set(groupId, list)
    }

    const groupsRaw = await fetchRaw('auth_group')
    const groupDocs = (groupsRaw as any[]).map((g) => ({
      djangoId: Number(g.id),
      name: g.name,
      permissions: groupPermissionMap.get(Number(g.id)) || [],
    }))

    if (groupDocs.length) {
      log(`Upserting groups: ${groupDocs.length}`)
      for (const group of groupDocs) {
        await GroupModel.updateOne({ name: group.name }, { $set: group }, { upsert: true })
      }
    }

    const userGroupsRaw = await fetchRaw('auth_user_groups')
    const userGroupMap = new Map<number, string[]>()
    for (const row of userGroupsRaw as any[]) {
      const userId = Number(row.user_id)
      const groupId = Number(row.group_id)
      const group = groupDocs.find((g) => g.djangoId === groupId)
      if (!group) continue
      const list = userGroupMap.get(userId) || []
      list.push(group.name)
      userGroupMap.set(userId, list)
    }

    const userPermRaw = await fetchRaw('auth_user_user_permissions')
    const userPermMap = new Map<number, string[]>()
    for (const row of userPermRaw as any[]) {
      const userId = Number(row.user_id)
      const permId = Number(row.permission_id)
      const perm = permissions.find((p) => p.djangoId === permId)
      if (!perm) continue
      const list = userPermMap.get(userId) || []
      list.push(perm.permissionKey)
      userPermMap.set(userId, list)
    }

    const usersRaw = await mongoose.connection.db!.collection('users').find({}).toArray()
    log(`Updating users: ${usersRaw.length}`)

    for (const user of usersRaw as any[]) {
      const rawDjangoId = user.djangoId ?? user.id
      const djangoIdNum = Number(rawDjangoId)
      const hasDjangoId = Number.isFinite(djangoIdNum)
      const groups = hasDjangoId ? (userGroupMap.get(djangoIdNum) || []) : []
      const directPerms = hasDjangoId ? (userPermMap.get(djangoIdNum) || []) : []
      const groupPerms = groups.flatMap((groupName) => {
        const group = groupDocs.find((g) => g.name === groupName)
        return group?.permissions || []
      })
      const permissionsCombined = Array.from(new Set([...directPerms, ...groupPerms]))

      const update: Record<string, any> = {
        ...(hasDjangoId ? { djangoId: djangoIdNum } : {}),
        groups,
        permissions: permissionsCombined,
      }

      if (!user.passwordHash && user.password) {
        update.passwordHash = user.password
      }

      if (user.first_name && !user.firstName) update.firstName = user.first_name
      if (user.last_name && !user.lastName) update.lastName = user.last_name
      if (user.is_active !== undefined && user.isActive === undefined) update.isActive = user.is_active
      if (user.date_joined && !user.createdAt) update.createdAt = user.date_joined
      if (user.last_login && !user.updatedAt) update.updatedAt = user.last_login

      await UserModel.updateOne({ _id: user._id }, { $set: update })
    }

    const historicalRaw = await fetchRaw('auth_historicaluser')
    if (historicalRaw.length) {
      log(`Upserting user audit logs: ${historicalRaw.length}`)
      for (const row of historicalRaw as any[]) {
        const rawHistoryId = row.history_id ?? row.id
        const djangoIdNum = Number(rawHistoryId)
        const hasDjangoId = Number.isFinite(djangoIdNum)
        const doc = {
          ...(hasDjangoId ? { djangoId: djangoIdNum } : {}),
          userId: row.id ? Number(row.id) : undefined,
          username: row.username,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          isActive: row.is_active,
          isStaff: row.is_staff,
          isSuperuser: row.is_superuser,
          dateJoined: row.date_joined,
          lastLogin: row.last_login,
          changeReason: row.history_change_reason,
          historyDate: row.history_date,
          historyType: row.history_type,
          raw: row,
        }
        const filter = hasDjangoId
          ? { djangoId: djangoIdNum, historyDate: doc.historyDate }
          : { historyDate: doc.historyDate, username: doc.username }
        await UserAuditLogModel.updateOne(filter, { $set: doc }, { upsert: true })
      }
    }

    if (shouldArchive) {
      await archiveCollections([
        'auth_group',
        'auth_historicaluser',
        'auth_permission',
        'auth_user_groups',
        'auth_user_user_permissions',
        'django_admin_log',
        'django_content_type',
        'django_migrations',
        'django_session',
        'oauth2_provider_accesstoken',
        'oauth2_provider_application',
      ])
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
