import { useState, useCallback } from 'react'

interface LocationMarker {
    id: string
    lat: number
    lon: number
    name: string
    type: 'facility' | 'inspection' | 'violation' | 'complaint'
    intensity?: number
}

interface AnalyticsMetric {
    month: string
    inspections: number
    violations: number
    complaints: number
    resolved: number
}

export const useGISAnalytics = () => {
    const [locations, setLocations] = useState<LocationMarker[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchLocations = useCallback(async (filters?: { district?: string; type?: string }) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (filters?.district) params.append('district', filters.district)
            if (filters?.type) params.append('type', filters.type)

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/locations?${params}`, {
                credentials: 'include',
            })

            if (!response.ok) throw new Error('Failed to fetch locations')

            const data = await response.json()
            setLocations(data.data || [])
            return data.data
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error fetching locations'
            setError(message)
            console.error(message)
        } finally {
            setLoading(false)
        }
    }, [])

    const getLocationStats = useCallback(async (district?: string) => {
        try {
            const url = district
                ? `${import.meta.env.VITE_API_URL}/api/analytics/location-stats?district=${district}`
                : `${import.meta.env.VITE_API_URL}/api/analytics/location-stats`

            const response = await fetch(url, { credentials: 'include' })
            if (!response.ok) throw new Error('Failed to fetch stats')

            const data = await response.json()
            return data.data
        } catch (err) {
            console.error('Error fetching location stats:', err)
            return null
        }
    }, [])

    return { locations, loading, error, fetchLocations, getLocationStats }
}

export const useAdvancedAnalytics = () => {
    const [metrics, setMetrics] = useState<AnalyticsMetric[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTrendData = useCallback(async (from: string, to: string) => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analytics/trends?from=${from}&to=${to}`,
                { credentials: 'include' }
            )

            if (!response.ok) throw new Error('Failed to fetch trends')

            const data = await response.json()
            setMetrics(data.data || [])
            return data.data
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error fetching trends'
            setError(message)
            console.error(message)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchSummaryMetrics = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/summary-metrics`, {
                credentials: 'include',
            })

            if (!response.ok) throw new Error('Failed to fetch metrics')

            const data = await response.json()
            return data.data
        } catch (err) {
            console.error('Error fetching summary metrics:', err)
            return null
        }
    }, [])

    const exportAnalytics = useCallback(async (format: 'pdf' | 'excel', from: string, to: string) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analytics/export?format=${format}&from=${from}&to=${to}`,
                { credentials: 'include' }
            )

            if (!response.ok) throw new Error('Failed to export analytics')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `analytics-report-${from}-${to}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error exporting analytics:', err)
        }
    }, [])

    return { metrics, loading, error, fetchTrendData, fetchSummaryMetrics, exportAnalytics }
}

export const useComparisonAnalytics = () => {
    const [comparisonData, setComparisonData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const compareDistricts = useCallback(async (districts: string[], metric: string) => {
        setLoading(true)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analytics/compare?districts=${districts.join(',')}&metric=${metric}`,
                { credentials: 'include' }
            )

            if (!response.ok) throw new Error('Failed to fetch comparison')

            const data = await response.json()
            setComparisonData(data.data)
            return data.data
        } catch (err) {
            console.error('Error comparing districts:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    const getPerformanceRanking = useCallback(async (metric: string) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analytics/ranking?metric=${metric}`,
                { credentials: 'include' }
            )

            if (!response.ok) throw new Error('Failed to fetch ranking')

            const data = await response.json()
            return data.data
        } catch (err) {
            console.error('Error fetching ranking:', err)
            return null
        }
    }, [])

    return { comparisonData, loading, compareDistricts, getPerformanceRanking }
}
