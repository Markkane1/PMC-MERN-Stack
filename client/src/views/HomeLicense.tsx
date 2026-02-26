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

const normalizeLicenseRow = (
    row: Record<string, unknown>,
): Record<string, unknown> => {
    const normalized = { ...row }

    const aliases: Array<[string, string]> = [
        ['license_number', 'licenseNumber'],
        ['date_of_issue', 'dateOfIssue'],
        ['license_for', 'licenseFor'],
        ['license_duration', 'licenseDuration'],
        ['owner_name', 'ownerName'],
        ['business_name', 'businessName'],
        ['types_of_plastics', 'typesOfPlastics'],
        ['fee_amount', 'feeAmount'],
        ['applicant_id', 'applicantId'],
        ['district_name', 'districtName'],
        ['tehsil_name', 'tehsilName'],
        ['city_name', 'cityName'],
        ['is_active', 'isActive'],
        ['created_at', 'createdAt'],
    ]

    aliases.forEach(([snakeKey, camelKey]) => {
        if (
            (normalized[snakeKey] === undefined ||
                normalized[snakeKey] === null ||
                normalized[snakeKey] === '') &&
            normalized[camelKey] !== undefined &&
            normalized[camelKey] !== null &&
            normalized[camelKey] !== ''
        ) {
            normalized[snakeKey] = normalized[camelKey]
        }
    })

    return normalized
}

const sanitizeData = (data: Record<string, unknown>[]): LicenseRow[] => {
    return data.map((record) => {
        const flattened = flattenObject(
            normalizeLicenseRow({ ...record }),
        ) as Record<string, unknown>
        Object.keys(flattened).forEach((key) => {
            if (
                flattened[key] === undefined ||
                flattened[key] === null ||
                (typeof flattened[key] === 'string' &&
                    flattened[key].trim() === '')
            ) {
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
                    const hasLicenseNumber =
                        licenseNumber !== 'N/A' && licenseNumber.trim() !== ''

                    const pdfUrl = hasLicenseNumber
                        ? `/api/pmc/license-pdf?license_number=${encodeURIComponent(licenseNumber)}${
                              dateOfIssue !== 'N/A' && dateOfIssue.trim() !== ''
                                  ? `&date_of_issue=${encodeURIComponent(dateOfIssue)}`
                                  : ''
                          }`
                        : '#'

                    return (
                        <a
                            style={{
                                cursor: hasLicenseNumber ? 'pointer' : 'default',
                                color: hasLicenseNumber ? '#1d4ed8' : '#111827',
                                textDecoration: hasLicenseNumber
                                    ? 'underline'
                                    : 'none',
                            }}
                            href={pdfUrl}
                            target={hasLicenseNumber ? '_blank' : undefined}
                            rel={
                                hasLicenseNumber
                                    ? 'noopener noreferrer'
                                    : undefined
                            }
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
