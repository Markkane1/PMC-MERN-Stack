import { create } from 'zustand'
import AxiosBase from '../../services/axios/AxiosBase'

// ✅ Define Report Type
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
    syncStatus?: 'post' | 'patch' // Tracks offline edits
}

// ✅ Define Zustand Store Type
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

// ✅ Create Zustand Store with TypeScript
const useInspectionStore = create<InspectionStore>()(
    (set, get) => ({
        reports: [],
        loading: false,
        error: null,

            // ✅ Fetch Reports from API (Only if All Data is Synced)
            fetchReports: async () => {
                const hasUnsyncedData = get().reports.some(
                    (report) => report.syncStatus,
                )
                if (hasUnsyncedData) {
                    console.warn('Skipping fetch: Unsynced data exists')
                    // useInspectionStore.getState().syncReports(); // ✅ Now syncs automatically when online
                }

                set({ loading: true, error: null })
                try {
                    if (navigator.onLine) {
                        const response = await AxiosBase.get<
                            InspectionReport[]
                        >('/pmc/inspection-report/')
                        set({ reports: response.data })
                    }
                } catch (error) {
                    console.error('Error fetching reports:', error)
                    set({ error: 'Failed to fetch reports' })
                } finally {
                    set({ loading: false })
                }
            },

            // ✅ Update an Existing Report (Offline Mode)
            updateReport: (id, updatedData) => {
                console.log('its in update state')
                console.log(id)
                console.log(updatedData)
                set((state) => ({
                    reports: state.reports.map((report) =>
                        report.id == id
                            ? { ...report, ...updatedData, syncStatus: 'patch' }
                            : report,
                    ),
                }))
                // useInspectionStore.getState().syncReports(); // ✅ Now syncs
            },

            // ✅ Add a New Report (Offline Mode)
            addNewReport: (newData) => {
                const tempId = `temp-${Date.now()}` // Temporary ID
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

            // ✅ Sync Offline Updates to Server
            // ✅ Sync Offline Updates to Server
            syncReports: async () => {
                console.log('Syncing reports...')
                const { reports } = get()
                const updatedReports = reports.filter(
                    (report) => report.syncStatus,
                )

                if (updatedReports.length === 0) {
                    console.log('No unsynced reports. Fetching fresh data...')
                    get().fetchReports()
                    return
                }

                for (const report of updatedReports) {
                    try {
                        let response
                        let requestData: InspectionReport | FormData = report
                        let headers = { 'Content-Type': 'application/json' }

                        // ✅ Convert to FormData if a file (affidavit) is present
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
                                    formData.append(
                                        key,
                                        JSON.stringify(value || []),
                                    ) // arrays or objects
                                } else if (
                                    [
                                        'fine_recovery_date',
                                        'de_sealed_date',
                                    ].includes(key)
                                ) {
                                    const formattedDate = value
                                        ? String(value).split('T')[0]
                                        : ''
                                    formData.append(key, formattedDate)
                                } else if (
                                    value !== undefined &&
                                    value !== null
                                ) {
                                    formData.append(key, String(value))
                                }
                            })
                            requestData = formData
                            headers = { 'Content-Type': 'multipart/form-data' }
                        }

                        // ✅ Post or Patch based on syncStatus
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
                        } else if (report.syncStatus === 'patch') {
                            if (navigator.onLine) {
                                response = await AxiosBase.patch(
                                    `/pmc/inspection-report/${report.id}/`,
                                    requestData,
                                    { headers },
                                )
                            }
                        }

                        console.log('[✅ Synced]:', response?.status, report.id)

                        // ✅ Remove syncStatus after syncing
                        if (navigator.onLine) {
                            set((state) => ({
                                reports: state.reports.map((r) =>
                                    r.id === report.id
                                        ? { ...r, syncStatus: undefined }
                                        : r,
                                ),
                            }))
                        }
                    } catch (error) {
                        console.error('[❌ Sync Failed]:', report.id, error)
                    }
                }
            },

            // ✅ Reset Store (Optional)
        resetReports: () => set({ reports: [] }),
    }),
)

// ✅ Add Event Listener for Syncing When Online
if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
        console.log('[🔄 Online] Syncing stored reports...')
        useInspectionStore.getState().syncReports() // ✅ Now syncs automatically when online
    })
}

export default useInspectionStore
