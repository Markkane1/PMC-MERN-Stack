import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import AuthContext from './AuthContext'
import { getDashboardRoute } from '@/utils/roleRoute'
import appConfig from '@/configs/app.config'
import { useSessionUser, useToken } from '@/store/authStore'
import { apiSignIn, apiSignOut, apiSignUp } from '@/services/AuthService'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { sanitizeRedirectPath } from '@/utils/safeRedirect'
import { useNavigate } from 'react-router-dom'
import type {
    SignInCredential,
    SignUpCredential,
    AuthResult,
    User,
    Token,
} from '@/@types/auth'
import type { ReactNode } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import AxiosBase from '@/services/axios/AxiosBase'

type AuthProviderProps = { children: ReactNode }

export type IsolatedNavigatorRef = {
    navigate: NavigateFunction
}

const IsolatedNavigator = forwardRef<IsolatedNavigatorRef>((_, ref) => {
    const navigate = useNavigate()

    useImperativeHandle(ref, () => {
        return {
            navigate,
        }
    }, [navigate])

    return <></>
})

function AuthProvider({ children }: AuthProviderProps) {
    const signedIn = useSessionUser((state) => state.session.signedIn)
    const user = useSessionUser((state) => state.user)
    const setUser = useSessionUser((state) => state.setUser)
    const fetchUserGroups = useSessionUser((state) => state.fetchUserGroups)
    const fetchDashboardRoutes = useSessionUser((state) => state.fetchDashboardRoutes)
    const setSessionSignedIn = useSessionUser(
        (state) => state.setSessionSignedIn,
    )
    const { setToken } = useToken()

    const authenticated = Boolean(signedIn)

    const navigatorRef = useRef<IsolatedNavigatorRef>(null)

    const redirect = async () => {
        const search = window.location.search
        const params = new URLSearchParams(search)
        const redirectUrl = sanitizeRedirectPath(params.get(REDIRECT_URL_KEY), '')

        if (redirectUrl) {
            navigatorRef.current?.navigate(redirectUrl)
            return
        }

        const state = useSessionUser.getState()
        if (!state.user.authority || state.user.authority.length === 0) {
            await fetchUserGroups()
        }
        if (!state.dashboardRoutes || !Object.keys(state.dashboardRoutes).length) {
            await fetchDashboardRoutes()
        }

        const updated = useSessionUser.getState()
        const target = getDashboardRoute(
            updated.user.authority || [],
            updated.dashboardRoutes || {},
        )
        navigatorRef.current?.navigate(target)
    }

    const mapProfileToUser = (profile: any): User => ({
        userId: profile?.id || null,
        userName: profile?.username || profile?.userName || '',
        email: profile?.email || '',
        authority: profile?.groups || profile?.authority || [],
        avatar: profile?.avatar || '',
    })

    const hydrateSessionFromProfile = async () => {
        const profileResp = await AxiosBase.get('/accounts/profile/')
        const mappedUser = mapProfileToUser(profileResp.data || {})
        setUser(mappedUser)
        setSessionSignedIn(true)
        return mappedUser
    }

    const handleSignIn = (tokens?: Token, user?: User) => {
        if (tokens?.accessToken) {
            setToken(tokens.accessToken)
        } else {
            setToken('')
        }
        setSessionSignedIn(true)

        if (user) {
            setUser(user)
        }
    }

    const handleSignOut = () => {
        setToken('')
        setUser({ email: '', userName: '' })
        setSessionSignedIn(false)
    }

    useEffect(() => {
        let active = true

        const bootstrapSession = async () => {
            try {
                if (!navigator.onLine) return
                const mappedUser = await hydrateSessionFromProfile()
                if (!active) return

                if (!mappedUser.authority || mappedUser.authority.length === 0) {
                    await fetchUserGroups()
                }
                if (!Object.keys(useSessionUser.getState().dashboardRoutes || {}).length) {
                    await fetchDashboardRoutes()
                }
            } catch (_error) {
                if (!active) return
                handleSignOut()
            }
        }

        bootstrapSession()
        return () => {
            active = false
        }
    }, [])

    const signIn = async (values: SignInCredential): AuthResult => {
        try {
            const resp = await apiSignIn(values)
            if (resp) {
                const accessToken =
                    (resp as { access?: string }).access || resp.token
                handleSignIn(accessToken ? { accessToken } : undefined, resp.user)
                if (!resp.user) {
                    await hydrateSessionFromProfile()
                }
                await redirect()
                return {
                    status: 'success',
                    message: '',
                }
            }
            return {
                status: 'failed',
                message: 'Unable to sign in',
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            const message =
                errors?.response?.data?.error ||
                errors?.response?.data?.message ||
                errors?.message ||
                errors.toString()
            return {
                status: 'failed',
                message,
            }
        }
    }

    const signUp = async (values: SignUpCredential): AuthResult => {
        try {
            const resp = await apiSignUp(values)
            if (resp) {
                const accessToken =
                    (resp as { access?: string }).access || resp.token
                handleSignIn(accessToken ? { accessToken } : undefined, resp.user)
                if (!resp.user) {
                    await hydrateSessionFromProfile()
                }
                await redirect()
                return {
                    status: 'success',
                    message: '',
                }
            }
            return {
                status: 'failed',
                message: 'Unable to sign up',
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            const message =
                errors?.response?.data?.error ||
                errors?.response?.data?.message ||
                errors?.message ||
                errors.toString()
            return {
                status: 'failed',
                message,
            }
        }
    }

    const signOut = async () => {
        try {
            await apiSignOut()
        } finally {
            handleSignOut()
            navigatorRef.current?.navigate(appConfig.unAuthenticatedEntryPath)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                authenticated,
                user,
                signIn,
                signUp,
                signOut,
            }}
        >
            {children}
            <IsolatedNavigator ref={navigatorRef} />
        </AuthContext.Provider>
    )
}

IsolatedNavigator.displayName = 'IsolatedNavigator'

export default AuthProvider
