import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import appConfig from '@/configs/app.config'
import { useSessionUser } from '@/store/authStore'
import { getDashboardRoute } from '@/utils/roleRoute'
import { useAuth } from '@/auth'

const { authenticatedEntryPath } = appConfig

const PublicRoute = () => {
    const { authenticated } = useAuth()
    const authority = useSessionUser((state) => state.user.authority)
    const dashboardRoutes = useSessionUser((state) => state.dashboardRoutes)
    const fetchDashboardRoutes = useSessionUser((state) => state.fetchDashboardRoutes)


    useEffect(() => {
        if (!authenticated) return
        if (!dashboardRoutes || !Object.keys(dashboardRoutes).length) {
            fetchDashboardRoutes()
        }
    }, [authenticated, dashboardRoutes, fetchDashboardRoutes])

    if (!authenticated) {
        return <Outlet />
    }

    const target = getDashboardRoute(authority || [], dashboardRoutes || {}) || authenticatedEntryPath
    return <Navigate to={target} />
}

export default PublicRoute
