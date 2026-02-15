import React, { useEffect, useState } from 'react'
import AdminService, { ServiceConfigDto } from '@/services/AdminService'

const emptyConfig: ServiceConfigDto = {
    serviceName: '',
    baseUrl: '',
    authEndpoint: '',
    generatePsidEndpoint: '',
    transactionStatusEndpoint: '',
    clientId: '',
    clientSecret: '',
}

const AdminServiceConfig = () => {
    const [items, setItems] = useState<ServiceConfigDto[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [newConfig, setNewConfig] = useState<ServiceConfigDto>(emptyConfig)

    const load = async () => {
        try {
            setLoading(true)
            const data = await AdminService.listServiceConfigs()
            setItems(data)
        } catch (err: any) {
            setError(err?.message || 'Failed to load service configurations')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleSave = async (item: ServiceConfigDto) => {
        try {
            setLoading(true)
            const id = item._id || item.id
            if (!id) return
            const updated = await AdminService.updateServiceConfig(String(id), item)
            setItems((prev) => prev.map((row) => (String(row._id || row.id) === String(id) ? updated : row)))
        } catch (err: any) {
            setError(err?.message || 'Failed to update service configuration')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newConfig.serviceName) return
        try {
            setLoading(true)
            const created = await AdminService.createServiceConfig(newConfig)
            setItems((prev) => [...prev, created])
            setNewConfig(emptyConfig)
        } catch (err: any) {
            setError(err?.message || 'Failed to create service configuration')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-120px)] bg-slate-50/60 p-6">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Admin Console
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">Service Configuration</h3>
                    <p className="text-sm text-slate-500">Manage external service endpoints and credentials.</p>
                </div>

                {error && (
                    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-700">Add New Service</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Service name" value={newConfig.serviceName} onChange={(e) => setNewConfig((p) => ({ ...p, serviceName: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Base URL" value={newConfig.baseUrl} onChange={(e) => setNewConfig((p) => ({ ...p, baseUrl: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Auth endpoint" value={newConfig.authEndpoint} onChange={(e) => setNewConfig((p) => ({ ...p, authEndpoint: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Generate PSID" value={newConfig.generatePsidEndpoint} onChange={(e) => setNewConfig((p) => ({ ...p, generatePsidEndpoint: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Transaction status" value={newConfig.transactionStatusEndpoint} onChange={(e) => setNewConfig((p) => ({ ...p, transactionStatusEndpoint: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Client ID" value={newConfig.clientId} onChange={(e) => setNewConfig((p) => ({ ...p, clientId: e.target.value }))} />
                        <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Client Secret" value={newConfig.clientSecret} onChange={(e) => setNewConfig((p) => ({ ...p, clientSecret: e.target.value }))} />
                    </div>
                    <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={handleCreate} disabled={loading}>
                        Create
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Service</th>
                                    <th className="px-4 py-3">Auth</th>
                                    <th className="px-4 py-3">Generate</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Client ID</th>
                                    <th className="px-4 py-3">Client Secret</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item._id || item.id} className="border-t">
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.serviceName} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, serviceName: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.authEndpoint || ''} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, authEndpoint: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.generatePsidEndpoint || ''} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, generatePsidEndpoint: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.transactionStatusEndpoint || ''} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, transactionStatusEndpoint: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.clientId || ''} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, clientId: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={item.clientSecret || ''} onChange={(e) => setItems((prev) => prev.map((row) => (row === item ? { ...row, clientSecret: e.target.value } : row)))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white" onClick={() => handleSave(item)} disabled={loading}>
                                                Save
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                                            No service configurations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {loading && <div className="text-sm text-slate-500">Loading...</div>}
            </div>
        </div>
    )
}

export default AdminServiceConfig
