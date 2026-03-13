import { useEffect, useMemo, useRef, useState } from 'react'
import 'ol/ol.css'
import { Map as OlMap, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import OSM from 'ol/source/OSM'
import { Fill, Stroke, Style } from 'ol/style'
import CircleStyle from 'ol/style/Circle'
import { fromLonLat } from 'ol/proj'
import { isEmpty as isExtentEmpty } from 'ol/extent'
import AxiosBase from '../../services/axios/AxiosBase'
import { MaterialReactTable } from 'material-react-table'
import TablerIcon from '@/components/shared/TablerIcon'
import { logger } from '@/utils/logger'
import { unwrapListPayload } from '@/utils/apiPayload'

type ClubFeature = {
    type: 'Feature'
    geometry?: {
        type: 'Point'
        coordinates?: [number, number]
    } | null
    properties?: {
        id?: string
        emiscode?: string | number | null
        name?: string | null
        address?: string | null
        head_name?: string | null
        district_id?: string | number | null
        district?: string | null
    }
}

type DistrictSummary = {
    id: string
    label: string
    count: number
}

const DEFAULT_CENTER = [8127130, 3658593]
const DEFAULT_ZOOM = 7

const PUNJAB_BOUNDS = {
    minLon: 68,
    maxLon: 76,
    minLat: 27,
    maxLat: 35,
}

const getDistrictId = (value: unknown): string =>
    value === null || value === undefined ? '' : String(value)

const getClubCoordinates = (
    club: ClubFeature,
): { lon: number; lat: number } | null => {
    const coords = club.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) {
        return null
    }

    const lon = Number(coords[0])
    const lat = Number(coords[1])

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return null
    }

    const isWithinPunjabBounds =
        lon >= PUNJAB_BOUNDS.minLon &&
        lon <= PUNJAB_BOUNDS.maxLon &&
        lat >= PUNJAB_BOUNDS.minLat &&
        lat <= PUNJAB_BOUNDS.maxLat

    return isWithinPunjabBounds ? { lon, lat } : null
}

const CLUB_POINT_STYLE = new Style({
    image: new CircleStyle({
        radius: 4.5,
        fill: new Fill({ color: '#f97316' }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
})

const SELECTED_CLUB_POINT_STYLE = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#dc2626' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
})

const PANEL_HEIGHT = 'clamp(360px, 62vh, 760px)'

const ClubDirectory = () => {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const [mapInstance, setMapInstance] = useState<OlMap | null>(null)
    const [clubLayer, setClubLayer] = useState<VectorLayer | null>(null)
    const [clubs, setClubs] = useState<ClubFeature[]>([])
    const [districtStats, setDistrictStats] = useState<DistrictSummary[]>([])
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showNotice, setShowNotice] = useState(true)

    useEffect(() => {
        if (!mapRef.current) return

        const clubsVectorLayer = new VectorLayer({
            source: new VectorSource(),
        })

        const map = new OlMap({
            target: mapRef.current ?? undefined,
            layers: [
                new TileLayer({
                    source: new OSM(),
                    opacity: 0.45,
                }),
                clubsVectorLayer,
            ],
            view: new View({
                zoom: DEFAULT_ZOOM,
                center: DEFAULT_CENTER,
            }),
        })

        setClubLayer(clubsVectorLayer)
        setMapInstance(map)

        const mapContainer = mapRef.current
        const resizeObserver =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                      map.updateSize()
                  })

        resizeObserver?.observe(mapContainer)
        requestAnimationFrame(() => {
            map.updateSize()
        })

        return () => {
            resizeObserver?.disconnect()
            map.setTarget(undefined)
        }
    }, [])

    useEffect(() => {
        const fetchDistrictStats = async () => {
            setLoading(true)

            try {
                const countsResponse = await AxiosBase.get(
                    '/pmc/idm_districts-club-counts/',
                )
                const countFeatures = Array.isArray(countsResponse.data?.features)
                    ? countsResponse.data.features
                    : []

                const summaries = countFeatures
                    .map((feature: any) => ({
                        id: getDistrictId(feature?.properties?.id),
                        label: String(feature?.properties?.name || '').trim(),
                        count: Number(feature?.properties?.club_count || 0),
                    }))
                    .filter((district) => district.id && district.count > 0)
                    .sort((left, right) => right.count - left.count)

                setDistrictStats(summaries)
            } catch (error) {
                logger.error('Error fetching district club counts:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDistrictStats()
    }, [])

    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const response = await AxiosBase.get('/pmc/idm_clubs_geojson_all/')
                const features = Array.isArray(response.data?.features)
                    ? response.data.features
                    : unwrapListPayload<ClubFeature>(response.data)
                setClubs(features)
            } catch (error) {
                logger.error('Error fetching clubs:', error)
            }
        }

        fetchClubs()
    }, [])

    const filteredClubs = useMemo(() => {
        if (!selectedDistrict) {
            return clubs
        }

        return clubs.filter(
            (club) =>
                getDistrictId(club?.properties?.district_id) ===
                selectedDistrict,
        )
    }, [clubs, selectedDistrict])

    const districtLabelsById = useMemo(
        () =>
            clubs.reduce<Record<string, string>>((labels, club) => {
                const districtId = getDistrictId(club?.properties?.district_id)
                const districtName = String(club?.properties?.district || '').trim()

                if (districtId && districtName && !labels[districtId]) {
                    labels[districtId] = districtName
                }

                return labels
            }, {}),
        [clubs],
    )

    useEffect(() => {
        if (!clubLayer) return

        const source = clubLayer.getSource()
        if (!source) return

        source.clear()

        const visibleClubs = filteredClubs
            .map((club) => {
                const coordinates = getClubCoordinates(club)
                if (!coordinates) return null

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [coordinates.lon, coordinates.lat],
                    },
                    properties: {
                        ...club.properties,
                        featureType: 'club',
                    },
                }
            })
            .filter((feature): feature is NonNullable<typeof feature> =>
                Boolean(feature),
            )

        const features = new GeoJSON().readFeatures(
            {
                type: 'FeatureCollection',
                features: visibleClubs,
            },
            {
                featureProjection: 'EPSG:3857',
            },
        )

        features.forEach((feature) => {
            const clubId = getDistrictId(feature.get('id'))
            feature.setStyle(
                selectedClubId && clubId === selectedClubId
                    ? SELECTED_CLUB_POINT_STYLE
                    : CLUB_POINT_STYLE,
            )
        })

        source.addFeatures(features)

        if (!mapInstance || features.length === 0) {
            return
        }

        const extent = source.getExtent()
        if (!isExtentEmpty(extent)) {
            mapInstance.getView().fit(extent, {
                padding: [40, 40, 40, 40],
                duration: selectedClubId ? 0 : 300,
                maxZoom: selectedDistrict ? 10 : 8,
            })
        }
    }, [clubLayer, filteredClubs, selectedClubId])

    const locateClub = (club: ClubFeature) => {
        if (!mapInstance) return

        const clubId = getDistrictId(club?.properties?.id)
        const districtId = getDistrictId(club?.properties?.district_id)

        setSelectedClubId(clubId || null)
        setSelectedDistrict(districtId || null)

        const coordinates = getClubCoordinates(club)
        if (coordinates) {
            mapInstance.getView().animate({
                center: fromLonLat([coordinates.lon, coordinates.lat]),
                zoom: 12,
                duration: 400,
            })
            return
        }

        setSelectedDistrict(districtId || null)
    }

    useEffect(() => {
        if (!mapInstance) return

        const handleMapClick = (event: any) => {
            const features = mapInstance.getFeaturesAtPixel(event.pixel) || []

            if (features.length === 0) {
                setSelectedDistrict(null)
                setSelectedClubId(null)
                mapInstance.getView().animate({
                    center: DEFAULT_CENTER,
                    zoom: DEFAULT_ZOOM,
                    duration: 300,
                })
                return
            }

            const clickedClub = clubs.find(
                (club) =>
                    getDistrictId(club?.properties?.id) ===
                    getDistrictId(features[0].get('id')),
            )

            if (clickedClub) {
                locateClub(clickedClub)
                return
            }
        }

        mapInstance.on('click', handleMapClick)
        return () => mapInstance.un('click', handleMapClick)
    }, [clubs, mapInstance])

    const topDistricts = useMemo(() => {
        const ranked = [...districtStats].slice(0, 4)
        return [
            {
                id: null,
                label: 'Total Clubs',
                count: clubs.length,
            },
            ...ranked.map((district) => ({
                ...district,
                label: districtLabelsById[district.id] || district.label,
            })),
        ]
    }, [clubs.length, districtLabelsById, districtStats])

    const tileDefs = [
        {
            bgColor: 'bg-slate-700',
            icon: (
                <TablerIcon name="chart-bar" className="text-white text-3xl" />
            ),
        },
        {
            bgColor: 'bg-orange-600',
            icon: <TablerIcon name="building" className="text-white text-3xl" />,
        },
        {
            bgColor: 'bg-blue-600',
            icon: <TablerIcon name="building" className="text-white text-3xl" />,
        },
        {
            bgColor: 'bg-emerald-600',
            icon: <TablerIcon name="map-pin" className="text-white text-3xl" />,
        },
        {
            bgColor: 'bg-violet-600',
            icon: (
                <TablerIcon
                    name="building-bank"
                    className="text-white text-3xl"
                />
            ),
        },
    ]

    const columns = useMemo(
        () => [
            {
                accessorFn: (row: ClubFeature) =>
                    row.properties?.district || 'Unknown',
                id: 'district',
                header: 'District',
                size: 110,
            },
            {
                accessorFn: (row: ClubFeature) => row.properties?.name || 'N/A',
                id: 'name',
                header: 'School Name',
                size: 220,
            },
            {
                accessorFn: (row: ClubFeature) => row.properties?.address || 'N/A',
                id: 'address',
                header: 'Address',
                size: 220,
            },
            {
                accessorFn: (row: ClubFeature) =>
                    row.properties?.head_name || 'N/A',
                id: 'head_name',
                header: 'Head Name',
                size: 160,
            },
            {
                accessorFn: (row: ClubFeature) =>
                    row.properties?.emiscode || 'N/A',
                id: 'emiscode',
                header: 'EMIS Code',
                size: 120,
            },
            {
                id: 'map',
                header: 'Locate',
                size: 72,
                Cell: ({ row }: any) => (
                    <button
                        type="button"
                        title="Locate on map"
                        className="inline-flex items-center justify-center rounded-md p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                        onClick={(event) => {
                            event.stopPropagation()
                            locateClub(row.original)
                        }}
                    >
                        <TablerIcon name="map-pin" />
                    </button>
                ),
            },
        ],
        [],
    )

    return (
        <div className="flex flex-col gap-5 p-4 md:p-6">
            {showNotice && (
                <div className="relative rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                    <p className="pr-8 text-sm font-medium md:text-base">
                        To access Head Contact Number and Club Notification,
                        please sign in with an authenticated account.
                    </p>
                    <button
                        type="button"
                        className="absolute right-3 top-2 text-xl text-amber-700 transition hover:text-amber-900"
                        onClick={() => setShowNotice(false)}
                    >
                        x
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {topDistricts.map((district, index) => {
                    const tile = tileDefs[index]
                    const isActive =
                        district.id === null
                            ? selectedDistrict === null
                            : selectedDistrict === district.id

                    return (
                        <button
                            key={`${district.label}-${district.id ?? 'all'}`}
                            type="button"
                            className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-md transition ${
                                tile.bgColor
                            } ${isActive ? 'ring-2 ring-offset-2 ring-slate-900/25' : 'opacity-85 hover:opacity-100'}`}
                            onClick={() => {
                                setSelectedClubId(null)
                                if (district.id === null) {
                                    setSelectedDistrict(null)
                                    mapInstance?.getView().animate({
                                        center: DEFAULT_CENTER,
                                        zoom: DEFAULT_ZOOM,
                                        duration: 300,
                                    })
                                    return
                                }

                                const nextDistrict =
                                    selectedDistrict === district.id
                                        ? null
                                        : district.id
                                setSelectedDistrict(nextDistrict)
                            }}
                        >
                            <div>{tile.icon}</div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white/80">
                                    {district.label}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    {district.count.toLocaleString('en-US')}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(360px,42vw)_1fr]">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                        </div>
                    )}

                    <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Club Map
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {selectedDistrict
                                        ? `${filteredClubs.length.toLocaleString('en-US')} clubs in the selected district`
                                        : `${clubs.length.toLocaleString('en-US')} clubs across Punjab`}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                onClick={() => {
                                    setSelectedDistrict(null)
                                    setSelectedClubId(null)
                                    mapInstance?.getView().animate({
                                        center: DEFAULT_CENTER,
                                        zoom: DEFAULT_ZOOM,
                                        duration: 300,
                                    })
                                }}
                            >
                                Reset View
                            </button>
                        </div>
                    </div>

                    <div
                        ref={mapRef}
                        className="w-full"
                        style={{ height: PANEL_HEIGHT, minHeight: '360px' }}
                    />
                </div>

                <div
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    style={{ minHeight: '360px' }}
                >
                    <div className="border-b border-slate-200 px-4 py-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                            Club Directory
                        </h3>
                        <p className="text-sm text-slate-500">
                            Tap a row or the locate icon to focus the club on
                            the map.
                        </p>
                    </div>

                    <MaterialReactTable
                        enableColumnResizing
                        enableDensityToggle={false}
                        columns={columns}
                        data={filteredClubs}
                        initialState={{
                            density: 'compact',
                            pagination: { pageIndex: 0, pageSize: 12 },
                        }}
                        muiPaginationProps={{
                            rowsPerPageOptions: [12, 20, 50, 100],
                        }}
                        muiTableBodyRowProps={({ row }: any) => ({
                            onClick: () => locateClub(row.original),
                            style: { cursor: 'pointer' },
                            sx: {
                                '&:nth-of-type(even)': {
                                    backgroundColor: '#f8fafc',
                                },
                                '&:hover': { backgroundColor: '#e0f2fe' },
                            },
                        })}
                        muiTableContainerProps={{
                            sx: {
                                maxHeight: {
                                    xs: 'auto',
                                    xl: PANEL_HEIGHT,
                                },
                                overflowX: 'auto',
                            },
                        }}
                        muiTableProps={{
                            sx: {
                                tableLayout: 'fixed',
                            },
                        }}
                        muiTableHeadCellProps={{
                            sx: {
                                backgroundColor: '#f8fafc',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                borderBottom: '1px solid #cbd5e1',
                                textAlign: 'left',
                            },
                        }}
                        muiTableBodyCellProps={{
                            sx: {
                                borderBottom: '1px solid #e2e8f0',
                                padding: '10px 12px',
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
