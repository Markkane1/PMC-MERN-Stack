import Logo from '@/components/template/Logo'
import { useThemeStore } from '@/store/themeStore'
import { useSessionUser } from '@/store/authStore'
import { getDashboardRoute } from '@/utils/roleRoute'
import { Link } from 'react-router-dom'
import type { Mode } from '@/@types/theme'

const HeaderLogo = ({ mode }: { mode?: Mode }) => {
    const defaultMode = useThemeStore((state) => state.mode)
    const authority = useSessionUser((state) => state.user.authority)
    const dashboardRoutes = useSessionUser((state) => state.dashboardRoutes)
    const dashboardPath = getDashboardRoute(authority || [], dashboardRoutes || {})

    return (
        <Link to={dashboardPath}>
            <Logo
                imgClass="max-h-10"
                mode={mode || defaultMode}
                className="hidden lg:block"
            />
        </Link>
    )
}

export default HeaderLogo
