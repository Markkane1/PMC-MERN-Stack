/**
 * Advanced Dashboard Components
 * High-level analytics and reporting views
 */

import React, { useState, useEffect } from 'react'

/**
 * ComprehensiveAnalyticsDashboard - Complete system overview
 */
export const ComprehensiveAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(
          `/api/analytics/summary?start=${dateRange.start}&end=${dateRange.end}`
        )
        const result = await response.json()
        if (result.success) setAnalytics(result.data)
      } catch (error) {
        console.error('Analytics fetch failed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateRange])

  if (loading) return <div className="text-center py-8">Loading analytics...</div>

  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="px-4 py-2 border rounded"
        />
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="px-4 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricTile
          label="Total Applicants"
          value={analytics?.totalApplicants || 0}
          trend="+12%"
          color="blue"
        />
        <MetricTile
          label="Active Businesses"
          value={analytics?.activeBusinesses || 0}
          trend="+8%"
          color="green"
        />
        <MetricTile
          label="Documents Verified"
          value={analytics?.documentsVerified || 0}
          trend="+15%"
          color="purple"
        />
        <MetricTile
          label="Avg Compliance"
          value={`${analytics?.avgCompliance || 0}%`}
          trend="+3%"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard
          title="Application Status Distribution"
          data={analytics?.applicationStatus}
          type="pie"
        />
        <ReportCard
          title="Document Verification Trend"
          data={analytics?.verificationTrend}
          type="line"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard
          title="Business Entity Distribution"
          data={analytics?.businessEntities}
          type="bar"
        />
        <ReportCard
          title="Top Documents by Type"
          data={analytics?.topDocuments}
          type="table"
        />
      </div>
    </div>
  )
}

/**
 * RecyclingAnalyticsDashboard - Plastic waste tracking
 */
export const RecyclingAnalyticsDashboard: React.FC = () => {
  const [recyclingData, setRecyclingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics/recycling')
        const result = await response.json()
        if (result.success) setRecyclingData(result.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">Recycling & Waste Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricTile
          label="Total Plastic Collected"
          value={`${recyclingData?.totalPlastic || 0} tons`}
          trend="+18%"
          color="blue"
        />
        <MetricTile
          label="Recycling Rate"
          value={`${recyclingData?.recyclingRate || 0}%`}
          trend="+5%"
          color="green"
        />
        <MetricTile
          label="Safe Disposal"
          value={`${recyclingData?.safeDisposal || 0}%`}
          trend="+8%"
          color="purple"
        />
        <MetricTile
          label="Hazardous Items"
          value={recyclingData?.hazardousCount || 0}
          trend="-3%"
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard
          title="Disposal Method Breakdown"
          data={recyclingData?.disposalMethods}
          type="pie"
        />
        <ReportCard
          title="Plastic Category Analysis"
          data={recyclingData?.plasticCategories}
          type="bar"
        />
      </div>
    </div>
  )
}

/**
 * MetricTile - Reusable metric display with trend
 */
interface MetricTileProps {
  label: string
  value: string | number
  trend: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, trend, color }) => {
  const colorClass = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  }[color]

  return (
    <div className={`p-6 rounded-lg border ${colorClass}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs mt-2">{trend} from last period</p>
    </div>
  )
}

/**
 * ReportCard - Flexible report display component
 */
interface ReportCardProps {
  title: string
  data: any
  type: 'pie' | 'line' | 'bar' | 'table'
}

const ReportCard: React.FC<ReportCardProps> = ({ title, data, type }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      {type === 'table' && Array.isArray(data) && (
        <div className="space-y-2">
          {data.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between p-2 border-b">
              <span>{item.name}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      {type !== 'table' && (
        <div className="text-center py-12 text-gray-500">
          {type.charAt(0).toUpperCase() + type.slice(1)} Chart Visualization
        </div>
      )}
    </div>
  )
}

/**
 * CustomReportBuilder - Dynamic report generation
 */
export const CustomReportBuilder: React.FC = () => {
  const [report, setReport] = useState({
    name: '',
    metrics: [] as string[],
    filters: {} as any,
    format: 'pdf'
  })
  const [generating, setGenerating] = useState(false)

  const availableMetrics = [
    'Applicant Count',
    'Business Count',
    'Document Verified',
    'Compliance Score',
    'Plastic Collected',
    'Recycling Rate'
  ]

  const handleMetricToggle = (metric: string) => {
    setReport(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
      const result = await response.json()
      if (result.success) {
        alert(`Report generated: ${result.data.filename}`)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6">Custom Report Builder</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Report Name</label>
          <input
            type="text"
            value={report.name}
            onChange={(e) => setReport({ ...report, name: e.target.value })}
            placeholder="e.g., Monthly Compliance Report"
            className="w-full px-4 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Select Metrics</label>
          <div className="grid grid-cols-2 gap-3">
            {availableMetrics.map(metric => (
              <label key={metric} className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={report.metrics.includes(metric)}
                  onChange={() => handleMetricToggle(metric)}
                  className="w-4 h-4"
                />
                <span>{metric}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Export Format</label>
          <select
            value={report.format}
            onChange={(e) => setReport({ ...report, format: e.target.value })}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="html">HTML</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !report.name || report.metrics.length === 0}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  )
}
