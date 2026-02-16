import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FaChartLine, FaCalendarAlt, FaDownload } from 'react-icons/fa'

interface AnalyticsData {
    month: string
    inspections: number
    violations: number
    complaints: number
    resolved: number
}

interface MetricData {
    name: string
    value: number
    percentage: number
}

interface AnalyticsDashboardProps {
    data?: AnalyticsData[]
    metrics?: MetricData[]
    loading?: boolean
    onDateRangeChange?: (from: string, to: string) => void
    onExport?: () => void
}

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6']

export default function AnalyticsDashboard({
    data = [
        { month: 'Jan', inspections: 145, violations: 12, complaints: 5, resolved: 8 },
        { month: 'Feb', inspections: 178, violations: 15, complaints: 8, resolved: 12 },
        { month: 'Mar', inspections: 156, violations: 10, complaints: 4, resolved: 9 },
        { month: 'Apr', inspections: 189, violations: 18, complaints: 11, resolved: 16 },
        { month: 'May', inspections: 201, violations: 22, complaints: 14, resolved: 19 },
        { month: 'Jun', inspections: 234, violations: 28, complaints: 18, resolved: 25 },
    ],
    metrics = [
        { name: 'Total Inspections', value: 1103, percentage: 12 },
        { name: 'Violations Found', value: 105, percentage: 8 },
        { name: 'Complaints', value: 60, percentage: 5 },
        { name: 'Resolution Rate', value: 89, percentage: 3 },
    ],
    loading = false,
    onDateRangeChange,
    onExport,
}: AnalyticsDashboardProps) {
    const [dateFrom, setDateFrom] = useState('2024-01-01')
    const [dateTo, setDateTo] = useState('2024-06-30')

    const handleExport = () => {
        onExport?.()
        // Mock export
        console.log('Exporting analytics report...')
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FaChartLine className="text-primary" />
                        Analytics Overview
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-500" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value)
                                    onDateRangeChange?.(e.target.value, dateTo)
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>to</div>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value)
                                onDateRangeChange?.(dateFrom, e.target.value)
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                        >
                            <FaDownload className="text-sm" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: COLORS[idx] }}>
                        <div className="text-gray-600 text-sm font-medium">{metric.name}</div>
                        <div className="flex items-end justify-between mt-2">
                            <div className="text-3xl font-bold">{metric.value}</div>
                            <div className={`text-sm font-semibold ${metric.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {metric.percentage >= 0 ? '+' : ''}{metric.percentage}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trend Line Chart */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-bold mb-4">Trend Analysis</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="inspections" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="complaints" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Resolution Rate Bar Chart */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-bold mb-4">Resolution Performance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="violations" fill="#EF4444" />
                            <Bar dataKey="resolved" fill="#10B981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Pie Chart */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-bold mb-4">Overall Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Compliant', value: 65 },
                                    { name: 'Non-Compliant', value: 25 },
                                    { name: 'Pending', value: 10 },
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {[0, 1, 2].map((index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Comparison */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-bold mb-4">Monthly Activity</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="inspections" fill="#3B82F6" />
                            <Bar dataKey="violations" fill="#EF4444" />
                            <Bar dataKey="complaints" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
