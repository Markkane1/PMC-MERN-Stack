import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import Dropdown from '@/components/ui/Dropdown'
import type { BaseToolButtonProps, HeadingLevel } from './types'
import type { ReactNode } from 'react'

type ToolButtonCodeBlockProp = BaseToolButtonProps & {
    headingLevel?: HeadingLevel[]
}

type HeadingMap = Record<
    number,
    {
        label: string
        value: HeadingLevel
        icon: ReactNode
    }
>

const headingMap: HeadingMap = {
    1: { label: 'Heading 1', value: 1, icon: <TablerIcon name="h-1" /> },
    2: { label: 'Heading 2', value: 2, icon: <TablerIcon name="h-2" /> },
    3: { label: 'Heading 3', value: 3, icon: <TablerIcon name="h-3" /> },
    4: { label: 'Heading 4', value: 4, icon: <TablerIcon name="h-4" /> },
    5: { label: 'Heading 5', value: 5, icon: <TablerIcon name="h-5" /> },
    6: { label: 'Heading 6', value: 6, icon: <TablerIcon name="h-6" /> },
}

const ToolButtonCodeBlock = ({
    editor,
    headingLevel = [1, 2, 3, 4, 5, 6],
}: ToolButtonCodeBlockProp) => {
    return (
        <>
            <Dropdown
                renderTitle={
                    <ToolButton title="Heading">
                        <TablerIcon name="heading" />
                    </ToolButton>
                }
            >
                {headingLevel.map((level) => (
                    <Dropdown.Item
                        key={`heading-${level}`}
                        eventKey={`heading-${level}`}
                        active={editor.isActive('heading', {
                            level: headingMap[level].value,
                        })}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({
                                    level: headingMap[level].value,
                                })
                                .run()
                        }
                    >
                        <span className="text-lg">
                            {headingMap[level].icon}
                        </span>
                        {headingMap[level].label}
                    </Dropdown.Item>
                ))}
            </Dropdown>
        </>
    )
}

export default ToolButtonCodeBlock
