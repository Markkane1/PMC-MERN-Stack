import { useState, forwardRef } from 'react'
import { Input, InputProps } from '@/components/ui/Input'
import type { MouseEvent } from 'react'
import TablerIcon from '@/components/shared/TablerIcon'

interface PasswordInputProps extends InputProps {
    onVisibleChange?: (visible: boolean) => void
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    (props, ref) => {
        const { onVisibleChange, ...rest } = props

        const [pwInputType, setPwInputType] = useState('password')

        const onPasswordVisibleClick = (e: MouseEvent<HTMLSpanElement>) => {
            e.preventDefault()
            const nextValue = pwInputType === 'password' ? 'text' : 'password'
            setPwInputType(nextValue)
            onVisibleChange?.(nextValue === 'text')
        }

        return (
            <Input
                {...rest}
                ref={ref}
                type={pwInputType}
                suffix={
                    <span
                        className="cursor-pointer select-none text-xl"
                        role="button"
                        onClick={onPasswordVisibleClick}
                    >
                        {pwInputType === 'password' ? (
                            <TablerIcon name="eye-off" />
                        ) : (
                            <TablerIcon name="eye" />
                        )}
                    </span>
                }
            />
        )
    },
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
