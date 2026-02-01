export const DEFAULT_DASHBOARD_MAP: Record<string, string> = {
    Super: '/home-super',
    Admin: '/home-admin',
    DEO: '/home-deo',
    DG: '/home-deo',
    DO: '/home-do',
    Inspector: '/auth/EPAOperations/ReportViolation',
    'Download License': '/home-license',
    LSO: '/home-super',
    LSM: '/home-super',
    LSM2: '/home-super',
    TL: '/home-super',
    APPLICANT: '/home',
}

export const getDashboardRoute = (
    authority: string[] = [],
    customMap: Record<string, string> = {},
) => {
    const roles = authority || []
    const map = { ...DEFAULT_DASHBOARD_MAP, ...(customMap || {}) }

    for (const role of roles) {
        if (map[role]) return map[role]
    }

    return '/home'
}
