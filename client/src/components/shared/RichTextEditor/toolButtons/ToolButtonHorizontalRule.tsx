import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonHorizontalRuleProp = BaseToolButtonProps

const ToolButtonHorizontalRule = ({ editor }: ToolButtonHorizontalRuleProp) => {
    return (
        <ToolButton
            title="Horizontal Rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
            <TablerIcon name="minus" />
        </ToolButton>
    )
}

export default ToolButtonHorizontalRule
