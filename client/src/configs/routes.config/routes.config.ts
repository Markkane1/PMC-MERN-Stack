import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes: Routes = [
    {
        key: 'home',
        path: '/home',
        component: lazy(() => import('@/views/Home')),
        authority: [],
    },
    {
        key: 'home.super',
        path: '/home-super',
        component: lazy(() => import('@/views/HomeSuper')),
        authority: [],
    },
    {
        key: 'home.admin',
        path: '/home-admin',
        component: lazy(() => import('@/views/HomeAdmin')),
        authority: [],
    },
    {
        key: 'home.deo',
        path: '/home-deo',
        component: lazy(() => import('@/views/HomeDEO')),
        authority: [],
    },
    {
        key: 'home.do',
        path: '/home-do',
        component: lazy(() => import('@/views/HomeDO')),
        authority: [],
    },
    {
        key: 'home.license',
        path: '/home-license',
        component: lazy(() => import('@/views/HomeLicense')),
        authority: [],
    },
    {
        key: 'track.application',
        path: '/track-application',
        component: lazy(() => import('@/views/TrackApplication')),
        authority: [],
    },
    {
        key: 'spuid.signup',
        path: '/spuid-signup',
        component: lazy(
            () => import('@/views/supid/CreateApplication/CustomerCreate'),
        ),
        authority: [],
    },
    {
        key: 'spuid.signup.edit',
        path: '/spuid-signup/:id',
        component: lazy(
            () => import('@/views/supid/CreateApplication/CustomerCreate'),
        ),
        authority: [],
    },
    {
        key: 'spuid.review',
        path: '/spuid-review/:id',
        component: lazy(
            () =>
                import(
                    '@/views/supid/ReviewApplication/ReviewApplicationMain'
                ),
        ),
        authority: [],
    },

    // Analytics
    {
        key: 'analytics.summary',
        path: '/analytics1',
        component: lazy(() => import('@/views/demo/MISAnalyticsView')),
        authority: [],
    },
    {
        key: 'analytics.downloads.2',
        path: '/collapse-menu-item-view-2',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView2')),
        authority: [],
    },
    {
        key: 'analytics.downloads.3',
        path: '/collapse-menu-item-view-3',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView3')),
        authority: [],
    },

    // MIS (protected)
    {
        key: 'auth.mis.directory',
        path: '/auth/mis/directory',
        component: lazy(() => import('@/views/demo/MISDirectoryPage')),
        authority: [],
    },
    {
        key: 'auth.mis.recycling-efficiency',
        path: '/auth/mis/recycling-efficiency',
        component: lazy(
            () => import('@/views/demo/MISRecyclingEfficiencyPage'),
        ),
        authority: [],
    },
    {
        key: 'auth.mis.clubs-directory',
        path: '/auth/mis/clubs/directory',
        component: lazy(() => import('@/views/demo/ClubDirectoryPage')),
        authority: [],
    },

    // EPA Operations
    {
        key: 'auth.epa.report-violation',
        path: '/auth/EPAOperations/ReportViolation',
        component: lazy(() => import('@/views/supid/EPA/InspectionCreate')),
        authority: [],
    },
    {
        key: 'auth.epa.all-inspections',
        path: '/auth/EPAOperations/AllInspections',
        component: lazy(
            () => import('@/views/supid/EPA/InspectionReportsList'),
        ),
        authority: [],
    },
    {
        key: 'auth.epa.dashboard',
        path: '/auth/EPAOperation/Dashboard',
        component: lazy(
            () => import('@/views/supid/EPA/InspectionDashboard'),
        ),
        authority: [],
    },
    {
        key: 'auth.epa.user-profile',
        path: '/auth/EPAOperation/UserProfile',
        component: lazy(() => import('@/views/supid/EPA/FieldInspectors')),
        authority: [],
    },
    {
        key: 'auth.epa.document-dashboard',
        path: '/auth/EPAOperation/DocumentsDashboard',
        component: lazy(() => import('@/views/supid/EPA/DocumentDashboard')),
        authority: [],
    },

    // Admin
    {
        key: 'auth.admin.role-dashboard',
        path: '/auth/admin/role-dashboard',
        component: lazy(() => import('@/views/admin/RoleDashboardConfig')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.permissions',
        path: '/auth/admin/permissions',
        component: lazy(() => import('@/views/admin/PermissionsMatrix')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.api-logs',
        path: '/auth/admin/api-logs',
        component: lazy(() => import('@/views/admin/AdminApiLogs')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.audit-logs',
        path: '/auth/admin/audit-logs',
        component: lazy(() => import('@/views/admin/AdminAuditLogs')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.access-logs',
        path: '/auth/admin/access-logs',
        component: lazy(() => import('@/views/admin/AdminAccessLogs')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.service-configs',
        path: '/auth/admin/service-configs',
        component: lazy(() => import('@/views/admin/AdminServiceConfig')),
        authority: ['Admin', 'Super'],
    },
    {
        key: 'auth.admin.external-tokens',
        path: '/auth/admin/external-tokens',
        component: lazy(() => import('@/views/admin/AdminExternalTokens')),
        authority: ['Admin', 'Super'],
    },

    // Competition
    {
        key: 'register-competition',
        path: '/register-competition',
        component: lazy(
            () => import('@/views/auth/competition/CompetitionFormPage'),
        ),
        authority: [],
    },

    // Error
    {
        key: 'error.page',
        path: '/error',
        component: lazy(() => import('@/views/ErrorPage')),
        authority: [],
    },

    ...othersRoute,
]
