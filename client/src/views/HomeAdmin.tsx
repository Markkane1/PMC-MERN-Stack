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
    let groupAssignmentDays = 'N/A'
    if (latestGroupAssignment && latestGroupAssignment.updated_at) {
        const assignmentDate = new Date(latestGroupAssignment.updated_at)
        const currentDate = new Date()
        const differenceInTime = currentDate - assignmentDate
        groupAssignmentDays = Math.floor(
            differenceInTime / (1000 * 60 * 60 * 24),
        ) // Convert milliseconds to days
    }

    let duration = 'N/A'
    if (
        obj.submittedapplication?.created_at &&
        obj.submittedapplication?.created_at
    ) {
        const assignmentDate = new Date(obj.submittedapplication?.created_at)
        const currentDate = new Date()
        const differenceInTime = currentDate - assignmentDate
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

const Home = () => {
    const [flattenedData, setFlattenedData] = useState([])
    const [columns, setColumns] = useState([])
    const [userGroups, setUserGroups] = useState([])
    const [statistics, setStatistics] = useState({})
    const [selectedTile, setSelectedTile] = useState(null) // State for the selected tile
    const [tableLoading, setTableLoading] = useState(false)
    const [metaLoading, setMetaLoading] = useState(false)
    const [rowCount, setRowCount] = useState(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    })
    const tableRequestControllerRef = useRef<AbortController | null>(null)
    const latestTableRequestRef = useRef(0)

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
        if (!group) {
            setSelectedTile(null)
            setFlattenedData([])
            setColumns([])
            setRowCount(0)
            return
        }
        const isNewGroup = selectedTile !== group
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
            setSelectedTile(group) // Update selected tile state

            // Logic for LSO.1, LSO.2, LSO.3
            if (group === 'LSO1' || group === 'LSO2' || group === 'LSO3') {
                const moduloValue =
                    group === 'LSO1' ? 1 : group === 'LSO2' ? 2 : 0

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
                                    group !== 'All-Applications' &&
                                    group !== 'Challan-Downloaded'
                                        ? group
                                        : undefined,
                                application_status:
                                    group === 'Challan-Downloaded'
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
        const fetchData = async () => {
            setMetaLoading(true) // Show summary loading state
            // try {
            //     const response = await AxiosBase.get(`/pmc/ping/`, {
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //     });
            // } catch (error) {
            //     navigate('/error');
            // }

            try {
                let groupsResponse = []
                try {
                    if (navigator.onLine) {
                        const response = await AxiosBase.get(
                            `/pmc/user-groups/`,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            },
                        )

                        groupsResponse = response.data || []
                        setUserGroups(groupsResponse.map((group) => group.name))
                    } else {
                        throw new Error(
                            'Application is offline. Cannot fetch data.',
                        )
                    }
                } catch (error) {
                    console.error('Error fetching user groups:', error)
                    // Set user groups to an empty array if an error occurs
                    setUserGroups([])
                }
                console.log('groupsResponse', groupsResponse)

                if (navigator.onLine) {
                    // Fetch statistics for groups
                    const statsResponse = await AxiosBase.get(
                        `/pmc/fetch-statistics-view-groups/`,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        },
                    )
                    setStatistics(statsResponse.data) // Save statistics to state
                } else {
                    throw new Error(
                        'Application is offline. Cannot fetch data.',
                    )
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setMetaLoading(false)
            }
        }

        fetchData()
    }, []) // Run only once on component load

    useEffect(() => {
        console.log('userGroups:', userGroups)
        if (userGroups.length > 0 && !userGroups.includes('Admin')) {
            navigate('/home')
        }
    }, [userGroups, navigate]) // Run only once on component load

    useEffect(() => {
        return () => {
            if (tableRequestControllerRef.current) {
                tableRequestControllerRef.current.abort()
            }
        }
    }, [])

    const handleExport = async () => {
        try {
            const response = await AxiosBase.post(
                '/pmc/export-applicant/',
                { applicant_ids: flattenedData?.map((row) => row.id) },
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
                                selectedTile === group ? '#007BFF' : '#f8f9fa',
                            color: selectedTile === group ? '#fff' : '#000',
                        }} // Add cursor pointer for interactivity
                        onClick={() => handleTileClick(group)} // Call the handler with the group
                    >
                        <h3>{groupTitles[group] || group}</h3>{' '}
                        {/* Use title or fallback to the group key */}
                        <p>{count}</p>
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
                                    group !== 'Applicant' &&
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
                // enableSorting={false} // Optionally disable column sorting
            />
        </div>
    )
}

export default Home
