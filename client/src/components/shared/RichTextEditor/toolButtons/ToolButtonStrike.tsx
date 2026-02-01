import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonStrikeProp = BaseToolButtonProps

const ToolButtonStrike = ({ editor }: ToolButtonStrikeProp) => {
    return (
        <ToolButton
            title="Strikethrough"
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
        >
            <TablerIcon name="strikethrough" />
        </ToolButton>
    )
}

export default ToolButtonStrike
