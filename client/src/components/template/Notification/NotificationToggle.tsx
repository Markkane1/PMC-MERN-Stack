import classNames from '@/utils/classNames'
import Badge from '@/components/ui/Badge'
import TablerIcon from '@/components/shared/TablerIcon'

const NotificationToggle = ({
    className,
    dot,
}: {
    className?: string
    dot: boolean
}) => {
    return (
        <div className={classNames('text-2xl', className)}>
            {dot ? (
                <Badge badgeStyle={{ top: '3px', right: '6px' }}>
                    <TablerIcon name="bell" />
                </Badge>
            ) : (
                <TablerIcon name="bell" />
            )}
        </div>
    )
}

export default NotificationToggle
