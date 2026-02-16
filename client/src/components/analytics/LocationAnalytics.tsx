import { useState, useEffect } from 'react'
import { FaMapMarkerAlt, FaChartBar, FaExclamationTriangle, FaClock } from 'react-icons/fa'

interface LocationStats {
    district: string
    facilities: number
    inspections: number
    violations: number
    complaints: number
    avgResponseTime: number
}

interface LocationAnalyticsProps {
    stats?: LocationStats[]
    loading?: boolean
    onDistrictSelect?: (district: string) => void
}

export default function LocationAnalytics({
    stats = [
        {
            district: 'Lahore',
            facilities: 245,
            inspections: 892,
            violations: 34,
            complaints: 12,
            avgResponseTime: 4.2,
        },
        {
            district: 'Karachi',
            facilities: 198,
            inspections: 756,
            violations: 28,
            complaints: 8,
            avgResponseTime: 5.1,
        },
        {
            district: 'Islamabad',
            facilities: 87,
            inspections: 234,
            violations: 5,
            complaints: 2,
            avgResponseTime: 3.5,
        },
        {
            district: 'Multan',
            facilities: 156,
            inspections: 421,
            violations: 19,
            complaints: 6,
            avgResponseTime: 6.3,
        },
    ],
    loading = false,
    onDistrictSelect,
}: LocationAnalyticsProps) {
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

    const handleDistrictClick = (district: string) => {
        setSelectedDistrict(district)
        onDistrictSelect?.(district)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.district}
                        onClick={() => handleDistrictClick(stat.district)}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            selectedDistrict === stat.district
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-primary/30'
                        }`}
                    >
                        <div className="text-lg font-bold mb-3">{stat.district}</div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaMapMarkerAlt className="text-blue-500" />
                                    <span className="text-sm">Facilities</span>
                                </div>
                                <span className="font-semibold text-blue-600">{stat.facilities}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaChartBar className="text-green-500" />
                                    <span className="text-sm">Inspections</span>
                                </div>
                                <span className="font-semibold text-green-600">{stat.inspections}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaExclamationTriangle className="text-red-500" />
                                    <span className="text-sm">Violations</span>
                                </div>
                                <span className="font-semibold text-red-600">{stat.violations}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaClock className="text-amber-500" />
                                    <span className="text-sm">Avg Response</span>
                                </div>
                                <span className="font-semibold text-amber-600">{stat.avgResponseTime}h</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
