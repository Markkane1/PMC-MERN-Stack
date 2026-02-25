import { useState, useCallback } from 'react'

const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
const normalizedEnvApiUrl = envApiUrl ? envApiUrl.replace(/\/+$/, '') : ''
const API_BASE_URL = normalizedEnvApiUrl
  ? `${normalizedEnvApiUrl}${normalizedEnvApiUrl.endsWith('/api') ? '' : '/api'}`
  : '/api'

type GenerateChalanPayload = {
  amountDue: number
  dueDate: string
  description?: string
  bankName?: string
  bankBranch?: string
  accountNumber?: string
  bankCode?: string
}

// Hook for Payment APIs
export const usePaymentAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPaymentStatus = useCallback(async (applicantId: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/payment-status/${applicantId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to get payment status')
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const generateChalan = useCallback(async (applicantId: number, payload: GenerateChalanPayload) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/chalan-pdf/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, ...payload }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Failed to generate chalan')
      }

      return await response.blob()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyPayment = useCallback(async (applicantId: number, amount: number, referenceNumber: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/payment-status/${applicantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaid: amount, referenceNumber }),
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Verification failed')
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { getPaymentStatus, generateChalan, verifyPayment, loading, error }
}

// Hook for Alerts APIs
export const useAlertAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAlerts = useCallback(async (limit = 20, offset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts?limit=${limit}&offset=${offset}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts/unread-count`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data.unreadCount
    } catch (err) {
      console.error('Failed to get unread count:', err)
      return 0
    }
  }, [])

  const markAsRead = useCallback(async (alertId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts/${alertId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAlert = useCallback(async (alertId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getPreferences = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts/preferences`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      console.error('Failed to get preferences:', err)
      return null
    }
  }, [])

  const updatePreferences = useCallback(async (preferences: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/alerts/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { getAlerts, getUnreadCount, markAsRead, deleteAlert, getPreferences, updatePreferences, loading, error }
}

// Hook for Advanced Field Response APIs
export const useAdvancedFieldAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getFieldDefinitions = useCallback(async (sectionId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = sectionId ? `${API_BASE_URL}/pmc/fields/definitions?section=${sectionId}` : `${API_BASE_URL}/pmc/fields/definitions`
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const validateField = useCallback(async (fieldId: string, value: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/fields/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, value }),
        credentials: 'include',
      })
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Validation error:', err)
      return { isValid: false, errors: ['Validation failed'] }
    }
  }, [])

  const saveResponses = useCallback(async (sectionId: string, responses: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/fields/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, responses }),
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getResponses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/fields/responses`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getCompletionStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/fields/completion-status`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      console.error('Failed to get completion status:', err)
      return null
    }
  }, [])

  const getSections = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/fields/sections`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      return data.data
    } catch (err) {
      console.error('Failed to get sections:', err)
      return []
    }
  }, [])

  return {
    getFieldDefinitions,
    validateField,
    saveResponses,
    getResponses,
    getCompletionStatus,
    getSections,
    loading,
    error,
  }
}

// Hook for Excel Export APIs
export const useExcelExportAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadExport = useCallback(async (endpoint: string, filename: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/pmc/export/${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const exportApplicants = useCallback(
    () => downloadExport('applicants-payment', `applicants-${new Date().toISOString().split('T')[0]}.xlsx`),
    [downloadExport]
  )

  const exportCompetitions = useCallback(
    () => downloadExport('competitions', `competitions-${new Date().toISOString().split('T')[0]}.xlsx`),
    [downloadExport]
  )

  const exportPayments = useCallback(
    () => downloadExport('payments', `payments-${new Date().toISOString().split('T')[0]}.xlsx`),
    [downloadExport]
  )

  const exportPSID = useCallback(() => downloadExport('psid-tracking', `psid-${new Date().toISOString().split('T')[0]}.xlsx`), [
    downloadExport,
  ])

  const exportCourierLabels = useCallback(() => downloadExport('courier-labels', `courier-labels-${new Date().toISOString().split('T')[0]}.xlsx`), [
    downloadExport,
  ])

  const exportSummaryReport = useCallback(() => downloadExport('summary-report', `summary-report-${new Date().toISOString().split('T')[0]}.xlsx`), [
    downloadExport,
  ])

  return {
    exportApplicants,
    exportCompetitions,
    exportPayments,
    exportPSID,
    exportCourierLabels,
    exportSummaryReport,
    loading,
    error,
  }
}
