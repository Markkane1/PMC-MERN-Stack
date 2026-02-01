import React, { useEffect, useRef, useState, useMemo } from 'react'
import 'ol/ol.css'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import OSM from 'ol/source/OSM'
import { Fill, Stroke, Style, Text } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import AxiosBase from '../../services/axios/AxiosBase'
import { MaterialReactTable } from 'material-react-table'
import TablerIcon from '@/components/shared/TablerIcon'

const ClubDirectory = () => {
    const mapRef = useRef(null)
    const [mapInstance, setMapInstance] = useState(null)
    const [districtLayer, setDistrictLayer] = useState(null)
        const [clubs, setClubs] = useState([])
    const [selectedDistrict, setSelectedDistrict] = useState(null)
    const [loading, setLoading] = useState(false)
    const [districtStats, setDistrictStats] = useState([])
    const [showNotice, setShowNotice] = useState(true)
    
    // Initialize Map
    useEffect(() => {
        const map = new Map({
            target: mapRef.current,
            layers: [new TileLayer({ source: new OSM() })],
            view: new View({ zoom: 7, center: [8127130, 3658593] }),
        })

        const districtVecLayer = new VectorLayer({ source: new VectorSource() })

        map.addLayer(districtVecLayer)

        setDistrictLayer(districtVecLayer)
        setMapInstance(map)

        return () => map.setTarget(null)
    }, [])

    // Fetch and display districts once
    useEffect(() => {
        if (!districtLayer || !mapInstance) return

        const fetchDistricts = async () => {
            setLoading(true)
            try {
                const res = await AxiosBase.get(
                    '/pmc/idm_districts-club-counts/',
                )
                setDistrictStats(res.data.features)
                const vectorSource = new VectorSource({
                    features: new GeoJSON().readFeatures(res.data, {
                        featureProjection: 'EPSG:3857',
                    }),
                })
                districtLayer.setSource(vectorSource)
                mapInstance.getView().fit(vectorSource.getExtent(), {
                    padding: [50, 50, 50, 50],
                    duration: 500,
                })
            } catch (error) {
                console.error('Error fetching districts:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDistricts()
    }, [districtLayer, mapInstance])

    // District styling with selection
    useEffect(() => {
        if (!districtLayer) return

        districtLayer.setStyle((feature) => {
            const isSelected = feature.get('id') === selectedDistrict
            if (feature.get('club_count') === 0) return
            return new Style({
                stroke: new Stroke({
                    color: '#1d4ed8',
                    width: isSelected ? 3 : 2,
                }),
                fill: new Fill({
                    color: 'rgba(59,130,246,0.12)'
                }),
                text: new Text({
                    text: `${feature.get('name')} (${feature.get('club_count')})`,
                    font: 'bold 12px sans-serif',
                    fill: new Fill({ color: '#000' }),
                    stroke: new Stroke({ color: '#fff', width: 3 }),
                    overflow: true, // <<< This allows text outside of geometry
                    // placement: 'point', // <<< Ensures it's placed at centroid, not along line
                }),
            })
        })
    }, [districtLayer, selectedDistrict])

    // Fetch clubs once
    useEffect(() => {
        const fetchClubs = async () => {
            const res = await AxiosBase.get('/pmc/idm_clubs_geojson_all/')
            setClubs(res.data.features)
        }
        fetchClubs()
    }, [])

    // Handle map click for district selection
    useEffect(() => {
        if (!mapInstance || !districtLayer) return

        const handleMapClick = (event) => {
            const features = mapInstance.getFeaturesAtPixel(event.pixel)
            if (features.length > 0) {
                const selectedFeature = features[0]
                const districtId = selectedFeature.get('id')
                if (selectedDistrict === districtId) {
                    setSelectedDistrict(null)
                    mapInstance.getView().setCenter([8127130, 3658593])
                } else {
                    setSelectedDistrict(districtId)
                }
            } else {
                setSelectedDistrict(null)
                mapInstance.getView().setCenter([8127130, 3658593])
            }
        }

        mapInstance.on('click', handleMapClick)
        return () => mapInstance.un('click', handleMapClick)
    }, [mapInstance, districtLayer, selectedDistrict])

    const filteredClubs = useMemo(
        () =>
            selectedDistrict !== null && selectedDistrict !== undefined
                ? clubs.filter(
                      (c) =>
                          String(c?.properties?.district_id) ===
                          String(selectedDistrict),
                  )
                : clubs,
        [selectedDistrict, clubs],
    )

    const topDistricts = useMemo(() => {
        const sortedDistricts = [...districtStats]
            .sort((a, b) => b.properties.club_count - a.properties.club_count)
            .slice(0, 4)

        return [
            {
                properties: {
                    name: 'Total Clubs',
                    club_count: clubs.length,
                    id: null,
                },
            },
            ...sortedDistricts,
        ]
    }, [districtStats, clubs])

    const handleRowClick = (row) => {
        const coords = row?.original?.geometry?.coordinates
        if (!mapInstance || !coords || coords.length < 2) return
        const lon = Number(coords[0])
        const lat = Number(coords[1])
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return
        const view = mapInstance.getView()
        view.animate({ center: fromLonLat([lon, lat]), zoom: 11, duration: 500 })
    }

    const columns = useMemo(
        () => [
            {
                accessorKey: 'properties.district',
                header: 'District',
                size: 120,
            },
            {
                accessorKey: 'properties.name',
                header: 'School Name',
                size: 180,
            },
            { accessorKey: 'properties.address', header: 'Address', size: 180 },
            {
                accessorKey: 'properties.head_name',
                header: 'Head Name',
                size: 160,
            },
            {
                header: 'Map',
                size: 50,
                Cell: ({ row }) => {
                    const { name, district } = row.original.properties
                    const mapLink = getGoogleMapsLink(name, district)
                    return (
                        <a
                            href={mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Maps"
                            className="text-blue-500 hover:text-blue-700"
                        >
                            <TablerIcon name="map-pin" size={20} />
                        </a>
                    )
                },
            },
        ],
        [],
    )

    const tileDefs = [
        {
            bgColor: 'bg-gray-500',
            icon: (
                <TablerIcon name="chart-bar" className="text-white text-3xl" />
            ),
        },
        {
            bgColor: 'bg-orange-500',
            icon: (
                <TablerIcon name="building" className="text-white text-3xl" />
            ),
        },
        {
            bgColor: 'bg-blue-500',
            icon: (
                <TablerIcon name="building" className="text-white text-3xl" />
            ),
        },
        {
            bgColor: 'bg-yellow-500',
            icon: <TablerIcon name="map-pin" className="text-white text-3xl" />,
        },
        {
            bgColor: 'bg-green-500',
            icon: (
                <TablerIcon
                    name="building-bank"
                    className="text-white text-3xl"
                />
            ),
        },
    ]
    // console.log('topDistricts',topDistricts)
    const getGoogleMapsLink = (schoolName, district) => {
        const formatText = (text) =>
            text
                ?.replace(/\d+/g, '') // Remove numbers
                .replace(/\s+/g, '+') || '' // Replace spaces with +

        return `https://www.google.com/maps/search/?api=1&query=${formatText(schoolName)}+${formatText(district)}`
    }

    return (
        <div className="flex flex-col p-4 gap-4">
            {showNotice && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded relative">
                    <p className="font-medium">
                        To access Head Contact Number and Club Notification,
                        please sign in with an authenticated account.
                    </p>
                    <button
                        className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
                        onClick={() => setShowNotice(false)}
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {topDistricts.map((dist, idx) => (
                    <div
                        key={idx}
                        className={`shadow-md rounded p-6 w-full cursor-pointer transition 
                ${selectedDistrict === null || selectedDistrict === dist.properties.id ? 'opacity-100' : 'opacity-50'}
                ${tileDefs[idx].bgColor}
                `}
                        onClick={() => setSelectedDistrict(dist.properties.id)}
                    >
                        <div className="flex items-center space-x-2">
                            {tileDefs[idx].icon}
                            <h2 className="text-2xl font-bold text-white">
                                {dist.properties.name}
                            </h2>
                            <p className="text-2xl font-bold text-white">
                                {dist.properties.club_count}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col p-4 gap-4 md:flex-row md:flex-nowrap items-stretch">
                <div className="relative w-full md:w-[520px] shrink-0 h-[850px]">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                    <div
                        ref={mapRef}
                        style={{ height: '100%', width: '100%' }}
                    />
                </div>

                <div className="min-w-0 w-full h-[850px] overflow-auto">
                    <MaterialReactTable
                        enableZebraStripes
                        enableColumnResizing
                        columns={columns}
                        data={filteredClubs}
                        initialState={{ pagination: { pageSize: 15 } }}
                        muiTableBodyRowProps={({ row }) => ({
                            onClick: () => handleRowClick(row),
                            style: { cursor: 'pointer' }, // Make rows visually clickable
                            sx: {
                                '&:nth-of-type(even)': {
                                    backgroundColor: '#f9f9f9',
                                }, // Alternate row colors
                                '&:hover': { backgroundColor: '#e0f7fa' }, // Hover effect
                            },
                        })}
                        muiTableContainerProps={{
                            sx: {
                                maxHeight: '100%',
                                overflowX: 'auto',
                            },
                        }}
                        muiTableProps={{
                            sx: {
                                border: '1px solid #ddd',
                                tableLayout: 'auto', // Table border
                            },
                        }}
                        muiTableHeadCellProps={{
                            sx: {
                                backgroundColor: '#f5f5f5', // Header background
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                whiteSpace: 'normal',
                                borderBottom: '2px solid #ccc',
                                textAlign: 'center',
                            },
                        }}
                        muiTableBodyCellProps={{
                            sx: {
                                borderRight: '1px solid #ddd', // Column border
                                padding: '8px',
                                fontSize: '0.85rem',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default ClubDirectory
