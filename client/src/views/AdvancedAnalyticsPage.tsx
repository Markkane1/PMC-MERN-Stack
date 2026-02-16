import { useState, useEffect } from 'react'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { useAdvancedAnalytics } from '@/api/analytics'
import { FaChartLine, FaInfoCircle } from 'react-icons/fa'

export default function AdvancedAnalyticsPage() {
    const { metrics, loading, fetchTrendData, fetchSummaryMetrics, exportAnalytics } = useAdvancedAnalytics()
    const [dateFrom, setDateFrom] = useState('2024-01-01')
    const [dateTo, setDateTo] = useState('2024-06-30')
    const [summaryMetrics, setSummaryMetrics] = useState<any[]>([])

    useEffect(() => {
        fetchTrendData(dateFrom, dateTo)
        fetchSummaryMetrics()?.then(setSummaryMetrics)
    }, [])

    const handleDateRangeChange = (from: string, to: string) => {
        setDateFrom(from)
        setDateTo(to)
        fetchTrendData(from, to)
    }

    const handleExport = async () => {
        const format = window.confirm('Export as PDF? (OK = PDF, Cancel = Excel)') ? 'pdf' : 'excel'
        await exportAnalytics(format, dateFrom, dateTo)
    }

    const kpiMetrics = [
        {
            name: 'Total Inspections',
            value: 1103,
            percentage: 12,
            description: '↑ 12% from last period',
        },
        {
            name: 'Violations Found',
            value: 105,
            percentage: 8,
            description: '↑ 8% from last period',
        },
        {
            name: 'Complaints',
            value: 60,
            percentage: 5,
            description: '↓ 5% from last period',
        },
        {
            name: 'Resolution Rate',
            value: 89,
            percentage: 3,
            description: '↑ 3% from last period',
        },
    ]

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-400 rounded-lg shadow-lg p-6 text-white">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <FaChartLine />
                    Advanced Analytics Dashboard
                </h1>
                <p className="text-purple-100">Comprehensive insights into EPA operations and compliance trends</p>
            </div>

            {/* Quick Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                    <p className="text-sm text-blue-800">
                        <strong>Dashboard Info:</strong> This dashboard provides real-time analytics on EPA operations including
                        inspection trends, violation patterns, and compliance metrics across all districts.
                    </p>
                </div>
            </div>

            {/* Main Analytics Dashboard */}
            {loading ? (
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                </div>
            ) : (
                <AnalyticsDashboard
                    data={metrics}
                    metrics={kpiMetrics}
                    onDateRangeChange={handleDateRangeChange}
                    onExport={handleExport}
                />
            )}

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4">Key Insights</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span className="text-gray-700">Average response time has decreased by 15% this quarter</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span className="text-gray-700">Lahore district shows 23% improvement in compliance rate</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span className="text-gray-700">98% of critical violations resolved within SLA</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span className="text-gray-700">Peak inspection season predicted for July-August</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4">Performance Targets</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Response Time SLA', current: 89, target: 95 },
                            { label: 'Resolution Rate', current: 88, target: 95 },
                            { label: 'Inspector Capacity', current: 82, target: 85 },
                            { label: 'Data Quality', current: 91, target: 98 },
                        ].map((target, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-semibold">{target.label}</span>
                                    <span className="text-sm text-gray-600">
                                        {target.current}% / {target.target}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${target.current >= target.target ? 'bg-green-600' : 'bg-amber-600'}`}
                                        style={{ width: `${(target.current / target.target) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Data Quality Status */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Data Quality & Coverage</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Records Analyzed', value: '12,450', color: 'bg-blue-100 text-blue-800' },
                        { label: 'Data Completeness', value: '98.5%', color: 'bg-green-100 text-green-800' },
                        { label: 'Real-time Updates', value: '100%', color: 'bg-purple-100 text-purple-800' },
                        { label: 'Report Accuracy', value: '99.2%', color: 'bg-amber-100 text-amber-800' },
                    ].map((stat, idx) => (
                        <div key={idx} className={`rounded-lg p-4 ${stat.color}`}>
                            <p className="text-sm font-semibold opacity-75">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
