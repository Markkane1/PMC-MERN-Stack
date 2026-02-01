import TablerIcon from '@/components/shared/TablerIcon'
import classNames from '../utils/classNames'

export type SorterProps = {
    className?: string
    sort?: boolean | 'asc' | 'desc'
}

const Sorter = ({ sort, className }: SorterProps) => {
    const color = 'text-primary'

    const renderSort = () => {
        if (typeof sort === 'boolean') {
            return <TablerIcon name="arrows-sort" />
        }

        if (sort === 'asc') {
            return <TablerIcon name="sort-ascending" className={color} />
        }

        if (sort === 'desc') {
            return <TablerIcon name="sort-descending" className={color} />
        }

        return null
    }

    return (
        <div className={classNames('inline-flex', className)}>
            {renderSort()}
        </div>
    )
}

export default Sorter
