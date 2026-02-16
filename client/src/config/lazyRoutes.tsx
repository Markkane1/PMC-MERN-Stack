/**
 * Week 3: Lazy-Loaded Routes Configuration
 * Code splitting - each route loads only when accessed
 * Dramatically reduces initial bundle size and load time
 */

import { lazy, Suspense } from 'react'

/**
 * Loading/skeleton component shown while route chunks load
 */
export function RouteLoadingFallback() {
  return (
    <div className="route-loading">
      <div className="spinner"></div>
      <p>Loading page...</p>
      <style>{`
        .route-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #666;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1976d2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        p {
          margin: 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

/**
 * Wrap component in lazy loading and Suspense
 */
function lazyRoute<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const Component = lazy(importFunc)
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Component />
    </Suspense>
  )
}

/**
 * Lazy-loaded main views
 * These will be code-split and loaded on-demand
 */
export const LazyDashboard = lazy(
  () => import('@/views/Dashboard').then((m) => ({ default: m.Dashboard }))
)

export const LazyApplicantList = lazy(
  () => import('@/views/ApplicantList').then((m) => ({ default: m.ApplicantList }))
)

export const LazyApplicantDetail = lazy(
  () => import('@/views/ApplicantDetail').then((m) => ({ default: m.ApplicantDetail }))
)

export const LazyAnalytics = lazy(
  () => import('@/views/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
)

export const LazySettings = lazy(
  () => import('@/views/Settings').then((m) => ({ default: m.Settings }))
)

/**
 * Sample route configuration with lazy loading
 * Use in your router setup:
 *
 * const routes = [
 *   {
 *     path: 'dashboard',
 *     element: (
 *       <Suspense fallback={<RouteLoadingFallback />}>
 *         <LazyDashboard />
 *       </Suspense>
 *     )
 *   },
 *   {
 *     path: 'applicants',
 *     element: (
 *       <Suspense fallback={<RouteLoadingFallback />}>
 *         <LazyApplicantList />
 *       </Suspense>
 *     )
 *   },
 *   // ... more routes
 * ]
 */
export const lazyRoutes = [
  {
    path: 'dashboard',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyDashboard />
      </Suspense>
    ),
  },
  {
    path: 'applicants',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyApplicantList />
      </Suspense>
    ),
  },
  {
    path: 'applicants/:id',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyApplicantDetail />
      </Suspense>
    ),
  },
  {
    path: 'analytics',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyAnalytics />
      </Suspense>
    ),
  },
  {
    path: 'settings',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazySettings />
      </Suspense>
    ),
  },
]
