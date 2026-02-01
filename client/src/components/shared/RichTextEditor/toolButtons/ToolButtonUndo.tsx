import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonUndoProp = BaseToolButtonProps

const ToolButtonUndo = ({ editor }: ToolButtonUndoProp) => {
    return (
        <ToolButton
            title="Code"
            disabled={!editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
        >
            <TablerIcon name="arrow-back-up" />
        </ToolButton>
    )
}

export default ToolButtonUndo
