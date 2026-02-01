import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonRedoProp = BaseToolButtonProps

const ToolButtonRedo = ({ editor }: ToolButtonRedoProp) => {
    return (
        <ToolButton
            title="Code"
            disabled={!editor.can().chain().focus().redo().run()}
            onClick={() => editor.chain().focus().redo().run()}
        >
            <TablerIcon name="arrow-forward-up" />
        </ToolButton>
    )
}

export default ToolButtonRedo
