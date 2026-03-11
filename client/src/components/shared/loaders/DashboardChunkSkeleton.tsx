import Skeleton from '@/components/ui/Skeleton'
import classNames from 'classnames'

type DashboardChunkSkeletonProps = {
    variant?: 'page' | 'chart' | 'map'
    className?: string
}

const cardWidths = ['55%', '48%', '62%', '44%']

const DashboardChunkSkeleton = ({
    variant = 'page',
    className,
}: DashboardChunkSkeletonProps) => {
    if (variant === 'chart') {
        return (
            <div
                className={classNames(
                    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
                    className,
                )}
            >
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Skeleton height={14} width={120} />
                        <Skeleton height={10} width={180} />
                    </div>
                    <Skeleton height={36} width={108} className="rounded-xl" />
                </div>
                <Skeleton height={320} className="w-full rounded-2xl" />
            </div>
        )
    }

    if (variant === 'map') {
        return (
            <div
                className={classNames(
                    'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
                    className,
                )}
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Skeleton height={14} width={136} />
                        <Skeleton height={10} width={192} />
                    </div>
                    <Skeleton height={34} width={96} className="rounded-xl" />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <Skeleton height={360} className="w-full rounded-2xl" />
                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <Skeleton height={12} width={84} />
                        <Skeleton height={10} width="100%" />
                        <Skeleton height={10} width="86%" />
                        <Skeleton height={10} width="92%" />
                        <Skeleton height={10} width="74%" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={classNames('space-y-6', className)}>
            <div className="rounded-3xl bg-slate-950 p-6 shadow-lg">
                <Skeleton height={18} width={220} className="mb-3 bg-slate-700" />
                <Skeleton height={12} width="58%" className="bg-slate-800" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cardWidths.map((width, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <Skeleton height={12} width={width} className="mb-4" />
                        <Skeleton height={24} width="38%" className="mb-3" />
                        <Skeleton height={10} width="72%" />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                <DashboardChunkSkeleton variant="chart" />
                <DashboardChunkSkeleton variant="chart" />
            </div>
        </div>
    )
}

export default DashboardChunkSkeleton
