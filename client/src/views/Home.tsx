import React, { useEffect, useMemo, useState } from 'react'
import { MaterialReactTable } from 'material-react-table'
import AxiosBase from '../services/axios/AxiosBase'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import TablerIcon from '@/components/shared/TablerIcon'
import { getDashboardRoute } from '@/utils/roleRoute'

// Utility function to flatten nested objects and handle null values
// Utility function to flatten nested objects and handle remarks
const flattenObject = (obj) => {
    // Step 1: Collect remarks from the assignment entries
    // that have assigned_group === 'APPLICANT'.
    const applicantAssignments = (
        (obj.assigned_group === 'APPLICANT' && obj.applicationassignment) ||
        []
    ).filter(
        (assignment) =>
            assignment.assigned_group === 'APPLICANT' &&
            assignment.remarks &&
            assignment.remarks !== 'undefined',
    )

    // Map out just the remarks from those assignments
    const applicantRemarks = applicantAssignments.map((a) => a.remarks)

    // If we want to ALSO include the top-level remarks if this applicant’s
    // own assigned_group is 'APPLICANT', do something like:
    // if (obj.assigned_group === 'APPLICANT' && obj.remarks) {
    //   applicantRemarks.push(obj.remarks);
    // }

    // Step 2: Combine them or use 'N/A' if none
    const combinedRemarks =
        applicantRemarks.length > 0 ? applicantRemarks.join('; ') : 'N/A'

    // 3) Return your flattened fields + the combined remarks
    return {
        id: obj.id,
        tracking_number: obj.tracking_number,
        first_name: obj.first_name,
        last_name: obj.last_name,
        CNIC: obj.cnic,
        mobile_no: obj.mobile_no,
        application_status: obj.application_status,
        assigned_group: obj.assigned_group,
        registration_for: obj.registration_for,
        application_Start_Time: obj.created_at?.substring(0, 16) || 'N/A',
        application_Submission_Time:
            obj.submittedapplication?.created_at?.substring(0, 16) || 'N/A',
        // The new "remarks" field we’ll show in the grid:
        remarks: combinedRemarks,
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

const Home = () => {
    const [flattenedData, setFlattenedData] = useState([])
    const [columns, setColumns] = useState([])
    const [selectedRowId, setSelectedRowId] = useState(null)
    const [statistics, setStatistics] = useState({})
    const [loading, setLoading] = useState(false)
    const [rowCount, setRowCount] = useState(0)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    })

    const groupTitles = {
        APPLICANT: 'Applicant',
        LSO: 'LSO',
        LSM: 'LSM',
        DO: 'DO',
        LSM2: 'LSM',
        TL: 'TL',
        DEO: 'DEO',
        'Download License': 'Download License',
    }
    const userAuthority = useSessionUser((state) => state.user.authority)
    const dashboardRoutes = useSessionUser((state) => state.dashboardRoutes)
    const userAuthorityList = useMemo(
        () => userAuthority ?? [],
        [userAuthority],
    )

    const reviewerRoles = useMemo(
        () => ['LSO', 'LSM', 'LSM2', 'TL', 'DO', 'DEO', 'DG', 'Admin', 'Super'],
        [],
    )

    const canReview = useMemo(
        () => userAuthorityList.some((role) => reviewerRoles.includes(role)),
        [userAuthorityList, reviewerRoles],
    )

    const isApplicantOnly =
        userAuthorityList.length === 1 && userAuthorityList[0] === 'APPLICANT'

    const visibleStatistics = useMemo(() => {
        if (!statistics || typeof statistics !== 'object') return {}
        if (isApplicantOnly) {
            const allowed = new Set(['APPLICANT', 'Download License'])
            return Object.fromEntries(
                Object.entries(statistics).filter(([group]) => allowed.has(group)),
            )
        }
        return statistics
    }, [statistics, isApplicantOnly])

    // Extract columns and flattened data
    // Extract columns and flattened data
    const extractColumns = (data, canReview, group) => {
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
            'remarks',
        ]

        const flattenedData = sanitizeData(data)
        const firstRecord = flattenedData[0]

        const columns = [
            // Optional: PDF icon column
            {
                accessorKey: 'download',
                header: '',
                size: 50,
                Cell: ({ row }) => {
                    const assignedGroup = row.original.assigned_group
                    if (assignedGroup === 'Download License') {
                        const downloadUrl = `/api/pmc/license-pdf?license_number=${row.original.tracking_number}`
                        return (
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download License"
                            >
                                <TablerIcon
                                    name="file-type-pdf"
                                    style={{
                                        fontSize: '1.5rem',
                                        color: '#d32f2f',
                                        cursor: 'pointer',
                                    }}
                                />
                            </a>
                        )
                    }
                    return null
                },
            },

            // Dynamic columns with special condition for 'assigned_group'
            ...Object.keys(firstRecord)
                .filter((key) => allowedColumns.includes(key))
                .map((key) => {
                    if (key === 'assigned_group') {
                        return {
                            accessorKey: key,
                            header: 'Assigned Group',
                            Cell: ({ row }) => {
                                const assignedGroup =
                                    row.original.assigned_group
                                const trackingNumber =
                                    row.original.tracking_number

                                if (assignedGroup === 'Download License') {
                                    const downloadUrl = `/api/pmc/license-pdf?license_number=${trackingNumber}`
                                    return (
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                backgroundColor: '#2563eb',
                                                color: 'white',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.9rem',
                                                fontWeight: '500',
                                                display: 'inline-block',
                                                textDecoration: 'none',
                                            }}
                                            title="Download License PDF"
                                        >
                                            {assignedGroup}
                                        </a>
                                    )
                                }

                                return assignedGroup
                            },
                        }
                    }

                    // Default clickable cell for all other keys
                    return {
                        accessorKey: key,
                        header: key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (char) => char.toUpperCase()),
                        Cell: ({ cell, row }) => {
                            const id = row.original.id
                            return (
                                <span
                                    style={{
                                        cursor: 'pointer',
                                        color: '#111827',
                                        textDecoration: 'underline',
                                        textDecorationColor: '#111827',
                                    }}
                                    onClick={() => {
                                        window.location.href = canReview
                                            ? `/spuid-review/${id}?group=${group}`
                                            : `/spuid-signup/${id}`
                                    }}
                                >
                                    {cell.getValue() || '-'}
                                </span>
                            )
                        },
                    }
                }),
        ]

        return { flattenedData, columns }
    }

    const navigate = useNavigate()

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true) // Show the loading spinner

            try {
                if (navigator.onLine) {
                    const response = await AxiosBase.get(
                        `/pmc/applicant-detail/`,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                            params: {
                                page: pagination.pageIndex + 1,
                                page_size: pagination.pageSize,
                            },
                        },
                    )
                    const dataApplicants = response.data
                    const totalHeader =
                        response.headers?.['x-total-count'] ||
                        response.headers?.['X-Total-Count']
                    const total = totalHeader
                        ? Number(totalHeader)
                        : Array.isArray(dataApplicants)
                          ? dataApplicants.length
                          : 0
                    setRowCount(Number.isFinite(total) ? total : 0)

                    if (
                        Array.isArray(dataApplicants) &&
                        dataApplicants.length > 0
                    ) {
                        const extracted = extractColumns(
                            dataApplicants,
                            canReview,
                            userAuthorityList[0],
                        )
                        setFlattenedData(extracted.flattenedData)
                        setColumns(extracted.columns)

                        // Debugging: Log the last row
                        const lastRow =
                            extracted.flattenedData[
                                extracted.flattenedData.length - 1
                            ]
                        if (lastRow && lastRow.id) {
                            setSelectedRowId(lastRow.id) // Set last row ID as selected
                        }
                    }
                    } else {
                        setFlattenedData([])
                        setColumns([])
                        throw new Error(
                            'Application is offline. Cannot fetch applicant details.',
                        )
                    }

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
                        'Application is offline. Cannot fetch statistics.',
                    )
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false) // Hide the loading spinner
            }
        }

        fetchData()
    }, [userAuthorityList, pagination.pageIndex, pagination.pageSize])

    useEffect(() => {
        if (!userAuthorityList || userAuthorityList.length === 0) return
        const target = getDashboardRoute(userAuthorityList, dashboardRoutes || {})
        if (target && target !== '/home') {
            navigate(target)
        }
    }, [userAuthorityList, navigate])

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
                {Object.entries(visibleStatistics).map(([group, count]) => (
                    <div key={group} className="tile">
                        <h3>{String((groupTitles as any)[group] || group)}</h3>{' '}
                        {/* Use title or fallback to the group key */}
                        <p>{String(count)}</p>
                    </div>
                ))}
            </div>
            {/*             
            <Steps current={step} className="mb-5">
                {groups.map((group, index) => (
                    <Steps.Item
                        key={index}
                        title={
                            <div
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleStepClick(index)} // Handle step click
                            >
                                {groupTitles[group] || group} 
                            </div>
                        }
                    />
                ))}
            </Steps> 
*/}
            {userAuthorityList.length > 0 && (
                <div className="mb-4">
                    <h3>
                        {userAuthorityList
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
            )}

            {loading ? (
                // Show a spinner or loading message
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent border-solid rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg font-medium text-gray-600">
                        Loading data, please wait...
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-5 gap-5 items-center mb-4">
                        {/* Left-aligned warning message */}
                        <span className="text-red-500 col-span-3"></span>
                        <span></span>
                        {/* Right-aligned Export button with icon */}
                        <button
                            type="button"
                            className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
                            onClick={handleExport}
                        >
                            <TablerIcon
                                name="file-spreadsheet"
                                className="mr-2 text-xl"
                            />
                            Export to Excel
                        </button>
                    </div>

                    <MaterialReactTable
                        key={selectedRowId} // Force re-render when selectedRowId changes
                        enableColumnFilters
                        enableSorting
                        enableStickyHeader
                        data={flattenedData.map((row) => ({
                            ...row,
                            assigned_group_title:
                                groupTitles[row.assigned_group] ||
                                row.assigned_group, // Add a title for the assigned group
                        }))} // Include updated data
                        columns={[
                            // {
                            //     accessorKey: 'selected',
                            //     header: 'Select',
                            //     size: 50,
                            //     Cell: ({ row }) => (
                            //         <input
                            //             type="radio"
                            //             name="rowSelect"
                            //             onChange={() => {
                            //                 setSelectedRowId(row.original.id);
                            //                 const groupIndex = groups.indexOf(row.original.assigned_group);
                            //                 if (groupIndex !== -1) {
                            //                     setStep(groupIndex); // Update the Steps component
                            //                 }
                            //             }}
                            //             checked={String(selectedRowId) === String(row.original.id)} // Ensure proper comparison
                            //         />
                            //     ),
                            // },
                            ...columns,
                        ]}
                        muiTableProps={{
                            sx: {
                                border: '1px solid #ddd', // Table border
                            },
                        }}
                        muiTableHeadCellProps={{
                            sx: {
                                backgroundColor: '#f5f5f5', // Header background
                                fontWeight: 'bold',
                                borderBottom: '2px solid #ccc',
                                textAlign: 'center',
                            },
                        }}
                        muiTableBodyCellProps={{
                            sx: {
                                borderRight: '1px solid #ddd', // Column border
                                padding: '10px',
                                color: '#111827',
                                '& a, & a:visited, & a:hover, & a:active': {
                                    color: '#111827 !important',
                                    textDecorationColor: '#111827',
                                },
                            },
                        }}
                        muiTableBodyRowProps={{
                            sx: {
                                '&:nth-of-type(even)': {
                                    backgroundColor: '#f9f9f9',
                                }, // Alternate row colors
                                '&:hover': { backgroundColor: '#e0f7fa' }, // Hover effect
                            },
                        }}
                        enableColumnResizing={true}
                        // columnResizeMode="onChange" // default
                        enableTopToolbar={true} // Disables the top-right controls entirely
                        // enableGlobalFilter={false} // Disables the global search/filter box
                        enablePagination={true} // Optionally disable pagination controls
                        manualPagination
                        rowCount={rowCount}
                        onPaginationChange={setPagination}
                        state={{
                            pagination,
                            isLoading: loading,
                        }}
                        // enableSorting={false} // Optionally disable column sorting
                    />
                </>
            )}
        </div>
    )
}

export default Home




