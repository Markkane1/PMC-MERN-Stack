import React, { useEffect, useState } from 'react'
import AdminService, { AccessLogDto } from '@/services/AdminService'

const AdminAccessLogs = () => {
    const [items, setItems] = useState<AccessLogDto[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [total, setTotal] = useState(0)

    const [user, setUser] = useState('')
    const [model, setModel] = useState('')
    const [method, setMethod] = useState('')
    const [endpoint, setEndpoint] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')

    const load = async () => {
        try {
            setLoading(true)
            const res = await AdminService.listAccessLogs({
                page,
                limit,
                user: user || undefined,
                model: model || undefined,
                method: method || undefined,
                endpoint: endpoint || undefined,
                from: from || undefined,
                to: to || undefined,
            })
            setItems(res.items || [])
            setTotal(res.total || 0)
        } catch (err: any) {
            setError(err?.message || 'Failed to load access logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return (
        <div className="min-h-[calc(100vh-120px)] bg-slate-50/60 p-6">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Admin Console
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">Access Logs</h3>
                    <p className="text-sm text-slate-500">Track data access events.</p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="User"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                    />
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    />
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    />
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Endpoint"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                    />
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                    <button
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                        onClick={() => {
                            setPage(1)
                            load()
                        }}
                        disabled={loading}
                    >
                        Apply
                    </button>
                </div>

                {error && (
                    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Model</th>
                                    <th className="px-4 py-3">Object</th>
                                    <th className="px-4 py-3">Method</th>
                                    <th className="px-4 py-3">Endpoint</th>
                                    <th className="px-4 py-3">When</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id || item.legacyId} className="border-t">
                                        <td className="px-4 py-2">{item.username || '-'}</td>
                                        <td className="px-4 py-2">{item.modelName || '-'}</td>
                                        <td className="px-4 py-2">{item.objectId || '-'}</td>
                                        <td className="px-4 py-2">{item.method || '-'}</td>
                                        <td className="px-4 py-2 max-w-[320px] truncate">{item.endpoint || '-'}</td>
                                        <td className="px-4 py-2">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                                {!loading && items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                                            No logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                            Page {page} of {totalPages} ({total} items)
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="rounded border border-slate-300 px-2 py-1"
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value))
                                    setPage(1)
                                }}
                            >
                                {[25, 50, 100, 200].map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="rounded border border-slate-300 px-2 py-1"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                Prev
                            </button>
                            <button
                                className="rounded border border-slate-300 px-2 py-1"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
                {loading && <div className="text-sm text-slate-500">Loading...</div>}
            </div>
        </div>
    )
}

export default AdminAccessLogs
