/**
 * Week 3: API Data Fetching Hook
 * Uses SWR for automatic caching, revalidation, and data fetching
 */

import useSWR from 'swr'

export interface Applicant {
  id: string
  name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  [key: string]: any
}

export interface PaginationData {
  page: number
  pageSize: number
  total: number
  pages: number
}

interface FetchResponse<T> {
  data: T[]
  pagination: PaginationData
}

/**
 * Global fetcher function for SWR
 */
export const apifetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('API fetch failed')
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

/**
 * Hook: Fetch applicants with pagination and filtering
 * Caches results, dedupes requests, handles loading/error states
 */
export function useApplicants(page = 1, status?: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    ...(status && { status }),
  })

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Applicant>>(
    `/api/applicants?${params}`,
    apifetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Don't fetch same data twice in 1 min
      focusThrottleInterval: 300000, // Min 5 min between revalidates on focus
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  return {
    applicants: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
    isEmpty: data?.data?.length === 0,
  }
}

/**
 * Hook: Search applicants with debounced query
 */
export function useApplicantSearch(query: string, delay = 500) {
  // Only fetch if query is at least 2 chars long
  const shouldFetch = query.length >= 2

  const { data, error, isLoading } = useSWR<FetchResponse<Applicant>>(
    shouldFetch ? `/api/applicants/search?q=${encodeURIComponent(query)}` : null,
    apifetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    results: data?.data || [],
    isSearching: isLoading,
    searchError: error,
    hasResults: shouldFetch && !isLoading && (data?.data?.length || 0) > 0,
  }
}

/**
 * Hook: Fetch user profile
 */
export function useUserProfile(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/users/${userId}` : null,
    apifetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
    }
  )

  return { user: data, isLoading, error, mutate }
}

/**
 * Hook: Fetch dashboard data (parallel multiple endpoints)
 */
export function useDashboard() {
  const { data: stats, error: statsError } = useSWR(`/api/stats`, apifetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const { data: recentApplicants, error: applicantsError } = useSWR(
    `/api/applicants?pageSize=10`,
    apifetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  )

  return {
    stats,
    recentApplicants: recentApplicants?.data || [],
    isLoading: !stats || !recentApplicants,
    error: statsError || applicantsError,
  }
}

/**
 * Hook: Generic SWR wrapper for any API endpoint
 */
export function useApi<T>(url: string | null, options = {}) {
  const { data, error, isLoading, mutate } = useSWR<T>(url, apifetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    ...options,
  })

  return { data, error, isLoading, mutate }
}
