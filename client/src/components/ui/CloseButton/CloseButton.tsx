import { forwardRef } from 'react'
import TablerIcon from '@/components/shared/TablerIcon'
import classNames from 'classnames'
import type { CommonProps } from '../@types/common'
import type { MouseEvent, ButtonHTMLAttributes } from 'react'

export interface CloseButtonProps
    extends CommonProps,
        ButtonHTMLAttributes<HTMLButtonElement> {
    absolute?: boolean
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void
    resetDefaultClass?: boolean
}

const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
    (props, ref) => {
        const { absolute, className, resetDefaultClass, ...rest } = props
        const closeButtonAbsoluteClass = 'absolute z-10'

        const closeButtonClass = classNames(
            !resetDefaultClass && 'close-button button-press-feedback',
            absolute && closeButtonAbsoluteClass,
            className,
        )

        return (
            <button
                ref={ref}
                className={closeButtonClass}
                type="button"
                {...rest}
            >
                <TablerIcon name="x" />
            </button>
        )
    },
)

CloseButton.displayName = 'CloseButton'

export default CloseButton
