import type { HTMLAttributes } from 'react'

type TablerIconProps = HTMLAttributes<HTMLElement> & {
    name: string
    label?: string
}

const TablerIcon = ({ name, className, label, ...rest }: TablerIconProps) => {
    const classes = `ti ti-${name} ${className || ''}`.trim()
    return (
        <i
            className={classes}
            aria-hidden={label ? undefined : true}
            aria-label={label}
            {...rest}
        />
    )
}

export default TablerIcon
