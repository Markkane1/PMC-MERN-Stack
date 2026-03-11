import { Suspense } from 'react'
import DashboardChunkSkeleton from '@/components/shared/loaders/DashboardChunkSkeleton'
import AllRoutes from '@/components/route/AllRoutes'
import type { LayoutType } from '@/@types/theme'

interface ViewsProps {
    pageContainerType?: 'default' | 'gutterless' | 'contained'
    layout?: LayoutType
}

const Views = (props: ViewsProps) => {
    return (
        <Suspense
            fallback={
                <div className="w-full px-4 py-6 md:px-6">
                    <DashboardChunkSkeleton />
                </div>
            }
        >
            <AllRoutes {...props} />
        </Suspense>
    )
}

export default Views
