import { forwardRef } from 'react'
import classNames from '@/utils/classNames'
import type { ReactNode } from 'react'
import TablerIcon from '@/components/shared/TablerIcon'

type GrowShrinkTagProps = {
    value?: number
    showIcon?: boolean
    prefix?: ReactNode | string
    suffix?: ReactNode | string
    positiveIcon?: ReactNode | string
    negativeIcon?: ReactNode | string
    positiveClass?: string
    negativeClass?: string
    className?: string
}

const GrowShrinkValue = forwardRef<HTMLDivElement, GrowShrinkTagProps>(
    (props, ref) => {
        const {
            value = 0,
            className,
            prefix,
            suffix,
            positiveIcon,
            negativeIcon,
            showIcon = true,
            positiveClass,
            negativeClass,
        } = props

        return (
            <span
                ref={ref}
                className={classNames(
                    'flex items-center',
                    value > 0
                        ? classNames('text-success', positiveClass)
                        : classNames('text-error', negativeClass),
                    className,
                )}
            >
                {value !== 0 && (
                    <span>
                        {showIcon &&
                            (value > 0 ? (
                                typeof positiveIcon !== 'undefined' ? (
                                    positiveIcon
                                ) : (
                                    <TablerIcon name="arrow-up" />
                                )
                            ) : typeof negativeIcon !== 'undefined' ? (
                                negativeIcon
                            ) : (
                                <TablerIcon name="arrow-down" />
                            ))}
                    </span>
                )}
                <span>
                    {prefix}
                    {value}
                    {suffix}
                </span>
            </span>
        )
    },
)

GrowShrinkValue.displayName = 'GrowShrinkValue'

export default GrowShrinkValue
