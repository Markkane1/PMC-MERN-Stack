import { useState, useEffect, useRef, useCallback } from 'react'
import "ol/ol.css"
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { Point } from 'ol/geom'
import { Style, Icon, Circle, Fill, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { useCallback as useCallbackMemo } from 'react'

interface LocationMarker {
    id: string
    lat: number
    lon: number
    name: string
    type: 'facility' | 'inspection' | 'violation' | 'complaint'
    intensity?: number // 0-100 for heatmap
}

interface GISMapViewerProps {
    markers: LocationMarker[]
    center?: [number, number] // [lon, lat]
    zoom?: number
    onMarkerClick?: (marker: LocationMarker) => void
    showHeatmap?: boolean
}

export default function GISMapViewer({
    markers,
    center = [74.3436, 31.5497], // Lahore default
    zoom = 10,
    onMarkerClick,
    showHeatmap = false,
}: GISMapViewerProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<Map | null>(null)
    const vectorSource = useRef<VectorSource>(new VectorSource())

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return

        const vectorLayer = new VectorLayer({
            source: vectorSource.current,
        })

        map.current = new Map({
            target: mapContainer.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat(center),
                zoom,
            }),
        })

        return () => {
            map.current?.setTarget(undefined)
        }
    }, [center, zoom])

    // Update markers
    useEffect(() => {
        vectorSource.current.clear()

        markers.forEach((marker) => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([marker.lon, marker.lat])),
                ...marker,
            })

            const colors: Record<string, string> = {
                facility: '#3B82F6',
                inspection: '#10B981',
                violation: '#EF4444',
                complaint: '#F59E0B',
            }

            const style = new Style({
                image: new Circle({
                    radius: showHeatmap && marker.intensity ? 6 + (marker.intensity / 100) * 4 : 6,
                    fill: new Fill({ color: colors[marker.type] || '#6B7280' }),
                    stroke: new Stroke({ color: '#FFF', width: 2 }),
                }),
            })

            feature.setStyle(style)
            vectorSource.current.addFeature(feature)
        })
    }, [markers, showHeatmap])

    // Handle marker clicks
    useEffect(() => {
        if (!map.current || !onMarkerClick) return

        const handleClick = (evt: any) => {
            const feature = map.current?.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
            if (feature) {
                const markerData = markers.find((m) => m.id === feature.get('id'))
                if (markerData) onMarkerClick(markerData)
            }
        }

        map.current.on('click', handleClick)
        return () => {
            map.current?.un('click', handleClick)
        }
    }, [markers, onMarkerClick])

    return (
        <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
            <div ref={mapContainer} className="w-full h-full" />
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
                <div className="text-xs font-semibold mb-2">Legend</div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs">Facility</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs">Inspection</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-xs">Violation</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span className="text-xs">Complaint</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
