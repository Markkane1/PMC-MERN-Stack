import React, { useEffect, useMemo, useState } from 'react'
import {
    MaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table'
import AxiosBase from '../services/axios/AxiosBase'

type LicenseRow = Record<string, string | number | boolean> & {
    license_number?: string
    date_of_issue?: string
}

type GroupResponse = {
    name: string
}

const flattenObject = <T extends Record<string, unknown>>(obj: T): T => {
    return obj
}

const sanitizeData = (data: Record<string, unknown>[]): LicenseRow[] => {
    return data.map((record) => {
        const flattened = flattenObject({ ...record }) as Record<string, unknown>
        Object.keys(flattened).forEach((key) => {
            if (flattened[key] === undefined || flattened[key] === null) {
                flattened[key] = 'N/A'
            }
        })
        return flattened as LicenseRow
    })
}

const Home = () => {
    const [flattenedData, setFlattenedData] = useState<LicenseRow[]>([])
    const [userGroups, setUserGroups] = useState<string[]>([])

    const extractColumns = (data: Record<string, unknown>[]) => {
        const processedData = sanitizeData(data)
        return { flattenedData: processedData }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                let groupsResponse: GroupResponse[] = []
                try {
                    const response = await AxiosBase.get(`/pmc/user-groups/`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                    groupsResponse = Array.isArray(response.data)
                        ? (response.data as GroupResponse[])
                        : []
                    setUserGroups(groupsResponse.map((group) => group.name))
                } catch (error) {
                    console.error('Error fetching user groups:', error)
                    setUserGroups([])
                }

                const response = await AxiosBase.get(`/pmc/license-by-user/`, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                })

                const dataApplicants = response.data
                if (Array.isArray(dataApplicants) && dataApplicants.length > 0) {
                    const extracted = extractColumns(
                        dataApplicants as Record<string, unknown>[],
                    )
                    setFlattenedData(extracted.flattenedData)
                } else {
                    setFlattenedData([])
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }

        fetchData()
    }, [])

    const columns = useMemo<MRT_ColumnDef<LicenseRow>[]>(
        () => [
            {
                accessorKey: 'license_number',
                header: 'License Number',
                minSize: 50,
                maxSize: 500,
                size: 150,
                Cell: ({ row }) => {
                    const licenseNumber = String(
                        row.original.license_number ?? 'N/A',
                    )
                    const dateOfIssue = String(row.original.date_of_issue ?? 'N/A')

                    const pdfUrl = `/api/pmc/license-pdf?license_number=${encodeURIComponent(licenseNumber)}&date_of_issue=${encodeURIComponent(dateOfIssue)}`

                    return (
                        <a
                            style={{
                                cursor: 'pointer',
                                color: '#1d4ed8',
                                textDecoration: 'underline',
                            }}
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {licenseNumber}
                        </a>
                    )
                },
            },
            {
                accessorKey: 'date_of_issue',
                header: 'Date Of Issue',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'license_for',
                header: 'License For',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'license_duration',
                header: 'License Duration',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'owner_name',
                header: 'Owner Name',
                minSize: 50,
                maxSize: 500,
                size: 200,
            },
            {
                accessorKey: 'business_name',
                header: 'Business Name',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'district_name',
                header: 'District Name',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'tehsil_name',
                header: 'Tehsil Name',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'city_name',
                header: 'City Name',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'address',
                header: 'Address',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'types_of_plastics',
                header: 'Types Of Plastics',
                minSize: 100,
                maxSize: 500,
                size: 500,
            },
            {
                accessorKey: 'particulars',
                header: 'Particulars',
                minSize: 100,
                maxSize: 100,
                size: 150,
            },
            {
                accessorKey: 'fee_amount',
                header: 'Fee Amount',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
            {
                accessorKey: 'is_active',
                header: 'Is Active',
                minSize: 50,
                maxSize: 500,
                size: 150,
            },
        ],
        [],
    )

    return (
        <div>
            <MaterialReactTable
                enableColumnFilters
                enableSorting
                enableStickyHeader
                columns={columns}
                data={flattenedData}
                muiTableProps={{
                    sx: {
                        border: '1px solid #ddd',
                    },
                }}
                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                        borderBottom: '2px solid #ccc',
                        textAlign: 'center',
                    },
                }}
                muiTableBodyCellProps={{
                    sx: {
                        borderRight: '1px solid #ddd',
                        padding: '10px',
                    },
                }}
                muiTableBodyRowProps={{
                    sx: {
                        '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' },
                        '&:hover': { backgroundColor: '#e0f7fa' },
                    },
                }}
                enableColumnResizing
                enableTopToolbar={userGroups.length > 0}
                enablePagination
            />
        </div>
    )
}

export default Home
