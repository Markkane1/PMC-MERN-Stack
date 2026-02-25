import { useState, useEffect } from 'react'
import GISMapViewer from '@/components/gis/GISMapViewer'
import LocationAnalytics from '@/components/analytics/LocationAnalytics'
import { useGISAnalytics } from '@/api/analytics'

interface LocationMarker {
    id: string
    lat: number
    lon: number
    name: string
    type: 'facility' | 'inspection' | 'violation' | 'complaint'
    intensity?: number
}

export default function GISVisualizationPage() {
    const { locations, loading, fetchLocations } = useGISAnalytics()
    const [selectedMarker, setSelectedMarker] = useState<LocationMarker | null>(null)
    const [selectedDistrict, setSelectedDistrict] = useState<string>('')
    const [filterType, setFilterType] = useState<string>('all')

    useEffect(() => {
        fetchLocations({ district: selectedDistrict || undefined, type: filterType === 'all' ? undefined : filterType })
    }, [selectedDistrict, filterType, fetchLocations])

    const filteredLocations = filterType === 'all' ? locations : locations.filter((l) => l.type === filterType)

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg shadow-lg p-6 text-white">
                <h1 className="text-3xl font-bold mb-2">GIS Visualization</h1>
                <p className="text-blue-100">Monitor facilities, inspections, and violations across districts</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Filter by Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Types</option>
                            <option value="facility">Facilities</option>
                            <option value="inspection">Inspections</option>
                            <option value="violation">Violations</option>
                            <option value="complaint">Complaints</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Selected: {filteredLocations.length} items</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700">
                            {selectedMarker ? `📍 ${selectedMarker.name}` : 'Click on map markers for details'}
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilterType('all')
                                setSelectedDistrict('')
                                setSelectedMarker(null)
                            }}
                            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="mb-4">
                    <h2 className="text-xl font-bold mb-3">Location Map</h2>
                    <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
                        {loading ? (
                            <div className="flex items-center justify-center h-full bg-gray-100">
                                <div className="animate-spin">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                </div>
                            </div>
                        ) : (
                            <GISMapViewer
                                markers={filteredLocations}
                                onMarkerClick={setSelectedMarker}
                                showHeatmap={filterType === 'violation' || filterType === 'complaint'}
                            />
                        )}
                    </div>
                </div>

                {/* Selected Marker Details */}
                {selectedMarker && (
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-bold mb-3">Selected Location Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600">Name</label>
                                <p className="text-lg font-semibold">{selectedMarker.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600">Type</label>
                                <p className="text-lg font-semibold capitalize bg-blue-50 px-3 py-1 rounded w-fit">
                                    {selectedMarker.type}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600">Latitude</label>
                                <p className="text-lg font-semibold">{selectedMarker.lat.toFixed(4)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600">Longitude</label>
                                <p className="text-lg font-semibold">{selectedMarker.lon.toFixed(4)}</p>
                            </div>
                            {selectedMarker.intensity !== undefined && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600">Intensity</label>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-red-600 h-2 rounded-full"
                                            style={{ width: `${selectedMarker.intensity}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{selectedMarker.intensity}%</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Location Analytics */}
            <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-bold mb-4">District Analytics</h2>
                <LocationAnalytics onDistrictSelect={setSelectedDistrict} loading={loading} />
            </div>
        </div>
    )
}
