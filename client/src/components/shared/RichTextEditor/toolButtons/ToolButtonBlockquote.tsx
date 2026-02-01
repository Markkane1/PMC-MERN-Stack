import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonBlockquoteProp = BaseToolButtonProps

const ToolButtonBlockquote = ({ editor }: ToolButtonBlockquoteProp) => {
    return (
        <ToolButton
            title="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
            <TablerIcon name="blockquote" />
        </ToolButton>
    )
}

export default ToolButtonBlockquote
