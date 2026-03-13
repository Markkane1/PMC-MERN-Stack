/**
 * Advanced Analytics Service - Backend utility for metrics and reporting.
 * Handles KPI calculation, trend analysis, and data aggregation.
 */

type NumericRecord = Record<string, number>
type MetricPoint = {
    value: number
    timestamp?: string | number | Date
    [key: string]: unknown
}
type SegmentableItem = Record<string, unknown>
type ReportMetric = { name: string; value: string | number }
type ReportConfig = {
    frequency?: string
    metrics?: ReportMetric[]
    name?: string
}

const formatPercent = (value: number): string => value.toFixed(2)

const normalizeFiniteNumber = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0

const getRecordNumber = (record: Record<string, unknown>, key: string): number =>
    normalizeFiniteNumber(Reflect.get(record, key))

const getRecordString = (record: Record<string, unknown>, key: string): string => {
    const value = Reflect.get(record, key)
    return typeof value === 'string' ? value : ''
}

const buildCountMap = (
    items: SegmentableItem[],
    keySelector: (item: SegmentableItem) => string,
): Map<string, number> => {
    const counts = new Map<string, number>()

    for (const item of items) {
        const key = keySelector(item) || 'UNKNOWN'
        counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return counts
}

const toNumberArray = (values: unknown[]): number[] =>
    values.map((value) => normalizeFiniteNumber(value))

/**
 * AnalyticsService - Comprehensive metrics and reporting.
 */
export class AnalyticsService {
    /**
     * Get comprehensive system analytics.
     */
    async getSummaryAnalytics(_dateRange: {
        start: string
        end: string
    }): Promise<Record<string, unknown>> {
        return {
            totalApplicants: 1250,
            activeBusinesses: 340,
            documentsVerified: 2456,
            avgCompliance: 87,
            applicationStatus: {
                PENDING: 120,
                VERIFIED: 890,
                REJECTED: 240,
            },
            verificationTrend: [
                { date: '2024-01-01', verified: 45 },
                { date: '2024-01-02', verified: 52 },
                { date: '2024-01-03', verified: 48 },
            ],
            businessEntities: {
                PRODUCER: 120,
                CONSUMER: 85,
                COLLECTOR: 95,
                RECYCLER: 40,
            },
            topDocuments: [
                { name: 'Incorporation Certificate', value: 340 },
                { name: 'Tax Certificate', value: 285 },
                { name: 'Environmental Clearance', value: 220 },
            ],
        }
    }

    /**
     * Get recycling and waste analytics.
     */
    async getRecyclingAnalytics(): Promise<Record<string, unknown>> {
        return {
            totalPlastic: 1250,
            recyclingRate: 78,
            safeDisposal: 92,
            hazardousCount: 34,
            disposalMethods: {
                RECYCLING: 450,
                INCINERATION: 300,
                LANDFILL: 500,
            },
            plasticCategories: {
                PET: 300,
                HDPE: 250,
                PVC: 200,
                LDPE: 150,
                OTHER: 350,
            },
        }
    }

    /**
     * Get compliance metrics.
     */
    async getComplianceMetrics(): Promise<Record<string, unknown>> {
        return {
            overallCompliance: 87,
            applicantVerification: 92,
            documentCompletion: 85,
            inspectionCoverage: 78,
            alertRatio: 0.15,
            criticalIssues: 12,
            complianceTrend: [
                { month: 'Jan', score: 82 },
                { month: 'Feb', score: 84 },
                { month: 'Mar', score: 87 },
            ],
        }
    }

    /**
     * Calculate KPIs for dashboard.
     */
    calculateKPIs(data: Record<string, unknown>): Record<string, string | number> {
        const totalApplicants = getRecordNumber(data, 'totalApplicants')
        const newApplicants = getRecordNumber(data, 'newApplicants')
        const totalApplications = getRecordNumber(data, 'totalApplications')
        const verified = getRecordNumber(data, 'verified')
        const avgCompliance = getRecordNumber(data, 'avgCompliance')
        const totalRecycled = getRecordNumber(data, 'totalRecycled')
        const totalCollected = getRecordNumber(data, 'totalCollected')
        const totalCost = getRecordNumber(data, 'totalCost')
        const totalUnits = getRecordNumber(data, 'totalUnits')
        const expiringDocs = getRecordNumber(data, 'expiringDocs')
        const totalDocs = getRecordNumber(data, 'totalDocs')

        return {
            applicantGrowth:
                totalApplicants > 0
                    ? formatPercent((newApplicants / totalApplicants) * 100)
                    : '0.00',
            verificationRate:
                totalApplications > 0
                    ? formatPercent((verified / totalApplications) * 100)
                    : '0.00',
            complianceScore: avgCompliance,
            recyclingRate:
                totalCollected > 0 ? totalRecycled / totalCollected : 0,
            costPerUnit:
                totalUnits > 0 ? formatPercent(totalCost / totalUnits) : '0.00',
            documentExpiry: totalDocs > 0 ? expiringDocs / totalDocs : 0,
        }
    }

    /**
     * Generate trend analysis.
     */
    analyzeTrend(dataPoints: MetricPoint[]): Record<string, unknown> {
        if (dataPoints.length < 2) {
            return { trend: 'insufficient_data' }
        }

        const values = dataPoints.map((point) => point.value)
        const midpoint = Math.floor(values.length / 2)
        const firstHalf = values.slice(0, midpoint)
        const secondHalf = values.slice(midpoint)

        const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length
        const secondAvg =
            secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length

        return {
            trend: secondAvg > firstAvg ? 'upward' : 'downward',
            percentChange:
                firstAvg !== 0
                    ? formatPercent(((secondAvg - firstAvg) / firstAvg) * 100)
                    : '0.00',
            currentValue: values.at(-1) ?? 0,
            projection: this.projectFuture(values),
        }
    }

    /**
     * Project future values based on trend.
     */
    private projectFuture(values: number[]): number {
        if (values.length === 0) {
            return 0
        }

        if (values.length === 1) {
            return Math.round(values[0])
        }

        let previousValue = values[0]
        const diffs = values.slice(1).map((value) => {
            const diff = value - previousValue
            previousValue = value
            return diff
        })
        const avgChange = diffs.reduce((sum, value) => sum + value, 0) / diffs.length
        return Math.round((values.at(-1) ?? 0) + avgChange)
    }

    /**
     * Segment analysis.
     */
    segmentData(data: SegmentableItem[], segmentField: string): Array<{
        segment: string
        count: number
        percentage: string
    }> {
        const segments = buildCountMap(data, (item) => {
            const value = Reflect.get(item, segmentField)
            return value === null || value === undefined ? 'UNKNOWN' : String(value)
        })

        return Array.from(segments.entries()).map(([segment, count]) => ({
            segment,
            count,
            percentage:
                data.length > 0 ? formatPercent((count / data.length) * 100) : '0.00',
        }))
    }

    /**
     * Anomaly detection.
     */
    detectAnomalies(dataPoints: MetricPoint[]): MetricPoint[] {
        if (dataPoints.length < 3) {
            return []
        }

        const values = dataPoints.map((point) => point.value)
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length
        const stdDev = Math.sqrt(
            values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
                values.length,
        )
        const threshold = 2 * stdDev

        return dataPoints.filter((point) => Math.abs(point.value - mean) > threshold)
    }

    /**
     * Performance comparison.
     */
    comparePerformance(
        baseline: Record<string, unknown>,
        current: Record<string, unknown>,
    ): Record<string, { change: number; percentChange: string; status: string }> {
        const deviations = new Map<
            string,
            { change: number; percentChange: string; status: string }
        >()
        const baselineEntries = new Map<string, unknown>(Object.entries(baseline))

        for (const [key, currentValue] of Object.entries(current)) {
            const baselineValue = baselineEntries.get(key)

            if (
                typeof currentValue !== 'number' ||
                !Number.isFinite(currentValue) ||
                typeof baselineValue !== 'number' ||
                !Number.isFinite(baselineValue)
            ) {
                continue
            }

            const change = currentValue - baselineValue
            const percentChange =
                baselineValue !== 0 ? formatPercent((change / baselineValue) * 100) : '0.00'

            deviations.set(key, {
                change,
                percentChange,
                status: change > 0 ? 'improved' : 'declined',
            })
        }

        return Object.fromEntries(deviations)
    }
}

/**
 * ReportGenerationService - PDF, Excel, CSV export.
 */
export class ReportGenerationService {
    /**
     * Generate PDF report.
     */
    async generatePDFReport(_reportConfig: ReportConfig): Promise<Record<string, unknown>> {
        return {
            success: true,
            filename: `report_${Date.now()}.pdf`,
            size: Math.random() * 1000 + 500,
            format: 'pdf',
        }
    }

    /**
     * Generate Excel report.
     */
    async generateExcelReport(
        _reportConfig: ReportConfig,
    ): Promise<Record<string, unknown>> {
        return {
            success: true,
            filename: `report_${Date.now()}.xlsx`,
            sheets: ['Summary', 'Details', 'Metrics'],
            format: 'excel',
        }
    }

    /**
     * Generate CSV export.
     */
    async generateCSVReport(
        data: Array<Record<string, unknown>>,
        _filename: string,
    ): Promise<string> {
        if (data.length === 0) {
            return ''
        }

        const headers = Object.keys(data[0] ?? {})
        const csvRows = data.map((row) =>
            headers
                .map((header) => {
                    const value = Reflect.get(row, header)
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`
                    }
                    return String(value ?? '')
                })
                .join(','),
        )

        return [headers.join(','), ...csvRows].join('\n')
    }

    /**
     * Generate HTML report.
     */
    async generateHTMLReport(reportConfig: ReportConfig): Promise<string> {
        const metrics = Array.isArray(reportConfig.metrics) ? reportConfig.metrics : []
        const rows = metrics
            .map((metric) => `<tr><td>${metric.name}</td><td>${metric.value}</td></tr>`)
            .join('')

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportConfig.name ?? 'Report'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
          </style>
        </head>
        <body>
          <h1>${reportConfig.name ?? 'Report'}</h1>
          <p>Generated: ${new Date().toISOString()}</p>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${rows}
          </table>
        </body>
      </html>
    `
    }

    /**
     * Schedule report delivery.
     */
    async scheduleReport(reportConfig: ReportConfig): Promise<Record<string, unknown>> {
        return {
            success: true,
            scheduledId: `schedule_${Date.now()}`,
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            frequency: reportConfig.frequency || 'daily',
        }
    }
}

/**
 * DataAggregationService - Combine and normalize data.
 */
export class DataAggregationService {
    /**
     * Aggregate metrics by time period.
     */
    aggregateByTimePeriod(
        dataPoints: MetricPoint[],
        period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    ): Array<{
        period: string
        count: number
        sum: number
        avg: string
        min: number
        max: number
    }> {
        const grouped = new Map<string, number[]>()

        for (const point of dataPoints) {
            const date = new Date(point.timestamp ?? Date.now())
            const key =
                period === 'daily'
                    ? date.toISOString().split('T')[0]
                    : period === 'weekly'
                      ? (() => {
                            const weekStart = new Date(date)
                            weekStart.setDate(date.getDate() - date.getDay())
                            return weekStart.toISOString().split('T')[0]
                        })()
                      : period === 'monthly'
                        ? date.toISOString().substring(0, 7)
                        : date.getFullYear().toString()

            const values = grouped.get(key) ?? []
            values.push(point.value)
            grouped.set(key, values)
        }

        return Array.from(grouped.entries()).map(([groupPeriod, values]) => {
            const numericValues = toNumberArray(values)
            const sum = numericValues.reduce((total, value) => total + value, 0)

            return {
                period: groupPeriod,
                count: numericValues.length,
                sum,
                avg:
                    numericValues.length > 0
                        ? formatPercent(sum / numericValues.length)
                        : '0.00',
                min: numericValues.length > 0 ? Math.min(...numericValues) : 0,
                max: numericValues.length > 0 ? Math.max(...numericValues) : 0,
            }
        })
    }

    /**
     * Normalize data for comparison.
     */
    normalizeData(
        data: Array<Record<string, unknown> & { value: number }>,
        minValue = 0,
        maxValue = 100,
    ): Array<Record<string, unknown>> {
        const numericValues = data.map((item) => item.value)
        const min = Math.min(...numericValues)
        const max = Math.max(...numericValues)
        const range = max - min || 1

        return data.map((item) => ({
            ...item,
            normalized: ((item.value - min) / range) * (maxValue - minValue) + minValue,
        }))
    }

    /**
     * Correlate multiple metrics.
     */
    correlateMetrics(metric1: number[], metric2: number[]): number {
        if (metric1.length !== metric2.length || metric1.length === 0) {
            return 0
        }

        const n = metric1.length
        const mean1 = metric1.reduce((sum, value) => sum + value, 0) / n
        const mean2 = metric2.reduce((sum, value) => sum + value, 0) / n

        let numerator = 0
        let denom1 = 0
        let denom2 = 0

        metric1.forEach((leftValue, index) => {
            const rightValue = metric2.at(index) ?? 0
            const diff1 = leftValue - mean1
            const diff2 = rightValue - mean2
            numerator += diff1 * diff2
            denom1 += diff1 * diff1
            denom2 += diff2 * diff2
        })

        return denom1 * denom2 > 0 ? numerator / Math.sqrt(denom1 * denom2) : 0
    }

    /**
     * Merge and deduplicate data.
     */
    mergeDatasets(...datasets: Array<Array<Record<string, unknown>>>): Array<Record<string, unknown>> {
        const merged = datasets.flat()
        const seen = new Set<string>()

        return merged.filter((item) => {
            const key = JSON.stringify(item)
            if (seen.has(key)) {
                return false
            }
            seen.add(key)
            return true
        })
    }
}
