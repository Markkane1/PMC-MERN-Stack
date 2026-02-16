import { useState } from 'react'
import { ExcelExportPanel } from '@/components'

export default function AdminReportsPage() {
    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    })

    return (
        <div className="space-y-8 py-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">📊 Data Reports & Exports</h1>
                <p className="text-gray-600 mt-2">
                    Export and download comprehensive reports in Excel format for analysis and record keeping
                </p>
            </div>

            {/* Filter & Controls Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Date Range Filter */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                        <h2 className="text-lg font-semibold mb-4">🔍 Filter Options</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">From Date</label>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) =>
                                        setDateRange({ ...dateRange, from: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">To Date</label>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) =>
                                        setDateRange({ ...dateRange, to: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium transition-colors">
                                Apply Filters
                            </button>
                        </div>

                        <hr className="my-6" />

                        {/* Quick Stats */}
                        <div>
                            <h3 className="font-semibold mb-3">📈 Quick Stats</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Applicants</span>
                                    <span className="font-bold">2,847</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Payments Received</span>
                                    <span className="font-bold">2,621</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Pending</span>
                                    <span className="font-bold text-orange-600">226</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Completion Rate</span>
                                    <span className="font-bold text-green-600">92%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Panel */}
                <div className="lg:col-span-2">
                    <ExcelExportPanel />
                </div>
            </div>

            {/* Recent Exports Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">📥 Recent Exports</h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">Export Type</th>
                                <th className="text-left px-4 py-3 font-semibold">Date</th>
                                <th className="text-left px-4 py-3 font-semibold">Records</th>
                                <th className="text-left px-4 py-3 font-semibold">Size</th>
                                <th className="text-left px-4 py-3 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3">Applicants List</td>
                                <td className="px-4 py-3">Feb 17, 2026</td>
                                <td className="px-4 py-3">2,847</td>
                                <td className="px-4 py-3">1.2 MB</td>
                                <td className="px-4 py-3">
                                    <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                                        Download
                                    </a>
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3">Payment Records</td>
                                <td className="px-4 py-3">Feb 15, 2026</td>
                                <td className="px-4 py-3">2,621</td>
                                <td className="px-4 py-3">980 KB</td>
                                <td className="px-4 py-3">
                                    <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                                        Download
                                    </a>
                                </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3">Summary Report</td>
                                <td className="px-4 py-3">Feb 10, 2026</td>
                                <td className="px-4 py-3">156</td>
                                <td className="px-4 py-3">420 KB</td>
                                <td className="px-4 py-3">
                                    <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                                        Download
                                    </a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Export Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">📚 Export Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-900 text-sm">
                    <div>
                        <h4 className="font-semibold mb-2">✓ What's Included</h4>
                        <ul className="space-y-1">
                            <li>• Formatted headers and professional styling</li>
                            <li>• Currency formatting for financial data</li>
                            <li>• Date formatting for consistency</li>
                            <li>• Calculated aggregates and summaries</li>
                            <li>• Ready-to-use pivot tables</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">💡 Tips & Tricks</h4>
                        <ul className="space-y-1">
                            <li>• Use date filters for specific time periods</li>
                            <li>• Export summary report for quick overview</li>
                            <li>• Open in Excel for advanced analysis</li>
                            <li>• Create charts for presentations</li>
                            <li>• Share with stakeholders securely</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
