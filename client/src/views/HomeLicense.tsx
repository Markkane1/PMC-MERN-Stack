import React, { useEffect, useState } from 'react'
import { MaterialReactTable } from 'material-react-table'
import AxiosBase from '../services/axios/AxiosBase'

// Utility function to flatten nested objects and handle null values
// Utility function to flatten nested objects and handle remarks
const flattenObject = (obj) => {
    return obj
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
    const [userGroups, setUserGroups] = useState([])
    // APPLICANT > LSO > LSM > DO > LSM2 > TL > DEO > Download License

    // Extract columns and flattened data
    // Extract columns and flattened data
    const extractColumns = (data) => {
        const flattenedData = sanitizeData(data)
        return { flattenedData }
    }

    useEffect(() => {
        const fetchData = async () => {
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
                    const response = await AxiosBase.get(`/pmc/user-groups/`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                    groupsResponse = response.data || []
                    setUserGroups(groupsResponse.map((group) => group.name))
                } catch (error) {
                    console.error('Error fetching user groups:', error)
                    // Set user groups to an empty array if an error occurs
                    setUserGroups([])
                }
                console.log('groupsResponse', groupsResponse)
                const response = await AxiosBase.get(`/pmc/license-by-user/`, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                })
                const dataApplicants = response.data
                console.log(dataApplicants)

                if (
                    Array.isArray(dataApplicants) &&
                    dataApplicants.length > 0
                ) {
                    const extracted = extractColumns(
                        dataApplicants,
                        groupsResponse.length > 0 && groupsResponse[0] !== '',
                        groupsResponse.map((group) => group.name)[0],
                    )
                    setFlattenedData(extracted.flattenedData)
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }

        fetchData()
    }, []) // Run only once on component load

    console.log('flattenedData', flattenedData)
    return (
        <div>
            <MaterialReactTable
                enableColumnFilters
                enableSorting
                enableStickyHeader
                columns={[
                    {
                        accessorKey: 'license_number',
                        header: 'License Number',
                        minSize: 50,
                        maxSize: 500,
                        size: 150,
                        // Create a custom cell that shows an <a> link:
                        Cell: ({ row }) => {
                            // row.original contains the full row data
                            const licenseNumber = row.original.license_number
                            const dateOfIssue = row.original.date_of_issue // e.g. "2025-01-10"

                            const pdfUrl = `/api/pmc/license-pdf?license_number=${licenseNumber}&date_of_issue=${dateOfIssue}`

                            return (
                                <a
                                    style={{
                                        cursor: 'pointer',
                                        color: 'blue',
                                        textDecoration: 'underline',
                                    }}
                                    href={pdfUrl}
                                    target="_blank" // open in new tab
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
                ]}
                data={flattenedData} // Include updated data
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
                    },
                }}
                muiTableBodyRowProps={{
                    sx: {
                        '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' }, // Alternate row colors
                        '&:hover': { backgroundColor: '#e0f7fa' }, // Hover effect
                    },
                }}
                enableZebraStripes={true}
                enableColumnResizing={true}
                // columnResizeMode="onChange" // default
                enableTopToolbar={userGroups.length > 0} // Disables the top-right controls entirely
                // enableGlobalFilter={false} // Disables the global search/filter box
                enablePagination={true} // Optionally disable pagination controls
                // enableSorting={false} // Optionally disable column sorting
            />
        </div>
    )
}

export default Home
