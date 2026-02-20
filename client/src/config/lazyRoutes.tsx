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
 * Lazy-loaded main views
 * These are valid current modules in this codebase.
 */
export const LazyDashboard = lazy(() => import('@/views/Home'))

export const LazyApplicantList = lazy(() => import('@/views/HomeSuper'))

export const LazyApplicantDetail = lazy(async () => {
  const module = await import('@/views/supid/ApplicantDetailForm/ApplicantDetailForm')
  const ApplicantDetailForm = module.default
  return {
    default: () => <ApplicantDetailForm onFormSubmit={() => undefined} />,
  }
})

export const LazyAnalytics = lazy(() => import('@/views/demo/AnalyticsView'))

export const LazySettings = lazy(() => import('@/views/SettingsPage'))

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
