import { forwardRef } from 'react'
import classNames from 'classnames'
import TablerIcon from '@/components/shared/TablerIcon'
import type { CommonProps } from '../@types/common'
import type { Placement } from '@floating-ui/react'
import type { ReactNode, HTMLProps } from 'react'

export interface DropdownToggleSharedProps {
    renderTitle?: ReactNode
    placement?: Placement
    toggleClassName?: string
    disabled?: boolean
}

interface DropdownToggleProps extends CommonProps, DropdownToggleSharedProps {
    id?: string
}

const DropdownToggleDefaultContent = ({
    placement,
    children,
}: {
    placement: Placement
    children: string | ReactNode
}) => {
    if (placement && placement.includes('right')) {
        return (
            <>
                {children}
                <TablerIcon name="chevron-right" />
            </>
        )
    }

    if (placement && placement.includes('left')) {
        return (
            <>
                <TablerIcon name="chevron-left" />
                {children}
            </>
        )
    }

    if (placement && placement.includes('right')) {
        return (
            <>
                {children}
                <TablerIcon name="chevron-up" />
            </>
        )
    }

    return (
        <>
            {children}
            <TablerIcon name="chevron-down" />
        </>
    )
}

const DropdownToggle = forwardRef<
    HTMLDivElement,
    DropdownToggleProps & HTMLProps<HTMLDivElement>
>((props, ref) => {
    const {
        className,
        renderTitle,
        children,
        placement = 'bottom-start',
        disabled,
        toggleClassName,
        ...rest
    } = props

    const toggleClass = 'dropdown-toggle'
    const disabledClass = 'dropdown-toggle-disabled'

    const dropdownToggleClass = classNames(
        toggleClass,
        className,
        toggleClassName,
        disabled && disabledClass,
    )

    const dropdownToggleDefaultClass = classNames(
        dropdownToggleClass,
        'dropdown-toggle-default',
    )

    if (renderTitle) {
        return (
            <div className={dropdownToggleClass} {...rest} ref={ref}>
                {renderTitle}
            </div>
        )
    }

    return (
        <div ref={ref} className={dropdownToggleDefaultClass} {...rest}>
            <span className="flex items-center gap-1">
                <DropdownToggleDefaultContent placement={placement}>
                    {children}
                </DropdownToggleDefaultContent>
            </span>
        </div>
    )
})

DropdownToggle.displayName = 'DropdownToggle'

export default DropdownToggle
