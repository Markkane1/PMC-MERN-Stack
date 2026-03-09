import { create } from 'zustand'
import AxiosBase from '../../services/axios/AxiosBase'
import { logger } from '@/utils/logger'

declare global {
    interface Window {
        __pmcInspectionStoreOnlineSyncCleanup__?: () => void
    }
}

// Define Report Type
interface InspectionReport {
    id: string | number
    businessName: string
    businessType: string
    licenseNumber?: string
    violationFound?: string[]
    violationType?: string[]
    actionTaken?: string[]
    plasticBagsConfiscation?: number
    confiscationOtherPlastics?: Record<string, number>
    totalConfiscation?: number
    OtherSingleUseItems?: string[]
    latitude?: number | null
    longitude?: number | null
    district?: string
    inspectionDate: string
    fineAmount?: number
    fineRecoveryStatus?: 'Pending' | 'Partial' | 'Recovered'
    fineRecoveryDate?: string
    recoveryAmount?: number
    deSealedDate?: string
    affidavit?: File | null
    confiscation_receipt?: File | null
    payment_challan?: File | null
    syncStatus?: 'post' | 'patch'
}

// Define Zustand Store Type
interface InspectionStore {
    reports: InspectionReport[]
    loading: boolean
    error: string | null
    fetchReports: () => Promise<void>
    updateReport: (
        id: string | number,
        updatedData: Partial<InspectionReport>,
    ) => void
    addNewReport: (newData: Omit<InspectionReport, 'id'>) => void
    syncReports: () => Promise<void>
    resetReports: () => void
}

// Create Zustand Store with TypeScript
const useInspectionStore = create<InspectionStore>()((set, get) => ({
    reports: [],
    loading: false,
    error: null,

    fetchReports: async () => {
        const hasUnsyncedData = get().reports.some((report) => report.syncStatus)
        if (hasUnsyncedData) {
            logger.warn('Skipping fetch: Unsynced data exists')
        }

        set({ loading: true, error: null })
        try {
            if (navigator.onLine) {
                const response = await AxiosBase.get<InspectionReport[]>(
                    '/pmc/inspection-report/',
                )
                set({ reports: response.data })
            }
        } catch (error) {
            logger.error('Error fetching reports:', error)
            set({ error: 'Failed to fetch reports' })
        } finally {
            set({ loading: false })
        }
    },

    updateReport: (id, updatedData) => {
        logger.debug('its in update state')
        logger.debug(id)
        logger.debug(updatedData)
        set((state) => ({
            reports: state.reports.map((report) =>
                report.id == id
                    ? { ...report, ...updatedData, syncStatus: 'patch' }
                    : report,
            ),
        }))
    },

    addNewReport: (newData) => {
        const tempId = `temp-${Date.now()}`
        set((state) => ({
            reports: [
                ...state.reports,
                {
                    ...newData,
                    id: tempId,
                    syncStatus: 'post',
                } as InspectionReport,
            ],
        }))
    },

    syncReports: async () => {
        logger.debug('Syncing reports...')
        const { reports } = get()
        const updatedReports = reports.filter((report) => report.syncStatus)

        if (updatedReports.length === 0) {
            logger.debug('No unsynced reports. Fetching fresh data...')
            get().fetchReports()
            return
        }

        for (const report of updatedReports) {
            try {
                let response
                let requestData: InspectionReport | FormData = report
                let headers = { 'Content-Type': 'application/json' }

                if (
                    report.affidavit ||
                    report.confiscation_receipt ||
                    report.payment_challan
                ) {
                    const formData = new FormData()

                    Object.entries(report).forEach(([key, value]) => {
                        if (value instanceof File) {
                            formData.append(key, value)
                        } else if (
                            [
                                'violation_found',
                                'violation_type',
                                'action_taken',
                                'confiscation_other_plastics',
                                'other_single_use_items',
                                'fine_recovery_breakup',
                            ].includes(key)
                        ) {
                            formData.append(key, JSON.stringify(value || []))
                        } else if (
                            ['fine_recovery_date', 'de_sealed_date'].includes(key)
                        ) {
                            const formattedDate = value
                                ? String(value).split('T')[0]
                                : ''
                            formData.append(key, formattedDate)
                        } else if (value !== undefined && value !== null) {
                            formData.append(key, String(value))
                        }
                    })

                    requestData = formData
                    headers = { 'Content-Type': 'multipart/form-data' }
                }

                if (
                    report.syncStatus === 'post' ||
                    String(report.id).startsWith('temp-')
                ) {
                    if (navigator.onLine) {
                        response = await AxiosBase.post(
                            '/pmc/inspection-report/',
                            requestData,
                            { headers },
                        )
                        report.id = response.data.id
                    }
                } else if (report.syncStatus === 'patch' && navigator.onLine) {
                    response = await AxiosBase.patch(
                        `/pmc/inspection-report/${report.id}/`,
                        requestData,
                        { headers },
                    )
                }

                logger.debug('[Synced]:', response?.status, report.id)

                if (navigator.onLine) {
                    set((state) => ({
                        reports: state.reports.map((currentReport) =>
                            currentReport.id === report.id
                                ? { ...currentReport, syncStatus: undefined }
                                : currentReport,
                        ),
                    }))
                }
            } catch (error) {
                logger.error('[Sync Failed]:', report.id, error)
            }
        }
    },

    resetReports: () => set({ reports: [] }),
}))

export const bindInspectionStoreOnlineSyncListener = () => {
    if (typeof window === 'undefined') {
        return () => undefined
    }

    if (window.__pmcInspectionStoreOnlineSyncCleanup__) {
        return window.__pmcInspectionStoreOnlineSyncCleanup__
    }

    const handleOnline = () => {
        logger.debug('[Online] Syncing stored reports...')
        void useInspectionStore.getState().syncReports()
    }

    window.addEventListener('online', handleOnline)

    const cleanup = () => {
        window.removeEventListener('online', handleOnline)
        if (window.__pmcInspectionStoreOnlineSyncCleanup__ === cleanup) {
            delete window.__pmcInspectionStoreOnlineSyncCleanup__
        }
    }

    window.__pmcInspectionStoreOnlineSyncCleanup__ = cleanup
    return cleanup
}

export default useInspectionStore
