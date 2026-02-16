import React, { useState } from 'react'
import { useExcelExportAPI } from '../../api/pmc'

interface ExportOption {
  id: string
  label: string
  description: string
  icon: string
}

export const ExcelExportPanel: React.FC = () => {
  const {
    exportApplicants,
    exportCompetitions,
    exportPayments,
    exportPSID,
    exportCourierLabels,
    exportSummaryReport,
    loading,
    error,
  } = useExcelExportAPI()

  const [downloadProgress, setDownloadProgress] = useState<Record<string, boolean>>({})
  const [completedExports, setCompletedExports] = useState<Record<string, boolean>>({})

  const exportOptions: ExportOption[] = [
    {
      id: 'applicants',
      label: 'Applicants List',
      description: 'Export all applicants with contact & status information',
      icon: '👥',
    },
    {
      id: 'payments',
      label: 'Payment Records',
      description: 'Financial summary with payment status and amounts',
      icon: '💰',
    },
    {
      id: 'competitions',
      label: 'Competitions',
      description: 'Registered competitions and participation details',
      icon: '🏆',
    },
    {
      id: 'psid',
      label: 'PSID Tracking',
      description: 'PSID allocation and tracking information',
      icon: '🔢',
    },
    {
      id: 'courier',
      label: 'Courier Labels',
      description: 'Shipping labels and courier information',
      icon: '📦',
    },
    {
      id: 'summary',
      label: 'Summary Report',
      description: 'Comprehensive statistics and overview',
      icon: '📊',
    },
  ]

  const handleExport = async (exportType: string) => {
    setDownloadProgress({ ...downloadProgress, [exportType]: true })

    try {
      let success = false
      switch (exportType) {
        case 'applicants':
          success = await exportApplicants()
          break
        case 'payments':
          success = await exportPayments()
          break
        case 'competitions':
          success = await exportCompetitions()
          break
        case 'psid':
          success = await exportPSID()
          break
        case 'courier':
          success = await exportCourierLabels()
          break
        case 'summary':
          success = await exportSummaryReport()
          break
        default:
          return
      }

      // Trigger download
      if (success) {

        setCompletedExports({ ...completedExports, [exportType]: true })
        setTimeout(() => {
          setCompletedExports({ ...completedExports, [exportType]: false })
        }, 3000)
      }
    } catch (err) {
      console.error(`Failed to export ${exportType}:`, err)
    } finally {
      setDownloadProgress({ ...downloadProgress, [exportType]: false })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Export Data</h2>
        <p className="text-gray-600">Download reports and data in Excel format for further analysis</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleExport(option.id)}
            disabled={loading || downloadProgress[option.id]}
            className="relative p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group"
          >
            {/* Completed Checkmark */}
            {completedExports[option.id] && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                ✓
              </div>
            )}

            {/* Content */}
            <div className="flex items-start gap-3">
              <span className="text-3xl">{option.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{option.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
            </div>

            {/* Loading State */}
            {downloadProgress[option.id] && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600">Generating...</span>
              </div>
            )}

            {/* Download Indicator */}
            {!downloadProgress[option.id] && (
              <div className="mt-3 flex items-center gap-1 text-sm text-gray-500 group-hover:text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Export Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• All exports include timestamps and formatted data</li>
          <li>• Payment data includes transaction details and verification status</li>
          <li>• Applicant list exports contact information and registration status</li>
          <li>• Competition data shows participation and achievement details</li>
          <li>• Courier labels include tracking and delivery information</li>
          <li>• Summary report provides statistical overview and trends</li>
        </ul>
      </div>
    </div>
  )
}
