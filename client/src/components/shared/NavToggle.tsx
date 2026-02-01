import type { CommonProps } from '@/@types/common'
import TablerIcon from '@/components/shared/TablerIcon'

export interface NavToggleProps extends CommonProps {
    toggled?: boolean
}

const NavToggle = ({ toggled, className }: NavToggleProps) => {
    return (
        <div className={className}>
            {toggled ? (
                <TablerIcon name="menu" />
            ) : (
                <TablerIcon name="menu-2" />
            )}
        </div>
    )
}

export default NavToggle
