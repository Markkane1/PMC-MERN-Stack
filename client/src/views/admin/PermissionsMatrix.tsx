import React, { useEffect, useMemo, useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import AdminService, {
    GroupDto,
    PermissionDto,
    SuperadminDto,
    UserDto,
} from '@/services/AdminService'
import { useSessionUser } from '@/store/authStore'

const { TabList, TabNav, TabContent } = Tabs

type DirtyMap = Record<string, boolean>

type PermissionSection = {
    key: string
    appLabel: string
    title: string
    permissions: PermissionDto[]
}

const actionToneMap: Record<string, string> = {
    view: 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200',
    add: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    change: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200',
    delete: 'bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200',
}

const inputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'

function formatLabel(value?: string) {
    if (!value) return 'General'
    const withSpaces = value.replace(/[_-]+/g, ' ').trim()
    return withSpaces.replace(/\b\w/g, (char) => char.toUpperCase())
}

function getPermissionAction(permission: PermissionDto) {
    const source = permission.codename || permission.permission_key.split('.').at(1) || ''
    return source.split('_')[0] || 'view'
}

function getPermissionTitle(permission: PermissionDto) {
    if (permission.model_name) return formatLabel(permission.model_name)
    const codename = permission.codename || permission.permission_key.split('.').at(1) || ''
    return formatLabel(codename.split('_').slice(1).join('_') || codename)
}

function getPermissionSections(permissions: PermissionDto[]): PermissionSection[] {
    const sections = new Map<string, PermissionSection>()

    permissions.forEach((permission) => {
        const appLabel = permission.app_label || permission.permission_key.split('.').at(0) || 'core'
        const modelName = permission.model_name || getPermissionTitle(permission)
        const key = `${appLabel}:${modelName}`

        if (!sections.has(key)) {
            sections.set(key, {
                key,
                appLabel: formatLabel(appLabel),
                title: formatLabel(modelName),
                permissions: [],
            })
        }

        sections.get(key)?.permissions.push(permission)
    })

    return Array.from(sections.values())
}

const PermissionsMatrix = () => {
    const [activeTab, setActiveTab] = useState('groups')
    const [permissions, setPermissions] = useState<PermissionDto[]>([])
    const [groups, setGroups] = useState<GroupDto[]>([])
    const [users, setUsers] = useState<UserDto[]>([])
    const [superadmins, setSuperadmins] = useState<SuperadminDto[]>([])
    const [loading, setLoading] = useState(false)
    const sessionUser = useSessionUser((state) => state.user)
    const isSuperUser = (sessionUser.authority || []).includes('Super')
    const [error, setError] = useState<string | null>(null)

    const [permQuery, setPermQuery] = useState('')
    const [userQuery, setUserQuery] = useState('')
    const [newGroupName, setNewGroupName] = useState('')
    const [dirtyGroups, setDirtyGroups] = useState<DirtyMap>({})

    const [selectedUserId, setSelectedUserId] = useState('')
    const [userGroups, setUserGroups] = useState<string[]>([])
    const [userDirectPermissions, setUserDirectPermissions] = useState<string[]>([])
    const [userActive, setUserActive] = useState(true)
    const [passwordReset, setPasswordReset] = useState('')
    const [superForm, setSuperForm] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
    })

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                setError(null)
                const [permissionData, groupData] = await Promise.all([
                    AdminService.listPermissions(),
                    AdminService.listGroups(),
                ])
                setPermissions(permissionData)
                setGroups(groupData)
            } catch (err: any) {
                setError(err?.message || 'Failed to load admin data.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    useEffect(() => {
        const loadUsers = async () => {
            if (activeTab !== 'users') return
            try {
                setLoading(true)
                setError(null)
                const data = await AdminService.listUsers()
                setUsers(data)
            } catch (err: any) {
                setError(err?.message || 'Failed to load users.')
            } finally {
                setLoading(false)
            }
        }
        loadUsers()
    }, [activeTab])

    useEffect(() => {
        const loadSuperadmins = async () => {
            if (activeTab !== 'superadmins' || !isSuperUser) return
            try {
                setLoading(true)
                setError(null)
                const data = await AdminService.listSuperadmins()
                setSuperadmins(data)
            } catch (err: any) {
                setError(err?.message || 'Failed to load superadmins.')
            } finally {
                setLoading(false)
            }
        }
        loadSuperadmins()
    }, [activeTab, isSuperUser])

    useEffect(() => {
        if (!selectedUserId) return
        const selected = users.find((user) => user.id === selectedUserId)
        if (!selected) return
        setUserGroups(selected.groups || [])
        setUserDirectPermissions(selected.direct_permissions || [])
        setUserActive(Boolean(selected.is_active))
        setPasswordReset('')
    }, [selectedUserId, users])

    const filteredPermissions = useMemo(() => {
        const query = permQuery.trim().toLowerCase()
        if (!query) return permissions
        return permissions.filter((permission) =>
            [
                permission.name,
                permission.codename,
                permission.permission_key,
                permission.model_name,
                permission.app_label,
            ]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(query)),
        )
    }, [permQuery, permissions])

    const permissionSections = useMemo(
        () => getPermissionSections(filteredPermissions),
        [filteredPermissions],
    )

    const filteredUsers = useMemo(() => {
        const query = userQuery.trim().toLowerCase()
        if (!query) return users
        return users.filter((user) =>
            [user.username, user.first_name, user.last_name]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(query)),
        )
    }, [userQuery, users])

    const totalPermissions = permissions.length
    const totalGroups = groups.length
    const totalUsers = users.length
    const dirtyCount = Object.keys(dirtyGroups).filter((id) => dirtyGroups[id]).length
    const selectedUser = users.find((user) => user.id === selectedUserId)
    const selectedUserPermissionCount = selectedUser?.permissions.length || 0
    const matrixWidth = 360 + groups.length * 96

    const groupCoverage = useMemo(
        () =>
            groups.map((group) => ({
                ...group,
                coverage: totalPermissions
                    ? Math.round((group.permissions.length / totalPermissions) * 100)
                    : 0,
            })),
        [groups, totalPermissions],
    )

    const getPasswordPolicyError = (value: string) => {
        if (value.length < 8) return 'Password must be at least 8 characters.'
        if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
        if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
        if (!/\d/.test(value)) return 'Password must include a number.'
        return null
    }

    const toggleGroupPermission = (groupId: string, permissionKey: string) => {
        setGroups((prev) =>
            prev.map((group) => {
                if (group.id !== groupId) return group
                const current = new Set(group.permissions || [])
                if (current.has(permissionKey)) current.delete(permissionKey)
                else current.add(permissionKey)
                return { ...group, permissions: Array.from(current) }
            }),
        )
        setDirtyGroups((prev) => ({ ...prev, [groupId]: true }))
    }

    const handleSaveGroups = async () => {
        const dirtyIds = Object.keys(dirtyGroups).filter((id) => dirtyGroups[id])
        if (!dirtyIds.length) return

        try {
            setLoading(true)
            setError(null)
            const updatedGroups = await Promise.all(
                dirtyIds.map((id) => {
                    const group = groups.find((item) => item.id === id)
                    if (!group) return Promise.resolve(null)
                    return AdminService.updateGroup(id, {
                        name: group.name,
                        permissions: group.permissions,
                    })
                }),
            )

            const updatedById = new Map(
                updatedGroups.filter(Boolean).map((group) => [String(group?.id), group as GroupDto]),
            )

            setGroups((prev) => prev.map((group) => updatedById.get(group.id) || group))
            setDirtyGroups({})
        } catch (err: any) {
            setError(err?.message || 'Failed to save group permissions.')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPermissions = async () => {
        const confirmed = window.confirm(
            'Reset all permissions to the default set? This will remove any unknown permissions from groups and users.',
        )
        if (!confirmed) return
        try {
            setLoading(true)
            setError(null)
            await AdminService.resetPermissions()
            const [permissionData, groupData] = await Promise.all([
                AdminService.listPermissions(),
                AdminService.listGroups(),
            ])
            setPermissions(permissionData)
            setGroups(groupData)
            setDirtyGroups({})
        } catch (err: any) {
            setError(err?.message || 'Failed to reset permissions.')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateGroup = async () => {
        const trimmed = newGroupName.trim()
        if (!trimmed) return
        try {
            setLoading(true)
            setError(null)
            const created = await AdminService.createGroup({ name: trimmed })
            setGroups((prev) => [...prev, created])
            setNewGroupName('')
        } catch (err: any) {
            setError(err?.message || 'Failed to create group.')
        } finally {
            setLoading(false)
        }
    }

    const handleRenameGroup = async (group: GroupDto) => {
        const nextName = window.prompt('Rename group', group.name)
        if (!nextName || nextName.trim() === group.name) return
        try {
            setLoading(true)
            setError(null)
            const updated = await AdminService.updateGroup(group.id, {
                name: nextName.trim(),
                permissions: group.permissions,
            })
            setGroups((prev) => prev.map((item) => (item.id === group.id ? updated : item)))
        } catch (err: any) {
            setError(err?.message || 'Failed to rename group.')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteGroup = async (group: GroupDto) => {
        const confirmed = window.confirm(
            `Delete group "${group.name}"? Users will be updated automatically.`,
        )
        if (!confirmed) return
        try {
            setLoading(true)
            setError(null)
            await AdminService.deleteGroup(group.id)
            setGroups((prev) => prev.filter((item) => item.id !== group.id))
            setDirtyGroups((prev) => {
                const next = { ...prev }
                delete next[group.id]
                return next
            })
        } catch (err: any) {
            setError(err?.message || 'Failed to delete group.')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleUserGroup = (groupName: string) => {
        setUserGroups((prev) => {
            const next = new Set(prev)
            if (next.has(groupName)) next.delete(groupName)
            else next.add(groupName)
            return Array.from(next)
        })
    }

    const handleToggleUserPermission = (permissionKey: string) => {
        setUserDirectPermissions((prev) => {
            const next = new Set(prev)
            if (next.has(permissionKey)) next.delete(permissionKey)
            else next.add(permissionKey)
            return Array.from(next)
        })
    }

    const handleDeleteUser = async () => {
        if (!selectedUserId) return
        const selected = users.find((user) => user.id === selectedUserId)
        if (!selected) return
        const confirmed = window.confirm(`Delete user ${selected.username}? This cannot be undone.`)
        if (!confirmed) return
        try {
            setLoading(true)
            setError(null)
            await AdminService.deleteUser(selectedUserId)
            setUsers((prev) => prev.filter((user) => user.id !== selectedUserId))
            setSelectedUserId('')
        } catch (err: any) {
            setError(err?.message || 'Failed to delete user.')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveUser = async () => {
        if (!selectedUserId) return
        try {
            setLoading(true)
            setError(null)
            const updated = await AdminService.updateUser(selectedUserId, {
                groups: userGroups,
                direct_permissions: userDirectPermissions,
                is_active: userActive,
            })
            setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)))
        } catch (err: any) {
            setError(err?.message || 'Failed to update user.')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSuperadmin = async () => {
        if (!superForm.username || !superForm.password) return
        const passwordPolicyError = getPasswordPolicyError(superForm.password)
        if (passwordPolicyError) {
            setError(passwordPolicyError)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const created = await AdminService.createSuperadmin({
                username: superForm.username,
                password: superForm.password,
                first_name: superForm.first_name || undefined,
                last_name: superForm.last_name || undefined,
            })
            setSuperadmins((prev) => [...prev, created])
            setSuperForm({ username: '', password: '', first_name: '', last_name: '' })
        } catch (err: any) {
            setError(err?.message || 'Failed to create SuperAdmin.')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleSuperadminActive = async (superadmin: SuperadminDto) => {
        try {
            setLoading(true)
            setError(null)
            const updated = await AdminService.updateSuperadmin(superadmin.id, {
                is_active: !superadmin.is_active,
            })
            setSuperadmins((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        } catch (err: any) {
            setError(err?.message || 'Failed to update SuperAdmin.')
        } finally {
            setLoading(false)
        }
    }

    const handleResetSuperadminPassword = async (superadmin: SuperadminDto) => {
        const nextPassword = window.prompt(`Reset password for ${superadmin.username}`)
        if (!nextPassword) return
        const passwordPolicyError = getPasswordPolicyError(nextPassword)
        if (passwordPolicyError) {
            setError(passwordPolicyError)
            return
        }
        try {
            setLoading(true)
            setError(null)
            await AdminService.updateSuperadmin(superadmin.id, {
                password: nextPassword,
            })
        } catch (err: any) {
            setError(err?.message || 'Failed to reset SuperAdmin password.')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteSuperadmin = async (superadmin: SuperadminDto) => {
        const confirmed = window.confirm(`Deactivate SuperAdmin ${superadmin.username}?`)
        if (!confirmed) return
        try {
            setLoading(true)
            setError(null)
            await AdminService.deleteSuperadmin(superadmin.id)
            setSuperadmins((prev) => prev.filter((item) => item.id !== superadmin.id))
        } catch (err: any) {
            setError(err?.message || 'Failed to delete SuperAdmin.')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUserId || !passwordReset) return
        const passwordPolicyError = getPasswordPolicyError(passwordReset)
        if (passwordPolicyError) {
            setError(passwordPolicyError)
            return
        }
        try {
            setLoading(true)
            setError(null)
            await AdminService.resetUserPassword(selectedUserId, {
                new_password: passwordReset,
            })
            setPasswordReset('')
        } catch (err: any) {
            setError(err?.message || 'Failed to reset password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-120px)] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef6f4_100%)] p-4 sm:p-6">
            <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
                <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200/80 px-6 py-6 sm:px-8">
                        <div className="max-w-3xl space-y-3">
                            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                                Admin Console
                            </div>
                            <div>
                                <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                    Permissions &amp; Access
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                    The matrix now renders only the app&apos;s real permission registry.
                                    Unknown legacy keys from MongoDB are filtered out before they
                                    reach groups, users, or the UI.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {isSuperUser && (
                                <button
                                    className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={handleResetPermissions}
                                    disabled={loading}
                                >
                                    Reset to Canonical Permissions
                                </button>
                            )}
                            {activeTab === 'groups' && (
                                <button
                                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                    onClick={handleSaveGroups}
                                    disabled={loading || dirtyCount === 0}
                                >
                                    Save Group Changes
                                    {dirtyCount > 0 ? ` (${dirtyCount})` : ''}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8 xl:grid-cols-4">
                        <div className="rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                                Groups
                            </div>
                            <div className="mt-4 text-3xl font-semibold">{totalGroups}</div>
                            <div className="mt-2 text-sm text-slate-300">
                                Role templates currently available to assign.
                            </div>
                        </div>
                        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                Canonical Permissions
                            </div>
                            <div className="mt-4 text-3xl font-semibold text-emerald-950">
                                {totalPermissions}
                            </div>
                            <div className="mt-2 text-sm text-emerald-800/80">
                                Every row shown here maps to an actual app capability.
                            </div>
                        </div>
                        <div className="rounded-[28px] border border-sky-200 bg-sky-50 px-5 py-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                                Loaded Users
                            </div>
                            <div className="mt-4 text-3xl font-semibold text-sky-950">
                                {totalUsers}
                            </div>
                            <div className="mt-2 text-sm text-sky-800/80">
                                User assignments load on demand when the user tab is opened.
                            </div>
                        </div>
                        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Pending Changes
                            </div>
                            <div className="mt-4 text-3xl font-semibold text-amber-950">
                                {dirtyCount}
                            </div>
                            <div className="mt-2 text-sm text-amber-800/80">
                                Unsaved group edits stay local until you commit them.
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
                        {error}
                    </div>
                )}

                <Tabs value={activeTab} onChange={setActiveTab}>
                    <TabList className="flex flex-wrap gap-2 rounded-[28px] border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                        <TabNav
                            value="groups"
                            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition"
                        >
                            Group Permissions
                        </TabNav>
                        <TabNav
                            value="users"
                            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition"
                        >
                            User Assignments
                        </TabNav>
                        {isSuperUser && (
                            <TabNav
                                value="superadmins"
                                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition"
                            >
                                SuperAdmins
                            </TabNav>
                        )}
                    </TabList>

                    <TabContent value="groups">
                        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                            <aside className="space-y-6">
                                <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-base font-semibold text-slate-900">
                                                Groups
                                            </h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Rename, remove, and maintain the role set used by
                                                auth/admin.
                                            </p>
                                        </div>
                                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {totalGroups} total
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-col gap-3 sm:flex-row xl:flex-col">
                                        <input
                                            className={inputClassName}
                                            placeholder="New group name"
                                            value={newGroupName}
                                            onChange={(event) => setNewGroupName(event.target.value)}
                                        />
                                        <button
                                            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                            onClick={handleCreateGroup}
                                            disabled={loading}
                                        >
                                            Create Group
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-3 shadow-sm">
                                    <div className="flex items-center justify-between px-2 pb-3">
                                        <div className="text-sm font-semibold text-slate-800">
                                            Coverage by Group
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Based on {totalPermissions} live permissions
                                        </div>
                                    </div>

                                    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
                                        {groupCoverage.map((group) => (
                                            <div
                                                key={group.id}
                                                className={`rounded-[24px] border px-4 py-4 transition ${
                                                    dirtyGroups[group.id]
                                                        ? 'border-amber-300 bg-amber-50/80'
                                                        : 'border-slate-200 bg-slate-50/80'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="truncate text-sm font-semibold text-slate-900">
                                                                {group.name}
                                                            </span>
                                                            {dirtyGroups[group.id] && (
                                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                                                    edited
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {group.permissions.length} mapped permissions
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs font-semibold text-slate-500">
                                                        {group.coverage}% of matrix
                                                    </div>
                                                </div>

                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500"
                                                        style={{ width: `${group.coverage}%` }}
                                                    />
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50"
                                                        onClick={() => handleRenameGroup(group)}
                                                    >
                                                        Rename
                                                    </button>
                                                    <button
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                                                        onClick={() => handleDeleteGroup(group)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </aside>

                            <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6">
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-semibold text-slate-950">
                                            Permission Matrix
                                        </h4>
                                        <p className="text-sm text-slate-500">
                                            Scroll horizontally to compare groups. The permission
                                            column stays pinned for context.
                                        </p>
                                    </div>
                                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px]">
                                        <input
                                            className={inputClassName}
                                            placeholder="Search by permission, codename, app, or model"
                                            value={permQuery}
                                            onChange={(event) => setPermQuery(event.target.value)}
                                        />
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{filteredPermissions.length} visible permissions</span>
                                            <span>{permissionSections.length} sections</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 sm:px-6">
                                    <div className="flex flex-wrap gap-2">
                                        {(['view', 'add', 'change', 'delete'] as const).map(
                                            (action) => (
                                                <span
                                                    key={action}
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${actionToneMap[action]}`}
                                                >
                                                    {action}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div className="max-h-[72vh] overflow-auto">
                                    <table
                                        className="border-separate border-spacing-0 text-sm"
                                        style={{ minWidth: `${matrixWidth}px` }}
                                    >
                                        <thead className="sticky top-0 z-30">
                                            <tr>
                                                <th className="sticky left-0 z-40 min-w-[360px] border-b border-r border-slate-200 bg-slate-950 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                                    Permission
                                                </th>
                                                {groups.map((group) => (
                                                    <th
                                                        key={group.id}
                                                        className="min-w-24 border-b border-slate-800 bg-slate-950 px-3 py-4 text-center align-top"
                                                    >
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                                                            {group.name}
                                                        </div>
                                                        <div className="mt-1 text-[10px] text-slate-400">
                                                            {group.permissions.length} perms
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permissionSections.map((section) => (
                                                <React.Fragment key={section.key}>
                                                    <tr>
                                                        <td
                                                            colSpan={groups.length + 1}
                                                            className="border-b border-t border-emerald-100 bg-emerald-50/70 px-5 py-3"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                                                        {section.appLabel}
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-slate-900">
                                                                        {section.title}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-emerald-100">
                                                                    {section.permissions.length} permissions
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {section.permissions.map((permission) => {
                                                        const action = getPermissionAction(permission)
                                                        const actionTone =
                                                            actionToneMap[action] ||
                                                            'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'

                                                        return (
                                                            <tr
                                                                key={permission.permission_key}
                                                                className="group"
                                                            >
                                                                <td className="sticky left-0 z-20 min-w-[360px] border-b border-r border-slate-200 bg-white px-5 py-4 align-top transition group-hover:bg-slate-50">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span
                                                                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${actionTone}`}
                                                                        >
                                                                            {action}
                                                                        </span>
                                                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                                            {permission.app_label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-3 text-sm font-semibold text-slate-900">
                                                                        {getPermissionTitle(permission)}
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        {permission.permission_key}
                                                                    </div>
                                                                    <div className="mt-2 text-xs leading-5 text-slate-500">
                                                                        {permission.name}
                                                                    </div>
                                                                </td>
                                                                {groups.map((group) => (
                                                                    <td
                                                                        key={`${permission.permission_key}-${group.id}`}
                                                                        className="border-b border-slate-100 bg-white px-3 py-4 text-center align-middle group-hover:bg-slate-50"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                            checked={group.permissions.includes(
                                                                                permission.permission_key,
                                                                            )}
                                                                            onChange={() =>
                                                                                toggleGroupPermission(
                                                                                    group.id,
                                                                                    permission.permission_key,
                                                                                )
                                                                            }
                                                                        />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </TabContent>

                    <TabContent value="users">
                        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                            <aside className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-base font-semibold text-slate-900">
                                            Users
                                        </h4>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Search users, then tune inherited and direct access.
                                        </p>
                                    </div>
                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {filteredUsers.length} shown
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <input
                                        className={inputClassName}
                                        placeholder="Search users"
                                        value={userQuery}
                                        onChange={(event) => setUserQuery(event.target.value)}
                                    />
                                </div>

                                <div className="mt-5 max-h-[640px] space-y-3 overflow-y-auto pr-1">
                                    {filteredUsers.map((user) => {
                                        const isSelected = selectedUserId === user.id

                                        return (
                                            <button
                                                key={user.id}
                                                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                                                    isSelected
                                                        ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                                        : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
                                                }`}
                                                onClick={() => setSelectedUserId(user.id)}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-slate-900">
                                                            {user.username}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {[user.first_name, user.last_name]
                                                                .filter(Boolean)
                                                                .join(' ') || 'No display name'}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                                            user.is_active
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        {user.is_active ? 'active' : 'inactive'}
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-inset ring-slate-200">
                                                        {user.groups.length} groups
                                                    </span>
                                                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-inset ring-slate-200">
                                                        {user.direct_permissions.length} direct permissions
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </aside>
                            <section className="space-y-6">
                                {!selectedUserId ? (
                                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
                                        Select a user to edit memberships, direct permissions, and
                                        status.
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                        Selected User
                                                    </div>
                                                    <h4 className="mt-2 text-2xl font-semibold text-slate-950">
                                                        {selectedUser?.username}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Effective access is inherited from groups plus
                                                        any direct overrides.
                                                    </p>
                                                </div>
                                                <label className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                        checked={userActive}
                                                        onChange={(event) =>
                                                            setUserActive(event.target.checked)
                                                        }
                                                    />
                                                    Active Account
                                                </label>
                                            </div>

                                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Groups
                                                    </div>
                                                    <div className="mt-3 text-2xl font-semibold text-slate-900">
                                                        {userGroups.length}
                                                    </div>
                                                </div>
                                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Direct Permissions
                                                    </div>
                                                    <div className="mt-3 text-2xl font-semibold text-slate-900">
                                                        {userDirectPermissions.length}
                                                    </div>
                                                </div>
                                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Effective Permissions
                                                    </div>
                                                    <div className="mt-3 text-2xl font-semibold text-slate-900">
                                                        {selectedUserPermissionCount}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                                            <div>
                                                <h5 className="text-base font-semibold text-slate-900">
                                                    Group Membership
                                                </h5>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Toggle role membership to inherit the right
                                                    permission bundle.
                                                </p>
                                            </div>

                                            <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                                {groups.map((group) => {
                                                    const checked = userGroups.includes(group.name)

                                                    return (
                                                        <label
                                                            key={group.id}
                                                            className={`flex items-start gap-3 rounded-[22px] border px-4 py-4 transition ${
                                                                checked
                                                                    ? 'border-emerald-300 bg-emerald-50'
                                                                    : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                checked={checked}
                                                                onChange={() =>
                                                                    handleToggleUserGroup(group.name)
                                                                }
                                                            />
                                                            <span className="min-w-0">
                                                                <span className="block text-sm font-semibold text-slate-900">
                                                                    {group.name}
                                                                </span>
                                                                <span className="mt-1 block text-xs text-slate-500">
                                                                    {group.permissions.length} mapped permissions
                                                                </span>
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
                                                <div>
                                                    <h5 className="text-base font-semibold text-slate-900">
                                                        Direct Permissions
                                                    </h5>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Use direct permissions sparingly. These are
                                                        explicit overrides on top of group-based
                                                        access.
                                                    </p>
                                                </div>
                                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {userDirectPermissions.length} selected
                                                </div>
                                            </div>

                                            <div className="max-h-[520px] overflow-y-auto px-6 py-5">
                                                <div className="space-y-4">
                                                    {permissionSections.map((section) => (
                                                        <section
                                                            key={section.key}
                                                            className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                        {section.appLabel}
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-slate-900">
                                                                        {section.title}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {section.permissions.length} permissions
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 grid gap-3 xl:grid-cols-2">
                                                                {section.permissions.map((permission) => {
                                                                    const checked =
                                                                        userDirectPermissions.includes(
                                                                            permission.permission_key,
                                                                        )
                                                                    const action =
                                                                        getPermissionAction(permission)

                                                                    return (
                                                                        <label
                                                                            key={permission.permission_key}
                                                                            className={`flex items-start gap-3 rounded-[20px] border px-4 py-4 transition ${
                                                                                checked
                                                                                    ? 'border-emerald-300 bg-white shadow-sm'
                                                                                    : 'border-slate-200 bg-white/80 hover:border-slate-300'
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                    handleToggleUserPermission(
                                                                                        permission.permission_key,
                                                                                    )
                                                                                }
                                                                            />
                                                                            <span className="min-w-0">
                                                                                <span className="flex flex-wrap items-center gap-2">
                                                                                    <span
                                                                                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                                                                            actionToneMap[
                                                                                                action
                                                                                            ] ||
                                                                                            'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
                                                                                        }`}
                                                                                    >
                                                                                        {action}
                                                                                    </span>
                                                                                    <span className="text-sm font-semibold text-slate-900">
                                                                                        {getPermissionTitle(permission)}
                                                                                    </span>
                                                                                </span>
                                                                                <span className="mt-2 block text-xs text-slate-500">
                                                                                    {permission.permission_key}
                                                                                </span>
                                                                            </span>
                                                                        </label>
                                                                    )
                                                                })}
                                                            </div>
                                                        </section>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                                    onClick={handleSaveUser}
                                                    disabled={loading}
                                                >
                                                    Save User Access
                                                </button>
                                                {isSuperUser && (
                                                    <button
                                                        className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                                                        onClick={handleDeleteUser}
                                                        disabled={loading}
                                                    >
                                                        Delete User
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                                                <input
                                                    className={inputClassName}
                                                    placeholder="Reset password"
                                                    type="password"
                                                    value={passwordReset}
                                                    onChange={(event) => setPasswordReset(event.target.value)}
                                                />
                                                <button
                                                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                                    onClick={handleResetPassword}
                                                    disabled={!passwordReset || loading}
                                                >
                                                    Reset Password
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>
                    </TabContent>

                    {isSuperUser && (
                        <TabContent value="superadmins">
                            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                                <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                                    <h4 className="text-base font-semibold text-slate-900">
                                        Create SuperAdmin
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Provision emergency access accounts only when role-based
                                        admin coverage is not enough.
                                    </p>

                                    <div className="mt-5 space-y-3">
                                        <input
                                            className={inputClassName}
                                            placeholder="Username"
                                            value={superForm.username}
                                            onChange={(event) =>
                                                setSuperForm((prev) => ({
                                                    ...prev,
                                                    username: event.target.value,
                                                }))
                                            }
                                        />
                                        <input
                                            className={inputClassName}
                                            placeholder="Password"
                                            type="password"
                                            value={superForm.password}
                                            onChange={(event) =>
                                                setSuperForm((prev) => ({
                                                    ...prev,
                                                    password: event.target.value,
                                                }))
                                            }
                                        />
                                        <input
                                            className={inputClassName}
                                            placeholder="First name"
                                            value={superForm.first_name}
                                            onChange={(event) =>
                                                setSuperForm((prev) => ({
                                                    ...prev,
                                                    first_name: event.target.value,
                                                }))
                                            }
                                        />
                                        <input
                                            className={inputClassName}
                                            placeholder="Last name"
                                            value={superForm.last_name}
                                            onChange={(event) =>
                                                setSuperForm((prev) => ({
                                                    ...prev,
                                                    last_name: event.target.value,
                                                }))
                                            }
                                        />
                                        <button
                                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                            onClick={handleCreateSuperadmin}
                                            disabled={loading}
                                        >
                                            Create SuperAdmin
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-base font-semibold text-slate-900">
                                                SuperAdmins
                                            </h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Manage the highest-privilege accounts separately
                                                from normal group administration.
                                            </p>
                                        </div>
                                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {superadmins.length} accounts
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {superadmins.map((superadmin) => (
                                            <div
                                                key={superadmin.id}
                                                className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4"
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            {superadmin.username}
                                                        </div>
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                                                superadmin.is_active
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-slate-200 text-slate-600'
                                                            }`}
                                                        >
                                                            {superadmin.is_active
                                                                ? 'active'
                                                                : 'inactive'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {[superadmin.first_name, superadmin.last_name]
                                                            .filter(Boolean)
                                                            .join(' ') || 'No display name'}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100"
                                                        onClick={() =>
                                                            handleResetSuperadminPassword(
                                                                superadmin,
                                                            )
                                                        }
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50"
                                                        onClick={() =>
                                                            handleToggleSuperadminActive(
                                                                superadmin,
                                                            )
                                                        }
                                                    >
                                                        {superadmin.is_active
                                                            ? 'Deactivate'
                                                            : 'Activate'}
                                                    </button>
                                                    <button
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                                                        onClick={() =>
                                                            handleDeleteSuperadmin(
                                                                superadmin,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </TabContent>
                    )}
                </Tabs>

                {loading && (
                    <div className="rounded-[24px] border border-slate-200 bg-white/85 px-5 py-4 text-sm text-slate-500 shadow-sm">
                        Loading admin data...
                    </div>
                )}
            </div>
        </div>
    )
}

export default PermissionsMatrix
