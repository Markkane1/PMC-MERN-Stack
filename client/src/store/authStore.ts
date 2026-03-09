import { create } from 'zustand'
import type { User } from '@/@types/auth'
import { logger } from '@/utils/logger'
import AxiosBase from '../services/axios/AxiosBase'
import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from '@/utils/accessTokenStorage'

type Session = {
    signedIn: boolean
}

type AuthState = {
    session: Session
    user: User
    dashboardRoutes: Record<string, string>
}

type AuthAction = {
    setSessionSignedIn: (payload: boolean) => void
    setUser: (payload: User) => void
    fetchUserGroups: () => Promise<void> // Action to fetch user groups
    fetchDashboardRoutes: () => Promise<void>
}

const initialState: AuthState = {
    session: {
        signedIn: false,
    },
    user: {
        avatar: '',
        userName: '',
        email: '',
        authority: [],
    },
    dashboardRoutes: {},
}

export const useSessionUser = create<AuthState & AuthAction>()(
    (set) => ({
        ...initialState,
        setSessionSignedIn: (payload) =>
            set((state) => ({
                session: {
                    ...state.session,
                    signedIn: payload,
                },
            })),
        setUser: (payload) =>
            set((state) => ({
                user: {
                    ...state.user,
                    ...payload,
                },
            })),
        // Fetch user groups along with district details
        fetchUserGroups: async () => {
            try {
                if (navigator.onLine) {
                    const response = await AxiosBase.get('/pmc/user-groups/', {
                        headers: { 'Content-Type': 'application/json' },
                    })
                    let groups = response.data || []

                    if (!groups.length) {
                        try {
                            const profileResp =
                                await AxiosBase.get('/accounts/profile/')
                            const profileGroups =
                                profileResp.data?.groups || []
                            groups = profileGroups.map((name: string) => ({
                                name,
                            }))
                        } catch (_err) {
                            // ignore profile fallback errors
                        }
                    }

                    const districtInfo =
                        groups.length > 0
                            ? {
                                  district_id: groups[0].district_id,
                                  district_name: groups[0].district_name,
                              }
                            : { district_id: null, district_name: '' }

                    set((state) => ({
                        user: {
                            ...state.user,
                            authority:
                                groups.length > 0
                                    ? groups.map(
                                          (group: { name: string }) =>
                                              group.name,
                                      )
                                    : [],
                            district_id: districtInfo.district_id,
                            district_name: districtInfo.district_name,
                        },
                    }))
                }
            } catch (error) {
                logger.error('Error fetching user groups:', error)
                set((state) => ({
                    user: {
                        ...state.user,
                        authority: [],
                        district_id: null,
                        district_name: '',
                    },
                }))
            }
        },
        fetchDashboardRoutes: async () => {
            try {
                if (navigator.onLine) {
                    const response = await AxiosBase.get(
                        '/accounts/role-dashboard/',
                        {
                            headers: { 'Content-Type': 'application/json' },
                        },
                    )
                    const mappings = response.data?.mappings || {}
                    set((state) => ({
                        dashboardRoutes: {
                            ...state.dashboardRoutes,
                            ...mappings,
                        },
                    }))
                }
            } catch (error) {
                logger.error('Error fetching role dashboard map:', error)
            }
        },
    }),
)

export const useToken = () => {
    const setToken = (token: string) => {
        if (!token) {
            clearAccessToken()
            return
        }

        setAccessToken(token)
    }

    return {
        setToken,
        token: getAccessToken(),
    }
}
