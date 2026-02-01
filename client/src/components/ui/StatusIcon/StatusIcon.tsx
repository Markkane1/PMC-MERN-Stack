import TablerIcon from '@/components/shared/TablerIcon'
import type { TypeAttributes, CommonProps } from '../@types/common'
import type { ReactNode } from 'react'

export interface StatusIconProps extends CommonProps {
    type: TypeAttributes.Status
    custom?: ReactNode | JSX.Element
    iconColor?: string
}

const ICONS: Record<
    TypeAttributes.Status,
    {
        color: string
        icon: JSX.Element
    }
> = {
    success: {
        color: 'text-success',
        icon: <TablerIcon name="circle-check" />,
    },
    info: {
        color: 'text-info',
        icon: <TablerIcon name="info-circle" />,
    },
    warning: {
        color: 'text-warning',
        icon: <TablerIcon name="alert-circle" />,
    },
    danger: {
        color: 'text-error',
        icon: <TablerIcon name="circle-x" />,
    },
}

const StatusIcon = (props: StatusIconProps) => {
    const { type = 'info', custom, iconColor } = props

    const icon = ICONS[type]

    return (
        <span className={`text-2xl ${iconColor || icon.color}`}>
            {custom || icon.icon}
        </span>
    )
}

export default StatusIcon
