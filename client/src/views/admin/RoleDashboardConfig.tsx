import React, { useEffect, useMemo, useState } from 'react'
import AdminService, { RoleDashboardConfig } from '@/services/AdminService'
import { DEFAULT_DASHBOARD_MAP } from '@/utils/roleRoute'

const ROUTE_OPTIONS = [
    '/home',
    '/home-super',
    '/home-admin',
    '/home-deo',
    '/home-do',
    '/home-license',
    '/auth/EPAOperations/ReportViolation',
    '/auth/mis/directory',
    '/auth/mis/clubs/directory',
]

const RoleDashboardConfigView = () => {
    const [roles, setRoles] = useState<string[]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [newRole, setNewRole] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const [groups, config] = await Promise.all([
                    AdminService.listGroups(),
                    AdminService.getRoleDashboardConfig(),
                ])

                const groupRoles = groups.map((g) => g.name)
                const baseRoles = Object.keys(DEFAULT_DASHBOARD_MAP)
                const allRoles = Array.from(
                    new Set([...baseRoles, ...groupRoles]),
                )

                setRoles(allRoles)
                setMapping(config?.mappings || {})
            } catch (err: any) {
                setError(err?.message || 'Failed to load role dashboards.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const mergedMapping = useMemo(() => {
        return { ...DEFAULT_DASHBOARD_MAP, ...(mapping || {}) }
    }, [mapping])

    const handleChange = (role: string, path: string) => {
        setMapping((prev) => ({
            ...prev,
            [role]: path,
        }))
    }

    const handleAddRole = () => {
        const trimmed = newRole.trim()
        if (!trimmed) return
        if (!roles.includes(trimmed)) {
            setRoles((prev) => [...prev, trimmed])
        }
        setNewRole('')
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            const cleaned: Record<string, string> = {}
            Object.entries(mapping).forEach(([role, path]) => {
                if (typeof role !== 'string' || typeof path !== 'string') return
                const r = role.trim()
                const p = path.trim()
                if (!r || !p || !p.startsWith('/')) return
                cleaned[r] = p
            })
            const updated = await AdminService.updateRoleDashboardConfig({
                mappings: cleaned,
            } as RoleDashboardConfig)
            setMapping(updated?.mappings || cleaned)
        } catch (err: any) {
            setError(err?.message || 'Failed to save role dashboards.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4">
            <div className="mb-4">
                <h3 className="text-xl font-semibold">
                    Role Dashboard Routing
                </h3>
                <p className="text-sm text-gray-500">
                    Configure which dashboard each role should land on after
                    login. Custom mappings override defaults.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <input
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Add custom role"
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                />
                <button
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                    onClick={handleAddRole}
                    disabled={loading}
                >
                    Add Role
                </button>
                <button
                    className="ml-auto rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                    onClick={handleSave}
                    disabled={loading}
                >
                    Save Changes
                </button>
            </div>

            <div className="overflow-auto rounded border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                        <tr>
                            <th className="px-3 py-2 text-left">Role</th>
                            <th className="px-3 py-2 text-left">Dashboard Route</th>
                            <th className="px-3 py-2 text-left">Effective</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => (
                            <tr key={role} className="border-t">
                                <td className="px-3 py-2 font-medium text-gray-700">
                                    {role}
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        list="route-options"
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                        value={mapping[role] || ''}
                                        placeholder="/home"
                                        onChange={(event) =>
                                            handleChange(role, event.target.value)
                                        }
                                    />
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                    {mergedMapping[role] || '/home'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <datalist id="route-options">
                {ROUTE_OPTIONS.map((route) => (
                    <option value={route} key={route} />
                ))}
            </datalist>

            {loading && (
                <div className="mt-3 text-sm text-gray-500">Saving...</div>
            )}
        </div>
    )
}

export default RoleDashboardConfigView
