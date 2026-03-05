import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'

type MaskToken = 'digit' | 'letter' | 'alphanumeric' | 'static'

type InputMaskProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'children' | 'value' | 'onChange'
> & {
    mask: string
    value?: string
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    children: (
        inputProps: InputHTMLAttributes<HTMLInputElement>,
    ) => ReactNode
}

const tokenFor = (char: string): MaskToken => {
    if (char === '9') return 'digit'
    if (char === 'a' || char === 'A') return 'letter'
    if (char === '*') return 'alphanumeric'
    return 'static'
}

const matchesToken = (value: string, token: MaskToken): boolean => {
    if (token === 'digit') return /\d/.test(value)
    if (token === 'letter') return /[a-zA-Z]/.test(value)
    if (token === 'alphanumeric') return /[a-zA-Z0-9]/.test(value)
    return false
}

const applyMask = (rawInput: string, mask: string): string => {
    const cleaned = String(rawInput || '').replace(/[^a-zA-Z0-9]/g, '')
    const maskChars = mask.split('')

    // Handle fixed static prefix (for example mask "3999999999")
    let prefix = ''
    let firstPlaceholderIndex = maskChars.findIndex((char) => tokenFor(char) !== 'static')
    if (firstPlaceholderIndex < 0) firstPlaceholderIndex = maskChars.length
    for (let i = 0; i < firstPlaceholderIndex; i += 1) {
        if (/[a-zA-Z0-9]/.test(maskChars[i])) {
            prefix += maskChars[i]
        }
    }

    let source = cleaned
    if (prefix && source.startsWith(prefix)) {
        source = source.slice(prefix.length)
    }

    let result = ''
    let cursor = 0
    let consumedPlaceholder = false

    for (let i = 0; i < maskChars.length; i += 1) {
        const maskChar = maskChars[i]
        const token = tokenFor(maskChar)

        if (token === 'static') {
            if (i < firstPlaceholderIndex) {
                result += maskChar
                continue
            }
            if (consumedPlaceholder) {
                result += maskChar
            }
            continue
        }

        let nextChar = ''
        while (cursor < source.length) {
            const candidate = source[cursor]
            cursor += 1
            if (matchesToken(candidate, token)) {
                nextChar = candidate
                break
            }
        }

        if (!nextChar) break
        result += nextChar
        consumedPlaceholder = true
    }

    return result
}

const InputMask = ({
    mask,
    value = '',
    onChange,
    children,
    ...rest
}: InputMaskProps) => {
    const maskedValue = applyMask(String(value || ''), mask)

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!onChange) return
        const nextValue = applyMask(event.target.value, mask)
        const syntheticEvent = {
            ...event,
            target: { ...event.target, value: nextValue },
            currentTarget: { ...event.currentTarget, value: nextValue },
        } as ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
    }

    return (
        <>
            {children({
                ...rest,
                value: maskedValue,
                onChange: handleChange,
            })}
        </>
    )
}

export default InputMask

