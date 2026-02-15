import React, { useEffect, useState } from 'react'
import AdminService, { ExternalTokenDto } from '@/services/AdminService'

const AdminExternalTokens = () => {
    const [items, setItems] = useState<ExternalTokenDto[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [service, setService] = useState('')

    const load = async () => {
        try {
            setLoading(true)
            const data = await AdminService.listExternalTokens({ service: service || undefined })
            setItems(data)
        } catch (err: any) {
            setError(err?.message || 'Failed to load tokens')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="min-h-[calc(100vh-120px)] bg-slate-50/60 p-6">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Admin Console
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">External Tokens</h3>
                    <p className="text-sm text-slate-500">Read-only token cache for external services.</p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
                    <input
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Service"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                    />
                    <button
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                        onClick={() => load()}
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
                                    <th className="px-4 py-3">Service</th>
                                    <th className="px-4 py-3">Token</th>
                                    <th className="px-4 py-3">Expires</th>
                                    <th className="px-4 py-3">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id || item.legacyId} className="border-t">
                                        <td className="px-4 py-2">{item.serviceName}</td>
                                        <td className="px-4 py-2 max-w-[420px] truncate">{item.accessToken}</td>
                                        <td className="px-4 py-2">{item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                                {!loading && items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                                            No tokens found.
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

export default AdminExternalTokens
