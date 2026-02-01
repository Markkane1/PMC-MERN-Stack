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
                .some((field) => String(field).toLowerCase().includes(query))
        )
    }, [permQuery, permissions])

    const filteredUsers = useMemo(() => {
        const query = userQuery.trim().toLowerCase()
        if (!query) return users
        return users.filter((user) =>
            [user.username, user.first_name, user.last_name]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(query))
        )
    }, [userQuery, users])

    const totalPermissions = permissions.length
    const totalGroups = groups.length
    const totalUsers = users.length
    const dirtyCount = Object.keys(dirtyGroups).filter((id) => dirtyGroups[id])
        .length
    const selectedUser = users.find((user) => user.id === selectedUserId)

    const toggleGroupPermission = (groupId: string, permissionKey: string) => {
        setGroups((prev) =>
            prev.map((group) => {
                if (group.id !== groupId) return group
                const current = new Set(group.permissions || [])
                if (current.has(permissionKey)) {
                    current.delete(permissionKey)
                } else {
                    current.add(permissionKey)
                }
                return { ...group, permissions: Array.from(current) }
            })
        )
        setDirtyGroups((prev) => ({ ...prev, [groupId]: true }))
    }

    const handleSaveGroups = async () => {
        const dirtyIds = Object.keys(dirtyGroups).filter((id) => dirtyGroups[id])
        if (!dirtyIds.length) return
        try {
            setLoading(true)
            await Promise.all(
                dirtyIds.map((id) => {
                    const group = groups.find((g) => g.id === id)
                    if (!group) return Promise.resolve(null)
                    return AdminService.updateGroup(id, {
                        name: group.name,
                        permissions: group.permissions,
                    })
                })
            )
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
            await AdminService.resetPermissions()
            const [permissionData, groupData] = await Promise.all([
                AdminService.listPermissions(),
                AdminService.listGroups(),
            ])
            setPermissions(permissionData)
            setGroups(groupData)
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
            const updated = await AdminService.updateGroup(group.id, {
                name: nextName.trim(),
                permissions: group.permissions,
            })
            setGroups((prev) =>
                prev.map((item) => (item.id === group.id ? updated : item))
            )
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
            await AdminService.deleteGroup(group.id)
            setGroups((prev) => prev.filter((item) => item.id !== group.id))
        } catch (err: any) {
            setError(err?.message || 'Failed to delete group.')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleUserGroup = (groupName: string) => {
        setUserGroups((prev) => {
            const set = new Set(prev)
            if (set.has(groupName)) set.delete(groupName)
            else set.add(groupName)
            return Array.from(set)
        })
    }

    const handleToggleUserPermission = (permissionKey: string) => {
        setUserDirectPermissions((prev) => {
            const set = new Set(prev)
            if (set.has(permissionKey)) set.delete(permissionKey)
            else set.add(permissionKey)
            return Array.from(set)
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
            const updated = await AdminService.updateUser(selectedUserId, {
                groups: userGroups,
                direct_permissions: userDirectPermissions,
                is_active: userActive,
            })
            setUsers((prev) =>
                prev.map((user) => (user.id === updated.id ? updated : user))
            )
        } catch (err: any) {
            setError(err?.message || 'Failed to update user.')
        } finally {
            setLoading(false)
        }
    }


    const handleCreateSuperadmin = async () => {
        if (!superForm.username || !superForm.password) return
        try {
            setLoading(true)
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
            const updated = await AdminService.updateSuperadmin(superadmin.id, {
                is_active: !superadmin.is_active,
            })
            setSuperadmins((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
            )
        } catch (err: any) {
            setError(err?.message || 'Failed to update SuperAdmin.')
        } finally {
            setLoading(false)
        }
    }

    const handleResetSuperadminPassword = async (superadmin: SuperadminDto) => {
        const nextPassword = window.prompt(`Reset password for ${superadmin.username}`)
        if (!nextPassword) return
        try {
            setLoading(true)
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
        try {
            setLoading(true)
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
        <div className="min-h-[calc(100vh-120px)] bg-slate-50/60 p-6">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Admin Console
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">
                        Permissions & Access
                    </h3>
                    <p className="text-sm text-slate-500">
                        Manage groups, permissions, and user assignments.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isSuperUser && (
                        <button
                            className="rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                            onClick={handleResetPermissions}
                            disabled={loading}
                        >
                            Reset Permissions
                        </button>
                    )}
                    {activeTab === 'groups' && (
                        <button
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            onClick={handleSaveGroups}
                            disabled={loading || dirtyCount === 0}
                        >
                            Save Changes {dirtyCount > 0 ? `(${dirtyCount})` : ''}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400">Groups</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-800">{totalGroups}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400">Permissions</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-800">{totalPermissions}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400">Users</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-800">{totalUsers}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400">Pending Changes</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-800">{dirtyCount}</div>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                    {error}
                </div>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
                <TabList>
                    <TabNav value="groups">Group Permissions</TabNav>
                    <TabNav value="users">User Assignments</TabNav>
                </TabList>

                <TabContent value="groups">
                    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-slate-700">
                                Groups
                            </h4>
                            <div className="flex gap-2">
                                <input
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="New group name"
                                    value={newGroupName}
                                    onChange={(event) =>
                                        setNewGroupName(event.target.value)
                                    }
                                />
                                <button
                                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                                    onClick={handleCreateGroup}
                                    disabled={loading}
                                >
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                {groups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                                    >
                                        <span className="font-medium text-slate-700">
                                            {group.name}
                                        </span>
                                        <span className="text-xs text-slate-400">{group.permissions.length} perms</span>
                                        <div className="flex gap-2">
                                            <button
                                                className="text-xs text-blue-600"
                                                onClick={() =>
                                                    handleRenameGroup(group)
                                                }
                                            >
                                                Rename
                                            </button>
                                            <button
                                                className="text-xs text-rose-600"
                                                onClick={() =>
                                                    handleDeleteGroup(group)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="text-sm font-semibold text-slate-700">
                                    Permission Matrix
                                </h4>
                                <input
                                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Search permissions"
                                    value={permQuery}
                                    onChange={(event) =>
                                        setPermQuery(event.target.value)
                                    }
                                />
                            </div>
                            <div className="overflow-auto rounded-2xl border border-slate-200 shadow-sm">
                                <table className="min-w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">
                                                Permission
                                            </th>
                                            {groups.map((group) => (
                                                <th
                                                    key={group.id}
                                                    className="px-3 py-2 text-center"
                                                >
                                                    {group.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPermissions.map((permission) => (
                                            <tr
                                                key={permission.permission_key}
                                                className="border-t border-slate-100 hover:bg-slate-50"
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-700">
                                                        {permission.permission_key}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {permission.name}
                                                    </div>
                                                </td>
                                                {groups.map((group) => (
                                                    <td
                                                        key={`${permission.permission_key}-${group.id}`}
                                                        className="px-3 py-2 text-center"
                                                    >
                                                        <input
                                                            type="checkbox"
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </TabContent>

                <TabContent value="users">
                    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-slate-700">
                                Users
                            </h4>
                            <input
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Search users"
                                value={userQuery}
                                onChange={(event) =>
                                    setUserQuery(event.target.value)
                                }
                            />
                            <div className="max-h-[520px] space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                            selectedUserId === user.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-100 bg-slate-50'
                                        }`}
                                        onClick={() => setSelectedUserId(user.id)}
                                    >
                                        <div className="font-medium text-slate-700">
                                            {user.username}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {(user.first_name || '') +
                                                ' ' +
                                                (user.last_name || '')}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {!selectedUserId ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                                    Select a user to edit permissions.
                                </div>
                            ) : (
                                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-slate-700">
                                            User Permissions
                                        </h4>
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={userActive}
                                                onChange={(event) =>
                                                    setUserActive(event.target.checked)
                                                }
                                            />
                                            Active
                                        </label>
                                    </div>

                                    <div>
                                        <h5 className="text-xs font-semibold text-slate-600">
                                            Groups
                                        </h5>
                                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {groups.map((group) => (
                                                <label
                                                    key={group.id}
                                                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={userGroups.includes(group.name)}
                                                        onChange={() =>
                                                            handleToggleUserGroup(
                                                                group.name,
                                                            )
                                                        }
                                                    />
                                                    {group.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h5 className="text-xs font-semibold text-slate-600">
                                            Direct Permissions
                                        </h5>
                                        <div className="mt-2 max-h-[320px] overflow-auto rounded border border-slate-100 p-2">
                                            {filteredPermissions.map((permission) => (
                                                <label
                                                    key={permission.permission_key}
                                                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={userDirectPermissions.includes(
                                                            permission.permission_key,
                                                        )}
                                                        onChange={() =>
                                                            handleToggleUserPermission(
                                                                permission.permission_key,
                                                            )
                                                        }
                                                    />
                                                    <span className="text-xs text-slate-700">
                                                        {permission.permission_key}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                                            onClick={handleSaveUser}
                                            disabled={loading}
                                        >
                                            Save User
                                        </button>
                                        {isSuperUser && (
                                            <button
                                                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                                                onClick={handleDeleteUser}
                                                disabled={loading}
                                            >
                                                Delete User
                                            </button>
                                        )}
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                                placeholder="Reset password"
                                                type="password"
                                                value={passwordReset}
                                                onChange={(event) =>
                                                    setPasswordReset(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <button
                                                className="rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                                                onClick={handleResetPassword}
                                                disabled={!passwordReset || loading}
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabContent>

                {isSuperUser && (
                    <TabContent value="superadmins">
                        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-700">
                                    Create SuperAdmin
                                </h4>
                                <input
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
                                    onClick={handleCreateSuperadmin}
                                    disabled={loading}
                                >
                                    Create SuperAdmin
                                </button>
                            </div>
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-700">
                                    SuperAdmins
                                </h4>
                                <div className="space-y-2 text-sm">
                                    {superadmins.map((superadmin) => (
                                        <div
                                            key={superadmin.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-100 px-3 py-2"
                                        >
                                            <div>
                                                <div className="font-medium text-slate-700">
                                                    {superadmin.username}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {(superadmin.first_name || '') +
                                                        ' ' +
                                                        (superadmin.last_name || '')}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    className="text-xs text-slate-600"
                                                    onClick={() =>
                                                        handleResetSuperadminPassword(
                                                            superadmin,
                                                        )
                                                    }
                                                >
                                                    Reset Password
                                                </button>
                                                <button
                                                    className="text-xs text-blue-600"
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
                                                    className="text-xs text-rose-600"
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
                <div className="mt-4 text-sm text-slate-500">Loading...</div>
            )}
        </div>
        </div>
    )
}

export default PermissionsMatrix
