import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonHardBreakProp = BaseToolButtonProps

const ToolButtonHardBreak = ({ editor }: ToolButtonHardBreakProp) => {
    return (
        <ToolButton
            title="Horizontal Rule"
            onClick={() => editor.chain().focus().setHardBreak().run()}
        >
            <TablerIcon name="separator-horizontal" />
        </ToolButton>
    )
}

export default ToolButtonHardBreak
