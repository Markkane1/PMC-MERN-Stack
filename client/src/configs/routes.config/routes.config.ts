import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes: Routes = [

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

    {
        key: 'auth.mis.directory',
