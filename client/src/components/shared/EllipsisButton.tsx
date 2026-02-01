import Button from '@/components/ui/Button'
import type { ButtonProps } from '@/components/ui/Button'
import TablerIcon from '@/components/shared/TablerIcon'

type EllipsisButtonProps = ButtonProps

const EllipsisButton = (props: EllipsisButtonProps) => {
    const { shape = 'circle', variant = 'plain', size = 'xs' } = props

    return (
        <Button
            shape={shape}
            variant={variant}
            size={size}
            icon={<TablerIcon name="dots" />}
            {...props}
        />
    )
}

export default EllipsisButton
