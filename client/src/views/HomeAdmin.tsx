import React, { useEffect, useRef, useState } from 'react'
import { MaterialReactTable } from 'material-react-table'
import AxiosBase from '../services/axios/AxiosBase'
import { useNavigate } from 'react-router-dom'
import TablerIcon from '@/components/shared/TablerIcon'

// Utility function to flatten nested objects and handle null values
// Utility function to flatten nested objects and handle remarks
const flattenObject = (obj) => {
    // Utility to format numbers as PKR currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(amount)
    }

    // Step 1: Extract the latest time for the matching assigned_group in applicationassignment
    const groupAssignments = obj.applicationassignment.filter(
        (assignment) => assignment.assigned_group === obj.assigned_group,
    )

    // Find the latest time for the matching group
    const latestGroupAssignment = groupAssignments.reduce((latest, current) => {
        const currentTime = new Date(current.updated_at).getTime()
        return currentTime > new Date(latest.updated_at).getTime()
            ? current
            : latest
    }, groupAssignments[0])
    const groupAssignmentTime = latestGroupAssignment
        ? latestGroupAssignment.updated_at?.substring(0, 16)
        : 'N/A'

    // Calculate group assignment days
    let groupAssignmentDays: any = 'N/A'
    if (latestGroupAssignment && latestGroupAssignment.updated_at) {
        const assignmentDate = new Date(latestGroupAssignment.updated_at)
        const currentDate = new Date()
        const differenceInTime = currentDate.getTime() - assignmentDate.getTime()
        groupAssignmentDays = Math.floor(
            differenceInTime / (1000 * 60 * 60 * 24),
        ) // Convert milliseconds to days
    }

    let duration: any = 'N/A'
    if (
        obj.submittedapplication?.created_at &&
        obj.submittedapplication?.created_at
    ) {
        const assignmentDate = new Date(obj.submittedapplication?.created_at)
        const currentDate = new Date()
        const differenceInTime = currentDate.getTime() - assignmentDate.getTime()
        duration = Math.floor(differenceInTime / (1000 * 60 * 60 * 24)) // Convert milliseconds to days
    }

    // Calculate the total fee amount and settled fee amount
    const totalFeeAmount = obj.applicantfees
        ? obj.applicantfees.reduce(
              (sum, fee) => sum + parseFloat(fee.fee_amount || 0),
              0,
          )
        : 0

    const verifiedFeeAmount = obj.applicantfees
        ? obj.applicantfees
              .filter((fee) => fee.is_settled)
              .reduce((sum, fee) => sum + parseFloat(fee.fee_amount || 0), 0)
        : 0

    // Step 3: Return the flattened object with the added group_assignment_days field
    return {
        id: obj.id,
        application_Submission_Time:
            obj.submittedapplication?.created_at?.substring(0, 16) || 'N/A',
        duration: duration,
        tracking_number: obj.tracking_number,
        first_name: obj.first_name,
        last_name: obj.last_name,
        mobile_no: obj.mobile_no,
        application_status: obj.application_status,
        assigned_group: obj.assigned_group,
        group_assignment_time: groupAssignmentTime, // Keep the raw group assignment time
        group_assignment_days: groupAssignmentDays, // Include the calculated days difference
        total_fee_amount: formatCurrency(totalFeeAmount.toFixed(2)), // Include total fee amount
        verified_fee_amount: formatCurrency(verifiedFeeAmount.toFixed(2)), // Include verified fee amount
        created_by_username: obj.created_by_username,
    }
}

const sanitizeData = (data) => {
    return data.map((record) => {
        const flattened = flattenObject(record)
        Object.keys(flattened).forEach((key) => {
            if (flattened[key] === undefined || flattened[key] === null) {
                flattened[key] = 'N/A' // Replace undefined/null values
            }
        })
        return flattened
    })
}

const normalizeListData = (payload) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.results)) return payload.results
    if (Array.isArray(payload?.data)) return payload.data
    return []
}

const GROUP_ALIASES: Record<string, string> = {
    applicant: 'APPLICANT',
    APPLICANT: 'APPLICANT',
    'all applications': 'All-Applications',
    'All Applications': 'All-Applications',
    'All-Applications': 'All-Applications',
    'challan downloaded': 'Challan-Downloaded',
    'Challan Downloaded': 'Challan-Downloaded',
    'Challan-Downloaded': 'Challan-Downloaded',
    lso: 'LSO',
    lso1: 'LSO1',
    lso2: 'LSO2',
    lso3: 'LSO3',
    lsm: 'LSM',
    lsm2: 'LSM2',
    tl: 'TL',
    deo: 'DEO',
    dg: 'DG',
    do: 'DO',
    submitted: 'Submitted',
    pmc: 'PMC',
    'download license': 'Download License',
}

const normalizeGroupKey = (value: unknown): string => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    return GROUP_ALIASES[raw] || GROUP_ALIASES[raw.toLowerCase()] || raw
}

const normalizeStatistics = (statsPayload: Record<string, any>) => {
    const normalized: Record<string, number> = {}
    for (const [rawGroup, rawCount] of Object.entries(statsPayload || {})) {
        const group = normalizeGroupKey(rawGroup)
        if (!group) continue
        normalized[group] = (normalized[group] || 0) + Number(rawCount || 0)
    }
    return normalized
}

const Home = () => {
    const [flattenedData, setFlattenedData] = useState([])
    const [columns, setColumns] = useState([])
    const [userGroups, setUserGroups] = useState([])
    const [statistics, setStatistics] = useState({})
    const [selectedTile, setSelectedTile] = useState(null) // State for the selected tile
    const [hasAutoSelectedTile, setHasAutoSelectedTile] = useState(false)
    const [tableLoading, setTableLoading] = useState(false)
    const [metaLoading, setMetaLoading] = useState(false)
    const [rowCount, setRowCount] = useState(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    })
    const tableRequestControllerRef = useRef<AbortController | null>(null)
    const latestTableRequestRef = useRef(0)
    const selectedTileRef = useRef<string | null>(null)

    // APPLICANT > LSO > LSM > DO > LSM2 > TL > DEO > Download License

    const groupTitles = {
        APPLICANT: 'Applicant',
        LSO: 'LSO',
        LSO1: 'Sana',
        LSO2: 'Qaisar',
        LSO3: 'Ameer',
        LSM: 'LSM',
        DO: 'DO',
        LSM2: 'LSM',
        TL: 'TL',
        DEO: 'DEO',
        DG: 'DG',
        'Download License': 'Download License',
    }

    const handleTileClick = async (group) => {
        const normalizedGroup = normalizeGroupKey(group)
        if (!normalizedGroup) {
            setSelectedTile(null)
            setFlattenedData([])
            setColumns([])
            setRowCount(0)
            return
        }
        const isNewGroup = selectedTileRef.current !== normalizedGroup
        const targetPageIndex = isNewGroup ? 0 : pagination.pageIndex
        if (isNewGroup && pagination.pageIndex !== 0) {
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
        }
        const requestId = latestTableRequestRef.current + 1
        latestTableRequestRef.current = requestId
        if (tableRequestControllerRef.current) {
            tableRequestControllerRef.current.abort()
        }
        const controller = new AbortController()
        tableRequestControllerRef.current = controller
        try {
            setTableLoading(true)
            setSelectedTile(normalizedGroup) // Update selected tile state
            setHasAutoSelectedTile(true)

            // Logic for LSO.1, LSO.2, LSO.3
            if (
                normalizedGroup === 'LSO1' ||
                normalizedGroup === 'LSO2' ||
                normalizedGroup === 'LSO3'
            ) {
                const moduloValue =
                    normalizedGroup === 'LSO1'
                        ? 1
                        : normalizedGroup === 'LSO2'
                          ? 2
                          : 0

                if (navigator.onLine) {
                    const response = await AxiosBase.get(
                        '/pmc/applicant-detail-main-list/',
                        {
                            params: {
                                assigned_group: 'LSO',
                                page: targetPageIndex + 1,
                                page_size: pagination.pageSize,
                                compact: 1,
                            },
                            signal: controller.signal,
                        },
                    )
                    if (latestTableRequestRef.current !== requestId) {
                        return
                    }
                    const responseList = normalizeListData(response.data)
                    const filteredData = responseList.filter(
                        (item) =>
                            item.submittedapplication?.id % 3 === moduloValue,
                    )
                    const totalHeader =
                        response.headers?.['x-total-count'] ||
                        response.headers?.['X-Total-Count']
                    const total = totalHeader
                        ? Number(totalHeader)
                        : Array.isArray(filteredData)
                          ? filteredData.length
                          : 0
                    setRowCount(Number.isFinite(total) ? total : 0)
                    // Update the table data
                    const extracted = extractColumns(filteredData, group)
                    setFlattenedData(extracted.flattenedData)
                    setColumns(extracted.columns)
                } else {
                    throw new Error(
                        'Application is offline. Cannot fetch data.',
                    )
                }
            } else {
                if (navigator.onLine) {
                    // Fetch filtered data from the backend
                    const response = await AxiosBase.get(
                        '/pmc/applicant-detail-main-list/',
                        {
                            params: {
                                assigned_group:
                                    normalizedGroup !== 'All-Applications' &&
                                    normalizedGroup !== 'Challan-Downloaded'
                                        ? normalizedGroup
                                        : undefined,
                                application_status:
                                    normalizedGroup === 'Challan-Downloaded'
                                        ? 'Fee Challan'
                                        : undefined,
                                page: targetPageIndex + 1,
                                page_size: pagination.pageSize,
                                compact: 1,
                            },
                            signal: controller.signal,
                        },
                    )
                    if (latestTableRequestRef.current !== requestId) {
                        return
                    }
                    const filteredData = normalizeListData(response.data)
                    const totalHeader =
                        response.headers?.['x-total-count'] ||
                        response.headers?.['X-Total-Count']
                    const total = totalHeader
                        ? Number(totalHeader)
                        : Array.isArray(filteredData)
                          ? filteredData.length
                          : 0
                    setRowCount(Number.isFinite(total) ? total : 0)

                    // Update the table data
                    const extracted = extractColumns(filteredData, group)
                    setFlattenedData(extracted.flattenedData)
                    setColumns(extracted.columns)
                } else {
                    throw new Error(
                        'Application is offline. Cannot fetch data.',
                    )
                }
            }
        } catch (error) {
            if (
                (error as any)?.code === 'ERR_CANCELED' ||
                (error as any)?.name === 'CanceledError'
            ) {
                return
            }
            console.error('Error fetching filtered data:', error)
            setFlattenedData([])
            setColumns([])
        } finally {
            if (latestTableRequestRef.current === requestId) {
                setTableLoading(false)
            }
        }
    }

    useEffect(() => {
        selectedTileRef.current = selectedTile
    }, [selectedTile])

    useEffect(() => {
        if (selectedTile) {
            handleTileClick(selectedTile)
        }
    }, [pagination.pageIndex, pagination.pageSize])

    // Extract columns and flattened data
    const extractColumns = (data, selectedGroup) => {
        const allowedColumns = [
            'first_name',
            'last_name',
            'cnic',
            'mobile_no',
            'application_status',
            'tracking_number',
            'assigned_group',
            'registration_for',
            'application_Start_Time',
            'application_Submission_Time',
            'duration',
            'remarks',
            'group_assignment_days', // Ensure this is included
            'total_fee_amount',
            'verified_fee_amount',
            'created_by_username',
        ]

        const flattenedData = sanitizeData(Array.isArray(data) ? data : []) // Ensure sanitized data
        if (!flattenedData.length) {
            return { flattenedData: [], columns: [] }
        }
        const firstRecord = flattenedData[0]

        const columns = [
            ...Object.keys(firstRecord)
                .filter((key) => allowedColumns.includes(key)) // Only include allowed columns
                .map((key) => {
                    let customSize = 160 // Default column size
                    if (
                        [
                            'mobile_no',
                            'application_status',
                            'assigned_group',
                            'total_fee_amount',
                        ].includes(key)
                    ) {
                        customSize = 120 // Reduce size for these specific columns
                    } else if (['first_name'].includes(key)) {
                        customSize = 180 // Reduce size for these specific columns
                    }

                    if (key === 'tracking_number') {
                        return {
                            accessorKey: key,
                            header: key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (char) =>
                                    char.toUpperCase(),
                                ),
                            size: customSize,
                            Cell: ({ cell, row }) => {
                                const id = row.original.id
                                const url = `/spuid-review/${id}?group=${selectedGroup}`
                                return (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#0f172a',
                                            textDecoration: 'underline',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {cell.getValue() || '-'}
                                    </a>
                                )
                            },
                        }
                    }

                    return {
                        accessorKey: key,
                        header: key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (char) => char.toUpperCase()),
                        size: customSize,
                    }
                }),
        ]

        return { flattenedData, columns }
    }

    const navigate = useNavigate()
    useEffect(() => {
        const controller = new AbortController()
        const fetchData = async () => {
            setMetaLoading(true) // Show summary loading state
            try {
                const [groupsResult, statsResult] = await Promise.allSettled([
                    AxiosBase.get(`/pmc/user-groups/`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        signal: controller.signal,
                    }),
                    AxiosBase.get(`/pmc/fetch-statistics-view-groups/`, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                        signal: controller.signal,
                    }),
                ])

                if (groupsResult.status === 'fulfilled') {
                    const groupsResponse = groupsResult.value?.data || []
                    setUserGroups(
                        groupsResponse.map((group) =>
                            normalizeGroupKey(group.name),
                        ),
                    )
                } else {
                    console.error('Error fetching user groups:', groupsResult.reason)
                    setUserGroups([])
                }

                if (statsResult.status === 'fulfilled') {
                    setStatistics(normalizeStatistics(statsResult.value?.data || {}))
                } else {
                    console.error('Error fetching statistics:', statsResult.reason)
                }
            } catch (error) {
                if (
                    (error as any)?.code === 'ERR_CANCELED' ||
                    (error as any)?.name === 'CanceledError'
                ) {
                    return
                }
                console.error('Error fetching data:', error)
            } finally {
                setMetaLoading(false)
            }
        }

        fetchData()
        return () => {
            controller.abort()
        }
    }, []) // Run only once on component load

    useEffect(() => {
        console.log('userGroups:', userGroups)
        if (userGroups.length > 0 && !userGroups.includes('Admin')) {
            navigate('/home')
        }
    }, [userGroups, navigate]) // Run only once on component load

    useEffect(() => {
        if (hasAutoSelectedTile || selectedTile) {
            return
        }
        const preferredGroups = [
            'Submitted',
            'All-Applications',
            'PMC',
            'DO',
            'DEO',
            'DG',
            'TL',
            'LSM',
            'LSM2',
            'LSO',
            'LSO1',
            'LSO2',
            'LSO3',
            'Download License',
            'Challan-Downloaded',
            'APPLICANT',
        ]
        const groupsMatch = preferredGroups.find((group) =>
            userGroups.includes(group),
        )
        const statsMatch =
            preferredGroups.find(
                (group) =>
                    Object.prototype.hasOwnProperty.call(statistics, group) &&
                    Number((statistics as Record<string, number>)[group] || 0) >
                        0,
            ) ||
            preferredGroups.find((group) =>
                Object.prototype.hasOwnProperty.call(statistics, group),
            )
        const fallbackGroup = Object.keys(statistics || {}).find(Boolean)
        const matchingGroup =
            groupsMatch || statsMatch || fallbackGroup || 'Submitted'
        if (matchingGroup) {
            setHasAutoSelectedTile(true)
            handleTileClick(matchingGroup)
        }
    }, [userGroups, statistics, hasAutoSelectedTile, selectedTile])

    useEffect(() => {
        return () => {
            if (tableRequestControllerRef.current) {
                tableRequestControllerRef.current.abort()
            }
        }
    }, [])

    const handleExport = async () => {
        try {
            const response = await AxiosBase.get(
                '/pmc/export-applicant/',
                { responseType: 'blob' },
            )
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute(
                'download',
                `Applicant_Details_${new Date().toISOString()}.xlsx`,
            )
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Export failed:', error)
        }
    }
    return (
        <div>
            {/* Display Tiles */}
            <div className="tiles-container">
                {Object.entries(statistics).map(([group, count]) => (
                    <div
                        key={group}
                        className="tile"
                        style={{
                            cursor: 'pointer',
                            backgroundColor:
                                selectedTile === group ? '#1d4ed8' : '#f3f4f6',
                            color: selectedTile === group ? '#fff' : '#0f172a',
                            border:
                                selectedTile === group
                                    ? '1px solid #1d4ed8'
                                    : '1px solid #cbd5e1',
                            transition: 'all 150ms ease-in-out',
                        }} // Add cursor pointer for interactivity
                        onClick={() => handleTileClick(group)} // Call the handler with the group
                    >
                        <h3>{String((groupTitles as any)[group] || group)}</h3>{' '}
                        {/* Use title or fallback to the group key */}
                        <p>{String(count)}</p>
                    </div>
                ))}
            </div>
            {metaLoading && Object.keys(statistics || {}).length === 0 && (
                <p className="text-sm text-gray-600 mb-4">
                    Loading dashboard summary...
                </p>
            )}

            <div className="mb-4">
                <h3>
                    {userGroups &&
                        userGroups
                            .filter(
                                (group) =>
                                    group !== 'Download License' &&
                                    group !== 'APPLICANT' &&
                                    group !== 'LSM2',
                            )
                            .join(' - ')}{' '}
                    Dashboard
                </h3>
            </div>
            <div className="grid md:grid-cols-5 gap-5 items-center mb-4">
                {/* Left-aligned warning message */}
                <h6 className="text-red-500 col-span-3">
                    Records highlighted in red require immediate attention, as
                    they have been returned from a next step.
                </h6>
                <span></span>
                {/* Right-aligned Export button with icon */}
                <button
                    type="button"
                    className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
                    onClick={handleExport}
                >
                    <TablerIcon name="file-spreadsheet" className="mr-2 text-xl" />
                    Export to Excel
                </button>
            </div>

            <MaterialReactTable
                enableColumnResizing
                data={flattenedData.map((row) => ({
                    ...row,
                    assigned_group_title:
                        groupTitles[row.assigned_group] ||
                        row.assigned_group, // Add a title for the assigned group
                }))} // Include updated data
                columns={[...columns]}
                getRowId={(row) => row.id} // Explicitly set the row ID using the `id` field from your original data
                initialState={{
                    showColumnFilters: false,
                }}
                defaultColumn={{
                    maxSize: 200,
                    minSize: 1,
                    size: 50, // default size is usually 180
                }}
                columnResizeMode="onChange" // default
                enableTopToolbar={true} // Disables the top-right controls entirely
                // enableGlobalFilter={false} // Disables the global search/filter box
                enablePagination={true} // Optionally disable pagination controls
                manualPagination
                rowCount={rowCount}
                onPaginationChange={setPagination}
                state={{ pagination, isLoading: tableLoading }}
                muiTableBodyRowProps={({ row }) => ({
                    sx:
                        row.original.is_assigned_back === 'Yes'
                            ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' }
                            : undefined,
                })}
                muiTableBodyCellProps={({ row }) => ({
                    sx: {
                        color: '#111827',
                        '& a, & a:visited, & a:hover, & a:active': {
                            color:
                                row.original.is_assigned_back === 'Yes'
                                    ? '#b91c1c !important'
                                    : '#111827 !important',
                            textDecorationColor:
                                row.original.is_assigned_back === 'Yes'
                                    ? '#b91c1c'
                                    : '#111827',
                        },
                    },
                })}
                // enableSorting={false} // Optionally disable column sorting
            />
        </div>
    )
}

export default Home




