import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import './KPIDashboard.css'
import {
    GoogleMap,
    LoadScript,
    Marker,
    InfoWindow,
} from '@react-google-maps/api'
import Select from 'react-select'
import DemoBoxContent from '@/components/docs/DemoBoxContent'
import { MaterialReactTable } from 'material-react-table'
import TablerIcon from '@/components/shared/TablerIcon'
import { number } from 'zod'
import AxiosBase from '../../services/axios/AxiosBase'
import { motion } from 'framer-motion'
import { Divider } from '@mui/material'

// new ApexCharts(document.querySelector("#spark3"), spark3).render();

// Base component for the KPI Dashboard
interface BaseKPIDashboardProps {
    loginUrl?: string
}

interface AllStackholdersChartDataTypes {
    series: {
        name: string
        data: number[]
    }[]
    options: {
        chart: {
            type: string
            height: number
            stacked: boolean
            events: {
                dataPointSelection: (
                    event: any,
                    chartContext: any,
                    config: { seriesIndex: number; dataPointIndex: number },
                ) => void
            }
        }
        plotOptions: {
            bar: {
                horizontal: boolean
                dataLabels: {
                    total: {
                        enabled: boolean
                        offsetX: number
                        style: {
                            fontSize: string
                            fontWeight: number
                        }
                    }
                }
            }
        }
        stroke: {
            width: number
            colors: string[]
        }
        title: {
            text: string
        }
        xaxis: {
            categories: string[]
            labels: {
                formatter: (val: string) => string
            }
        }
        yaxis: {
            title: {
                text: string | undefined
            }
        }
        tooltip: {
            y: {
                formatter: (val: number) => string
            }
        }
        fill: {
            opacity: number
        }
        legend: {
            position: string
            horizontalAlign: string
            offsetX: number
        }
    }
}

export const KPIDashboardBase: React.FC<BaseKPIDashboardProps> = ({
    loginUrl = '/sign-in',
}: any) => {
    const [tilesData, setTilesData] = useState<any[]>([])
    const [dataApplicants, setDataApplicants] = useState<any[]>([])
    const [chartData, setChartData] = useState<any>(null)

    const [filterDistrictCategory, setFilterDistrictCategory] =
        useState<string>('')
    const [filterStackholderSeries, setFilterStackholderSeries] =
        useState<string>('')
    const navigate = useNavigate()
    useEffect(() => {
        const fetchData = async () => {
            try {
                const respons = await AxiosBase.get(
                    '/pmc/mis-applicant-statistics/',
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    },
                )
                console.log(respons.data)

                const { district_data, registration_statistics, grid_data } =
                    respons.data

                // Validate district_data
                if (!district_data || !Array.isArray(district_data)) {
                    throw new Error('Invalid district_data format')
                }

                // Validate registration_statistics
                if (
                    !registration_statistics ||
                    !Array.isArray(registration_statistics)
                ) {
                    throw new Error('Invalid registration_statistics format')
                }

                // Validate grid_data
                if (!grid_data || !Array.isArray(grid_data)) {
                    throw new Error('Invalid grid_data format')
                }

                // Proceed with data processing...

                const iconMap: Record<string, JSX.Element> = {
                    Total: (
                        <TablerIcon
                            name="chart-bar"
                            className="text-white text-3xl"
                        />
                    ),
                    Producer: (
                        <TablerIcon
                            name="building-factory"
                            className="text-white text-3xl"
                        />
                    ),
                    Consumer: (
                        <TablerIcon
                            name="user"
                            className="text-white text-3xl"
                        />
                    ),
                    Recycler: (
                        <TablerIcon
                            name="recycle"
                            className="text-white text-3xl"
                        />
                    ),
                    Collector: (
                        <TablerIcon
                            name="truck"
                            className="text-white text-3xl"
                        />
                    ),
                }

                const colorMap: Record<string, string> = {
                    Producer: 'bg-orange-500',
                    Consumer: 'bg-blue-500',
                    Recycler: 'bg-green-500',
                    Collector: 'bg-yellow-500',
                }

                // Map registration_statistics into tilesData
                const readNumber = (value: any) => {
                    const num = typeof value === 'number' ? value : parseFloat(String(value))
                    return Number.isFinite(num) ? num : 0
                }
                const readStat = (stat: any, key: string) =>
                    stat?.[key] ?? stat?.[key.toLowerCase()] ?? stat?.[key.replace(/_/g, '').toLowerCase()]

                const computeStatsFromGrid = (rows: any[]) => {
                    const result: Record<
                        string,
                        { registration_for: string; Applications: number; DO: number; PMC: number; APPLICANT: number; Licenses: number }
                    > = {}
                    const isExcluded = (status: string) =>
                        ['Created', 'Fee Challan'].includes(status || '')
                    const isInFlightExcluded = (status: string) =>
                        ['Created', 'Completed', 'Rejected', 'Fee Challan'].includes(status || '')
                    rows.forEach((row: any) => {
                        const registrationFor =
                            row.registration_for || row.registrationFor || 'Unknown'
                        const status = row.application_status || row.applicationStatus || ''
                        const group = row.assigned_group || row.assignedGroup || ''
                        if (!result[registrationFor]) {
                            result[registrationFor] = {
                                registration_for: registrationFor,
                                Applications: 0,
                                DO: 0,
                                PMC: 0,
                                APPLICANT: 0,
                                Licenses: 0,
                            }
                        }
                        if (!isExcluded(status)) {
                            result[registrationFor].Applications += 1
                        }
                        if (!isInFlightExcluded(status) && group === 'DO') {
                            result[registrationFor].DO += 1
                        }
                        if (
                            !isInFlightExcluded(status) &&
                            group !== 'DO' &&
                            group !== 'APPLICANT'
                        ) {
                            result[registrationFor].PMC += 1
                        }
                        if (!isInFlightExcluded(status) && group === 'APPLICANT') {
                            result[registrationFor].APPLICANT += 1
                        }
                        if (status === 'Completed') {
                            result[registrationFor].Licenses += 1
                        }
                    })
                    const rowsOut = Object.values(result)
                    const totals = rowsOut.reduce(
                        (acc, item) => {
                            acc.Applications += item.Applications
                            acc.DO += item.DO
                            acc.PMC += item.PMC
                            acc.APPLICANT += item.APPLICANT
                            acc.Licenses += item.Licenses
                            return acc
                        },
                        { Applications: 0, DO: 0, PMC: 0, APPLICANT: 0, Licenses: 0 }
                    )
                    rowsOut.unshift({ registration_for: 'Total', ...totals })
                    return rowsOut
                }

                const normalizedStats = Array.isArray(registration_statistics)
                    ? registration_statistics
                    : []
                const hasNonZero = normalizedStats.some((stat: any) =>
                    ['Applications', 'DO', 'PMC', 'APPLICANT', 'Licenses'].some(
                        (key: any) => readNumber(readStat(stat, key)) > 0
                    )
                )
                const statsSource =
                    hasNonZero || !Array.isArray(grid_data)
                        ? normalizedStats
                        : computeStatsFromGrid(grid_data)

                const dynamicTiles = statsSource.map(
                    (stat: any) => {
                        const title = stat.registration_for || stat.registrationFor || stat.registration || 'Unknown'
                        return {
                            title,
                            data: [
                                {
                                    value: readNumber(readStat(stat, 'Applications')),
                                    label: 'Applications',
                                    title: 'Applications',
                                },
                                {
                                    value: readNumber(readStat(stat, 'DO')),
                                    label: 'DO',
                                    title: 'District Officer (Environment)/Assistant/Deputy Director/District In-Charge',
                                },
                                {
                                    value: readNumber(readStat(stat, 'PMC')),
                                    label: 'PMC',
                                    title: 'Plastic Management Cell',
                                },
                                {
                                    value: readNumber(readStat(stat, 'APPLICANT')),
                                    label: 'Applicant',
                                    title: 'Applicant',
                                },
                                {
                                    value: readNumber(readStat(stat, 'Licenses')),
                                    label: 'Licenses',
                                    title: 'Licenses',
                                },
                            ],
                            color: colorMap[title] || 'bg-gray-500',
                            icon: iconMap[title] || null,
                        }
                    },
                )

                // Process district-wise statistics for ApexCharts
                const districts = Array.from(
                    new Set(
                        district_data
                            .map(
                                (item: any) =>
                                    item.businessprofile__district__district_name?.trim() ||
                                    'Unknown',
                            )
                            .filter((name: any) => name !== 'Unknown'),
                    ),
                )

                const categories = Array.from(
                    new Set(
                        district_data
                            .map((item: any) => item.registration_for || 'Unknown')
                            .filter((category: any) => category !== 'Unknown'),
                    ),
                )

                const series = categories.map((category: any) => {
                    const dataPoints = districts.map((district: any) => {
                        const record = respons.data.district_data.find(
                            (item: any) =>
                                item.registration_for === category &&
                                item.businessprofile__district__district_name ===
                                    district,
                        )
                        return record ? record.count : 0
                    })
                    return { name: category, data: dataPoints }
                })

                setChartData({
                    series: series,
                    options: {
                        chart: {
                            type: 'bar',
                            height: 550,
                            stacked: true,
                            events: {
                                dataPointSelection: (event: any, chartContext: any, config: any) => {
                                    const { seriesIndex, dataPointIndex } =
                                        config
                                    const seriesName = series[seriesIndex].name
                                    const category = districts[dataPointIndex]
                                    showStatistics(seriesName, category)
                                    console.log(
                                        `Series: ${seriesName}, Category: ${category}`,
                                    )
                                },
                            },
                        },
                        title: {
                            text: 'Applications by Category and District',
                        },
                        xaxis: { categories: districts },
                        legend: { position: 'right' },
                        plotOptions: {
                            bar: { horizontal: false, borderRadius: 5 },
                        },
                        colors: ['#F97316', '#3B82F6', '#22C55E', '#EAB308'],
                    },
                })
                setTilesData(dynamicTiles)

                // Grid data
                setDataApplicants(respons.data.grid_data)
            } catch (error: any) {
                const errorDetails = {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                }

                navigate('/error', { state: { error: errorDetails } })
            }
        }

        fetchData()
    }, [])

    const columns = [
        {
            accessorKey: 'tracking_number',
            header: 'Tracking Number',
            size: 150,
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'first_name',
            header: 'First Name',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'last_name',
            header: 'Last Name',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'cnic',
            header: 'CNIC',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'mobile_no',
            header: 'Mobile No',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'application_status',
            header: 'Status',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'assigned_group',
            header: 'Assigned Group',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
        {
            accessorKey: 'registration_for',
            header: 'Category',
            Cell: ({ cell, row }: any) => {
                const id = row.original.id
                const url = `/spuid-review/${id}` // Adjust URL as needed
                return (
                    <a
                        href={url} // Link to the desired URL
                        target="_blank" // Open in a new tab on click
                        rel="noopener noreferrer" // Security best practices for external links
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                    >
                        {cell.getValue() || '-'}
                    </a>
                )
            },
        },
    ]

    function showStatistics(seriesName: string, category: string): void {
        setFilterDistrictCategory(category)
        setFilterStackholderSeries(seriesName)
        console.log('District calculated: ', category)
        console.log('seriesName calculated: ', seriesName)
    }

    const AllStackholdersChartData: AllStackholdersChartDataTypes = {
        series: [],
        options: {
            chart: {
                type: 'bar',
                height: 350,
                stacked: true,
                events: {
                    dataPointSelection: (event: any, chartContext: any, config: any) => {
                        const { seriesIndex, dataPointIndex } = config
                        const seriesName =
                            AllStackholdersChartData.series[seriesIndex].name
                        const category =
                            AllStackholdersChartData.options.xaxis.categories[
                                dataPointIndex
                            ]
                        showStatistics(seriesName, category)
                        console.log(
                            `Series: ${seriesName}, Category: ${category}`,
                        )
                    },
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        total: {
                            enabled: true,
                            offsetX: 0,
                            style: {
                                fontSize: '13px',
                                fontWeight: 900,
                            },
                        },
                    },
                },
            },
            stroke: {
                width: 1,
                colors: ['#fff'],
            },
            title: {
                text: 'All Stack Holders',
            },
            xaxis: {
                categories: [
                    'Producers',
                    'Consumers',
                    'Recyclers',
                    'Collectors',
                ],
                labels: {
                    formatter: (val: any) => `${val}`,
                },
            },
            yaxis: {
                title: {
                    text: undefined,
                },
            },
            tooltip: {
                y: {
                    formatter: (val: any) => `${val}`,
                },
            },
            fill: {
                opacity: 1,
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left',
                offsetX: 40,
            },
        },
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 1 } },
    }

    console.log('chartData', chartData)
    return (
        <motion.div
            className="banner-container2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <header className="banner-header">
                <Link
                    to="/pub"
                    className="transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                    <div className="logo-section">
                        <img
                            src="/img/logo/epa_logo-removebg-preview.png"
                            alt="GOP Logo"
                            className="header-logo"
                        />
                        <img
                            src="/img/logo/epccd.png"
                            alt="EPCCD Logo"
                            className="header-logo"
                        />
                        <img
                            src="/img/logo/gop.png"
                            alt="GOP Logo"
                            className="header-logo"
                        />

                        <span className="header-text">PMIS</span>
                    </div>
                </Link>
                <nav className="banner-nav">
                    <Link
                        to="/sign-in"
                        className="nav-link transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                        Staff Login
                    </Link>
                </nav>
            </header>

            <div className="dashboard-container flex flex-col flex-auto">
                <header className="dashboard-header">
                    <h1>Admin - Data Analytics</h1>
                </header>

                {/* KPI Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {tilesData.map((tile, index) => (
                        <Tile
                            key={index}
                            title={tile.title}
                            data={tile.data}
                            color={tile.color}
                            icon={tile.icon}
                        />
                    ))}
                </div>

                {/* React Apex Chart */}
                <div id="chart" className="mt-5">
                    {chartData && chartData.series && chartData.options && (
                        <ReactApexChart
                            options={chartData.options}
                            series={chartData.series}
                            type="bar"
                            height={350}
                        />
                    )}
                </div>

                {/* Filtered Grid */}
                {filterDistrictCategory !== '' && (
                    <div className="mt-2">
                        <MaterialReactTable
                            columns={columns}
                            data={dataApplicants.filter(
                                (applicant: any) =>
                                    applicant.businessprofile__district__district_name ===
                                        filterDistrictCategory &&
                                    applicant.registration_for ===
                                        filterStackholderSeries,
                            )}
                            initialState={
                                {
                                    // showColumnFilters: true,
                                    // density: 'compact',
                                }
                            }
                            enableColumnResizing={true}
                        />
                    </div>
                )}
            </div>
            <div className="mb-0">
                <Divider textAlign="left"></Divider>
            </div>
            <footer className="footer-container ">
                <span className="footer-text">
                    Copyright &copy; {new Date().getFullYear()}{' '}
                    <span className="font-semibold">PMIS</span> All rights
                    reserved. <br />
                    Plastic Management Cell, Strategic Planning & Implementation
                    Unit, Environmental Protection Agency, and Environment
                    Protection & Climate Change Department, Government of the
                    Punjab.
                </span>
            </footer>
        </motion.div>
    )
}

// KPI Block Component
interface KPIBlockProps {
    label: string
    value: string
    color: string
}

const KPIBlock: React.FC<KPIBlockProps> = ({ label, value, color }: any) => (
    <div className={`kpi-block ${color}`}>
        <h3>{label}</h3>
        <p>{value}</p>
    </div>
)

const KPIDashboard = () => {
    return <KPIDashboardBase />
}

interface TileProps {
    title: string
    data: {
        value: number
        label: string
    }[]
    color: string
    icon: React.ReactNode
}

const Tile: React.FC<TileProps> = ({ title, data, color, icon }: any) => {
    return (
        <div className={`shadow-md rounded p-6 w-full ${color}`}>
            <div className="flex items-center mb-4">
                {icon}
                <h2 className="text-2xl font-bold text-white ml-2">{title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {data.map((item: any, index: any) => (
                    <div key={index} className="text-center" title={item.title}>
                        {' '}
                        {/* Use item.title for the tooltip */}
                        <p className="text-3xl font-bold text-white">
                            {item.value}
                        </p>
                        <p className="text-sm text-white">{item.label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default KPIDashboard // Export only the base component




